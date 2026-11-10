/**

 * 直播互动页：连接本地服务、规则管理、事件流与测试。
 */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const els = {};
  const state = {
    visible: false,
    connected: false,
    config: null,
    events: [],
    lastEventId: 0,
    voiceBootstrapped: false,
    spokenEvents: new Set(),
    initialLoaded: false,
    baseDir: '',
    timers: [],
    saveTimer: null,
    editingRuleId: null
  };

  function cache() {
    [
      'chatView', 'chatConn', 'chatModel', 'chatRoom', 'chatCount', 'chatFeed',
      'chatClearBtn', 'chatMode', 'chatEnabledToggle', 'chatAutoSendToggle',
      'chatWelcomeToggle', 'chatVoiceToggle', 'welcomeTemplate', 'minIntervalSec', 'maxPerMinute',
      'userCooldownSec', 'saveChatBtn', 'testNickname', 'testText',
      'testWelcomeBtn', 'testQuestionBtn', 'testResult', 'rulesList', 'ruleCount',
      'addRuleBtn', 'openDouyinBtn', 'extHelpBtn', 'extensionHint',
      'copyExtensionPath', 'ruleDialog', 'ruleDialogTitle', 'ruleKeywords',
      'ruleReply', 'saveRuleBtn', 'cancelRuleBtn', 'closeRuleBtn',
      'extDialog', 'closeExtBtn', 'extDoneBtn', 'extPathText', 'copyExtPathBtn2'
    ].forEach(function (id) { els[id] = $(id); });
  }

  function toast(message, type, duration) {
    const el = $('toast');
    if (!el) return;
    clearTimeout(el._chatTimer);
    el.textContent = message;
    el.className = 'toast show' + (type ? ' ' + type : '');
    el._chatTimer = setTimeout(function () {
      el.className = 'toast' + (type ? ' ' + type : '');
    }, duration || 2600);
  }

  async function fetchJSON(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 4500);
    try {
      const response = await fetch(path, Object.assign({ cache: 'no-store', signal: controller.signal }, options || {}));
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function extensionPath() {
    return (state.baseDir ? state.baseDir + '\\' : '软件目录\\') + 'douyin-extension';
  }

  function setConnection(connected, heartbeat) {
    state.connected = Boolean(connected);
    els.chatConn.className = 'chat-conn' + (connected ? '' : ' offline');
    els.chatConn.innerHTML = '<i></i><span>' + (connected ? '抖音扩展已连接' : '扩展未连接') + '</span>';
    els.extensionHint.textContent = connected
      ? '扩展已连接，正在接收当前直播间的公屏消息。'
      : '扩展未连接。安装扩展并打开自己的直播间后，这里会自动变成“已连接”。';
    if (heartbeat && heartbeat.roomId) {
      els.chatRoom.hidden = false;
      els.chatRoom.textContent = '房间 ' + heartbeat.roomId;
    } else {
      els.chatRoom.hidden = true;
    }
  }

  function renderConfig() {
    const config = state.config;
    if (!config) return;
    els.chatEnabledToggle.checked = Boolean(config.enabled);
    els.chatAutoSendToggle.checked = Boolean(config.autoSend);
    els.chatWelcomeToggle.checked = Boolean(config.welcomeEnabled);
    els.chatVoiceToggle.checked = config.voiceReply !== false;
    els.welcomeTemplate.value = config.welcomeTemplate || '';
    els.minIntervalSec.value = String(config.minIntervalSec || 8);
    els.maxPerMinute.value = String(config.maxPerMinute || 6);
    els.userCooldownSec.value = String(config.userCooldownSec === 0 ? 0 : (config.userCooldownSec || 45));
    els.chatMode.textContent = config.autoSend ? '自动发送' : '建议模式';
    els.chatMode.classList.toggle('live', Boolean(config.autoSend));
    els.chatModel.textContent = config.currentModel || '通用';
    renderRules();
  }

  function renderRules() {
    const rules = (state.config && state.config.rules) || [];
    els.ruleCount.textContent = String(rules.length);
    els.rulesList.textContent = '';
    if (!rules.length) {
      const empty = document.createElement('p');
      empty.className = 'chat-no-reply';
      empty.textContent = '还没有规则。点击“新增规则”添加第一条关键词回复。';
      els.rulesList.appendChild(empty);
      return;
    }
    rules.forEach(function (rule) {
      const row = document.createElement('div');
      row.className = 'chat-rule' + (rule.enabled === false ? ' disabled' : '');

      const keywords = document.createElement('div');
      keywords.className = 'chat-rule-keywords';
      (rule.keywords || []).forEach(function (keyword) {
        const tag = document.createElement('span');
        tag.textContent = keyword;
        keywords.appendChild(tag);
      });

      const actions = document.createElement('div');
      actions.className = 'chat-rule-actions';

      const label = document.createElement('label');
      label.className = 'switch chat-rule-switch';
      label.title = rule.enabled === false ? '启用此规则' : '停用此规则';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = rule.enabled !== false;
      checkbox.addEventListener('change', function () {
        rule.enabled = checkbox.checked;
        row.classList.toggle('disabled', !checkbox.checked);
        saveConfig(true);
      });
      const track = document.createElement('span');
      label.appendChild(checkbox);
      label.appendChild(track);

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'text-btn';
      edit.textContent = '编辑';
      edit.addEventListener('click', function () { openRuleDialog(rule); });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-btn danger';
      remove.textContent = '删除';
      remove.addEventListener('click', function () {
        if (!window.confirm('删除这条回复规则？')) return;
        state.config.rules = state.config.rules.filter(function (item) { return item.id !== rule.id; });
        renderRules();
        saveConfig(true);
      });

      actions.appendChild(label);
      actions.appendChild(edit);
      actions.appendChild(remove);

      const reply = document.createElement('p');
      reply.className = 'chat-rule-reply';
      reply.textContent = rule.reply;

      row.appendChild(keywords);
      row.appendChild(actions);
      row.appendChild(reply);
      els.rulesList.appendChild(row);
    });
  }

  function renderEvent(event) {
    const article = document.createElement('article');
    article.className = 'chat-event' + (event.type === 'welcome' ? ' welcome' : '');

    const top = document.createElement('div');
    top.className = 'chat-event-top';

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = String(event.nickname || '观').slice(0, 1);

    const user = document.createElement('div');
    user.className = 'chat-event-user';
    const name = document.createElement('b');
    name.textContent = event.nickname || '观众';
    const type = document.createElement('span');
    type.className = 'chat-event-type';
    type.textContent = event.type === 'welcome' ? '进入直播间' : '公屏提问';
    user.appendChild(name);
    user.appendChild(type);

    const time = document.createElement('time');
    const date = new Date(event.time || Date.now());
    time.textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    const badge = document.createElement('span');
    const labels = {
      sent: '已发送',
      suggest: '建议回复',
      blocked: '已限流',
      ignore: '未匹配',
      send_failed: '发送失败'
    };
    const kind = event.action || 'ignore';
    badge.className = 'chat-action-badge ' + (kind === 'send_failed' ? 'blocked' : kind);
    badge.textContent = labels[kind] || '记录';

    top.appendChild(avatar);
    top.appendChild(user);
    top.appendChild(time);
    top.appendChild(badge);

    const text = document.createElement('p');
    text.className = 'chat-event-text';
    text.textContent = event.text || '';

    article.appendChild(top);
    article.appendChild(text);

    if (event.reply) {
      const reply = document.createElement('div');
      reply.className = 'chat-reply';
      const label = document.createElement('span');
      label.className = 'chat-reply-label';
      label.textContent = '回复';
      const content = document.createElement('p');
      content.textContent = event.reply;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'chat-copy-btn';
      copy.title = '复制这条回复';
      copy.innerHTML = '<svg><use href="#icon-copy"></use></svg>';
      copy.addEventListener('click', function () { copyText(event.reply); });
      reply.appendChild(label);
      reply.appendChild(content);
      reply.appendChild(copy);
      article.appendChild(reply);
    } else if (kind === 'ignore') {
      const no = document.createElement('p');
      no.className = 'chat-no-reply';
      no.textContent = event.reason === 'engine_off'
        ? '回复引擎已关闭'
        : (event.reason === 'no_match' ? '没有命中关键词规则' : '未生成回复');
      article.appendChild(no);
    }

    if (kind === 'blocked' && event.reason) {
      const reason = document.createElement('p');
      reason.className = 'chat-no-reply';
      reason.textContent = event.reason === 'too_fast'
        ? '触发最短间隔，已拦截发送'
        : (event.reason === 'minute_limit'
          ? '触发每分钟上限，已拦截发送'
          : (event.reason === 'user_cooldown' ? '该观众冷却中，已拦截发送' : '已拦截'));
      article.appendChild(reason);
    }

    return article;
  }

  function renderEvents(reset) {
    if (reset) {
      els.chatFeed.textContent = '';
      if (!state.events.length) {
        const empty = document.createElement('div');
        empty.className = 'chat-empty';
        empty.innerHTML = '<div class="chat-empty-icon"><svg><use href="#icon-chat"></use></svg></div>' +
          '<strong>等待公屏消息</strong>' +
          '<p>先安装浏览器扩展，打开自己的抖音直播间。扩展连接后，观众问题和进入提醒会显示在这里。</p>';
        els.chatFeed.appendChild(empty);
        els.chatCount.textContent = '0 条';
        return;
      }
    }
    const empty = els.chatFeed.querySelector('.chat-empty');
    if (empty) empty.remove();
    state.events.forEach(function (event) {
      if (event._rendered) return;
      event._rendered = true;
      els.chatFeed.appendChild(renderEvent(event));
    });
    els.chatCount.textContent = state.events.length + ' 条';
    const nearBottom = els.chatFeed.scrollHeight - els.chatFeed.scrollTop - els.chatFeed.clientHeight < 80;
    if (nearBottom) els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
  }

  async function loadConfig() {
    try {
      const data = await fetchJSON('/api/chat/config');
      if (data.ok && data.config) {
        state.config = data.config;
        renderConfig();
      }
    } catch (_) {
      // status 会显示离线
    }
  }

  async function refreshStatus() {
    try {
      const data = await fetchJSON('/api/chat/status');
      if (!data.ok) throw new Error('bad status');
      state.baseDir = data.baseDir || state.baseDir || '';
      if (!state.initialLoaded) {
        state.config = data.config;
        state.initialLoaded = true;
        renderConfig();
      }
      setConnection(data.connected, data.heartbeat);
      if (data.heartbeat && data.heartbeat.roomId) {
        els.chatRoom.hidden = false;
        els.chatRoom.textContent = '房间 ' + data.heartbeat.roomId;
      } else {
        els.chatRoom.hidden = true;
      }
    } catch (_) {
      setConnection(false);
      els.extensionHint.textContent = '本地服务未响应。请确认软件正在运行，再刷新此页面。';
    }
  }

  function speakNewEvents(events) {
    if (!events || !events.length || !window.CarLiveVoice) return;
    if (state.config && state.config.voiceReply === false) return;
    events.forEach(function (event) {
      if (!event || !event.reply || event.action === 'ignore') return;
      if (state.spokenEvents.has(event.id)) return;
      state.spokenEvents.add(event.id);
      window.CarLiveVoice.speakChatReply(event.reply, {
        eventId: event.id,
        nickname: event.nickname
      });
    });
  }

  async function pollEvents() {
    try {
      const data = await fetchJSON('/api/chat/events');
      if (!data.ok) return;
      const fresh = (data.events || []).filter(function (event) {
        return !state.events.some(function (item) { return item.id === event.id; });
      });
      if (fresh.length) {
        state.events = state.events.concat(fresh).slice(-80);
        state.lastEventId = Math.max(state.lastEventId, data.lastId || 0);
        renderEvents(false);
        if (state.voiceBootstrapped) speakNewEvents(fresh);
      } else if (!state.events.length && data.lastId === 0) {
        renderEvents(true);
      }
    } catch (_) {
      // status 会提示
    }
  }

  async function saveConfig(silent) {
    if (!state.config) return;
    const config = Object.assign({}, state.config, {
      enabled: els.chatEnabledToggle.checked,
      autoSend: els.chatAutoSendToggle.checked,
      welcomeEnabled: els.chatWelcomeToggle.checked,
      voiceReply: els.chatVoiceToggle.checked,
      welcomeTemplate: els.welcomeTemplate.value.trim(),
      minIntervalSec: Number(els.minIntervalSec.value),
      maxPerMinute: Number(els.maxPerMinute.value),
      userCooldownSec: Number(els.userCooldownSec.value),
      currentModel: els.chatModel.textContent || '通用'
    });
    try {
      const data = await fetchJSON('/api/chat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!data.ok) throw new Error('save failed');
      state.config = data.config;
      renderConfig();
      if (!silent) toast('互动设置已保存。', 'success');
    } catch (_) {
      if (!silent) toast('保存失败，请确认软件正在运行。', 'error');
    }
  }

  function queueSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () { saveConfig(true); }, 450);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制。', 'success', 1600); });
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); toast('已复制。', 'success', 1600); } catch (_) { /* ignore */ }
    area.remove();
  }

  function openRuleDialog(rule) {
    state.editingRuleId = rule ? rule.id : null;
    els.ruleDialogTitle.textContent = rule ? '编辑回复规则' : '新增回复规则';
    els.ruleKeywords.value = rule ? (rule.keywords || []).join('，') : '';
    els.ruleReply.value = rule ? (rule.reply || '') : '';
    if (typeof els.ruleDialog.showModal === 'function') els.ruleDialog.showModal();
    else els.ruleDialog.setAttribute('open', '');
    setTimeout(function () { els.ruleKeywords.focus(); }, 50);
  }

  function closeRuleDialog() {
    if (typeof els.ruleDialog.close === 'function') els.ruleDialog.close();
    else els.ruleDialog.removeAttribute('open');
  }

  function saveRule() {
    if (!state.config) return;
    const keywords = els.ruleKeywords.value.split(/[,，、;；\s]+/).map(function (item) {
      return item.trim();
    }).filter(Boolean);
    const reply = els.ruleReply.value.trim();
    if (!keywords.length || !reply) {
      toast('请填写至少一个关键词和回复内容。', 'error');
      return;
    }
    if (state.editingRuleId) {
      const rule = state.config.rules.find(function (item) { return item.id === state.editingRuleId; });
      if (rule) {
        rule.keywords = keywords;
        rule.reply = reply;
      }
    } else {
      state.config.rules.push({
        id: 'rule-' + Date.now(),
        keywords: keywords,
        reply: reply,
        enabled: true
      });
    }
    renderRules();
    saveConfig(true);
    closeRuleDialog();
    toast('规则已保存。', 'success');
  }

  async function simulate(type) {
    const nickname = els.testNickname.value.trim() || (type === 'welcome' ? '测试观众' : '测试观众');
    const text = type === 'welcome'
      ? nickname + ' 来了'
      : (els.testText.value.trim() || '这个车多少钱？');
    els.testResult.textContent = '正在匹配规则…';
    try {
      const data = await fetchJSON('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname,
          text: text,
          type: type,
          messageId: 'test-' + Date.now(),
          test: true,
          source: 'ui-test'
        })
      });
      if (!data.ok) throw new Error(data.message || '测试失败');
      const labels = { suggest: '建议回复', blocked: '已限流', ignore: '未命中', send: '自动发送' };
      if (data.reply) {
        els.testResult.innerHTML = '';
        const head = document.createElement('strong');
        head.textContent = '结果：' + (labels[data.action] || data.action);
        const body = document.createElement('p');
        body.textContent = data.reply;
        els.testResult.appendChild(head);
        els.testResult.appendChild(body);
      } else {
        els.testResult.textContent = '没有命中规则。可以新增关键词，或检查回复引擎是否开启。';
      }
      await pollEvents();
    } catch (_) {
      els.testResult.textContent = '测试失败：本地服务没有响应。';
    }
  }

  function bind() {
    els.chatEnabledToggle.addEventListener('change', queueSave);
    els.chatAutoSendToggle.addEventListener('change', function () {
      if (els.chatAutoSendToggle.checked) {
        const ok = window.confirm(
          '开启后，扩展会在你的抖音直播间直接发送回复。\n\n' +
          '这可能触发平台风控或违反平台规则，建议先用“建议模式”验证话术，并控制频率。\n\n仍要开启吗？'
        );
        if (!ok) {
          els.chatAutoSendToggle.checked = false;
          return;
        }
      }
      queueSave();
    });
    els.chatWelcomeToggle.addEventListener('change', queueSave);
    els.chatVoiceToggle.addEventListener('change', function () {
      if (!els.chatVoiceToggle.checked && window.CarLiveVoice) {
        window.CarLiveVoice.cancelChatSpeech();
      }
      queueSave();
    });
    els.welcomeTemplate.addEventListener('change', function () { saveConfig(true); });
    [els.minIntervalSec, els.maxPerMinute, els.userCooldownSec].forEach(function (el) {
      el.addEventListener('change', function () { saveConfig(true); });
    });
    els.saveChatBtn.addEventListener('click', function () { saveConfig(false); });
    els.addRuleBtn.addEventListener('click', function () { openRuleDialog(null); });
    els.saveRuleBtn.addEventListener('click', saveRule);
    els.cancelRuleBtn.addEventListener('click', closeRuleDialog);
    els.closeRuleBtn.addEventListener('click', closeRuleDialog);
    els.ruleDialog.addEventListener('click', function (event) {
      if (event.target === els.ruleDialog) closeRuleDialog();
    });
    els.testWelcomeBtn.addEventListener('click', function () { simulate('welcome'); });
    els.testQuestionBtn.addEventListener('click', function () { simulate('chat'); });
    els.chatClearBtn.addEventListener('click', async function () {
      if (!window.confirm('清空当前互动记录？')) return;
      try {
        await fetchJSON('/api/chat/clear', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
        state.events = [];
        state.lastEventId = 0;
        renderEvents(true);
        toast('互动记录已清空。');
      } catch (_) {
        toast('清空失败。', 'error');
      }
    });
    els.openDouyinBtn.addEventListener('click', function () {
      window.open('https://live.douyin.com/', '_blank', 'noopener');
    });
    els.extHelpBtn.addEventListener('click', function () {
      els.extPathText.textContent = extensionPath();
      if (typeof els.extDialog.showModal === 'function') els.extDialog.showModal();
      else els.extDialog.setAttribute('open', '');
    });
    [els.closeExtBtn, els.extDoneBtn].forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof els.extDialog.close === 'function') els.extDialog.close();
        else els.extDialog.removeAttribute('open');
      });
    });
    els.extDialog.addEventListener('click', function (event) {
      if (event.target === els.extDialog) els.extDialog.close();
    });
    [els.copyExtensionPath, els.copyExtPathBtn2].forEach(function (button) {
      button.addEventListener('click', function () { copyText(extensionPath()); });
    });
    window.addEventListener('chisheng:model', function (event) {
      const name = event.detail && event.detail.name ? event.detail.name : '通用';
      els.chatModel.textContent = name;
      if (state.config && state.config.currentModel !== name) {
        state.config.currentModel = name;
        queueSave();
      }
    });
  }

  function startTimers() {
    stopTimers();
    state.timers.push(setInterval(refreshStatus, 3000));
    state.timers.push(setInterval(pollEvents, 1500));
  }

  function stopTimers() {
    state.timers.forEach(function (timer) { clearInterval(timer); });
    state.timers = [];
  }

  async function show() {
    state.visible = true;
    await refreshStatus();
    await loadConfig();
    await pollEvents();
    setModel(window.CarLiveModel || els.chatModel.textContent || '通用');
  }

  function hide() {
    state.visible = false;
  }

  function setModel(name) {
    els.chatModel.textContent = name || '通用';
    if (state.config && state.config.currentModel !== (name || '通用')) {
      state.config.currentModel = name || '通用';
      queueSave();
    }
  }

  async function init() {
    cache();
    bind();
    try {
      const health = await fetchJSON('/api/health');
      state.baseDir = health.baseDir || '';
    } catch (_) {
      state.baseDir = '';
    }
    await refreshStatus();
    await loadConfig();
    await pollEvents();
    state.voiceBootstrapped = true;
    startTimers();
  }

  window.CarLiveChat = {
    show: show,
    hide: hide,
    setModel: setModel,
    refresh: refreshStatus
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
