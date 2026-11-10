'use strict';

const PORTS = [8765, 8766, 8767, 8768, 8877];
let cachedBase = '';
let nextDiscoveryAt = 0;

async function fetchJSON(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs || 4000);
  try {
    const response = await fetch(url, Object.assign({
      cache: 'no-store',
      signal: controller.signal
    }, options || {}));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function findBase(force) {
  if (!force && cachedBase) return cachedBase;
  if (!force && Date.now() < nextDiscoveryAt) {
    throw new Error('正在等待本机软件启动');
  }
  const stored = await chrome.storage.local.get({ baseUrl: '' });
  const candidates = [];
  if (stored.baseUrl) candidates.push(String(stored.baseUrl).replace(/\/+$/, ''));
  PORTS.forEach(function (port) {
    const url = 'http://127.0.0.1:' + port;
    if (candidates.indexOf(url) === -1) candidates.push(url);
  });

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const data = await fetchJSON(candidates[i] + '/api/chat/status', null, 900);
      if (data && data.ok && data.app === 'chisheng-car-live') {
        cachedBase = candidates[i];
        nextDiscoveryAt = 0;
        return cachedBase;
      }
    } catch (_) {
      // 尝试下一个端口
    }
  }
  cachedBase = '';
  nextDiscoveryAt = Date.now() + 4000;
  throw new Error('未连接到驰声软件，请先启动软件');
}

async function callApi(path, method, body) {
  let base = await findBase(false);
  const doFetch = function () {
    const options = { method: method || 'GET' };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    return fetchJSON(base + path, options);
  };
  try {
    return await doFetch();
  } catch (err) {
    base = await findBase(true);
    return doFetch();
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || message.type !== 'car-live-api') return false;
  (async function () {
    try {
      const data = await callApi(message.path, message.method, message.body);
      sendResponse({ ok: true, data: data });
    } catch (err) {
      sendResponse({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  })();
  return true;
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.baseUrl) cachedBase = '';
});
