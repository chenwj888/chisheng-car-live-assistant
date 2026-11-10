'use strict';

const DEFAULTS = {
  baseUrl: '',
  roomId: '',
  debug: false,
  chatContainer: '.webcast-chatroom___list, [data-e2e="chatroom"], div[class*="chatroom"][class*="list"]',
  messageSelector: '.webcast-chatroom___item, [data-e2e="chat-message"], div[class*="chatroom"][class*="item"]',
  inputSelector: 'div[contenteditable="true"], textarea, [data-e2e="chat-input"]',
  sendSelector: '[data-e2e="chat-send"], button[class*="send"]'
};

const fields = ['baseUrl', 'roomId', 'chatContainer', 'messageSelector', 'inputSelector', 'sendSelector'];

function $(id) { return document.getElementById(id); }

function setStatus(text, kind) {
  const el = $('connStatus');
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function load() {
  chrome.storage.local.get(DEFAULTS, function (data) {
    fields.forEach(function (key) {
      $(key).value = data[key] || '';
    });
    $('debug').checked = Boolean(data.debug);
  });
}

function save() {
  const data = { debug: $('debug').checked };
  fields.forEach(function (key) {
    data[key] = $(key).value.trim();
  });
  chrome.storage.local.set(data, function () {
    setStatus('设置已保存。刷新抖音直播间页面后生效。', 'ok');
  });
}

function testConnection() {
  setStatus('正在连接本机软件…');
  chrome.runtime.sendMessage({
    type: 'car-live-api',
    path: '/api/chat/status',
    method: 'GET'
  }, function (response) {
    if (chrome.runtime.lastError) {
      setStatus('连接失败：' + chrome.runtime.lastError.message, 'err');
      return;
    }
    if (!response || !response.ok || !response.data || !response.data.ok) {
      setStatus('未连接。请先启动驰声软件，再点测试。\n' + (response && response.error ? response.error : ''), 'err');
      return;
    }
    const data = response.data;
    const config = data.config || {};
    setStatus(
      '已连接：' + (data.heartbeat && data.heartbeat.title ? data.heartbeat.title : '本机驰声软件') +
      '\n规则数量：' + ((config.rules && config.rules.length) || 0) +
      '｜自动发送：' + (config.autoSend ? '开启' : '关闭') +
      '\n扩展心跳：' + (data.connected ? '已连接' : '尚未收到（打开直播间页面后会自动发送）'),
      'ok'
    );
  });
}

$('saveBtn').addEventListener('click', save);
$('testBtn').addEventListener('click', testConnection);
$('resetSelectorsBtn').addEventListener('click', function () {
  ['chatContainer', 'messageSelector', 'inputSelector', 'sendSelector'].forEach(function (key) {
    $(key).value = DEFAULTS[key];
  });
  setStatus('已恢复默认选择器，记得点击“保存设置”。');
});
load();
