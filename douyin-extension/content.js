'use strict';

(function () {
  const VERSION = '1.0.0';
  const DEFAULTS = {
    baseUrl: '',
    roomId: '',
    debug: false,
    chatContainer: '.webcast-chatroom___list, [data-e2e="chatroom"], div[class*="chatroom"][class*="list"]',
    messageSelector: '.webcast-chatroom___item, [data-e2e="chat-message"], div[class*="chatroom"][class*="item"]',
    inputSelector: 'div[contenteditable="true"], textarea, [data-e2e="chat-input"]',
    sendSelector: '[data-e2e="chat-send"], button[class*="send"]'
  };

  let settings = Object.assign({}, DEFAULTS);
  let scanTimer = null;
  let heartbeatTimer = null;
  const seen = new Map();
  const recentSent = new Map();
  const MAX_SEEN = 900;

  function log() {
    if (!settings.debug) return;
    try { console.log.apply(console, ['[驰声互动]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* ignore */ }
  }

  function loadSettings() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(DEFAULTS, function (data) {
        settings = Object.assign({}, DEFAULTS, data || {});
        resolve(settings);
      });
    });
  }

  function roomId() {
    const match = location.pathname.match(/^\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  function api(path, method, body) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({
          type: 'car-live-api',
          path: path,
          method: method || 'GET',
          body: body
        }, function (response) {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, error: 'empty_response' });
        });
      } catch (err) {
        resolve({ ok: false, error: String(err) });
      }
    });
  }

  function queryAll(selector) {
    if (!selector) return [];
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selector));
    } catch (_) {
      log('选择器无效', selector);
      return [];
    }
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function messageNodes() {
    let nodes = [];
    const containers = queryAll(settings.chatContainer);
    containers.forEach(function (container) {
      nodes = nodes.concat(queryAllIn(container, settings.messageSelector));
    });
    if (!nodes.length) nodes = queryAll(settings.messageSelector);
    if (!nodes.length) {
      containers.forEach(function (container) {
        Array.prototype.slice.call(container.children || []).forEach(function (child) {
          const text = String(child.innerText || '').trim();
          if (text && text.length <= 600) nodes.push(child);
        });
      });
    }
    return nodes.filter(function (node, index) {
      return nodes.indexOf(node) === index;
    });
  }

  function queryAllIn(container, selector) {
    if (!container || !selector) return [];
    try {
      return Array.prototype.slice.call(container.querySelectorAll(selector));
    } catch (_) {
      return [];
    }
  }

  function extract(node) {
    const raw = String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw || raw.length > 600) return null;

    let nickname = '';
    let text = raw;

    const userEl = node.querySelector('[data-e2e*="user"], [data-e2e*="nickname"], [class*="nickname"], [class*="userName"], [class*="user-name"]');
    const contentEl = node.querySelector('[data-e2e*="content"], [class*="content"], [class*="message"]');
    if (userEl && contentEl && isVisible(userEl) && isVisible(contentEl)) {
      nickname = String(userEl.innerText || '').trim();
      text = String(contentEl.innerText || '').trim();
    }

    if (!nickname) {
      const colon = raw.match(/^([^\n：:]{1,28})[：:]\s*([\s\S]+)$/);
      if (colon) {
        nickname = colon[1].trim();
        text = colon[2].trim();
      }
    }

    if (!nickname) {
      const lines = raw.split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
      if (lines.length >= 2) {
        nickname = lines[0];
        text = lines.slice(1).join(' ');
      }
    }

    const welcomePattern = /^(.{1,28}?)(?:来了|进入直播间|加入了直播间)[！!。.]?$/;
    const welcome = raw.match(welcomePattern);
    if (welcome && !/[：:]/.test(raw)) {
      return {
        type: 'welcome',
        nickname: welcome[1].trim(),
        text: raw,
        messageId: node.dataset.id || node.getAttribute('data-message-id') || ''
      };
    }

    if (!text || text.length > 500) return null;
    if (nickname === text) {
      const second = text.match(/^([^\s：:]{1,28})\s+(.+)$/);
      if (second) {
        nickname = second[1];
        text = second[2];
      }
    }
    if (!text) return null;
    return {
      type: 'chat',
      nickname: nickname || '观众',
      text: text,
      messageId: node.dataset.id || node.getAttribute('data-message-id') || ''
    };
  }

  function remember(key) {
    const now = Date.now();
    if (seen.has(key) && now - seen.get(key) < 300000) return false;
    seen.set(key, now);
    if (seen.size > MAX_SEEN) {
      const cutoff = now - 600000;
      seen.forEach(function (value, itemKey) {
        if (value < cutoff) seen.delete(itemKey);
      });
    }
    return true;
  }

  async function handleMessage(message) {
    if (!message) return;
    if (settings.roomId && String(settings.roomId) !== String(roomId())) {
      return;
    }
    if (message.text && recentSent.has(message.text) && Date.now() - recentSent.get(message.text) < 90000) {
      return;
    }
    const key = message.messageId || (message.type + '|' + message.nickname + '|' + message.text);
    if (!remember(key)) return;
    log('收到消息', message);
    const response = await api('/api/chat/message', 'POST', {
      nickname: message.nickname,
      text: message.text,
      type: message.type,
      messageId: message.messageId || key,
      source: 'douyin-extension'
    });
    if (!response || !response.ok || !response.data || !response.data.ok) {
      log('消息处理失败', response);
      return;
    }
    const result = response.data;
    if (result.action === 'send' && result.reply) {
      const sent = await sendReply(result.reply);
      await api('/api/chat/sent', 'POST', {
        eventId: result.eventId,
        ok: sent.ok,
        error: sent.error || ''
      });
    }
  }

  function scan() {
    if (document.visibilityState === 'hidden') return;
    const nodes = messageNodes();
    if (!nodes.length) {
      log('未找到公屏节点，请检查扩展设置里的选择器');
      return;
    }
    nodes.forEach(function (node) {
      const message = extract(node);
      if (message) handleMessage(message);
    });
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scan();
    }, 220);
  }

  function findInput() {
    const candidates = queryAll(settings.inputSelector).filter(isVisible);
    return candidates.length ? candidates[candidates.length - 1] : null;
  }

  function setInputText(input, text) {
    input.focus();
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return String(input.value || '').trim() === text;
    }

    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, text);
    } catch (_) {
      input.textContent = text;
    }
    if (!String(input.innerText || input.textContent || '').trim()) {
      input.textContent = text;
    }
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));
    return String(input.innerText || input.textContent || '').trim().length > 0;
  }

  function pressEnter(input) {
    const options = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    input.dispatchEvent(new KeyboardEvent('keydown', options));
    input.dispatchEvent(new KeyboardEvent('keypress', options));
    input.dispatchEvent(new KeyboardEvent('keyup', options));
  }

  function clickSendButton() {
    const buttons = queryAll(settings.sendSelector).filter(isVisible);
    if (!buttons.length) return false;
    buttons[buttons.length - 1].click();
    return true;
  }

  async function sendReply(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!clean) return { ok: false, error: 'empty_reply' };
    const input = findInput();
    if (!input) {
      log('没有找到聊天输入框');
      return { ok: false, error: 'input_not_found' };
    }
    const filled = setInputText(input, clean);
    if (!filled) {
      return { ok: false, error: 'fill_failed' };
    }
    await new Promise(function (resolve) { setTimeout(resolve, 120); });
    pressEnter(input);
    await new Promise(function (resolve) { setTimeout(resolve, 280); });

    const left = String(input.innerText || input.value || input.textContent || '').trim();
    if (left) {
      const clicked = clickSendButton();
      if (!clicked) {
        return { ok: false, error: 'send_button_not_found' };
      }
      await new Promise(function (resolve) { setTimeout(resolve, 260); });
      const stillLeft = String(input.innerText || input.value || input.textContent || '').trim();
      if (stillLeft) {
        return { ok: false, error: 'send_not_confirmed' };
      }
    }
    recentSent.set(clean, Date.now());
    if (recentSent.size > 60) {
      const now = Date.now();
      recentSent.forEach(function (time, key) {
        if (now - time > 180000) recentSent.delete(key);
      });
    }
    return { ok: true };
  }

  async function heartbeat() {
    await api('/api/chat/heartbeat', 'POST', {
      url: location.href,
      title: document.title,
      roomId: roomId(),
      version: VERSION
    });
  }

  function observe() {
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function start() {
    await loadSettings();
    log('启动', settings);
    heartbeat();
    heartbeatTimer = setInterval(heartbeat, 10000);
    observe();
    setInterval(scan, 2000);
    setTimeout(scan, 600);
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      let changed = false;
      Object.keys(DEFAULTS).forEach(function (key) {
        if (changes[key]) {
          settings[key] = changes[key].newValue;
          changed = true;
        }
      });
      if (changed) {
        log('设置已更新', settings);
        scheduleScan();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', function () {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });
})();
