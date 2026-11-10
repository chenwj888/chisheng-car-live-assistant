(function () {
  'use strict';

  const Core = window.CarLiveCore;
  if (!Core) {
    document.body.innerHTML = '<p style="padding:40px;color:#fff;font-family:sans-serif">核心脚本加载失败，请确认 static/core.js 存在。</p>';
    return;
  }

  const STORAGE_KEY = 'chisheng.carLive.v1';
  const DEFAULT_SETTINGS = {
    mode: 'paragraph',
    rewrite: true,
    strength: 55,
    loop: true,
    jitter: true,
    gap: 0.8,
    engine: 'local',
    voiceURI: '',
    edgeVoice: 'zh-CN-XiaoxiaoNeural',
    azureVoice: 'zh-CN-XiaoxiaoNeural',
    azureKey: '',
    azureRegion: 'eastasia',
    azureStyle: '',
    volcAppId: '',
    volcToken: '',
    volcCluster: 'volcano_tts',
    volcVoice: 'zh_female_shuangkuaisisi_moon_bigtts',
    cosyKey: '',
    cosyWorkspace: '',
    cosyRegion: 'cn-beijing',
    cosyModel: 'cosyvoice-v3-flash',
    cosyVoice: 'longanyang',
    kokoroVoice: 'zf_001',
    outputDeviceId: '',
    musicVolume: 18,
    musicMode: 'random',
    autoKokoro: true,
    multiOrder: 'preset',
    generalIntro: '家人们，欢迎来到广汽上海锦仓店。我们1999年开业，地址在浦东高科西路1888号，广汽本田、广汽传祺都能看。新进来的家人先点点赞，左上角点个关注，转发给正在看车的朋友；有问题直接打在公屏上，我一条条回。到店可以试驾、算金融、做置换，具体优惠和现车以当天店内政策为准。',
    multiIntro: true,
    singleIntro: true,
    singleIntroText: '新进来的家人先点点赞，左上角点个关注，转发给正在看车的朋友；有问题直接打在公屏上，我一条条回。',
    multiModels: [],
    rate: 1,
    pitch: 0,
    volume: 1,
    protectedWords: ''
  };

  const DEFAULT_GENERAL_INTRO = '家人们，欢迎来到广汽上海锦仓店。我们店1999年开业，地址在上海市浦东新区高科西路1888号，广汽本田、广汽传祺都能看。新进来的家人先点点赞，左上角点个关注，转发给正在看车的朋友；有问题直接打在公屏上，我一条条回。到店可以试驾、算金融、做置换，具体优惠和现车以当天店内政策为准。';

  const EDGE_VOICES = [
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 · 女声', locale: 'zh-CN', gender: 'Female', desc: '自然亲和，适合日常口播' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊 · 女声', locale: 'zh-CN', gender: 'Female', desc: '年轻明亮，适合节奏轻快的直播' },
    { id: 'zh-CN-YunxiNeural', name: '云希 · 男声', locale: 'zh-CN', gender: 'Male', desc: '年轻清爽，适合车型讲解' },
    { id: 'zh-CN-YunjianNeural', name: '云健 · 男声', locale: 'zh-CN', gender: 'Male', desc: '浑厚有力，适合促销氛围' },
    { id: 'zh-CN-YunyangNeural', name: '云扬 · 男声', locale: 'zh-CN', gender: 'Male', desc: '新闻质感，稳重清晰' },
    { id: 'zh-CN-YunxiaNeural', name: '云夏 · 男声', locale: 'zh-CN', gender: 'Male', desc: '少年感，适合年轻车型' },
    { id: 'zh-CN-liaoning-XiaobeiNeural', name: '晓北 · 东北女声', locale: 'zh-CN', gender: 'Female', desc: '地域口音，亲切有记忆点' },
    { id: 'zh-CN-shaanxi-XiaoniNeural', name: '晓妮 · 陕西女声', locale: 'zh-CN', gender: 'Female', desc: '地域口音，适合本地直播' },
    { id: 'zh-HK-HiuGaaiNeural', name: '曉佳 · 粤语女声', locale: 'zh-HK', gender: 'Female', desc: '粤语口播' },
    { id: 'zh-HK-HiuMaanNeural', name: '曉曼 · 粤语女声', locale: 'zh-HK', gender: 'Female', desc: '粤语口播' },
    { id: 'zh-HK-WanLungNeural', name: '雲龍 · 粤语男声', locale: 'zh-HK', gender: 'Male', desc: '粤语口播' },
    { id: 'zh-TW-HsiaoChenNeural', name: '曉臻 · 台湾女声', locale: 'zh-TW', gender: 'Female', desc: '适合繁体或台湾腔内容' },
    { id: 'zh-TW-HsiaoYuNeural', name: '曉雨 · 台湾女声', locale: 'zh-TW', gender: 'Female', desc: '台湾腔' },
    { id: 'zh-TW-YunJheNeural', name: '雲哲 · 台湾男声', locale: 'zh-TW', gender: 'Male', desc: '台湾腔' }
  ];

  const AZURE_VOICES = [
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 · 女声', locale: 'zh-CN', gender: 'Female', desc: '自然亲和，Azure 常用直播音色' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊 · 女声', locale: 'zh-CN', gender: 'Female', desc: '年轻明亮' },
    { id: 'zh-CN-YunxiNeural', name: '云希 · 男声', locale: 'zh-CN', gender: 'Male', desc: '年轻清爽' },
    { id: 'zh-CN-YunjianNeural', name: '云健 · 男声', locale: 'zh-CN', gender: 'Male', desc: '浑厚有力' },
    { id: 'zh-CN-YunyangNeural', name: '云扬 · 男声', locale: 'zh-CN', gender: 'Male', desc: '新闻质感' },
    { id: 'zh-CN-YunxiaNeural', name: '云夏 · 男声', locale: 'zh-CN', gender: 'Male', desc: '少年感' }
  ];

  const VOLC_VOICES = [
    { id: 'zh_female_shuangkuaisisi_moon_bigtts', name: '爽快思思 · 女声', gender: 'Female', desc: '豆包常用女声' },
    { id: 'zh_female_wanqudashu_moon_bigtts', name: '湾区大叔 · 男声', gender: 'Male', desc: '成熟男声' },
    { id: 'zh_male_yangguangqingnian_moon_bigtts', name: '阳光青年 · 男声', gender: 'Male', desc: '年轻男声' },
    { id: 'zh_female_wanwanxiaohe_moon_bigtts', name: '湾湾小何 · 女声', gender: 'Female', desc: '亲切女声' },
    { id: 'zh_male_jingqiangkanye_moon_bigtts', name: '京腔侃爷 · 男声', gender: 'Male', desc: '京腔男声' }
  ];

  const COSY_VOICES = [
    { id: 'longanyang', name: '龙安洋 · 男声', gender: 'Male', desc: 'CosyVoice v3 常用' },
    { id: 'longxiaochun_v2', name: '龙小春 · 女声', gender: 'Female', desc: 'CosyVoice v2' },
    { id: 'longwan_v2', name: '龙婉 · 女声', gender: 'Female', desc: 'CosyVoice v2' },
    { id: 'longcheng_v2', name: '龙橙 · 男声', gender: 'Male', desc: 'CosyVoice v2' },
    { id: 'longhua_v2', name: '龙华 · 女声', gender: 'Female', desc: 'CosyVoice v2' },
    { id: 'longshu_v2', name: '龙书 · 男声', gender: 'Male', desc: 'CosyVoice v2' }
  ];

  const els = {};
  const state = {
    rawText: '',
    scripts: { common: '' },
    activeModel: 'common',
    edgeVoices: EDGE_VOICES.slice(),
    kokoroVoices: [],
    outputDevices: [],
    mediaAsked: false,
    packGenerating: false,
    multiSelected: [],
    multi: false,
    blockedWords: [],
    blockedReplacements: [],
    blockedPattern: null,
    blockedReplacementPattern: null,
    blockedReplacementMap: null,
    blocklistLoaded: false,
    blocklistUpdatedAt: 0,
    blocklistSaveTimer: null,
    blocklistDirty: false,
    kokoroTimer: null,
    kokoroAttempts: 0,
    serverRetryTimer: null,
    serverRetryCount: 0,
    musicTracks: [],
    musicAudio: null,
    musicIndex: -1,
    musicUploading: false,
    parsed: { text: '', paragraphs: [], sentences: [] },
    queue: [],
    current: -1,
    queueStale: false,
    playing: false,
    paused: false,
    inGap: false,
    finished: false,
    testing: false,
    round: 0,
    runId: 0,
    gapTimer: null,
    inputTimer: null,
    saveTimer: null,
    serverSaveTimer: null,
    saveStateTimer: null,
    currentUtterance: null,
    cancelCurrentUtterance: null,
    audioCtx: null,
    audioGain: null,
    audioSource: null,
    audioStopResolve: null,
    abortController: null,
    priorityActive: false,
    priorityQueue: [],
    priorityWasPlaying: false,
    priorityMode: 'none',
    priorityRestartIndex: -1,
    priorityResumeIndex: -1,
    priorityGeneration: 0,
    priorityUtterance: null,
    priorityUtteranceCancel: null,
    replyAudioCtx: null,
    replyAudioSource: null,
    replyAbort: null,
    replyStopResolve: null,
    audioCache: new Map(),
    voices: [],
    edgeWarned: false,
    consecutiveFailures: 0,
    server: { available: false, edgeTts: false, kokoroReady: false },
    playedMs: 0,
    resumeAt: null,
    wakeLock: null,
    clockTimer: null,
    settings: Object.assign({}, DEFAULT_SETTINGS)
  };

  const $ = function (id) { return document.getElementById(id); };

  function cacheElements() {
    [
      'scriptInput', 'importBtn', 'fileInput', 'sampleBtn', 'clearBtn', 'editorWrap', 'dropOverlay',
      'charCount', 'paraCount', 'sentCount', 'durationStat', 'saveState', 'saveText',
      'modelGroups', 'modelCurrent', 'modelHint', 'activeModelBadge', 'splitModelsBtn', 'useCommonBtn',
      'modeSelect', 'modeHint', 'gapSelect', 'rewriteToggle', 'loopToggle', 'jitterToggle',
      'strengthRange', 'strengthVal', 'strengthField', 'protectedInput',
      'buildPlaylistBtn', 'playPlaylistBtn', 'playPlaylistLabel', 'buildPlayBtn', 'buildBtn', 'queueCount', 'queueList', 'queueEmpty', 'staleBadge',
      'queueModel', 'downloadBtn', 'queueShuffleBtn', 'queueShuffleBtn2',
      'nowText', 'queuePos', 'progressBar', 'elapsed', 'remaining', 'playBtn', 'playUse',
      'prevBtn', 'nextBtn', 'stopBtn', 'testBtn', 'testLabel', 'playerCard', 'wave', 'playerModel', 'priorityBadge',
      'engineSelect', 'voiceSelect', 'voiceHint', 'naturalVoiceBtn',
      'azureConfig', 'azureKeyInput', 'azureRegionInput', 'azureStyleSelect',
      'volcConfig', 'volcAppIdInput', 'volcTokenInput', 'volcClusterInput', 'volcVoiceInput',
      'cosyConfig', 'cosyKeyInput', 'cosyWorkspaceInput', 'cosyRegionSelect', 'cosyModelSelect', 'cosyVoiceInput', 'rateRange', 'rateVal', 'pitchRange',
      'pitchVal', 'volumeRange', 'volumeVal', 'voiceTipText',
      'outputSelect', 'refreshOutputBtn', 'outputHint', 'packBtn', 'packState', 'autoKokoroToggle',
      'multiModels', 'multiAllBtn', 'multiClearBtn', 'multiBuildBtn', 'multiIntroToggle', 'multiPanel', 'multiGeneralText',
      'singleIntroToggle', 'singleIntroText',
      'blockedWordsInput', 'blockedSaveBtn', 'blockedUploadBtn', 'blockedFileInput', 'blockedState', 'blockedBtnCount',
      'blockedExportWordsBtn', 'blockedExportReplacementsBtn', 'blockedImportReplacementsBtn', 'blockedReplacementsFileInput',
      'blockedFromInput', 'blockedToInput', 'blockedAddBtn', 'blockedReplacementList',
      'musicState', 'musicPlayBtn', 'musicTitle', 'musicMeta', 'musicNextBtn',
      'musicVolume', 'musicVolumeVal', 'musicMode', 'musicAddBtn', 'musicClearBtn',
      'musicFileInput', 'musicList',
      'serverPill', 'engineMiniState', 'engineMiniText', 'exitBtn', 'helpBtn', 'topHelpBtn', 'blockedBtn', 'blockedPanel',
      'topEyebrow', 'topTitle', 'topSubtitle', 'scriptView', 'chatView',
      'navScript', 'navChat', 'navQueue',
      'toast', 'helpDialog', 'closeHelpBtn', 'helpDoneBtn'
    ].forEach(function (id) { els[id] = $(id); });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function hasScriptContent(scripts) {
    if (!scripts || typeof scripts !== 'object') return false;
    return Object.keys(scripts).some(function (id) {
      return typeof scripts[id] === 'string' && scripts[id].trim().length > 0;
    });
  }

  function chooseInitialState(localState, remoteState) {
    if (!remoteState || !remoteState.scripts) return localState;
    if (!localState || !localState.scripts) return remoteState;

    const localTime = Number(localState.updatedAt) || 0;
    const remoteTime = Number(remoteState.updatedAt) || 0;
    if (localTime && remoteTime) return remoteTime > localTime ? remoteState : localState;
    if (localTime && !remoteTime) return localState;
    if (!localTime && remoteTime) return remoteTime > 0 ? remoteState : localState;
    if (hasScriptContent(localState.scripts)) return localState;
    return remoteState;
  }

  async function readServerState() {
    if (location.protocol === 'file:') return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 700);
      const response = await fetch('/api/state', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return null;
      const data = await response.json();
      return data && data.state && data.state.scripts ? data.state : null;
    } catch (_) {
      return null;
    }
  }

  function postServerState(payload) {
    if (location.protocol === 'file:') return;
    clearTimeout(state.serverSaveTimer);
    state.serverSaveTimer = setTimeout(function () {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () { /* 离线或旧版服务不可用时，localStorage 仍然保留 */ });
    }, 450);
  }

  function isKnownModelId(id) {
    return id === Core.COMMON_MODEL.id || Core.CAR_MODELS.some(function (model) { return model.id === id; });
  }

  function modelById(id) {
    return Core.getModelById(id) || Core.COMMON_MODEL;
  }

  function modelName(id) {
    return modelById(id).name;
  }

  function normalizeScripts(input) {
    const scripts = { common: '' };
    if (!input || typeof input !== 'object') return scripts;
    Object.keys(input).forEach(function (id) {
      if (!isKnownModelId(id)) return;
      scripts[id] = typeof input[id] === 'string' ? input[id] : '';
    });
    return scripts;
  }

  function scriptText(id) {
    return state.scripts[id] || '';
  }

  function scriptCharCount(text) {
    return String(text || '').replace(/\s/g, '').length;
  }

  function parseBlockWords(raw) {
    const parts = Array.isArray(raw) ? raw : String(raw || '').replace(/^\uFEFF/, '').split(/[\n\r,，;；、]+/);
    const words = [];
    const seen = new Set();
    parts.forEach(function (item) {
      let word = String(item || '').trim().slice(0, 50);
      if (!word) return;
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      words.push(word);
    });
    return words.slice(0, 2000);
  }

  function parseBlockReplacements(raw) {
    let items = [];
    if (Array.isArray(raw)) items = raw;
    else if (typeof raw === 'string') items = raw.split(/[\n\r]+/);
    const replacements = [];
    const seen = new Set();
    items.forEach(function (item) {
      let from = '';
      let to = '';
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        from = String(item.from || item.word || '').trim();
        to = String(item.to || item.replacement || '').trim();
      } else if (Array.isArray(item) && item.length >= 2) {
        from = String(item[0] || '').trim();
        to = String(item[1] || '').trim();
      } else if (typeof item === 'string') {
        const match = item.trim().match(/^(.+?)\s*(?:=>|->|=|→|\t)\s*(.*)$/);
        if (match) {
          from = match[1].trim();
          to = match[2].trim();
        }
      }
      from = from.slice(0, 50);
      to = to.slice(0, 100);
      if (!from) return;
      const key = from.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      replacements.push({ from: from, to: to });
    });
    return replacements.slice(0, 2000);
  }

  function rebuildBlockedPattern() {
    const words = state.blockedWords.slice().sort(function (a, b) { return b.length - a.length; });
    state.blockedPattern = words.length
      ? new RegExp(words.map(function (word) { return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'gi')
      : null;
    const replacements = state.blockedReplacements.slice().sort(function (a, b) { return b.from.length - a.from.length; });
    state.blockedReplacementPattern = replacements.length
      ? new RegExp(replacements.map(function (item) { return item.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'gi')
      : null;
    state.blockedReplacementMap = {};
    replacements.forEach(function (item) {
      state.blockedReplacementMap[item.from.toLowerCase()] = item.to;
    });
  }

  function sanitizeBlocked(text) {
    let value = String(text || '');
    if (!value) return value;
    if (state.blockedReplacementPattern) {
      value = value.replace(state.blockedReplacementPattern, function (match) {
        return state.blockedReplacementMap[match.toLowerCase()] || '';
      });
    }
    if (state.blockedPattern) value = value.replace(state.blockedPattern, '');
    value = value.replace(/[ \t]+/g, ' ');
    value = value.replace(/\s+([，。！？；、,.!?;:])/g, '$1');
    value = value.replace(/([，。！？；、])\1+/g, '$1');
    value = value.replace(/^[\s，。！？；、,.!?;:]+/, '');
    value = value.replace(/[\s，。！？；、,.!?;:]+$/, '');
    return value.trim();
  }

  function renderBlockedReplacements() {
    if (!els.blockedReplacementList) return;
    els.blockedReplacementList.textContent = '';
    if (!state.blockedReplacements.length) {
      const empty = document.createElement('div');
      empty.className = 'blocked-replacement-empty';
      empty.textContent = '还没有高危替换规则，例如：绝对 → 非常';
      els.blockedReplacementList.appendChild(empty);
      return;
    }
    state.blockedReplacements.forEach(function (item, index) {
      const row = document.createElement('div');
      row.className = 'blocked-replacement-row';

      const from = document.createElement('input');
      from.type = 'text';
      from.value = item.from;
      from.placeholder = '高危词';
      from.addEventListener('input', function () { state.blockedReplacements[index].from = from.value; queueBlocklistSave(); });

      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';

      const to = document.createElement('input');
      to.type = 'text';
      to.value = item.to;
      to.placeholder = '替换词';
      to.addEventListener('input', function () { state.blockedReplacements[index].to = to.value; queueBlocklistSave(); });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'blocked-replacement-del';
      del.textContent = '删除';
      del.addEventListener('click', function () {
        state.blockedReplacements.splice(index, 1);
        renderBlockedReplacements();
        updateBlockedCounts();
        queueBlocklistSave();
      });

      row.appendChild(from);
      row.appendChild(arrow);
      row.appendChild(to);
      row.appendChild(del);
      els.blockedReplacementList.appendChild(row);
    });
  }

  function updateBlockedCounts() {
    const total = state.blockedWords.length + state.blockedReplacements.length;
    if (els.blockedState) els.blockedState.textContent = '绝对 ' + state.blockedWords.length + ' · 替换 ' + state.blockedReplacements.length + ' · 自动保存';
    if (els.blockedBtnCount) {
      els.blockedBtnCount.hidden = !total;
      els.blockedBtnCount.textContent = total ? String(total) : '';
    }
  }

  function updateBlockedUI() {
    updateBlockedCounts();
    if (els.blockedWordsInput && document.activeElement !== els.blockedWordsInput) {
      els.blockedWordsInput.value = state.blockedWords.join('\n');
    }
    renderBlockedReplacements();
  }

  function readLocalBlocklist() {
    try {
      const raw = localStorage.getItem('chisheng.blocklist.v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { words: parseBlockWords(parsed), replacements: [], updatedAt: 0 };
      }
      if (parsed && typeof parsed === 'object') {
        return {
          words: parseBlockWords(parsed.words || []),
          replacements: parseBlockReplacements(parsed.replacements || []),
          updatedAt: Number(parsed.updatedAt || 0)
        };
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function writeLocalBlocklist(words, replacements, updatedAt) {
    try {
      localStorage.setItem('chisheng.blocklist.v1', JSON.stringify({
        words: words,
        replacements: replacements,
        updatedAt: updatedAt
      }));
    } catch (_) { /* ignore */ }
  }

  function applyBlocklistState(words, replacements, updatedAt, render) {
    state.blockedWords = parseBlockWords(words);
    state.blockedReplacements = parseBlockReplacements(replacements);
    state.blocklistUpdatedAt = Number(updatedAt || Date.now());
    rebuildBlockedPattern();
    writeLocalBlocklist(state.blockedWords, state.blockedReplacements, state.blocklistUpdatedAt);
    if (render === false) updateBlockedCounts();
    else updateBlockedUI();
  }

  async function pushBlocklist(words, replacements, updatedAt) {
    try {
      const response = await fetch('/api/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: words,
          replacements: replacements,
          updatedAt: updatedAt
        })
      });
      if (!response.ok) throw new Error('save failed');
      const data = await response.json();
      const stamp = Number((data && data.updatedAt) || updatedAt || Date.now());
      state.blocklistUpdatedAt = stamp;
      if (data && Array.isArray(data.words)) {
        state.blockedWords = parseBlockWords(data.words);
        state.blockedReplacements = parseBlockReplacements(data.replacements || []);
        rebuildBlockedPattern();
      }
      writeLocalBlocklist(state.blockedWords, state.blockedReplacements, stamp);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadBlocklist() {
    const local = readLocalBlocklist();
    let server = null;
    try {
      const response = await fetch('/api/blocklist', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          server = {
            words: parseBlockWords(data.words || []),
            replacements: parseBlockReplacements(data.replacements || []),
            updatedAt: Number(data.updatedAt || 0)
          };
        }
      }
    } catch (_) { /* 离线时使用本页缓存 */ }

    let words = [];
    let replacements = [];
    let updatedAt = 0;
    let needsPush = false;

    if (!server) {
      if (local) {
        words = local.words;
        replacements = local.replacements;
        updatedAt = local.updatedAt || Date.now();
        needsPush = true;
      }
    } else if (local && (
      local.updatedAt > server.updatedAt ||
      (!server.words.length && local.words.length)
    )) {
      words = local.words;
      replacements = local.updatedAt > server.updatedAt ? local.replacements : server.replacements;
      updatedAt = Math.max(local.updatedAt, Date.now());
      needsPush = true;
    } else {
      words = server.words;
      replacements = server.replacements;
      updatedAt = server.updatedAt;
    }

    applyBlocklistState(words, replacements, updatedAt, true);
    state.blocklistLoaded = true;
    if (needsPush) {
      void pushBlocklist(words, replacements, updatedAt);
    }
  }

  function queueBlocklistSave() {
    const words = parseBlockWords(els.blockedWordsInput ? els.blockedWordsInput.value : state.blockedWords);
    const replacements = parseBlockReplacements(state.blockedReplacements);
    state.blockedWords = words;
    state.blockedReplacements = replacements;
    state.blocklistUpdatedAt = Date.now();
    state.blocklistDirty = true;
    writeLocalBlocklist(words, replacements, state.blocklistUpdatedAt);
    clearTimeout(state.blocklistSaveTimer);
    state.blocklistSaveTimer = setTimeout(function () {
      state.blocklistSaveTimer = null;
      void saveBlocklist({ silent: true });
    }, 700);
  }

  function flushBlocklist() {
    if (!state.blocklistDirty) return;
    const words = parseBlockWords(els.blockedWordsInput ? els.blockedWordsInput.value : state.blockedWords);
    const replacements = parseBlockReplacements(state.blockedReplacements);
    const stamp = Date.now();
    state.blockedWords = words;
    state.blockedReplacements = replacements;
    state.blocklistUpdatedAt = stamp;
    writeLocalBlocklist(words, replacements, stamp);
    state.blocklistDirty = false;
    const body = JSON.stringify({ words: words, replacements: replacements, updatedAt: stamp });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/blocklist', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/blocklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        });
      }
    } catch (_) { /* ignore */ }
  }

  function addBlockedReplacement() {
    const from = els.blockedFromInput ? els.blockedFromInput.value.trim() : '';
    const to = els.blockedToInput ? els.blockedToInput.value.trim() : '';
    if (!from) {
      toast('请先填写高危词。', 'error', 2600);
      return;
    }
    if (!to) {
      toast('请填写替换词，例如“绝对”替换成“非常”。', 'error', 3000);
      return;
    }
    const existing = state.blockedReplacements.find(function (item) { return item.from.toLowerCase() === from.toLowerCase(); });
    if (existing) existing.to = to;
    else state.blockedReplacements.push({ from: from, to: to });
    if (els.blockedFromInput) els.blockedFromInput.value = '';
    if (els.blockedToInput) els.blockedToInput.value = '';
    renderBlockedReplacements();
    updateBlockedCounts();
    queueBlocklistSave();
    if (els.blockedFromInput) els.blockedFromInput.focus();
  }

  async function saveBlocklist(options) {
    const opts = options || {};
    const words = parseBlockWords(els.blockedWordsInput ? els.blockedWordsInput.value : state.blockedWords);
    const replacements = parseBlockReplacements(state.blockedReplacements);
    const stamp = Date.now();
    applyBlocklistState(words, replacements, stamp, false);
    clearTimeout(state.blocklistSaveTimer);
    state.blocklistSaveTimer = null;
    const ok = await pushBlocklist(words, replacements, stamp);
    state.blocklistDirty = false;
    if (!opts.silent) {
      if (ok) {
        updateBlockedUI();
        toast('已保存：绝对 ' + state.blockedWords.length + ' 个 · 替换 ' + state.blockedReplacements.length + ' 条。', 'success', 3200);
      } else {
        toast('已保存在本机浏览器，但软件目录同步失败；刷新后会自动恢复并重试。', 'error', 4600);
      }
    }
  }

  async function uploadBlockedFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const words = parseBlockWords(els.blockedWordsInput ? els.blockedWordsInput.value : '');
      const replacements = state.blockedReplacements.slice();
      lines.forEach(function (line) {
        const value = line.trim();
        if (!value) return;
        const match = value.match(/^(.+?)\s*(?:=>|->|=|→|\t)\s*(.*)$/);
        if (match) {
          const from = match[1].trim();
          const to = match[2].trim();
          if (!from) return;
          const existing = replacements.find(function (item) { return item.from.toLowerCase() === from.toLowerCase(); });
          if (existing) existing.to = to;
          else replacements.push({ from: from, to: to });
        } else {
          parseBlockWords(value).forEach(function (word) {
            if (!words.some(function (item) { return item.toLowerCase() === word.toLowerCase(); })) words.push(word);
          });
        }
      });
      if (els.blockedWordsInput) els.blockedWordsInput.value = words.join('\n');
      state.blockedWords = words;
      state.blockedReplacements = replacements;
      await saveBlocklist();
    } catch (_) {
      toast('禁用词文件读取失败。', 'error', 3200);
    }
  }

  function downloadTextFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function dateStamp() {
    const now = new Date();
    return String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function exportBlockedWords() {
    const words = parseBlockWords(els.blockedWordsInput ? els.blockedWordsInput.value : '');
    if (!words.length) {
      toast('还没有绝对禁用词可以导出。', '', 2600);
      return;
    }
    downloadTextFile('绝对禁用词-' + dateStamp() + '.txt', '\uFEFF' + words.join('\r\n') + '\r\n', 'text/plain;charset=utf-8');
    toast('已导出 ' + words.length + ' 个绝对禁用词。', 'success', 2600);
  }

  function exportReplacementTable() {
    const rows = parseBlockReplacements(state.blockedReplacements);
    if (!rows.length) {
      toast('还没有高危替换规则可以导出。', '', 2600);
      return;
    }
    const lines = ['高危词,替换词'];
    rows.forEach(function (item) { lines.push(csvCell(item.from) + ',' + csvCell(item.to)); });
    downloadTextFile('高危替换表-' + dateStamp() + '.csv', '\uFEFF' + lines.join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
    toast('已导出 ' + rows.length + ' 条高危替换规则。', 'success', 2600);
  }

  function parseCsvRows(text) {
    const value = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      if (quoted) {
        if (ch === '"' && value[i + 1] === '"') { field += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter(function (item) { return item.some(function (cell) { return String(cell).trim(); }); });
  }

  async function importReplacementTable(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (!rows.length) {
        toast('替换表是空的。', 'error', 2600);
        return;
      }
      if (/高危|原词|替换词|替换为/.test(String(rows[0][0] || '')) && /替换|替换为/.test(String(rows[0][1] || ''))) {
        rows.shift();
      }
      const pairs = [];
      rows.forEach(function (row) {
        if (row.length >= 2) {
          const from = String(row[0] || '').trim();
          const to = String(row[1] || '').trim();
          if (from) pairs.push({ from: from, to: to });
        } else {
          const line = String(row[0] || '').trim();
          const parsed = parseBlockReplacements([line]);
          if (parsed.length) pairs.push(parsed[0]);
        }
      });
      const replacements = parseBlockReplacements(pairs);
      if (!replacements.length) {
        toast('没有识别到替换规则。表格需要两列：高危词、替换词。', 'error', 4200);
        return;
      }
      if (!window.confirm('导入会用文件中的 ' + replacements.length + ' 条规则替换当前高危替换表，是否继续？')) return;
      state.blockedReplacements = replacements;
      renderBlockedReplacements();
      updateBlockedCounts();
      await saveBlocklist();
      toast('已导入 ' + replacements.length + ' 条高危替换规则。', 'success', 3000);
    } catch (_) {
      toast('替换表读取失败，请检查 CSV 格式。', 'error', 3200);
    }
  }

  function applyBlockedToItems(items) {
    const output = [];
    (items || []).forEach(function (item) {
      const text = sanitizeBlocked(item.text);
      if (!text) return;
      let parts = (item.parts || []).map(function (part) {
        return { text: sanitizeBlocked(part.text), changed: Boolean(part.changed) };
      }).filter(function (part) { return part.text; });
      const partsText = parts.map(function (part) { return part.text; }).join('');
      if (!parts.length || partsText !== text) {
        parts = [{ text: text, changed: Number(item.changes || 0) > 0 }];
      }
      output.push(Object.assign({}, item, { text: text, parts: parts }));
    });
    return output;
  }

  function generalIntroText() {
    return String(state.settings.generalIntro || DEFAULT_GENERAL_INTRO).trim();
  }

  function singleIntroText() {
    return String(state.settings.singleIntroText || '').trim();
  }

  function initMultiSelection() {
    const valid = (state.settings.multiModels || []).filter(function (id) {
      return id !== 'common' && isKnownModelId(id);
    });
    if (valid.length) {
      state.multiSelected = valid.slice();
      return;
    }
    const active = state.activeModel !== 'common' ? state.activeModel : null;
    const firstWithScript = Core.CAR_MODELS.find(function (model) { return scriptText(model.id).trim(); });
    state.multiSelected = active ? [active] : (firstWithScript ? [firstWithScript.id] : []);
  }

  function syncMultiSelection() {
    state.settings.multiModels = state.multiSelected.slice();
    persist();
  }

  function renderMultiModels() {
    if (!els.multiModels) return;
    els.multiModels.textContent = '';
    Core.CAR_BRANDS.forEach(function (brand) {
      const group = document.createElement('div');
      group.className = 'multi-brand';
      const label = document.createElement('span');
      label.className = 'multi-brand-label';
      label.textContent = brand.name;
      const row = document.createElement('div');
      row.className = 'multi-brand-models';
      brand.models.forEach(function (model) {
        const button = document.createElement('button');
        const hasText = Boolean(scriptText(model.id).trim());
        button.type = 'button';
        button.className = 'multi-chip' + (state.multiSelected.includes(model.id) ? ' active' : '') + (hasText ? '' : ' empty');
        button.textContent = model.name;
        button.title = hasText ? '加入多车型清单' : '这个车型还没有讲稿';
        button.addEventListener('click', function () {
          if (state.multiSelected.includes(model.id)) {
            state.multiSelected = state.multiSelected.filter(function (id) { return id !== model.id; });
          } else {
            state.multiSelected.push(model.id);
          }
          syncMultiSelection();
          renderMultiModels();
        });
        row.appendChild(button);
      });
      group.appendChild(label);
      group.appendChild(row);
      els.multiModels.appendChild(group);
    });
    if (els.multiBuildBtn) {
      els.multiBuildBtn.disabled = !state.multiSelected.some(function (id) { return scriptText(id).trim(); });
    }
    updatePlaylistActions();
  }

  function hasAnyScript() {
    return Object.keys(state.scripts).some(function (id) {
      return scriptCharCount(state.scripts[id]) > 0;
    });
  }

  function modelDisplayCount(id) {
    const count = scriptCharCount(scriptText(id));
    return count ? count + ' 字' : '未录入';
  }

  function normalizeSettings(input) {
    const next = Object.assign({}, DEFAULT_SETTINGS);
    if (!input || typeof input !== 'object') return next;
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      if (input[key] !== undefined && input[key] !== null) next[key] = input[key];
    });
    if (!Core.MODES[next.mode]) next.mode = DEFAULT_SETTINGS.mode;
    next.rewrite = Boolean(next.rewrite);
    next.loop = Boolean(next.loop);
    next.jitter = Boolean(next.jitter);
    next.strength = clamp(Number(next.strength) || 0, 0, 100);
    next.gap = clamp(Number(next.gap) || 0, 0, 3);
    next.rate = clamp(Number(next.rate) || 1, 0.7, 1.3);
    next.pitch = clamp(Number(next.pitch) || 0, -30, 30);
    next.volume = clamp(Number(next.volume) || 0, 0, 1);
    if (!['local', 'edge', 'azure', 'volcengine', 'cosyvoice', 'kokoro'].includes(next.engine)) next.engine = 'local';
    next.protectedWords = String(next.protectedWords || '');
    next.edgeVoice = String(next.edgeVoice || DEFAULT_SETTINGS.edgeVoice);
    next.azureVoice = String(next.azureVoice || DEFAULT_SETTINGS.azureVoice);
    next.azureKey = String(next.azureKey || '').trim();
    next.azureRegion = String(next.azureRegion || DEFAULT_SETTINGS.azureRegion).trim().toLowerCase();
    next.azureStyle = String(next.azureStyle || '').trim();
    next.volcAppId = String(next.volcAppId || '').trim();
    next.volcToken = String(next.volcToken || '').trim();
    next.volcCluster = String(next.volcCluster || DEFAULT_SETTINGS.volcCluster).trim() || 'volcano_tts';
    next.volcVoice = String(next.volcVoice || DEFAULT_SETTINGS.volcVoice).trim();
    next.cosyKey = String(next.cosyKey || '').trim();
    next.cosyWorkspace = String(next.cosyWorkspace || '').trim();
    next.cosyRegion = String(next.cosyRegion || DEFAULT_SETTINGS.cosyRegion).trim().toLowerCase();
    next.cosyModel = String(next.cosyModel || DEFAULT_SETTINGS.cosyModel).trim();
    next.cosyVoice = String(next.cosyVoice || DEFAULT_SETTINGS.cosyVoice).trim();
    next.kokoroVoice = String(next.kokoroVoice || DEFAULT_SETTINGS.kokoroVoice);
    next.voiceURI = String(next.voiceURI || '');
    next.outputDeviceId = String(next.outputDeviceId || '');
    next.musicVolume = clamp(Number(next.musicVolume == null ? 18 : next.musicVolume), 0, 100);
    next.musicMode = next.musicMode === 'sequential' ? 'sequential' : 'random';
    next.autoKokoro = next.autoKokoro !== false;
    if (['edge', 'azure', 'volcengine', 'cosyvoice'].includes(next.engine)) next.autoKokoro = false;
    next.multiOrder = next.multiOrder === 'shuffle' ? 'shuffle' : 'preset';
    next.multiIntro = next.multiIntro !== false;
    next.singleIntro = next.singleIntro !== false;
    next.singleIntroText = String(next.singleIntroText || DEFAULT_SETTINGS.singleIntroText);
    next.multiModels = Array.isArray(next.multiModels) ? next.multiModels.filter(function (id) { return typeof id === 'string' && isKnownModelId(id) && id !== 'common'; }) : [];
    next.generalIntro = String(next.generalIntro || DEFAULT_GENERAL_INTRO);
    return next;
  }

  function toast(message, type, duration) {
    if (!els.toast) return;
    clearTimeout(els.toast._hideTimer);
    els.toast.textContent = message;
    els.toast.className = 'toast show' + (type ? ' ' + type : '');
    els.toast._hideTimer = setTimeout(function () {
      els.toast.className = 'toast' + (type ? ' ' + type : '');
    }, duration || 2800);
  }

  function setSaveState(mode) {
    if (!els.saveState || !els.saveText) return;
    clearTimeout(state.saveStateTimer);
    if (mode === 'saving') {
      els.saveState.classList.add('saving');
      els.saveText.textContent = '正在保存…';
      return;
    }
    els.saveState.classList.remove('saving');
    els.saveText.textContent = '已自动保存';
    state.saveStateTimer = setTimeout(function () {
      els.saveState.classList.remove('saving');
      els.saveText.textContent = '已自动保存';
    }, 1600);
  }

  function persist(immediate, options) {
    const opts = options || {};
    setSaveState('saving');
    clearTimeout(state.saveTimer);
    const write = function () {
      try {
        const payload = {
          version: 2,
          scripts: state.scripts,
          activeModel: state.activeModel,
          rawText: state.rawText,
          settings: state.settings,
          updatedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        if (opts.server !== false) postServerState(payload);
        setSaveState('saved');
      } catch (_) {
        if (els.saveText) els.saveText.textContent = '本地存储不可用';
        els.saveState.classList.remove('saving');
      }
    };
    if (immediate) write();
    else state.saveTimer = setTimeout(write, 350);
  }

  function fillRange(el) {
    if (!el) return;
    const min = Number(el.min) || 0;
    const max = Number(el.max) || 100;
    const value = Number(el.value) || 0;
    const percent = ((value - min) / (max - min)) * 100;
    el.style.setProperty('--fill', percent + '%');
  }

  function updateStrengthUI() {
    const enabled = state.settings.rewrite;
    els.strengthField.classList.toggle('disabled', !enabled);
    els.strengthVal.textContent = Math.round(state.settings.strength) + '%';
    fillRange(els.strengthRange);
  }

  function updateVoiceLabels() {
    els.rateVal.textContent = Number(state.settings.rate).toFixed(2) + '×';
    const pitch = Number(state.settings.pitch);
    els.pitchVal.textContent = (pitch > 0 ? '+' : '') + pitch;
    els.volumeVal.textContent = Math.round(state.settings.volume * 100) + '%';
  }

  function applySettingsToUI() {
    els.modeSelect.value = state.settings.mode;
    els.modeHint.textContent = Core.MODES[state.settings.mode].hint;
    els.gapSelect.value = String(state.settings.gap);
    els.rewriteToggle.checked = state.settings.rewrite;
    els.loopToggle.checked = state.settings.loop;
    els.jitterToggle.checked = state.settings.jitter;
    els.strengthRange.value = String(state.settings.strength);
    els.protectedInput.value = state.settings.protectedWords;
    els.rateRange.value = String(state.settings.rate);
    els.pitchRange.value = String(state.settings.pitch);
    els.volumeRange.value = String(state.settings.volume);
    els.engineSelect.value = state.settings.engine;
    if (els.azureKeyInput) els.azureKeyInput.value = state.settings.azureKey;
    if (els.azureRegionInput) els.azureRegionInput.value = state.settings.azureRegion;
    if (els.azureStyleSelect) els.azureStyleSelect.value = state.settings.azureStyle;
    if (els.volcAppIdInput) els.volcAppIdInput.value = state.settings.volcAppId;
    if (els.volcTokenInput) els.volcTokenInput.value = state.settings.volcToken;
    if (els.volcClusterInput) els.volcClusterInput.value = state.settings.volcCluster;
    if (els.volcVoiceInput) els.volcVoiceInput.value = state.settings.volcVoice;
    if (els.cosyKeyInput) els.cosyKeyInput.value = state.settings.cosyKey;
    if (els.cosyWorkspaceInput) els.cosyWorkspaceInput.value = state.settings.cosyWorkspace;
    if (els.cosyRegionSelect) els.cosyRegionSelect.value = state.settings.cosyRegion;
    if (els.cosyModelSelect) els.cosyModelSelect.value = state.settings.cosyModel;
    if (els.cosyVoiceInput) els.cosyVoiceInput.value = state.settings.cosyVoice;
    if (els.musicVolume) els.musicVolume.value = String(state.settings.musicVolume);
    if (els.musicVolumeVal) els.musicVolumeVal.textContent = Math.round(state.settings.musicVolume) + '%';
    if (els.musicMode) els.musicMode.value = state.settings.musicMode;
    if (els.autoKokoroToggle) els.autoKokoroToggle.checked = state.settings.autoKokoro;
    if (els.multiIntroToggle) els.multiIntroToggle.checked = state.settings.multiIntro;
    if (els.multiGeneralText) els.multiGeneralText.value = state.settings.generalIntro;
    if (els.singleIntroToggle) els.singleIntroToggle.checked = state.settings.singleIntro;
    if (els.singleIntroText) els.singleIntroText.value = state.settings.singleIntroText;
    document.querySelectorAll('input[name="multiOrder"]').forEach(function (radio) {
      radio.checked = radio.value === state.settings.multiOrder;
    });
    updateStrengthUI();
    updateVoiceLabels();
    [els.rateRange, els.pitchRange, els.volumeRange].forEach(fillRange);
  }

  function buildModeOptions() {
    els.modeSelect.textContent = '';
    Object.keys(Core.MODES).forEach(function (key) {
      const mode = Core.MODES[key];
      const option = document.createElement('option');
      option.value = key;
      option.textContent = mode.label;
      els.modeSelect.appendChild(option);
    });
    els.modeSelect.value = state.settings.mode;
  }

  function refreshParsed() {
    state.parsed = Core.parseScript(state.rawText);
    updateStats();
  }

  function updateStats() {
    const stats = Core.getStats(state.parsed);
    els.charCount.textContent = String(stats.chars);
    els.paraCount.textContent = String(stats.paragraphs);
    els.sentCount.textContent = String(stats.sentences);
    els.durationStat.textContent = Core.formatDuration(
      Core.estimateDuration(state.parsed.text, state.settings.rate)
    );
  }

  function buildModelPicker() {
    els.modelGroups.textContent = '';

    Core.CAR_BRANDS.forEach(function (brand) {
      const group = document.createElement('div');
      group.className = 'model-group';
      group.dataset.brand = brand.id;

      const label = document.createElement('span');
      label.className = 'model-brand-label';
      label.textContent = brand.name;

      const chips = document.createElement('div');
      chips.className = 'model-chips';
      brand.models.forEach(function (model) {
        chips.appendChild(createModelChip(model.id));
      });

      group.appendChild(label);
      group.appendChild(chips);
      els.modelGroups.appendChild(group);
    });

    const commonGroup = document.createElement('div');
    commonGroup.className = 'model-group';
    commonGroup.dataset.brand = 'common';
    const commonLabel = document.createElement('span');
    commonLabel.className = 'model-brand-label';
    commonLabel.textContent = '其他';
    const commonChips = document.createElement('div');
    commonChips.className = 'model-chips';
    commonChips.appendChild(createModelChip(Core.COMMON_MODEL.id));
    commonGroup.appendChild(commonLabel);
    commonGroup.appendChild(commonChips);
    els.modelGroups.appendChild(commonGroup);
  }

  function createModelChip(id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'model-chip';
    button.dataset.model = id;
    button.setAttribute('aria-pressed', 'false');

    const dot = document.createElement('i');
    dot.className = 'model-dot';
    const name = document.createElement('span');
    name.textContent = modelName(id);

    button.appendChild(dot);
    button.appendChild(name);
    button.addEventListener('click', function () { switchModel(id); });
    return button;
  }

  function updateModelUI() {
    if (!els.modelGroups) return;
    const activeId = state.activeModel;
    const activeScript = scriptText(activeId);
    const count = scriptCharCount(activeScript);
    const name = modelName(activeId);

    els.activeModelBadge.textContent = name;
    els.modelCurrent.textContent = name + (count ? ' · ' + count + ' 字' : ' · 未录入');
    els.queueModel.textContent = state.multi && state.queue.length ? '多车型' : name;
    els.playerModel.textContent = state.queue[state.current] && state.queue[state.current].modelName
      ? state.queue[state.current].modelName
      : name;
    els.splitModelsBtn.disabled = !String(els.scriptInput.value || '').trim();

    const commonAvailable = activeId !== Core.COMMON_MODEL.id && !activeScript.trim() && scriptText(Core.COMMON_MODEL.id).trim();
    els.useCommonBtn.hidden = !commonAvailable;

    if (commonAvailable) {
      els.modelHint.textContent = '当前车型还没有讲稿，可先使用通用稿，或粘贴该车型话术。';
    } else if (!activeScript.trim()) {
      els.modelHint.textContent = '还没有「' + name + '」的讲稿，粘贴后会自动保存到该车型。';
    } else {
      els.modelHint.textContent = '支持【雅阁】、雅阁：、## 雅阁 等车型标题自动拆分。';
    }

    const placeholder = activeScript.trim()
      ? '当前车型：' + name + '。修改后会自动保存；支持 .txt / .md / .docx 导入。'
      : '还没有「' + name + '」的讲稿。\n\n粘贴该车型话术，或导入包含【雅阁】【奥德赛】等标题的文档。';
    els.scriptInput.placeholder = placeholder;

    els.modelGroups.querySelectorAll('.model-chip').forEach(function (chip) {
      const id = chip.dataset.model;
      const chipCount = scriptCharCount(scriptText(id));
      const active = id === activeId;
      chip.classList.toggle('active', active);
      chip.classList.toggle('has-text', chipCount > 0);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      chip.title = modelName(id) + ' · ' + (chipCount ? chipCount + ' 字' : '未录入');
    });

    window.dispatchEvent(new CustomEvent('chisheng:model', { detail: { name: name } }));
    window.CarLiveModel = name;
  }

  function activateModel(id, options) {
    const opts = options || {};
    if (!isKnownModelId(id)) return;
    if (!opts.skipSave && state.activeModel) {
      state.scripts[state.activeModel] = els.scriptInput.value;
    }

    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    state.queue = [];
    state.current = -1;
    state.activeModel = id;
    state.rawText = scriptText(id);
    els.scriptInput.value = state.rawText;
    refreshParsed();
    clearStale();
    renderAll();
    updateModelUI();
    persist(true);

    if (!opts.silent) {
      if (state.rawText.trim()) {
        toast('已切换到「' + modelName(id) + '」，共 ' + scriptCharCount(state.rawText) + ' 字。', 'success', 2200);
      } else {
        toast('「' + modelName(id) + '」还没有讲稿，粘贴后会自动保存。', '', 2600);
      }
    }
  }

  function switchModel(id) {
    if (id === state.activeModel) return;
    activateModel(id);
  }

  // 兼容旧的无车型版本：持久化状态里只有 rawText 时归入“通用”。
  function hydrateScripts(saved) {
    if (saved && saved.scripts && typeof saved.scripts === 'object') {
      state.scripts = normalizeScripts(saved.scripts);
      if (isKnownModelId(saved.activeModel)) {
        state.activeModel = saved.activeModel;
      } else {
        const firstFilled = Core.CAR_MODELS.find(function (model) {
          return scriptCharCount(state.scripts[model.id]) > 0;
        });
        state.activeModel = firstFilled ? firstFilled.id : Core.COMMON_MODEL.id;
      }
      return;
    }
    if (saved && typeof saved.rawText === 'string') {
      state.scripts = { common: saved.rawText };
      state.activeModel = Core.COMMON_MODEL.id;
      return;
    }
    state.scripts = { common: Core.SAMPLE_SCRIPT };
    state.activeModel = Core.COMMON_MODEL.id;
  }

  function applyDetectedSections(result, options) {
    const opts = options || {};
    const detected = result.detected.filter(function (id) {
      return isKnownModelId(id) && Boolean(result.sections[id]);
    });
    if (!detected.length) {
      toast('没有识别到有正文的车型标题。请用【雅阁】、雅阁：或 ## 雅阁 这样的标题分段。', 'error', 4600);
      return false;
    }

    if (opts.rebuildAll) {
      if (opts.confirmRebuild && hasAnyScript() && !window.confirm(
        '文档中检测到 ' + detected.length + ' 个车型。\n\n导入会按文档重建车型讲稿库，现有车型讲稿会被替换（未出现在文档中的车型也会清空）。\n\n继续吗？'
      )) {
        return false;
      }
      const next = { common: result.sections.common || '' };
      detected.forEach(function (id) { next[id] = result.sections[id]; });
      state.scripts = next;
    } else {
      if (opts.confirmMerge && hasAnyScript() && !window.confirm(
        '将更新检测到的 ' + detected.length + ' 个车型，其他车型的讲稿会保留。\n\n继续拆分吗？'
      )) {
        return false;
      }
      if (opts.clearSource) {
        if (state.activeModel === Core.COMMON_MODEL.id) {
          state.scripts.common = result.sections.common || '';
        } else if (detected.indexOf(state.activeModel) === -1) {
          state.scripts[state.activeModel] = '';
        }
      }
      detected.forEach(function (id) { state.scripts[id] = result.sections[id]; });
    }

    const first = detected[0];
    activateModel(first, { skipSave: true, silent: true });
    toast(
      '已拆分 ' + detected.length + ' 个车型：' + detected.map(modelName).join('、') + '。',
      'success',
      4600
    );
    return true;
  }

  function splitCurrentText() {
    const result = Core.splitByModels(els.scriptInput.value);
    if (!result.hasHeadings || !result.detected.length) {
      toast('没有识别到车型标题。请用【雅阁】、雅阁：或 ## 雅阁 这样的标题分段后重试。', 'error', 4600);
      return;
    }
    applyDetectedSections(result, { confirmMerge: true, clearSource: true });
  }

  function useCommonScript() {
    if (state.activeModel === Core.COMMON_MODEL.id) return;
    const common = scriptText(Core.COMMON_MODEL.id);
    if (!common.trim()) {
      toast('通用讲稿还是空的。', 'error');
      return;
    }
    state.scripts[state.activeModel] = common;
    state.rawText = common;
    els.scriptInput.value = common;
    refreshParsed();
    clearStale();
    renderAll();
    updateModelUI();
    persist(true);
    toast('已把通用讲稿复制到「' + modelName(state.activeModel) + '」。', 'success');
  }

  function markQueueStale() {
    if (!state.queue.length) return;
    state.queueStale = true;
    if (els.staleBadge) els.staleBadge.hidden = false;
  }

  function clearStale() {
    state.queueStale = false;
    if (els.staleBadge) els.staleBadge.hidden = true;
  }

  function renderParts(container, parts) {
    container.textContent = '';
    (parts || []).forEach(function (part) {
      if (part.changed) {
        const mark = document.createElement('mark');
        mark.className = 'changed';
        mark.textContent = part.text;
        mark.title = '原词：' + (part.from || '');
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part.text));
      }
    });
  }

  function renderQueue() {
    els.queueList.textContent = '';
    const list = state.queue;
    els.queueCount.textContent = String(list.length);
    els.queueEmpty.hidden = list.length > 0;
    els.queueList.hidden = list.length === 0;
    els.downloadBtn.disabled = list.length === 0;
    els.queueShuffleBtn.disabled = list.length === 0;
    els.queueShuffleBtn2.disabled = list.length === 0;

    if (!list.length) {
      updateQueueCurrent();
      updatePackUI();
      return;
    }

    const fragment = document.createDocumentFragment();
    const maxRender = 400;
    list.slice(0, maxRender).forEach(function (item, index) {
      const row = document.createElement('div');
      row.className = 'queue-item';
      row.setAttribute('role', 'listitem');
      row.tabIndex = 0;
      row.dataset.index = String(index);
      row.title = '从这里开始朗读';

      const number = document.createElement('span');
      number.className = 'q-index';
      number.textContent = String(index + 1).padStart(2, '0');

      const body = document.createElement('span');
      body.className = 'q-body';

      const text = document.createElement('span');
      text.className = 'q-text';
      renderParts(text, item.parts);

      const meta = document.createElement('span');
      meta.className = 'q-meta';
      if (state.multi || item.kind === 'intro') {
        const model = document.createElement('span');
        model.className = 'q-model';
        model.textContent = item.modelName || '通用';
        meta.appendChild(model);
      }
      if (item.locked) {
        const locked = document.createElement('span');
        locked.className = 'q-lock';
        locked.textContent = '整段保留';
        locked.title = '含第一、第二、第三等序号，整段不拆开、不打乱内部顺序';
        meta.appendChild(locked);
      }
      const para = document.createElement('span');
      para.textContent = item.paragraphIndex ? '第 ' + item.paragraphIndex + ' 段' : '全篇';
      meta.appendChild(para);
      if (item.changes > 0) {
        const changed = document.createElement('span');
        changed.className = 'changed-count';
        changed.textContent = '改写 ' + item.changes + ' 处';
        meta.appendChild(changed);
      }

      body.appendChild(text);
      body.appendChild(meta);

      const play = document.createElement('span');
      play.className = 'q-play';
      play.innerHTML = '<svg><use href="#icon-play"></use></svg>';

      row.appendChild(number);
      row.appendChild(body);
      row.appendChild(play);
      fragment.appendChild(row);
    });

    if (list.length > maxRender) {
      const more = document.createElement('div');
      more.className = 'queue-more';
      more.textContent = '还有 ' + (list.length - maxRender) + ' 句未展开，导出可查看完整清单。';
      fragment.appendChild(more);
    }

    els.queueList.appendChild(fragment);
    updateQueueCurrent();
    updatePackUI();
  }

  function updateQueueCurrent() {
    if (!els.queueList) return;
    const rows = els.queueList.querySelectorAll('.queue-item');
    rows.forEach(function (row) {
      const index = Number(row.dataset.index);
      row.classList.toggle('current', index === state.current);
    });
    if (state.current < 0) return;
    const current = els.queueList.querySelector('.queue-item[data-index="' + state.current + '"]');
    if (!current) return;
    const top = current.offsetTop;
    const bottom = top + current.offsetHeight;
    if (top < els.queueList.scrollTop + 6) {
      els.queueList.scrollTop = Math.max(0, top - 6);
    } else if (bottom > els.queueList.scrollTop + els.queueList.clientHeight - 6) {
      els.queueList.scrollTop = bottom - els.queueList.clientHeight + 6;
    }
  }

  function updateProgress() {
    const total = state.queue.length;
    if (!total) {
      els.progressBar.style.width = '0%';
      els.queuePos.textContent = '0 / 0';
      els.remaining.textContent = '--:--';
      return;
    }
    const index = state.current < 0 ? 0 : state.current;
    els.queuePos.textContent = (state.current < 0 ? 0 : index + 1) + ' / ' + total;
    const percent = state.current < 0 ? 0 : ((index + 1) / total) * 100;
    els.progressBar.style.width = Math.min(100, percent) + '%';

    let seconds = 0;
    for (let i = Math.max(0, state.current); i < total; i += 1) {
      seconds += Core.estimateDuration(state.queue[i].text, state.settings.rate);
      if (i < total - 1) seconds += state.settings.gap;
    }
    els.remaining.textContent = '剩余 ' + Core.formatDuration(seconds);
  }

  function updateElapsed() {
    let ms = state.playedMs;
    if (state.resumeAt) ms += Date.now() - state.resumeAt;
    els.elapsed.textContent = Core.formatDuration(ms / 1000);
  }

  function resetClock() {
    state.playedMs = 0;
    state.resumeAt = state.playing && !state.paused ? Date.now() : null;
    updateElapsed();
  }

  function pauseClock() {
    if (state.resumeAt) {
      state.playedMs += Date.now() - state.resumeAt;
      state.resumeAt = null;
    }
    updateElapsed();
  }

  function resumeClock() {
    if (!state.resumeAt) state.resumeAt = Date.now();
    updateElapsed();
  }

  function updatePlayerUI() {
    const hasQueue = state.queue.length > 0;
    const current = state.current >= 0 ? state.queue[state.current] : null;
    const displayModel = current && current.modelName ? current.modelName : modelName(state.activeModel);
    const active = state.playing && !state.paused;

    els.playerCard.classList.toggle('playing', active);
    els.playBtn.classList.toggle('playing', active);
    els.playBtn.setAttribute('aria-label', active ? '暂停' : '播放');
    els.playUse.setAttribute('href', active ? '#icon-pause' : '#icon-play');
    els.prevBtn.disabled = !hasQueue;
    els.nextBtn.disabled = !hasQueue;
    els.stopBtn.disabled = !state.playing && !state.paused;
    els.testBtn.disabled = state.testing || (isRemoteEngine() && !remoteEngineReady());

    if (current) {
      renderParts(els.nowText, current.parts);
      els.nowText.scrollTop = 0;
    } else {
      els.nowText.innerHTML = '<span class="now-placeholder">点击播放键，或“生成并开始朗读”<br>将按「' +
        modelName(state.activeModel) + '」生成当前清单</span>';
    }

    els.queuePos.textContent = hasQueue && state.current >= 0
      ? (state.current + 1) + ' / ' + state.queue.length
      : '0 / ' + state.queue.length;

    els.playerModel.textContent = displayModel;
    els.queueModel.textContent = state.multi ? '多车型' : displayModel;
    document.title = (active ? '▶ ' : '') + displayModel + ' · 驰声汽车口播';
    updateProgress();
    updatePlaylistActions();
  }

  function renderAll() {
    renderQueue();
    updatePlayerUI();
    updateQueueCurrent();
  }

  function getVoice() {
    if (!state.voices.length) return null;
    const selected = state.settings.voiceURI;
    if (selected === '') return null;
    let voice = state.voices.find(function (item) { return item.voiceURI === selected; });
    if (!voice) voice = preferredVoice();
    return voice || null;
  }

  function isRegionalVoice(voice) {
    return /liaoning|shaanxi|东北|陕西|taiwan|hk|粤|香港|cantonese/i.test(
      String(voice.name || '') + ' ' + String(voice.lang || '')
    );
  }

  function preferredVoice() {
    const zh = state.voices.filter(function (voice) { return /^zh/i.test(voice.lang); });
    const standard = zh.filter(function (voice) { return !isRegionalVoice(voice); });
    const patterns = [/Xiaoxiao|晓晓/i, /Huihui|慧慧/i, /Yunxi|云希/i, /Xiaoyi|晓伊/i, /Yunyang|云扬/i, /Yunjian|云健/i];
    for (let i = 0; i < patterns.length; i += 1) {
      const found = standard.find(function (voice) {
        return patterns[i].test(String(voice.name || ''));
      });
      if (found) return found;
    }
    return standard[0] || zh[0] || state.voices[0] || null;
  }

  function voiceLabel(voice) {
    let name = String(voice.name || '系统语音').replace(/^Microsoft\s+/i, '');
    name = name.replace(/\s*-\s*Chinese.*$/i, '');
    const names = {
      Xiaoxiao: '晓晓',
      Xiaoyi: '晓伊',
      Yunxi: '云希',
      Yunjian: '云健',
      Yunyang: '云扬',
      Xiaobei: '晓北',
      Xiaoni: '晓妮',
      Huihui: '慧慧',
      Yaoyao: '瑶瑶',
      Kangkang: '康康',
      HiuMaan: '曉曼',
      HsiaoChen: '曉臻'
    };
    Object.keys(names).forEach(function (key) {
      name = name.replace(new RegExp('\\b' + key + '\\b', 'g'), names[key]);
    });
    name = name.replace(/\s*Online\s*\(Natural\)/i, ' · 自然');
    name = name.replace(/\s*\(Natural\)/i, ' · 自然');
    const lang = String(voice.lang || 'zh-CN').split('-').slice(0, 2).join('-');
    return name + ' · ' + lang;
  }

  function updateVoiceHint() {
    if (!els.voiceHint) return;
    if (state.settings.engine !== 'local') return;
    const voice = getVoice();
    const online = voice && /Online|Natural|自然/i.test(String(voice.name || ''));
    const hasZh = state.voices.some(function (item) { return /^zh/i.test(item.lang); });
    if (!state.voices.length) {
      els.voiceHint.textContent = '正在读取系统语音…';
    } else if (!hasZh) {
      els.voiceHint.textContent = '未检测到中文语音。可在 Windows 设置中安装中文语音包，或使用 Edge 自然语音。';
    } else if (online) {
      els.voiceHint.textContent = '该音色为在线自然音色，需要联网；离线时可选择本地音色。';
    } else {
      els.voiceHint.textContent = '使用 Windows 本地语音，离线可用。';
    }
  }

  function edgeVoiceLabel(voice) {
    let name = String(voice.name || voice.id || '自然音色');
    const map = {
      Xiaoxiao: '晓晓', Xiaoyi: '晓伊', Yunxi: '云希', Yunjian: '云健',
      Yunyang: '云扬', Yunxia: '云夏', Xiaobei: '晓北', Xiaoni: '晓妮',
      HiuGaai: '曉佳', HiuMaan: '曉曼', WanLung: '雲龍',
      HsiaoChen: '曉臻', HsiaoYu: '曉雨', YunJhe: '雲哲'
    };
    Object.keys(map).forEach(function (key) {
      name = name.replace(new RegExp('\\b' + key + '\\b', 'g'), map[key]);
    });
    if (/[男女]声/.test(name)) return name;
    return name + ' · ' + (voice.gender === 'Male' ? '男声' : '女声');
  }

  function kokoroVoiceLabel(voice) {
    return (voice.indexOf('zm_') === 0 ? '男声 ' : '女声 ') + voice;
  }

  function populateVoices() {
    if (!els.voiceSelect) return;
    els.voiceSelect.textContent = '';
    const edge = state.settings.engine === 'edge';
    const azure = state.settings.engine === 'azure';
    const kokoro = state.settings.engine === 'kokoro';

    if (edge) {
      els.voiceSelect.disabled = false;
      const voices = state.edgeVoices && state.edgeVoices.length ? state.edgeVoices : EDGE_VOICES;
      const groupNames = { 'zh-CN': '普通话', 'zh-HK': '粤语', 'zh-TW': '台湾' };
      const groups = {};
      voices.forEach(function (voice) {
        const locale = String(voice.locale || '');
        const key = locale.indexOf('zh-HK') === 0 ? 'zh-HK' : (locale.indexOf('zh-TW') === 0 ? 'zh-TW' : 'zh-CN');
        if (!groups[key]) groups[key] = [];
        groups[key].push(voice);
      });
      Object.keys(groups).forEach(function (locale) {
        const group = document.createElement('optgroup');
        group.label = groupNames[locale] || locale;
        groups[locale].forEach(function (voice) {
          const option = document.createElement('option');
          option.value = voice.id;
          option.textContent = edgeVoiceLabel(voice);
          option.title = voice.desc || voice.style || voice.name || voice.id;
          group.appendChild(option);
        });
        els.voiceSelect.appendChild(group);
      });
      if (!voices.some(function (voice) { return voice.id === state.settings.edgeVoice; })) {
        state.settings.edgeVoice = voices[0].id;
      }
      els.voiceSelect.value = state.settings.edgeVoice;
      return;
    }

    if (azure) {
      els.voiceSelect.disabled = false;
      AZURE_VOICES.forEach(function (voice) {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = edgeVoiceLabel(voice);
        option.title = voice.desc || voice.id;
        els.voiceSelect.appendChild(option);
      });
      if (!AZURE_VOICES.some(function (voice) { return voice.id === state.settings.azureVoice; })) {
        state.settings.azureVoice = AZURE_VOICES[0].id;
      }
      els.voiceSelect.value = state.settings.azureVoice;
      return;
    }

    if (state.settings.engine === 'volcengine') {
      els.voiceSelect.disabled = false;
      const volcList = VOLC_VOICES.slice();
      if (state.settings.volcVoice && !volcList.some(function (voice) { return voice.id === state.settings.volcVoice; })) {
        volcList.unshift({ id: state.settings.volcVoice, name: state.settings.volcVoice, gender: 'Female', desc: '自定义音色' });
      }
      volcList.forEach(function (voice) {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name && voice.name.indexOf('·') !== -1 ? voice.name : voice.id;
        option.title = voice.desc || voice.id;
        els.voiceSelect.appendChild(option);
      });
      if (!volcList.some(function (voice) { return voice.id === state.settings.volcVoice; })) {
        state.settings.volcVoice = volcList[0].id;
      }
      els.voiceSelect.value = state.settings.volcVoice;
      return;
    }

    if (state.settings.engine === 'cosyvoice') {
      els.voiceSelect.disabled = false;
      const list = COSY_VOICES.slice();
      if (state.settings.cosyVoice && !list.some(function (voice) { return voice.id === state.settings.cosyVoice; })) {
        list.unshift({ id: state.settings.cosyVoice, name: state.settings.cosyVoice, gender: 'Female', desc: '自定义音色' });
      }
      list.forEach(function (voice) {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name && voice.name.indexOf('·') !== -1 ? voice.name : voice.id;
        option.title = voice.desc || voice.id;
        els.voiceSelect.appendChild(option);
      });
      if (!list.some(function (voice) { return voice.id === state.settings.cosyVoice; })) {
        state.settings.cosyVoice = list[0].id;
      }
      els.voiceSelect.value = state.settings.cosyVoice;
      return;
    }

    if (kokoro) {
      els.voiceSelect.disabled = false;
      let voices = (state.kokoroVoices || []).filter(function (voice) { return voice.indexOf('zf_') === 0 || voice.indexOf('zm_') === 0; });
      if (!voices.length) voices = ['zf_001', 'zf_002', 'zf_003', 'zf_004', 'zm_009', 'zm_010', 'zm_011', 'zm_012'];
      const groups = { female: [], male: [] };
      voices.forEach(function (voice) {
        if (voice.indexOf('zm_') === 0) groups.male.push(voice);
        else groups.female.push(voice);
      });
      [['female', '女声'], ['male', '男声']].forEach(function (entry) {
        if (!groups[entry[0]].length) return;
        const group = document.createElement('optgroup');
        group.label = entry[1];
        groups[entry[0]].forEach(function (voice) {
          const option = document.createElement('option');
          option.value = voice;
          option.textContent = kokoroVoiceLabel(voice);
          group.appendChild(option);
        });
        els.voiceSelect.appendChild(group);
      });
      if (!voices.includes(state.settings.kokoroVoice)) state.settings.kokoroVoice = voices[0];
      els.voiceSelect.value = state.settings.kokoroVoice;
      return;
    }

    if (!state.voices.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '未检测到系统语音';
      els.voiceSelect.appendChild(option);
      els.voiceSelect.disabled = true;
      return;
    }

    els.voiceSelect.disabled = false;
    const zh = state.voices.filter(function (voice) { return /^zh/i.test(voice.lang); });
    const others = state.voices.filter(function (voice) { return !/^zh/i.test(voice.lang); });

    if (zh.length > 1) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '系统默认中文语音';
      els.voiceSelect.appendChild(option);
    }

    zh.forEach(function (voice) {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = voiceLabel(voice);
      option.title = voice.name;
      els.voiceSelect.appendChild(option);
    });

    if (!zh.length) {
      others.forEach(function (voice) {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = voiceLabel(voice);
        option.title = voice.name;
        els.voiceSelect.appendChild(option);
      });
    }

    const exists = state.voices.some(function (voice) { return voice.voiceURI === state.settings.voiceURI; });
    if (!exists) {
      const preferred = preferredVoice();
      state.settings.voiceURI = preferred ? preferred.voiceURI : '';
    }
    els.voiceSelect.value = state.settings.voiceURI;
    updateVoiceHint();
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) {
      state.voices = [];
      populateVoices();
      if (els.voiceHint && state.settings.engine === 'local') {
        els.voiceHint.textContent = '当前浏览器不支持系统语音，请使用 Edge 自然语音。';
      }
      return;
    }
    try {
      const list = window.speechSynthesis.getVoices();
      if (!list || !list.length) return;
      state.voices = list.slice().sort(function (a, b) {
        const az = /^zh/i.test(a.lang) ? 0 : 1;
        const bz = /^zh/i.test(b.lang) ? 0 : 1;
        if (az !== bz) return az - bz;
        return a.name.localeCompare(b.name);
      });
      populateVoices();
      updateVoiceHint();
    } catch (_) {
      // 某些浏览器在页面加载早期会抛错，稍后重试即可。
    }
  }

  async function loadEdgeVoices() {
    if (!state.server.available || !state.server.edgeTts) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 9000);
      const response = await fetch('/api/tts/voices', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.voices) || !data.voices.length) return;
      state.edgeVoices = data.voices;
      if (!state.edgeVoices.some(function (voice) { return voice.id === state.settings.edgeVoice; })) {
        state.settings.edgeVoice = state.edgeVoices[0].id;
        persist();
      }
      if (state.settings.engine === 'edge') populateVoices();
    } catch (_) {
      // 保留内置音色列表
    }
  }

  async function loadOutputDevices(askPermission) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !els.outputSelect) return;
    try {
      if (askPermission && !state.mediaAsked) {
        state.mediaAsked = true;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(function (track) { track.stop(); });
        } catch (_) {
          // 用户拒绝麦克风权限时仍尝试用默认设备
        }
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.outputDevices = devices.filter(function (device) {
        return device.kind === 'audiooutput' && Boolean(device.deviceId);
      });
      const current = state.settings.outputDeviceId;
      els.outputSelect.textContent = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '系统默认输出';
      els.outputSelect.appendChild(def);
      state.outputDevices.forEach(function (device, index) {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || ('音频输出 ' + (index + 1));
        els.outputSelect.appendChild(option);
      });
      if (current && !state.outputDevices.some(function (device) { return device.deviceId === current; })) {
        state.settings.outputDeviceId = '';
      }
      els.outputSelect.value = state.settings.outputDeviceId || '';
      updateOutputUI();
    } catch (_) {
      // 浏览器不允许枚举时保持系统默认
    }
  }

  async function applyOutputToContext(ctx) {
    if (!ctx || !state.settings.outputDeviceId || typeof ctx.setSinkId !== 'function') return;
    try {
      await ctx.setSinkId(state.settings.outputDeviceId);
    } catch (_) {
      // 某些浏览器或设备不支持指定输出，回退系统默认
    }
  }

  async function loadKokoroStatus() {
    if (!state.server.available) {
      state.server.kokoroReady = false;
      return false;
    }
    if (state.kokoroTimer) {
      clearTimeout(state.kokoroTimer);
      state.kokoroTimer = null;
    }
    const wasReady = Boolean(state.server.kokoroReady);
    try {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 3000);
      const response = await fetch('/api/kokoro/status', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) throw new Error('status failed');
      const data = await response.json();
      state.server.kokoroReady = Boolean(data.ready);
      state.kokoroVoices = Array.isArray(data.voices) ? data.voices : [];
    } catch (_) {
      state.server.kokoroReady = false;
    }

    if (state.server.kokoroReady) {
      state.kokoroAttempts = 0;
      if (state.settings.autoKokoro && state.settings.engine === 'local') {
        state.settings.engine = 'kokoro';
        persist();
        if (!wasReady) toast('Kokoro 本地语音已就绪，已自动切换。', 'success', 3200);
      }
    } else {
      state.kokoroAttempts += 1;
      if (state.settings.engine === 'kokoro' && !state.settings.autoKokoro) {
        state.settings.engine = 'local';
        persist();
        toast('Kokoro 本地服务还没启动，已切换到本地语音。', '', 4200);
      }
      if (state.settings.autoKokoro && (state.settings.engine === 'local' || state.settings.engine === 'kokoro') && state.kokoroAttempts < 40) {
        state.kokoroTimer = setTimeout(function () { loadKokoroStatus(); }, 2500);
      }
    }

    updateEngineUI();
    return state.server.kokoroReady;
  }

  function updateOutputUI() {
    if (!els.outputHint) return;
    const remote = isRemoteEngine();
    if (els.outputSelect) els.outputSelect.disabled = !remote;
    if (remote && !state.outputDevices.length) {
      els.outputHint.textContent = '点右侧刷新并允许麦克风权限，读取外接音箱 / 声卡；本地系统语音跟随 Windows 默认输出。';
    } else {
      els.outputHint.textContent = remote
        ? '可把云端语音和背景音乐送到外接音箱 / 声卡；本地系统语音跟随 Windows 默认输出。'
        : '本地语音跟随 Windows 默认输出。需要指定外放设备时，请切换云端或 Kokoro 引擎。';
    }
  }

  function updatePackUI() {
    if (!els.packBtn) return;
    const remote = isRemoteEngine();
    const can = remote && remoteEngineReady() && state.queue.length > 0;
    els.packBtn.disabled = !can || state.packGenerating;
    if (state.packGenerating) return;
    if (!remote) {
      els.packState.textContent = '切换到云端或 Kokoro 后可生成';
    } else if (!remoteEngineReady()) {
      els.packState.textContent = state.settings.engine === 'kokoro' ? '需要先启动 Kokoro 本地服务' : (state.settings.engine === 'volcengine' ? '需要先填火山引擎 AppID/Token' : (state.settings.engine === 'cosyvoice' ? '需要先填 CosyVoice Key' : (state.settings.engine === 'azure' ? '需要先填 Azure Key' : '需要先安装 Edge 自然语音组件')));
    } else if (!state.queue.length) {
      els.packState.textContent = '先生成播放清单，再缓存为本地音频';
    } else {
      els.packState.textContent = '生成后当前清单可离线播放；换轮或改写后需重新生成';
    }
  }

  function formatFileSize(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + ' MB';
    if (value >= 1024) return Math.round(value / 1024) + ' KB';
    return value + ' B';
  }

  function currentMusicTrack() {
    return state.musicTracks[state.musicIndex] || null;
  }

  function musicModeLabel() {
    return state.settings.musicMode === 'sequential' ? '顺序播放' : '随机播放';
  }

  function updateMusicUI() {
    if (!els.musicTitle) return;
    const track = currentMusicTrack();
    const audio = state.musicAudio;
    if (els.musicTitle) {
      els.musicTitle.textContent = track
        ? track.name
        : (state.musicTracks.length ? '已添加 ' + state.musicTracks.length + ' 首音乐' : '还没有音乐');
    }
    if (els.musicMeta) {
      els.musicMeta.textContent = track
        ? state.musicTracks.length + ' 首 · ' + musicModeLabel() + ' · ' + formatFileSize(track.size)
        : (state.musicTracks.length ? '点播放键，按' + musicModeLabel() + '开始' : '添加本地音乐后，可随机或顺序播放');
    }
    if (els.musicState) {
      let label = '未播放';
      let playing = false;
      if (state.musicUploading) label = '导入中';
      else if (audio && audio.src && !audio.paused) { label = '播放中'; playing = true; }
      else if (audio && audio.src && audio.ended) label = '已结束';
      else if (audio && audio.src) label = '已暂停';
      els.musicState.textContent = label;
      els.musicState.classList.toggle('playing', playing);
    }
    if (els.musicPlayBtn) {
      const use = els.musicPlayBtn.querySelector('use');
      if (use) use.setAttribute('href', audio && !audio.paused ? '#icon-pause' : '#icon-play');
      els.musicPlayBtn.title = audio && !audio.paused ? '暂停背景音乐' : '播放背景音乐';
    }
    if (els.musicAddBtn) els.musicAddBtn.disabled = state.musicUploading;
    if (els.musicClearBtn) els.musicClearBtn.disabled = state.musicUploading || !state.musicTracks.length;
    if (els.musicNextBtn) els.musicNextBtn.disabled = !state.musicTracks.length;
    if (els.musicVolume && document.activeElement !== els.musicVolume) {
      els.musicVolume.value = String(state.settings.musicVolume);
    }
    if (els.musicVolumeVal) els.musicVolumeVal.textContent = Math.round(state.settings.musicVolume) + '%';
    if (els.musicMode) els.musicMode.value = state.settings.musicMode;
    if (els.autoKokoroToggle) els.autoKokoroToggle.checked = state.settings.autoKokoro;
    if (els.multiIntroToggle) els.multiIntroToggle.checked = state.settings.multiIntro;
    if (els.multiGeneralText) els.multiGeneralText.value = state.settings.generalIntro;
    if (els.singleIntroToggle) els.singleIntroToggle.checked = state.settings.singleIntro;
    if (els.singleIntroText) els.singleIntroText.value = state.settings.singleIntroText;
    document.querySelectorAll('input[name="multiOrder"]').forEach(function (radio) {
      radio.checked = radio.value === state.settings.multiOrder;
    });
    renderMusicList();
  }

  function renderMusicList() {
    if (!els.musicList) return;
    els.musicList.textContent = '';
    if (!state.musicTracks.length) {
      const empty = document.createElement('div');
      empty.className = 'music-empty';
      empty.textContent = '从电脑里选几首展厅音乐，支持 MP3 / M4A / WAV / OGG。';
      els.musicList.appendChild(empty);
      return;
    }
    state.musicTracks.forEach(function (track, index) {
      const row = document.createElement('div');
      row.className = 'music-row' + (index === state.musicIndex ? ' active' : '');
      row.dataset.index = String(index);
      row.title = track.name;

      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'music-row-icon');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#icon-music');
      icon.appendChild(use);

      const name = document.createElement('span');
      name.className = 'music-row-name';
      name.textContent = track.name;

      const del = document.createElement('button');
      del.className = 'music-row-del';
      del.type = 'button';
      del.title = '删除这首音乐';
      del.setAttribute('aria-label', '删除这首音乐');
      del.innerHTML = '<svg width="12" height="12"><use href="#icon-close"></use></svg>';
      del.addEventListener('click', function (event) {
        event.stopPropagation();
        deleteMusic(track.id);
      });

      row.appendChild(icon);
      row.appendChild(name);
      row.appendChild(del);
      row.addEventListener('click', function () { playMusicIndex(index); });
      els.musicList.appendChild(row);
    });
  }

  function initMusicAudio() {
    if (state.musicAudio) return state.musicAudio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = clamp(Number(state.settings.musicVolume) / 100, 0, 1);
    audio.addEventListener('play', updateMusicUI);
    audio.addEventListener('pause', updateMusicUI);
    audio.addEventListener('ended', function () { nextMusic(); });
    audio.addEventListener('error', function () {
      toast('这首音乐无法播放，请换一个 MP3 / M4A 文件。', 'error', 3600);
      updateMusicUI();
    });
    state.musicAudio = audio;
    return audio;
  }

  async function applyMusicSink() {
    const audio = state.musicAudio;
    if (!audio || typeof audio.setSinkId !== 'function') return;
    const deviceId = state.settings.outputDeviceId;
    if (!deviceId) return;
    try {
      await audio.setSinkId(deviceId);
    } catch (_) {
      // 浏览器/设备不支持时继续使用系统默认输出
    }
  }

  function playMusicIndex(index) {
    if (index < 0 || index >= state.musicTracks.length) return;
    const audio = initMusicAudio();
    const track = state.musicTracks[index];
    if (!track) return;
    state.musicIndex = index;
    audio.pause();
    audio.src = '/api/music/file/' + encodeURIComponent(track.id);
    audio.volume = clamp(Number(state.settings.musicVolume) / 100, 0, 1);
    applyMusicSink();
    updateMusicUI();
    const promise = audio.play();
    if (promise && promise.catch) {
      promise.catch(function () {
        toast('浏览器阻止了自动播放，请再点一次播放按钮。', '', 3000);
        updateMusicUI();
      });
    }
  }

  function nextMusic() {
    if (!state.musicTracks.length) return;
    let next = 0;
    if (state.settings.musicMode === 'sequential') {
      next = state.musicIndex < 0 ? 0 : (state.musicIndex + 1) % state.musicTracks.length;
    } else if (state.musicTracks.length > 1) {
      do {
        next = Math.floor(Math.random() * state.musicTracks.length);
      } while (next === state.musicIndex);
    }
    playMusicIndex(next);
  }

  function toggleMusic() {
    if (!state.musicTracks.length) {
      toast('先添加几首本地音乐。', 'error');
      return;
    }
    const audio = initMusicAudio();
    if (!audio.src || audio.ended) {
      nextMusic();
      return;
    }
    if (audio.paused) {
      applyMusicSink();
      const promise = audio.play();
      if (promise && promise.catch) {
        promise.catch(function () { toast('浏览器阻止了播放，请再点一次播放按钮。', '', 2600); });
      }
    } else {
      audio.pause();
    }
  }

  async function loadMusicTracks() {
    try {
      const response = await fetch('/api/music/list', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      state.musicTracks = Array.isArray(data.tracks) ? data.tracks : [];
      const current = currentMusicTrack();
      if (state.musicIndex >= 0 && !current) {
        if (state.musicAudio) {
          state.musicAudio.pause();
          state.musicAudio.removeAttribute('src');
        }
        state.musicIndex = -1;
      }
      updateMusicUI();
    } catch (_) {
      updateMusicUI();
    }
  }

  async function uploadMusicFiles(files) {
    const list = Array.prototype.slice.call(files || []);
    if (!list.length || state.musicUploading) return;
    const allowed = /\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i;
    const valid = list.filter(function (file) { return allowed.test(file.name) && file.size <= 80 * 1024 * 1024; });
    if (!valid.length) {
      toast('请选择 80MB 以内的 MP3 / M4A / WAV / OGG 音频。', 'error', 4200);
      return;
    }
    if (valid.length < list.length) {
      toast('已跳过格式不支持或超过 80MB 的文件。', '', 3200);
    }
    state.musicUploading = true;
    updateMusicUI();
    let done = 0;
    try {
      for (let i = 0; i < valid.length; i += 1) {
        const file = valid[i];
        if (els.musicState) els.musicState.textContent = '导入 ' + (i + 1) + ' / ' + valid.length;
        const response = await fetch('/api/music/upload?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file
        });
        if (!response.ok) {
          let message = '音乐导入失败';
          try {
            const data = await response.json();
            if (data && data.message) message = data.message;
          } catch (_) { /* ignore */ }
          throw new Error(message);
        }
        done += 1;
      }
      state.musicUploading = false;
      await loadMusicTracks();
      toast('已导入 ' + done + ' 首音乐。', 'success', 3200);
    } catch (err) {
      state.musicUploading = false;
      updateMusicUI();
      toast(err.message || '音乐导入失败，请检查文件。', 'error', 4200);
    }
  }

  async function deleteMusic(id) {
    if (!id) return;
    if (!window.confirm('从背景音乐列表删除这首音乐？')) return;
    try {
      const response = await fetch('/api/music/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      });
      if (!response.ok) throw new Error('删除失败');
      await loadMusicTracks();
      toast('已删除这首音乐。', '', 2200);
    } catch (_) {
      toast('删除失败，请稍后重试。', 'error');
    }
  }

  async function clearMusic() {
    if (!state.musicTracks.length) return;
    if (!window.confirm('清空全部背景音乐？音乐文件会从软件目录中删除。')) return;
    try {
      const response = await fetch('/api/music/clear', { method: 'POST' });
      if (!response.ok) throw new Error('清空失败');
      if (state.musicAudio) {
        state.musicAudio.pause();
        state.musicAudio.removeAttribute('src');
      }
      state.musicIndex = -1;
      await loadMusicTracks();
      toast('背景音乐列表已清空。', '', 2200);
    } catch (_) {
      toast('清空失败，请稍后重试。', 'error');
    }
  }

  function updateEngineUI() {
    const edge = state.settings.engine === 'edge';
    const azure = state.settings.engine === 'azure';
    const volc = state.settings.engine === 'volcengine';
    const cosy = state.settings.engine === 'cosyvoice';
    const kokoro = state.settings.engine === 'kokoro';
    els.engineSelect.value = state.settings.engine;
    if (els.azureConfig) els.azureConfig.hidden = !azure;
    if (els.volcConfig) els.volcConfig.hidden = !volc;
    if (els.cosyConfig) els.cosyConfig.hidden = !cosy;
    const edgeOption = els.engineSelect.querySelector('option[value="edge"]');
    if (edgeOption) {
      edgeOption.disabled = !state.server.edgeTts;
      if (!state.server.available) {
        edgeOption.textContent = location.protocol === 'file:'
          ? 'Edge 自然语音 · 需通过启动脚本打开'
          : 'Edge 自然语音 · 正在连接本地服务…';
      } else if (!state.server.edgeTts) {
        edgeOption.textContent = 'Edge 自然语音 · 未安装组件';
      } else {
        edgeOption.textContent = 'Edge 自然语音 · 已就绪';
      }
    }

    const kokoroOption = els.engineSelect.querySelector('option[value="kokoro"]');
    if (kokoroOption) {
      kokoroOption.textContent = state.server.kokoroReady
        ? 'Kokoro 本地语音 · 已就绪'
        : 'Kokoro 本地语音 · 未启动服务';
    }

    const azureOption = els.engineSelect.querySelector('option[value="azure"]');
    if (azureOption) {
      azureOption.textContent = state.settings.azureKey
        ? 'Azure 神经语音 · 已配置'
        : 'Azure 神经语音 · 需 Key（联网）';
    }

    const volcOption = els.engineSelect.querySelector('option[value="volcengine"]');
    if (volcOption) {
      volcOption.textContent = (state.settings.volcAppId && state.settings.volcToken)
        ? '火山引擎 / 豆包 · 已配置'
        : '火山引擎 / 豆包 · 需 AppID/Token';
    }

    const cosyOption = els.engineSelect.querySelector('option[value="cosyvoice"]');
    if (cosyOption) {
      cosyOption.textContent = state.settings.cosyKey
        ? '阿里 CosyVoice · 已配置'
        : '阿里 CosyVoice · 需 API Key';
    }

    if (volc) {
      els.engineMiniState.textContent = '火山 / 豆包';
      els.engineMiniText.textContent = 'Volcengine TTS · 需联网与 Token';
      els.voiceHint.textContent = '豆包语音，音色自然；AppID/Token 只保存在本机。';
      els.voiceTipText.textContent = '直播时用 OBS 采集“桌面音频”；火山引擎合成需要网络。';
    } else if (cosy) {
      els.engineMiniState.textContent = 'CosyVoice';
      els.engineMiniText.textContent = '阿里百炼 · 需联网与 API Key';
      els.voiceHint.textContent = 'CosyVoice 大模型语音；Key/业务空间只保存在本机。';
      els.voiceTipText.textContent = '直播时用 OBS 采集“桌面音频”；CosyVoice 合成需要网络。';
    } else if (azure) {
      els.engineMiniState.textContent = 'Azure 神经';
      els.engineMiniText.textContent = 'Azure Speech · 需联网与 Key';
      els.voiceHint.textContent = '微软 Azure 神经语音，支持风格；Key 只保存在本机。';
      els.voiceTipText.textContent = '直播时用 OBS 采集“桌面音频”；Azure 合成需要稳定网络。';
    } else if (edge) {
      els.engineMiniState.textContent = '在线语音';
      els.engineMiniText.textContent = 'Edge 自然语音 · 需保持联网';
      els.voiceHint.textContent = '在线合成，音色更自然；首次朗读需要联网。';
      els.voiceTipText.textContent = '直播时用 OBS 采集“桌面音频”，并保持网络稳定。';
    } else if (kokoro) {
      els.engineMiniState.textContent = '本地 Kokoro';
      els.engineMiniText.textContent = 'Kokoro-82M 中文 · CPU 合成';
      els.voiceHint.textContent = '本地大模型，完全离线；CPU 合成比在线音色慢一些。';
      els.voiceTipText.textContent = 'Kokoro 在本机合成，不联网；直播时用 OBS 采集桌面音频。';
    } else {
      els.engineMiniState.textContent = '本地语音';
      els.engineMiniText.textContent = 'Windows 系统语音 · 无需联网';
      updateVoiceHint();
      els.voiceTipText.textContent = '直播时用 OBS 采集“桌面音频”即可把声音送进直播间。';
    }

    if (!state.server.available) {
      els.serverPill.className = 'status-pill offline';
      els.serverPill.innerHTML = '<i></i><span>本地文件模式</span>';
    } else if (state.server.edgeTts || state.server.kokoroReady || (azure && state.settings.azureKey) || (volc && state.settings.volcAppId && state.settings.volcToken) || (cosy && state.settings.cosyKey)) {
      els.serverPill.className = 'status-pill';
      els.serverPill.innerHTML = '<i></i><span>语音组件就绪</span>';
    } else {
      els.serverPill.className = 'status-pill';
      els.serverPill.innerHTML = '<i></i><span>本机运行</span>';
    }

    populateVoices();
    updateOutputUI();
    updatePackUI();
    if (els.testBtn) els.testBtn.disabled = state.testing || (isRemoteEngine() && !remoteEngineReady());
  }

  function scheduleServerRetry() {
    if (location.protocol === 'file:') return;
    clearTimeout(state.serverRetryTimer);
    if (state.serverRetryCount >= 20) return;
    state.serverRetryCount += 1;
    const delay = Math.min(1500 * state.serverRetryCount, 15000);
    state.serverRetryTimer = setTimeout(function () {
      state.serverRetryTimer = null;
      void checkServer();
    }, delay);
  }

  async function checkServer() {
    if (location.protocol === 'file:') {
      clearTimeout(state.serverRetryTimer);
      state.server.available = false;
      state.server.edgeTts = false;
      if (['edge', 'azure', 'volcengine', 'cosyvoice'].includes(state.settings.engine)) state.settings.engine = 'local';
      updateEngineUI();
      return;
    }
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('health failed');
      const data = await response.json();
      state.server.available = Boolean(data.ok);
      state.server.edgeTts = Boolean(data.edgeTts);
      state.serverRetryCount = 0;
      clearTimeout(state.serverRetryTimer);
      state.serverRetryTimer = null;
      if (!state.server.edgeTts && state.settings.engine === 'edge') {
        state.settings.engine = 'local';
        toast('未安装 Edge 自然语音组件，已切换到本地语音。', '', 3600);
      }
      updateEngineUI();
      if (state.server.edgeTts) loadEdgeVoices();
      loadKokoroStatus();
    } catch (_) {
      state.server.available = false;
      state.server.edgeTts = false;
      updateEngineUI();
      scheduleServerRetry();
    }
  }

  function buildSinglePlaylist(modelId, options) {
    const opts = options || {};
    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    const parsed = Core.parseScript(scriptText(modelId));
    if (!parsed.sentences.length) {
      toast('「' + modelName(modelId) + '」还没有可朗读的讲稿。', 'error', 3600);
      return false;
    }

    let queue = Core.buildQueue(parsed, {
      mode: state.settings.mode,
      rewrite: state.settings.rewrite,
      strength: state.settings.strength,
      protectedWords: state.settings.protectedWords,
      previousLastText: opts.previousLastText || null
    });
    queue = applyBlockedToItems(queue);
    if (!queue.length) {
      toast('「' + modelName(modelId) + '」的讲稿全部被禁用词过滤。', 'error', 4200);
      return false;
    }

    if (state.settings.singleIntro) {
      const interaction = sanitizeBlocked(singleIntroText());
      if (interaction) {
        queue.unshift({
          id: 's0',
          text: interaction,
          original: interaction,
          parts: [{ text: interaction, changed: false }],
          changes: 0,
          paragraphIndex: null,
          sentenceIndex: 0,
          locked: false,
          modelId: null,
          modelName: '互动',
          kind: 'intro'
        });
      }
    }

    let sequence = 0;
    queue.forEach(function (item) {
      sequence += 1;
      item.id = 's' + sequence;
      if (item.kind === 'intro') return;
      item.modelId = modelId;
      item.modelName = modelName(modelId);
      item.kind = 'model';
    });

    state.queue = queue;
    state.current = 0;
    state.round = opts.round === undefined ? 1 : opts.round;
    state.finished = false;
    state.multi = false;
    clearStale();
    renderAll();
    if (!opts.silent) {
      const changed = queue.reduce(function (total, item) { return total + (item.changes || 0); }, 0);
      toast('已生成「' + modelName(modelId) + '」清单：' + queue.length + ' 句，改写 ' + changed + ' 处。', 'success', 3600);
    }
    if (opts.autoplay) startAt(0);
    return true;
  }

  function buildMultiQueue(options) {
    const opts = options || {};
    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    const selected = state.multiSelected.filter(function (id) {
      return id !== 'common' && isKnownModelId(id) && scriptText(id).trim();
    });
    if (!selected.length) {
      toast('请先选择至少一个有讲稿的播放车型。', 'error', 3600);
      return false;
    }
    if (selected.length === 1) {
      return buildSinglePlaylist(selected[0], opts);
    }

    let order = selected.slice();
    if (state.settings.multiOrder === 'shuffle') {
      order = Core.shuffle(order);
    } else {
      const selectedSet = new Set(selected);
      order = Core.CAR_MODELS
        .filter(function (model) { return selectedSet.has(model.id); })
        .map(function (model) { return model.id; });
    }

    const introText = generalIntroText();
    const queue = [];
    let sequence = 0;
    order.forEach(function (modelId) {
      if (state.settings.multiIntro && introText) {
        const introParsed = Core.parseScript(introText + ' 接下来咱们看' + modelName(modelId) + '。');
        const introItems = Core.buildQueue(introParsed, {
          mode: 'sequential',
          rewrite: false,
          strength: 0,
          protectedWords: state.settings.protectedWords
        });
        introItems.forEach(function (item) {
          sequence += 1;
          item.id = 'x' + sequence;
          item.modelId = 'common';
          item.modelName = '通用';
          item.kind = 'intro';
          queue.push(item);
        });
      }

      const parsed = Core.parseScript(scriptText(modelId));
      const items = Core.buildQueue(parsed, {
        mode: state.settings.mode,
        rewrite: state.settings.rewrite,
        strength: state.settings.strength,
        protectedWords: state.settings.protectedWords
      });
      items.forEach(function (item) {
        sequence += 1;
        item.id = 'x' + sequence;
        item.modelId = modelId;
        item.modelName = modelName(modelId);
        item.kind = 'model';
        queue.push(item);
      });
    });

    if (!queue.length) {
      toast('选中的车型还没有可朗读的句子。', 'error', 3600);
      return false;
    }

    const filteredQueue = applyBlockedToItems(queue);
    if (!filteredQueue.length) {
      toast('选中的讲稿全部被禁用词过滤，请检查禁用词列表。', 'error', 4200);
      return false;
    }

    state.queue = filteredQueue;
    state.current = 0;
    state.round = opts.round === undefined ? 1 : opts.round;
    state.finished = false;
    state.multi = true;
    clearStale();
    renderAll();
    if (!opts.silent) {
      toast('多车型清单已生成：' + order.length + ' 款车，共 ' + queue.length + ' 句。', 'success', 3600);
    }
    if (opts.autoplay) startAt(0);
    return true;
  }

  function rebuildQueue(options) {
    const opts = options || {};
    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    refreshParsed();

    if (!state.parsed.sentences.length) {
      state.queue = [];
      clearStale();
      renderAll();
      toast('讲稿还是空的，请先粘贴或导入内容。', 'error');
      return false;
    }

    const previousLast = opts.previousLastText || null;
    state.queue = Core.buildQueue(state.parsed, {
      mode: state.settings.mode,
      rewrite: state.settings.rewrite,
      strength: state.settings.strength,
      protectedWords: state.settings.protectedWords,
      previousLastText: previousLast
    });
    state.queue = applyBlockedToItems(state.queue);
    if (!state.queue.length) {
      clearStale();
      renderAll();
      toast('讲稿内容全部被禁用词过滤，请检查禁用词列表。', 'error', 4200);
      return false;
    }

    if (state.settings.singleIntro) {
      const interaction = sanitizeBlocked(singleIntroText());
      if (interaction) {
        state.queue.unshift({
          id: 's0',
          text: interaction,
          original: interaction,
          parts: [{ text: interaction, changed: false }],
          changes: 0,
          paragraphIndex: null,
          sentenceIndex: 0,
          locked: false,
          modelId: null,
          modelName: '互动',
          kind: 'intro'
        });
      }
    }

    state.queue.forEach(function (item) {
      if (item.kind === 'intro') return;
      item.modelId = state.activeModel;
      item.modelName = modelName(state.activeModel);
      item.kind = 'model';
    });
    state.multi = false;
    state.current = state.queue.length ? 0 : -1;
    state.round = opts.round === undefined ? 1 : opts.round;
    state.finished = false;
    clearStale();
    renderAll();

    if (!opts.silent) {
      const changed = state.queue.reduce(function (total, item) { return total + (item.changes || 0); }, 0);
      toast('已生成 ' + state.queue.length + ' 句，改写 ' + changed + ' 处。', 'success');
    }
    if (opts.autoplay) startAt(0);
    return true;
  }

  function generatePlaylist(options) {
    const opts = options || {};
    const ok = buildMultiQueue({ silent: opts.silent, autoplay: false, previousLastText: opts.previousLastText, round: opts.round });
    if (ok) {
      updatePlaylistActions();
      if (!opts.silent) els.queueCount.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }

  function playPlaylist() {
    if (!state.queue.length) {
      const ok = generatePlaylist({ silent: true });
      if (!ok) return;
    }
    if (state.playing || state.paused) {
      togglePlay();
      return;
    }
    startAt(0);
  }

  function updatePlaylistActions() {
    const selected = state.multiSelected.filter(function (id) {
      return id !== 'common' && isKnownModelId(id) && scriptText(id).trim();
    });
    if (els.buildPlaylistBtn) els.buildPlaylistBtn.disabled = !selected.length;
    if (els.playPlaylistBtn) {
      els.playPlaylistBtn.disabled = !state.queue.length;
      if (els.playPlaylistLabel) els.playPlaylistLabel.textContent = state.playing ? '暂停清单' : '播放清单';
    }
  }

  function startAt(index) {
    if (!state.queue.length) {
      if (!generatePlaylist({ silent: true })) return;
    }
    const length = state.queue.length;
    if (!length) return;
    if (index < 0) index = 0;
    if (index >= length) {
      if (state.settings.loop) startNewRound();
      else finishRound();
      return;
    }

    const wasPlaying = state.playing;
    state.runId += 1;
    const run = state.runId;
    cancelOutput();
    clearTimeout(state.gapTimer);
    state.gapTimer = null;
    state.inGap = false;

    state.current = index;
    state.playing = true;
    state.paused = false;
    state.finished = false;
    if (!wasPlaying) resetClock();
    else resumeClock();

    if (isRemoteEngine()) primeAudioContext();
    updatePlayerUI();
    updateQueueCurrent();
    requestWakeLock();
    void playCurrent(run);
  }

  async function playCurrent(run) {
    const item = state.queue[state.current];
    if (!item) return;

    let result = { ok: false };
    try {
      if (isRemoteEngine()) {
        result = await speakEdge(item, run);
      } else {
        result = await speakLocal(item, run);
      }
    } catch (err) {
      if (run === state.runId) {
        console.warn('朗读失败', err);
        toast('朗读出现异常，请再试一次。', 'error', 3800);
      }
      return;
    }

    if (run !== state.runId || !state.playing || state.paused) return;

    if (!result || result.aborted) return;
    if (!result.ok && result.error) {
      const ignored = ['interrupted', 'canceled', 'cancelled'];
      if (ignored.indexOf(result.error) !== -1) return;
      state.consecutiveFailures += 1;
      if (state.consecutiveFailures >= 2) {
        stopPlayback({ resetSelection: false, resetClock: false });
        toast('连续朗读失败，已停止。请检查系统语音或切换音色。', 'error', 4200);
        return;
      }
      toast('这一句朗读失败，正在尝试下一句。', 'error', 2600);
      scheduleAdvance(run);
      return;
    }

    state.consecutiveFailures = 0;
    scheduleAdvance(run);
  }

  function scheduleAdvance(run) {
    const length = state.queue.length;
    const isLast = state.current + 1 >= length;
    state.inGap = true;
    clearTimeout(state.gapTimer);
    state.gapTimer = setTimeout(function () {
      state.gapTimer = null;
      state.inGap = false;
      if (run !== state.runId || !state.playing || state.paused) return;
      if (isLast) {
        if (state.settings.loop) startNewRound();
        else finishRound();
      } else {
        startAt(state.current + 1);
      }
    }, Math.max(0, state.settings.gap * 1000));
  }

  function startNewRound() {
    if (!state.queue.length) return;
    const previousLast = state.queue[state.queue.length - 1].text;
    const nextRound = state.round + 1;
    const shouldPlay = state.playing || state.paused;
    const ok = generatePlaylist({ silent: true, previousLastText: previousLast, round: nextRound });
    if (ok) toast('第 ' + nextRound + ' 轮开始，播放清单已重新编排。', '', 1800);
    if (ok && shouldPlay) startAt(0);
  }

  function finishRound() {
    state.runId += 1;
    state.playing = false;
    state.paused = false;
    state.finished = true;
    state.inGap = false;
    pauseClock();
    clearTimeout(state.gapTimer);
    state.gapTimer = null;
    updatePlayerUI();
    releaseWakeLock();
    toast('本轮朗读完成。', 'success', 2600);
  }

  function stopPlayback(options) {
    const opts = options || {};
    cancelPrioritySpeech(false);
    state.runId += 1;
    clearTimeout(state.gapTimer);
    state.gapTimer = null;
    state.inGap = false;
    cancelOutput();
    state.playing = false;
    state.paused = false;
    if (opts.resetSelection) state.current = -1;
    if (opts.resetClock) resetClock();
    else pauseClock();
    state.finished = false;
    releaseWakeLock();
    updatePlayerUI();
    updateQueueCurrent();
  }

  function cancelOutput() {
    if (state.cancelCurrentUtterance) {
      try { state.cancelCurrentUtterance(); } catch (_) { /* ignore */ }
      state.cancelCurrentUtterance = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) { /* ignore */ }
    }
    if (state.abortController) {
      try { state.abortController.abort(); } catch (_) { /* ignore */ }
      state.abortController = null;
    }
    stopAudioSource();
  }

  function primeAudioContext() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!state.audioCtx) {
        state.audioCtx = new Ctx();
        state.audioGain = state.audioCtx.createGain();
        state.audioGain.gain.value = state.settings.volume;
        state.audioGain.connect(state.audioCtx.destination);
      }
      void applyOutputToContext(state.audioCtx);
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(function () {});
    } catch (_) {
      // speakEdge 会给出更明确的提示并回退到本地语音。
    }
  }

  async function ensureAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('当前浏览器不支持 Web Audio');
    if (!state.audioCtx) {
      state.audioCtx = new Ctx();
      state.audioGain = state.audioCtx.createGain();
      state.audioGain.gain.value = state.settings.volume;
      state.audioGain.connect(state.audioCtx.destination);
    }
    await applyOutputToContext(state.audioCtx);
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.audioGain.gain.value = state.settings.volume;
  }

  function formatSigned(value, unit) {
    const rounded = Math.round(value);
    return (rounded >= 0 ? '+' : '') + rounded + unit;
  }

  function isRemoteEngine() {
    return ['edge', 'azure', 'volcengine', 'cosyvoice', 'kokoro'].includes(state.settings.engine);
  }

  function remoteEngineReady() {
    if (state.settings.engine === 'kokoro') return Boolean(state.server.kokoroReady);
    if (state.settings.engine === 'azure') {
      return Boolean(state.server.available && state.settings.azureKey && state.settings.azureRegion);
    }
    if (state.settings.engine === 'volcengine') {
      return Boolean(state.server.available && state.settings.volcAppId && state.settings.volcToken);
    }
    if (state.settings.engine === 'cosyvoice') {
      return Boolean(state.server.available && state.settings.cosyKey);
    }
    return Boolean(state.server.available && state.server.edgeTts);
  }

  function edgeOptions() {
    return {
      engine: 'edge',
      voice: state.settings.edgeVoice,
      rate: formatSigned((state.settings.rate - 1) * 100, '%'),
      pitch: formatSigned(state.settings.pitch * 2, 'Hz'),
      volume: formatSigned((state.settings.volume - 1) * 100, '%')
    };
  }

  function ttsOptions() {
    if (state.settings.engine === 'kokoro') {
      return {
        engine: 'kokoro',
        voice: state.settings.kokoroVoice || 'zf_001',
        speed: Math.round(clamp(Number(state.settings.rate), 0.5, 2) * 10) / 10
      };
    }
    if (state.settings.engine === 'azure') {
      return {
        engine: 'azure',
        voice: state.settings.azureVoice || 'zh-CN-XiaoxiaoNeural',
        key: state.settings.azureKey,
        region: state.settings.azureRegion || 'eastasia',
        style: state.settings.azureStyle || '',
        rate: formatSigned((state.settings.rate - 1) * 100, '%'),
        pitch: formatSigned(state.settings.pitch * 2, 'Hz'),
        volume: formatSigned((state.settings.volume - 1) * 100, '%')
      };
    }
    if (state.settings.engine === 'volcengine') {
      return {
        engine: 'volcengine',
        voice: state.settings.volcVoice || 'zh_female_shuangkuaisisi_moon_bigtts',
        appId: state.settings.volcAppId,
        token: state.settings.volcToken,
        cluster: state.settings.volcCluster || 'volcano_tts',
        rateValue: state.settings.rate,
        pitchValue: state.settings.pitch,
        volumeValue: state.settings.volume
      };
    }
    if (state.settings.engine === 'cosyvoice') {
      return {
        engine: 'cosyvoice',
        voice: state.settings.cosyVoice || 'longanyang',
        key: state.settings.cosyKey,
        workspace: state.settings.cosyWorkspace || '',
        region: state.settings.cosyRegion || 'cn-beijing',
        model: state.settings.cosyModel || 'cosyvoice-v3-flash',
        rateValue: state.settings.rate,
        pitchValue: state.settings.pitch,
        volumeValue: state.settings.volume
      };
    }
    return edgeOptions();
  }

  function ttsCacheKey(text, options) {
    return [
      options.engine || 'edge', text, options.voice,
      options.rate || '', options.pitch || '', options.volume || '', options.speed || '',
      options.region || '', options.style || '', options.cluster || '', options.model || '',
      options.workspace || '', options.rateValue || '', options.pitchValue || '', options.volumeValue || ''
    ].join('\u0001');
  }

  function putAudioCache(key, buffer) {
    if (state.audioCache.size >= 36) {
      const first = state.audioCache.keys().next().value;
      state.audioCache.delete(first);
    }
    state.audioCache.set(key, buffer);
  }

  async function speakEdge(item, run) {
    if (!remoteEngineReady()) {
      const label = state.settings.engine === 'kokoro' ? 'Kokoro 本地服务' : '在线语音';
      toast(label + '暂不可用，已暂时切换到本地语音。', 'error', 4200);
      switchToLocal();
      return speakLocal(item, run);
    }

    try {
      const spokenText = sanitizeBlocked(item.text);
      if (!spokenText) return { ok: true, skipped: true };
      await ensureAudioContext();
      if (run !== state.runId) return { ok: false, aborted: true };

      const options = ttsOptions();
      const key = ttsCacheKey(spokenText, options);
      let buffer = state.audioCache.get(key);

      if (!buffer) {
        state.abortController = new AbortController();
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: options.engine,
            text: spokenText,
            voice: options.voice,
            key: options.key,
            region: options.region,
            style: options.style,
            appId: options.appId,
            token: options.token,
            cluster: options.cluster,
            workspace: options.workspace,
            model: options.model,
            rate: options.rate,
            pitch: options.pitch,
            volume: options.volume,
            rateValue: options.rateValue,
            pitchValue: options.pitchValue,
            volumeValue: options.volumeValue,
            speed: options.speed
          }),
          signal: state.abortController.signal
        });
        state.abortController = null;

        if (!response.ok) {
          let message = '在线语音合成失败';
          try {
            const data = await response.json();
            if (data && data.message) message = data.message;
          } catch (_) { /* ignore */ }
          throw new Error(message);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (run !== state.runId) return { ok: false, aborted: true };
        buffer = await state.audioCtx.decodeAudioData(arrayBuffer.slice(0));
        putAudioCache(key, buffer);
      }

      if (run !== state.runId) return { ok: false, aborted: true };
      const result = await playAudioBuffer(buffer);
      return result;
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, aborted: true };
      if (run !== state.runId) return { ok: false, aborted: true };
      console.warn('远程语音不可用，回退本地语音', err);
      if (!state.edgeWarned) {
        state.edgeWarned = true;
        toast('远程语音暂不可用，已自动切换到本地语音。', 'error', 4200);
      }
      switchToLocal();
      return speakLocal(item, run);
    }
  }

  function playAudioBuffer(buffer) {
    return new Promise(function (resolve) {
      if (!state.audioCtx || !state.audioGain) {
        resolve({ ok: false, error: 'audio_context' });
        return;
      }
      stopAudioSource();
      const source = state.audioCtx.createBufferSource();
      source.buffer = buffer;
      const jitter = state.settings.jitter ? 1 + (Math.random() * 2 - 1) * 0.035 : 1;
      source.playbackRate.value = jitter;
      source.connect(state.audioGain);
      state.audioSource = source;

      let settled = false;
      const finish = function (value) {
        if (settled) return;
        settled = true;
        state.audioStopResolve = null;
        if (state.audioSource === source) state.audioSource = null;
        try { source.disconnect(); } catch (_) { /* ignore */ }
        resolve(value);
      };

      state.audioStopResolve = function () { finish({ ok: false, stopped: true }); };
      source.onended = function () { finish({ ok: true }); };
      try {
        source.start(0);
      } catch (_) {
        finish({ ok: false, error: 'audio_start' });
      }
    });
  }

  function stopAudioSource() {
    const source = state.audioSource;
    const stopResolve = state.audioStopResolve;
    state.audioSource = null;
    state.audioStopResolve = null;
    if (source) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (_) { /* already stopped */ }
    }
    if (stopResolve) stopResolve();
  }

  function switchToLocal() {
    if (state.settings.engine === 'local') return;
    state.settings.engine = 'local';
    els.engineSelect.value = 'local';
    updateEngineUI();
    persist();
  }

  function offlineVoice() {
    const zh = state.voices.filter(function (voice) { return /^zh/i.test(voice.lang); });
    return zh.find(function (voice) {
      return !/Online|Natural|自然/i.test(String(voice.name || '')) && !isRegionalVoice(voice);
    }) || zh.find(function (voice) {
      return !/Online|Natural|自然/i.test(String(voice.name || ''));
    }) || null;
  }

  function speakLocalOnce(item, run, voiceOverride) {
    return new Promise(function (resolve) {
      if (run !== state.runId) {
        resolve({ ok: false, aborted: true });
        return;
      }
      if (!('speechSynthesis' in window)) {
        resolve({ ok: false, error: 'unsupported' });
        return;
      }
      const spokenText = sanitizeBlocked(item.text);
      if (!spokenText) {
        resolve({ ok: true, skipped: true });
        return;
      }
      const synth = window.speechSynthesis;
      try { synth.cancel(); } catch (_) { /* ignore */ }
      try { if (synth.paused) synth.resume(); } catch (_) { /* ignore */ }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voice = voiceOverride || getVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'zh-CN';
      } else {
        utterance.lang = 'zh-CN';
      }
      const jitter = state.settings.jitter ? 1 + (Math.random() * 2 - 1) * 0.035 : 1;
      utterance.rate = clamp(state.settings.rate * jitter, 0.5, 2);
      utterance.pitch = clamp(1 + state.settings.pitch / 100, 0.5, 2);
      utterance.volume = clamp(state.settings.volume, 0, 1);

      let settled = false;
      let safetyTimer = null;
      let cancelCurrent = null;
      const cleanup = function () {
        if (settled) return;
        settled = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        if (state.currentUtterance === utterance) state.currentUtterance = null;
        if (state.cancelCurrentUtterance === cancelCurrent) state.cancelCurrentUtterance = null;
      };

      cancelCurrent = function () {
        cleanup();
        try { synth.cancel(); } catch (_) { /* ignore */ }
        resolve({ ok: false, aborted: true });
      };

      utterance.onend = function () {
        cleanup();
        resolve({ ok: true });
      };
      utterance.onerror = function (event) {
        cleanup();
        resolve({ ok: false, error: event.error || 'speech_error' });
      };

      state.currentUtterance = utterance;
      state.cancelCurrentUtterance = cancelCurrent;
      const expected = Core.estimateDuration(spokenText, utterance.rate) * 1000;
      safetyTimer = setTimeout(function () {
        if (settled) return;
        cleanup();
        try { synth.cancel(); } catch (_) { /* ignore */ }
        resolve({ ok: false, error: 'timeout' });
      }, Math.max(9000, expected + 9000));

      try {
        synth.speak(utterance);
      } catch (err) {
        cleanup();
        resolve({ ok: false, error: 'speak_failed' });
      }

      if (run !== state.runId) {
        cleanup();
        try { synth.cancel(); } catch (_) { /* ignore */ }
        resolve({ ok: false, aborted: true });
      }
    });
  }

  async function speakLocal(item, run) {
    const selected = getVoice();
    const selectedIsOnline = selected && /Online|Natural|自然/i.test(String(selected.name || ''));
    const result = await speakLocalOnce(item, run, selected);

    if (!result || result.ok || result.aborted) return result;
    if (!selectedIsOnline || run !== state.runId) return result;
    if (['not-allowed', 'interrupted', 'canceled', 'cancelled'].indexOf(result.error) !== -1) return result;

    const fallback = offlineVoice();
    if (!fallback) return result;

    state.settings.voiceURI = fallback.voiceURI;
    populateVoices();
    updateVoiceHint();
    persist();
    toast('在线音色不可用，已切换到本地音色“' + voiceLabel(fallback).replace(/ · zh-.*$/, '') + '”。', '', 4200);
    return speakLocalOnce(item, run, fallback);
  }

  function showPriorityBadge() {
    if (els.priorityBadge) els.priorityBadge.hidden = false;
    if (els.playerCard) els.playerCard.classList.add('priority');
  }

  function hidePriorityBadge() {
    if (els.priorityBadge) els.priorityBadge.hidden = true;
    if (els.playerCard) els.playerCard.classList.remove('priority');
  }

  function stopReplyAudio() {
    const source = state.replyAudioSource;
    const stopResolve = state.replyStopResolve;
    state.replyAudioSource = null;
    state.replyStopResolve = null;
    if (source) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (_) { /* ignore */ }
    }
    if (stopResolve) stopResolve();
    if (state.replyAbort) {
      try { state.replyAbort.abort(); } catch (_) { /* ignore */ }
      state.replyAbort = null;
    }
    if (state.replyAudioCtx && state.replyAudioCtx.state === 'running') {
      state.replyAudioCtx.suspend().catch(function () {});
    }
  }

  function stopPriorityLocal() {
    if (state.priorityUtteranceCancel) {
      try { state.priorityUtteranceCancel(); } catch (_) { /* ignore */ }
      state.priorityUtteranceCancel = null;
    }
  }

  function speakPriorityLocal(text, generation) {
    return new Promise(function (resolve) {
      const spokenText = sanitizeBlocked(text);
      if (!spokenText) {
        resolve(true);
        return;
      }
      if (generation !== state.priorityGeneration) {
        resolve(false);
        return;
      }
      if (!('speechSynthesis' in window)) {
        resolve(false);
        return;
      }
      const synth = window.speechSynthesis;
      try { synth.cancel(); } catch (_) { /* ignore */ }
      try { if (synth.paused) synth.resume(); } catch (_) { /* ignore */ }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'zh-CN';
      } else {
        utterance.lang = 'zh-CN';
      }
      const jitter = state.settings.jitter ? 1 + (Math.random() * 2 - 1) * 0.025 : 1;
      utterance.rate = clamp(state.settings.rate * jitter, 0.5, 2);
      utterance.pitch = clamp(1 + state.settings.pitch / 100, 0.5, 2);
      utterance.volume = clamp(state.settings.volume, 0, 1);

      let settled = false;
      let safetyTimer = null;
      const cleanup = function () {
        if (settled) return;
        settled = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        if (state.priorityUtteranceCancel === cancel) state.priorityUtteranceCancel = null;
        if (state.priorityUtterance === utterance) state.priorityUtterance = null;
      };
      const finish = function (ok) {
        cleanup();
        resolve(ok);
      };
      const cancel = function () {
        cleanup();
        try { synth.cancel(); } catch (_) { /* ignore */ }
        resolve(false);
      };

      utterance.onend = function () { finish(true); };
      utterance.onerror = function () { finish(false); };
      state.priorityUtterance = utterance;
      state.priorityUtteranceCancel = cancel;
      const expected = Core.estimateDuration(spokenText, utterance.rate) * 1000;
      safetyTimer = setTimeout(function () {
        if (settled) return;
        cleanup();
        try { synth.cancel(); } catch (_) { /* ignore */ }
        resolve(false);
      }, Math.max(8000, expected + 8000));

      try {
        synth.speak(utterance);
      } catch (_) {
        finish(false);
      }
    });
  }

  async function speakPriorityEdge(text, generation) {
    if (!remoteEngineReady()) return false;
    const spokenText = sanitizeBlocked(text);
    if (!spokenText) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      if (!state.replyAudioCtx) state.replyAudioCtx = new Ctx();
      await applyOutputToContext(state.replyAudioCtx);
      if (state.replyAudioCtx.state === 'suspended') await state.replyAudioCtx.resume();
      const gain = state.replyAudioCtx.createGain();
      gain.gain.value = clamp(state.settings.volume, 0, 1);
      gain.connect(state.replyAudioCtx.destination);

      const options = ttsOptions();
      const key = ttsCacheKey(spokenText, options);
      let buffer = state.audioCache.get(key);
      if (!buffer) {
        const controller = new AbortController();
        state.replyAbort = controller;
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: options.engine,
            text: spokenText,
            voice: options.voice,
            key: options.key,
            region: options.region,
            style: options.style,
            appId: options.appId,
            token: options.token,
            cluster: options.cluster,
            workspace: options.workspace,
            model: options.model,
            rate: options.rate,
            pitch: options.pitch,
            volume: options.volume,
            rateValue: options.rateValue,
            pitchValue: options.pitchValue,
            volumeValue: options.volumeValue,
            speed: options.speed
          }),
          signal: controller.signal
        });
        state.replyAbort = null;
        if (!response.ok) throw new Error('tts failed');
        const arrayBuffer = await response.arrayBuffer();
        if (generation !== state.priorityGeneration) return false;
        buffer = await state.replyAudioCtx.decodeAudioData(arrayBuffer.slice(0));
        state.audioCache.set(key, buffer);
      }
      if (generation !== state.priorityGeneration) return false;
      return await new Promise(function (resolve) {
        const source = state.replyAudioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        state.replyAudioSource = source;
        let settled = false;
        const finish = function (ok) {
          if (settled) return;
          settled = true;
          state.replyStopResolve = null;
          if (state.replyAudioSource === source) state.replyAudioSource = null;
          try { source.disconnect(); gain.disconnect(); } catch (_) { /* ignore */ }
          resolve(ok);
        };
        state.replyStopResolve = function () { finish(false); };
        source.onended = function () { finish(true); };
        try {
          source.start(0);
        } catch (_) {
          finish(false);
        }
      });
    } catch (_) {
      return false;
    }
  }

  async function speakPriorityText(text, generation) {
    if (isRemoteEngine() && remoteEngineReady()) {
      const ok = await speakPriorityEdge(text, generation);
      if (ok) return true;
    }
    return speakPriorityLocal(text, generation);
  }

  async function pauseMainForPriority() {
    state.priorityMode = 'none';
    state.priorityWasPlaying = state.playing && !state.paused;
    if (!state.priorityWasPlaying) return;

    if (state.inGap) {
      clearTimeout(state.gapTimer);
      state.gapTimer = null;
      state.inGap = false;
      state.priorityMode = 'advance';
      state.priorityResumeIndex = state.current + 1;
      state.paused = true;
      pauseClock();
    } else if (isRemoteEngine() && state.audioCtx) {
      state.priorityMode = 'resume';
      state.paused = true;
      pauseClock();
      try { await state.audioCtx.suspend(); } catch (_) { /* ignore */ }
    } else {
      state.priorityMode = 'restart';
      state.priorityRestartIndex = state.current;
      state.paused = true;
      pauseClock();
      state.runId += 1;
      cancelOutput();
    }
    updatePlayerUI();
  }

  async function resumeMainAfterPriority() {
    const mode = state.priorityMode;
    state.priorityMode = 'none';
    hidePriorityBadge();
    if (mode === 'resume') {
      state.paused = false;
      resumeClock();
      if (state.audioCtx) {
        try { await state.audioCtx.resume(); } catch (_) { /* ignore */ }
      }
      updatePlayerUI();
    } else if (mode === 'restart') {
      const index = state.priorityRestartIndex;
      state.priorityRestartIndex = -1;
      state.paused = false;
      if (index >= 0 && index < state.queue.length) startAt(index);
      else updatePlayerUI();
    } else if (mode === 'advance') {
      const index = state.priorityResumeIndex;
      state.priorityResumeIndex = -1;
      state.paused = false;
      if (index >= state.queue.length) {
        if (state.settings.loop) startNewRound();
        else finishRound();
      } else {
        startAt(index);
      }
    } else {
      updatePlayerUI();
    }
    state.priorityWasPlaying = false;
  }

  async function processPriorityQueue(generation) {
    await pauseMainForPriority();
    while (state.priorityActive && generation === state.priorityGeneration && state.priorityQueue.length) {
      const text = state.priorityQueue.shift();
      await speakPriorityText(text, generation);
    }
    if (generation !== state.priorityGeneration) return;
    state.priorityActive = false;
    await resumeMainAfterPriority();
  }

  function speakChatReply(text) {
    const clean = sanitizeBlocked(String(text || '').replace(/\s+/g, ' ').trim());
    if (!clean) return;
    if (state.priorityQueue.length >= 5) return;
    state.priorityQueue.push(clean);
    if (state.priorityActive) return;
    state.priorityActive = true;
    state.priorityGeneration += 1;
    showPriorityBadge();
    void processPriorityQueue(state.priorityGeneration);
  }

  function cancelPrioritySpeech(resume) {
    const wasActive = state.priorityActive;
    state.priorityActive = false;
    state.priorityQueue = [];
    state.priorityGeneration += 1;
    stopReplyAudio();
    stopPriorityLocal();
    hidePriorityBadge();
    if (resume && wasActive) {
      void resumeMainAfterPriority();
    } else {
      state.priorityMode = 'none';
      state.priorityWasPlaying = false;
    }
  }

  window.CarLiveVoice = {
    speakChatReply: speakChatReply,
    cancelChatSpeech: function () { cancelPrioritySpeech(true); },
    isSpeaking: function () { return state.priorityActive; }
  };

  async function togglePlay() {
    if (state.testing) return;
    if (state.priorityActive) {
      toast('正在语音回复公屏，稍后会继续讲稿。', '', 1800);
      return;
    }
    if (!state.queue.length) {
      const ok = generatePlaylist({ silent: true });
      if (!ok) return;
    }
    if (state.playing) {
      togglePause();
      return;
    }
    if (state.finished || state.current < 0) state.current = 0;
    startAt(state.current);
  }

  async function togglePause() {
    if (!state.playing) return;
    if (state.paused) {
      state.paused = false;
      resumeClock();
      if (state.inGap) {
        state.inGap = false;
        scheduleAdvance(state.runId);
      } else if (isRemoteEngine() && state.audioCtx) {
        try { await state.audioCtx.resume(); } catch (_) { /* ignore */ }
      } else if ('speechSynthesis' in window) {
        try { window.speechSynthesis.resume(); } catch (_) { /* ignore */ }
      }
      updatePlayerUI();
    } else {
      state.paused = true;
      pauseClock();
      if (state.inGap) {
        clearTimeout(state.gapTimer);
        state.gapTimer = null;
      } else if (isRemoteEngine() && state.audioCtx) {
        try { await state.audioCtx.suspend(); } catch (_) { /* ignore */ }
      } else if ('speechSynthesis' in window) {
        try { window.speechSynthesis.pause(); } catch (_) { /* ignore */ }
      }
      updatePlayerUI();
    }
  }

  function playNext() {
    if (!state.queue.length) return;
    if (state.priorityActive) cancelPrioritySpeech(false);
    if (state.current + 1 >= state.queue.length) {
      if (state.settings.loop) startNewRound();
      else finishRound();
      return;
    }
    if (state.playing || state.paused) startAt(state.current + 1);
    else {
      state.current = state.current + 1;
      updatePlayerUI();
      updateQueueCurrent();
    }
  }

  function playPrevious() {
    if (!state.queue.length) return;
    if (state.priorityActive) cancelPrioritySpeech(false);
    const target = Math.max(0, state.current - 1);
    if (state.playing || state.paused) startAt(target);
    else {
      state.current = target;
      updatePlayerUI();
      updateQueueCurrent();
    }
  }

  function jumpTo(index) {
    if (!state.queue.length) return;
    if (state.priorityActive) cancelPrioritySpeech(false);
    startAt(index);
  }

  async function generateVoicePack() {
    if (state.packGenerating) return;
    if (!isRemoteEngine()) {
      toast('请先切换到“Edge 自然语音”或“Kokoro 本地语音”。', 'error');
      return;
    }
    if (!remoteEngineReady()) {
      toast(state.settings.engine === 'kokoro'
        ? '需要先启动 Kokoro 本地服务。'
        : '需要先安装 Edge 自然语音组件。', 'error', 4200);
      return;
    }
    if (!state.queue.length) {
      toast('请先生成播放清单，再生成离线语音包。', 'error');
      return;
    }

    const options = ttsOptions();
    const texts = state.queue.map(function (item) { return sanitizeBlocked(item.text); }).filter(Boolean);
    state.packGenerating = true;
    updatePackUI();
    let done = 0;
    try {
      for (let i = 0; i < texts.length; i += 1) {
        let response = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              engine: options.engine,
              text: texts[i],
              voice: options.voice,
              rate: options.rate,
              pitch: options.pitch,
              volume: options.volume,
              speed: options.speed
            })
          });
          if (response.ok) break;
          if (attempt === 0) await new Promise(function (resolve) { setTimeout(resolve, 700); });
        }
        if (!response || !response.ok) {
          let message = '离线包生成失败';
          try {
            const data = await response.json();
            if (data && data.message) message = data.message;
          } catch (_) { /* ignore */ }
          throw new Error(message);
        }
        await response.arrayBuffer();
        done += 1;
        if (els.packState) els.packState.textContent = '正在缓存 ' + done + ' / ' + texts.length + ' 句…';
      }
      state.packGenerating = false;
      updatePackUI();
      if (els.packState) els.packState.textContent = '已缓存 ' + texts.length + ' 句 · 当前清单可离线播放';
      toast('离线语音包已生成，当前清单可断网播放。', 'success', 4200);
    } catch (err) {
      state.packGenerating = false;
      updatePackUI();
      toast(err.message || '离线包生成失败，请检查语音服务。', 'error', 4200);
    }
  }

  async function testVoice() {
    if (state.testing) return;
    if (isRemoteEngine() && !remoteEngineReady()) {
      const messages = {
        kokoro: 'Kokoro 本地服务未启动，请先运行“启动Kokoro语音.cmd”。',
        azure: '请先填写 Azure Speech Key 和区域。',
        volcengine: '请先填写火山引擎 AppID 和 Access Token。',
        cosyvoice: '请先填写阿里云百炼 API Key。',
        edge: '在线语音组件尚未安装，请先安装 Edge 自然语音组件。'
      };
      toast(messages[state.settings.engine] || '当前语音引擎尚未配置。', 'error', 4200);
      return;
    }
    stopPlayback({ silent: true, resetSelection: false, resetClock: true });
    state.testing = true;
    els.testBtn.classList.add('active');
    els.testLabel.textContent = '试听中…';
    els.testBtn.disabled = true;
    els.playerCard.classList.add('playing');

    const text = '家人们，欢迎来到直播间。今天带大家看一台很有质感的家用SUV，空间宽敞，开起来也很舒服。';
    const item = { text: text, parts: [{ text: text, changed: false }] };
    const run = ++state.runId;
    let result;
    try {
      if (isRemoteEngine()) {
        primeAudioContext();
        result = await speakEdge(item, run);
      } else {
        result = await speakLocal(item, run);
      }
    } catch (_) {
      result = { ok: false };
    }

    state.testing = false;
    els.testBtn.classList.remove('active');
    els.testLabel.textContent = '试听音色';
    els.testBtn.disabled = false;
    els.playerCard.classList.toggle('playing', state.playing && !state.paused);
    if (!result || !result.ok) {
      if (!result || !result.aborted) toast('试听失败，请换一个音色或引擎。', 'error', 3000);
    }
  }

  async function unlockWakeLock() {
    try {
      if ('wakeLock' in navigator && !state.wakeLock) {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', function () { state.wakeLock = null; });
      }
    } catch (_) {
      // 不支持或用户拒绝时静默跳过。
    }
  }

  function requestWakeLock() {
    if (document.visibilityState === 'visible') unlockWakeLock();
  }

  function releaseWakeLock() {
    if (state.wakeLock) {
      try { state.wakeLock.release(); } catch (_) { /* ignore */ }
      state.wakeLock = null;
    }
  }

  function exportQueue() {
    if (!state.queue.length) return;
    const now = new Date();
    const stamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const modelNames = [];
    state.queue.forEach(function (item) {
      if (item.modelName && !modelNames.includes(item.modelName)) modelNames.push(item.modelName);
    });
    const lines = [
      '驰声 · 汽车直播口播清单',
      '车型：' + (state.multi ? modelNames.join(' / ') : modelName(state.activeModel)),
      '生成时间：' + now.toLocaleString('zh-CN'),
      '朗读顺序：' + Core.MODES[state.settings.mode].label,
      '改写强度：' + state.settings.strength + '%',
      '',
      '----------------------------------------',
      ''
    ];
    state.queue.forEach(function (item, index) {
      const paragraph = item.paragraphIndex ? '第' + item.paragraphIndex + '段' : '全篇';
      const modelPrefix = state.multi ? '[' + (item.modelName || '通用') + ']  ' : '';
      lines.push(String(index + 1).padStart(2, '0') + '  ' + modelPrefix + '[' + paragraph + ']  ' + item.text);
      lines.push('');
    });
    lines.push('----------------------------------------');
    lines.push('说明：本清单由本地工具生成，合成语音请按直播平台规则标注。');

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '口播清单-' + modelName(state.activeModel) + '-' + stamp + '.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
    toast('播放清单已导出。', 'success');
  }

  function extractDocxText(arrayBuffer) {
    return new Promise(function (resolve, reject) {
      try {
        const view = new DataView(arrayBuffer);
        let eocd = -1;
        const min = Math.max(0, arrayBuffer.byteLength - 65557);
        for (let i = arrayBuffer.byteLength - 22; i >= min; i -= 1) {
          if (view.getUint32(i, true) === 0x06054b50) {
            eocd = i;
            break;
          }
        }
        if (eocd < 0) throw new Error('不是有效的 Word 文件');

        const count = view.getUint16(eocd + 10, true);
        let offset = view.getUint32(eocd + 16, true);
        let target = null;

        for (let i = 0; i < count; i += 1) {
          if (view.getUint32(offset, true) !== 0x02014b50) break;
          const method = view.getUint16(offset + 10, true);
          const compressedSize = view.getUint32(offset + 20, true);
          const nameLength = view.getUint16(offset + 28, true);
          const extraLength = view.getUint16(offset + 30, true);
          const commentLength = view.getUint16(offset + 32, true);
          const localOffset = view.getUint32(offset + 42, true);
          const nameBytes = new Uint8Array(arrayBuffer, offset + 46, nameLength);
          const name = new TextDecoder('utf-8').decode(nameBytes);
          if (name === 'word/document.xml') {
            target = { method: method, compressedSize: compressedSize, localOffset: localOffset };
          }
          offset += 46 + nameLength + extraLength + commentLength;
        }

        if (!target) throw new Error('Word 文件中没有正文');
        const localNameLength = view.getUint16(target.localOffset + 26, true);
        const localExtraLength = view.getUint16(target.localOffset + 28, true);
        const dataStart = target.localOffset + 30 + localNameLength + localExtraLength;
        const compressed = new Uint8Array(arrayBuffer, dataStart, target.compressedSize);

        const decodeXml = function (bytes) {
          const xml = new TextDecoder('utf-8').decode(bytes);
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          const paragraphs = Array.prototype.slice.call(doc.getElementsByTagNameNS('*', 'p'));
          return paragraphs.map(function (paragraph) {
            const pieces = [];
            Array.prototype.slice.call(paragraph.getElementsByTagNameNS('*', 't')).forEach(function (node) {
              pieces.push(node.textContent || '');
            });
            return pieces.join('').trim();
          }).filter(Boolean).join('\n\n');
        };

        if (target.method === 0) {
          resolve(decodeXml(compressed));
          return;
        }
        if (target.method !== 8) throw new Error('暂不支持这种 Word 压缩格式');
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('当前浏览器不支持 .docx 解压，请另存为 TXT 后导入');
        }
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        new Response(stream).arrayBuffer().then(function (inflated) {
          resolve(decodeXml(new Uint8Array(inflated)));
        }).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast('文件太大，请导入 15MB 以内的讲稿。', 'error');
      return;
    }
    const name = file.name.toLowerCase();
    try {
      let text;
      if (name.endsWith('.docx')) {
        text = await extractDocxText(await file.arrayBuffer());
      } else if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
        text = await file.text();
      } else {
        toast('只支持 TXT、Markdown 或 Word（.docx）文件。', 'error');
        return;
      }
      text = String(text || '').trim();
      if (!text) {
        toast('文件里没有可朗读的文字。', 'error');
        return;
      }

      const split = Core.splitByModels(text);
      if (split.hasHeadings) {
        if (!split.detected.length) {
          toast('检测到了车型标题，但标题下面没有正文。请检查文档格式。', 'error', 4200);
          return;
        }
        const applied = applyDetectedSections(split, {
          rebuildAll: split.detected.length >= 2,
          confirmRebuild: split.detected.length >= 2
        });
        if (applied) {
          toast('已导入并按车型拆分：' + file.name, 'success', 3600);
        }
        return;
      }

      stopPlayback({ silent: true, resetSelection: true, resetClock: true });
      state.queue = [];
      state.rawText = text;
      state.scripts[state.activeModel] = text;
      els.scriptInput.value = text;
      refreshParsed();
      clearStale();
      renderAll();
      updateModelUI();
      persist(true);
      toast('已导入到「' + modelName(state.activeModel) + '」：' + file.name, 'success', 3200);
    } catch (err) {
      console.error(err);
      toast(err.message || '导入失败，请换一个文件试试。', 'error', 4200);
    } finally {
      els.fileInput.value = '';
    }
  }

  function loadSample() {
    if (state.rawText.trim() && state.rawText.trim() !== Core.SAMPLE_SCRIPT.trim()) {
      if (!window.confirm('载入示例会替换「' + modelName(state.activeModel) + '」当前讲稿，确定继续吗？')) return;
    }
    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    state.queue = [];
    state.rawText = Core.SAMPLE_SCRIPT;
    state.scripts[state.activeModel] = Core.SAMPLE_SCRIPT;
    els.scriptInput.value = Core.SAMPLE_SCRIPT;
    refreshParsed();
    clearStale();
    renderAll();
    updateModelUI();
    persist(true);
    toast('已载入示例讲稿，点击“生成并开始朗读”试试。', 'success', 3200);
  }

  function clearScript() {
    if (!state.rawText.trim() && !state.queue.length) return;
    if (!window.confirm('清空「' + modelName(state.activeModel) + '」的讲稿和播放清单？此操作不可撤销。')) return;
    stopPlayback({ silent: true, resetSelection: true, resetClock: true });
    state.queue = [];
    state.rawText = '';
    state.scripts[state.activeModel] = '';
    els.scriptInput.value = '';
    refreshParsed();
    clearStale();
    renderAll();
    updateModelUI();
    persist(true);
    els.scriptInput.focus();
    toast('已清空「' + modelName(state.activeModel) + '」。');
  }

  const VIEW_COPY = {
    script: {
      eyebrow: 'LIVE SCRIPT CONSOLE / 2026',
      title: '直播口播台',
      subtitle: '一份文档管理多车型讲稿，随机编排、近义改写、连续口播。'
    },
    chat: {
      eyebrow: 'LIVE CHAT ASSIST / DOUYIN',
      title: '直播互动',
      subtitle: '读取抖音公屏，按关键词欢迎和回复；语音播报时自动暂停讲稿，播完继续。'
    }
  };

  function switchView(view, options) {
    const opts = options || {};
    const isChat = view === 'chat';
    if (els.scriptView) els.scriptView.hidden = isChat;
    if (els.chatView) els.chatView.hidden = !isChat;
    document.body.classList.toggle('chat-view-mode', isChat);

    [els.navScript, els.navChat, els.navQueue].forEach(function (button) {
      if (!button) return;
      button.classList.remove('active');
    });
    const activeNav = isChat ? els.navChat : els.navScript;
    if (activeNav) activeNav.classList.add('active');

    const copy = VIEW_COPY[isChat ? 'chat' : 'script'];
    if (els.topEyebrow) els.topEyebrow.textContent = copy.eyebrow;
    if (els.topTitle) els.topTitle.textContent = copy.title;
    if (els.topSubtitle) els.topSubtitle.textContent = copy.subtitle;
    if (els.serverPill) els.serverPill.hidden = isChat;

    if (window.CarLiveChat) {
      if (isChat) {
        Promise.resolve(window.CarLiveChat.show()).then(function () {
          window.CarLiveChat.setModel(modelName(state.activeModel));
        });
      } else {
        window.CarLiveChat.hide();
      }
    }

    if (opts.scrollTarget) {
      setTimeout(function () {
        const target = document.getElementById(opts.scrollTarget);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }

  function bindEvents() {
    els.scriptInput.addEventListener('input', function () {
      state.rawText = els.scriptInput.value;
      state.scripts[state.activeModel] = state.rawText;
      updateModelUI();
      setSaveState('saving');
      clearTimeout(state.inputTimer);
      state.inputTimer = setTimeout(function () {
        refreshParsed();
        updateModelUI();
        persist();
        setSaveState('saved');
      }, 220);
      if (state.queue.length) markQueueStale();
    });

    els.scriptInput.addEventListener('paste', function (event) {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const pasted = clipboard.getData('text');
      if (!pasted) return;
      const preview = Core.splitByModels(pasted);
      if (preview.detected.length >= 2) {
        setTimeout(function () {
          toast('检测到 ' + preview.detected.length + ' 个车型，点击“识别车型并拆分”即可分到各车型。', '', 4200);
        }, 60);
      }
    });

    els.scriptInput.addEventListener('blur', function () {
      state.rawText = els.scriptInput.value;
      state.scripts[state.activeModel] = state.rawText;
      refreshParsed();
      updateModelUI();
      persist(true);
    });

    els.modeSelect.addEventListener('change', function () {
      state.settings.mode = els.modeSelect.value;
      els.modeHint.textContent = Core.MODES[state.settings.mode].hint;
      markQueueStale();
      persist();
    });

    els.gapSelect.addEventListener('change', function () {
      state.settings.gap = Number(els.gapSelect.value);
      updateProgress();
      persist();
    });

    els.rewriteToggle.addEventListener('change', function () {
      state.settings.rewrite = els.rewriteToggle.checked;
      updateStrengthUI();
      markQueueStale();
      persist();
    });

    els.loopToggle.addEventListener('change', function () {
      state.settings.loop = els.loopToggle.checked;
      persist();
    });

    els.jitterToggle.addEventListener('change', function () {
      state.settings.jitter = els.jitterToggle.checked;
      persist();
    });

    els.strengthRange.addEventListener('input', function () {
      state.settings.strength = Number(els.strengthRange.value);
      updateStrengthUI();
      markQueueStale();
      persist();
    });

    let protectTimer = null;
    els.protectedInput.addEventListener('input', function () {
      state.settings.protectedWords = els.protectedInput.value;
      clearTimeout(protectTimer);
      protectTimer = setTimeout(function () {
        markQueueStale();
        persist();
      }, 320);
    });

    if (els.buildPlaylistBtn) {
      els.buildPlaylistBtn.addEventListener('click', function () {
        generatePlaylist();
      });
    }

    if (els.playPlaylistBtn) {
      els.playPlaylistBtn.addEventListener('click', function () {
        if (isRemoteEngine()) primeAudioContext();
        playPlaylist();
      });
    }

    els.playBtn.addEventListener('click', togglePlay);
    els.prevBtn.addEventListener('click', playPrevious);
    els.nextBtn.addEventListener('click', playNext);
    els.stopBtn.addEventListener('click', function () {
      stopPlayback({ resetSelection: true, resetClock: true });
      toast('已停止。');
    });

    els.queueShuffleBtn.addEventListener('click', function () {
      const wasActive = state.playing || state.paused;
      const previousLast = state.queue.length ? state.queue[state.queue.length - 1].text : null;
      const ok = generatePlaylist({ silent: true, previousLastText: previousLast, round: state.round + 1 });
      if (ok) {
        if (wasActive) startAt(0);
        toast('播放清单已重新编排。', 'success', 2200);
      }
    });

    if (els.multiAllBtn) {
      els.multiAllBtn.addEventListener('click', function () {
        state.multiSelected = Core.CAR_MODELS
          .filter(function (model) { return Boolean(scriptText(model.id).trim()); })
          .map(function (model) { return model.id; });
        syncMultiSelection();
        renderMultiModels();
      });
    }
    if (els.multiClearBtn) {
      els.multiClearBtn.addEventListener('click', function () {
        state.multiSelected = [];
        syncMultiSelection();
        renderMultiModels();
      });
    }
    if (els.multiBuildBtn) {
      els.multiBuildBtn.addEventListener('click', function () {
        const ok = buildMultiQueue({ autoplay: true });
        if (ok) els.queueCount.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (els.multiIntroToggle) {
      els.multiIntroToggle.addEventListener('change', function () {
        state.settings.multiIntro = els.multiIntroToggle.checked;
        persist();
      });
    }
    if (els.multiGeneralText) {
      els.multiGeneralText.addEventListener('input', function () {
        state.settings.generalIntro = els.multiGeneralText.value;
        persist();
      });
    }
    if (els.singleIntroToggle) {
      els.singleIntroToggle.addEventListener('change', function () {
        state.settings.singleIntro = els.singleIntroToggle.checked;
        persist();
      });
    }
    if (els.singleIntroText) {
      els.singleIntroText.addEventListener('input', function () {
        state.settings.singleIntroText = els.singleIntroText.value;
        persist();
      });
    }
    document.querySelectorAll('input[name="multiOrder"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        state.settings.multiOrder = radio.value === 'shuffle' ? 'shuffle' : 'preset';
        persist();
      });
    });
    if (els.autoKokoroToggle) {
      els.autoKokoroToggle.addEventListener('change', function () {
        state.settings.autoKokoro = els.autoKokoroToggle.checked;
        persist();
        if (els.autoKokoroToggle.checked) loadKokoroStatus();
      });
    }
    if (els.blockedWordsInput) {
      els.blockedWordsInput.addEventListener('input', function () {
        state.blockedWords = parseBlockWords(els.blockedWordsInput.value);
        updateBlockedCounts();
        queueBlocklistSave();
      });
    }
    window.addEventListener('beforeunload', flushBlocklist);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushBlocklist();
    });

    if (els.blockedSaveBtn) els.blockedSaveBtn.addEventListener('click', saveBlocklist);
    if (els.blockedUploadBtn && els.blockedFileInput) {
      els.blockedUploadBtn.addEventListener('click', function () { els.blockedFileInput.click(); });
      els.blockedFileInput.addEventListener('change', function () {
        const file = els.blockedFileInput.files && els.blockedFileInput.files[0];
        uploadBlockedFile(file);
        els.blockedFileInput.value = '';
      });
    }
    if (els.blockedAddBtn) els.blockedAddBtn.addEventListener('click', addBlockedReplacement);
    if (els.blockedExportWordsBtn) els.blockedExportWordsBtn.addEventListener('click', exportBlockedWords);
    if (els.blockedExportReplacementsBtn) els.blockedExportReplacementsBtn.addEventListener('click', exportReplacementTable);
    if (els.blockedImportReplacementsBtn && els.blockedReplacementsFileInput) {
      els.blockedImportReplacementsBtn.addEventListener('click', function () { els.blockedReplacementsFileInput.click(); });
      els.blockedReplacementsFileInput.addEventListener('change', function () {
        const file = els.blockedReplacementsFileInput.files && els.blockedReplacementsFileInput.files[0];
        importReplacementTable(file);
        els.blockedReplacementsFileInput.value = '';
      });
    }

    [els.blockedFromInput, els.blockedToInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          addBlockedReplacement();
        }
      });
    });

    els.queueShuffleBtn2.addEventListener('click', function () {
      els.queueShuffleBtn.click();
    });

    els.testBtn.addEventListener('click', testVoice);
    if (els.packBtn) els.packBtn.addEventListener('click', generateVoicePack);
    els.downloadBtn.addEventListener('click', exportQueue);

    els.importBtn.addEventListener('click', function () { els.fileInput.click(); });
    els.fileInput.addEventListener('change', function () {
      const file = els.fileInput.files && els.fileInput.files[0];
      importFile(file);
    });

    els.sampleBtn.addEventListener('click', loadSample);
    els.clearBtn.addEventListener('click', clearScript);
    els.splitModelsBtn.addEventListener('click', splitCurrentText);
    els.useCommonBtn.addEventListener('click', useCommonScript);

    ['dragenter', 'dragover'].forEach(function (eventName) {
      els.editorWrap.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        els.editorWrap.classList.add('dragging');
      });
    });
    ['dragleave', 'drop'].forEach(function (eventName) {
      els.editorWrap.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (eventName === 'dragleave' && els.editorWrap.contains(event.relatedTarget)) return;
        els.editorWrap.classList.remove('dragging');
      });
    });
    els.editorWrap.addEventListener('drop', function (event) {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) importFile(file);
    });

    els.engineSelect.addEventListener('change', async function () {
      const targetEngine = els.engineSelect.value;
      if (targetEngine === 'edge' && !state.server.edgeTts) {
        els.engineSelect.value = 'local';
        toast('在线语音组件还没安装，请先运行“安装自然语音.cmd”。', 'error', 4200);
        return;
      }
      if (targetEngine === 'kokoro') {
        const ready = await loadKokoroStatus();
        if (!ready) {
          els.engineSelect.value = 'local';
          toast('Kokoro 本地服务未启动。请先运行“启动Kokoro语音.cmd”，等模型加载完成再选。', 'error', 5200);
          return;
        }
      }
      state.settings.engine = targetEngine;
      if (['edge', 'azure', 'volcengine', 'cosyvoice', 'kokoro'].includes(state.settings.engine)) primeAudioContext();
      if (['edge', 'azure', 'volcengine', 'cosyvoice'].includes(state.settings.engine)) {
        state.settings.autoKokoro = false;
        if (els.autoKokoroToggle) els.autoKokoroToggle.checked = false;
      }
      updateEngineUI();
      persist();
      if (state.settings.engine === 'azure' && !state.settings.azureKey) {
        toast('请在下方填入 Azure Speech Key 和区域；保存后即可试听。', '', 5200);
      } else if (state.settings.engine === 'volcengine' && (!state.settings.volcAppId || !state.settings.volcToken)) {
        toast('请在下方填入火山引擎 AppID 和 Access Token。', '', 5200);
      } else if (state.settings.engine === 'cosyvoice' && !state.settings.cosyKey) {
        toast('请在下方填入阿里云百炼 API Key。', '', 5200);
      }
    });

    if (els.naturalVoiceBtn) {
      els.naturalVoiceBtn.addEventListener('click', function () {
        if (!state.server.edgeTts) {
          toast('还没有安装 Edge 自然语音组件，请先运行“安装自然语音.cmd”。', 'error', 4600);
          return;
        }
        state.settings.engine = 'edge';
        state.settings.autoKokoro = false;
        state.settings.edgeVoice = 'zh-CN-XiaoxiaoNeural';
        state.settings.rate = 1.05;
        state.settings.pitch = 0;
        state.settings.jitter = false;
        primeAudioContext();
        updateEngineUI();
        applySettingsToUI();
        persist();
        toast('已切换到 Edge 晓晓：语速 1.05、音调 0、关闭语气浮动。点“试听音色”听听看。', 'success', 5600);
      });
    }

    [els.volcAppIdInput, els.volcTokenInput, els.volcClusterInput, els.volcVoiceInput, els.cosyKeyInput, els.cosyWorkspaceInput, els.cosyRegionSelect, els.cosyModelSelect, els.cosyVoiceInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('change', function () {
        state.settings.volcAppId = String(els.volcAppIdInput ? els.volcAppIdInput.value : '').trim();
        state.settings.volcToken = String(els.volcTokenInput ? els.volcTokenInput.value : '').trim();
        state.settings.volcCluster = String(els.volcClusterInput ? els.volcClusterInput.value : 'volcano_tts').trim() || 'volcano_tts';
        if (els.volcVoiceInput && els.volcVoiceInput.value.trim()) state.settings.volcVoice = els.volcVoiceInput.value.trim();
        state.settings.cosyKey = String(els.cosyKeyInput ? els.cosyKeyInput.value : '').trim();
        state.settings.cosyWorkspace = String(els.cosyWorkspaceInput ? els.cosyWorkspaceInput.value : '').trim();
        state.settings.cosyRegion = String(els.cosyRegionSelect ? els.cosyRegionSelect.value : 'cn-beijing');
        state.settings.cosyModel = String(els.cosyModelSelect ? els.cosyModelSelect.value : 'cosyvoice-v3-flash');
        if (els.cosyVoiceInput && els.cosyVoiceInput.value.trim()) {
          state.settings.cosyVoice = els.cosyVoiceInput.value.trim();
        }
        updateEngineUI();
        persist();
        const configured = state.settings.engine === 'volcengine'
          ? (state.settings.volcAppId && state.settings.volcToken)
          : (state.settings.engine === 'cosyvoice' ? state.settings.cosyKey : true);
        if (configured && state.settings.engine !== 'azure') {
          toast('云端语音配置已保存，点“试听音色”测试。', 'success', 3200);
        }
      });
    });

    [els.azureKeyInput, els.azureRegionInput, els.azureStyleSelect].forEach(function (input) {
      if (!input) return;
      input.addEventListener('change', function () {
        state.settings.azureKey = String(els.azureKeyInput ? els.azureKeyInput.value : '').trim();
        state.settings.azureRegion = String(els.azureRegionInput ? els.azureRegionInput.value : 'eastasia').trim().toLowerCase() || 'eastasia';
        state.settings.azureStyle = String(els.azureStyleSelect ? els.azureStyleSelect.value : '');
        updateEngineUI();
        persist();
        if (state.settings.engine === 'azure' && state.settings.azureKey) {
          toast('Azure 配置已保存，点“试听音色”测试。', 'success', 3200);
        }
      });
    });

    els.voiceSelect.addEventListener('change', function () {
      if (state.settings.engine === 'edge') state.settings.edgeVoice = els.voiceSelect.value;
      else if (state.settings.engine === 'azure') state.settings.azureVoice = els.voiceSelect.value;
      else if (state.settings.engine === 'volcengine') {
        state.settings.volcVoice = els.voiceSelect.value;
        if (els.volcVoiceInput) els.volcVoiceInput.value = state.settings.volcVoice;
      }
      else if (state.settings.engine === 'cosyvoice') {
        state.settings.cosyVoice = els.voiceSelect.value;
        if (els.cosyVoiceInput) els.cosyVoiceInput.value = state.settings.cosyVoice;
      }
      else if (state.settings.engine === 'kokoro') state.settings.kokoroVoice = els.voiceSelect.value;
      else {
        state.settings.voiceURI = els.voiceSelect.value;
        updateVoiceHint();
      }
      updatePackUI();
      persist();
    });

    if (els.outputSelect) {
      els.outputSelect.addEventListener('change', function () {
        state.settings.outputDeviceId = els.outputSelect.value;
        if (state.audioCtx) void applyOutputToContext(state.audioCtx);
        if (state.replyAudioCtx) void applyOutputToContext(state.replyAudioCtx);
        void applyMusicSink();
        persist();
      });
    }
    if (els.refreshOutputBtn) {
      els.refreshOutputBtn.addEventListener('click', function () { loadOutputDevices(true); });
    }

    if (els.musicPlayBtn) els.musicPlayBtn.addEventListener('click', toggleMusic);
    if (els.musicNextBtn) els.musicNextBtn.addEventListener('click', nextMusic);
    if (els.musicAddBtn && els.musicFileInput) {
      els.musicAddBtn.addEventListener('click', function () { els.musicFileInput.click(); });
      els.musicFileInput.addEventListener('change', function () {
        uploadMusicFiles(els.musicFileInput.files);
        els.musicFileInput.value = '';
      });
    }
    if (els.musicClearBtn) els.musicClearBtn.addEventListener('click', clearMusic);
    if (els.musicVolume) {
      els.musicVolume.addEventListener('input', function () {
        state.settings.musicVolume = clamp(Number(els.musicVolume.value), 0, 100);
        if (els.musicVolumeVal) els.musicVolumeVal.textContent = Math.round(state.settings.musicVolume) + '%';
        if (state.musicAudio) state.musicAudio.volume = state.settings.musicVolume / 100;
        persist();
      });
    }
    if (els.musicMode) {
      els.musicMode.addEventListener('change', function () {
        state.settings.musicMode = els.musicMode.value === 'sequential' ? 'sequential' : 'random';
        updateMusicUI();
        persist();
      });
    }
    const musicCard = document.querySelector('.music-card');
    if (musicCard) {
      musicCard.addEventListener('dragover', function (event) {
        event.preventDefault();
        musicCard.classList.add('dragging');
      });
      musicCard.addEventListener('dragleave', function () { musicCard.classList.remove('dragging'); });
      musicCard.addEventListener('drop', function (event) {
        event.preventDefault();
        musicCard.classList.remove('dragging');
        if (event.dataTransfer && event.dataTransfer.files) uploadMusicFiles(event.dataTransfer.files);
      });
    }

    els.rateRange.addEventListener('input', function () {
      state.settings.rate = Number(els.rateRange.value);
      updateVoiceLabels();
      fillRange(els.rateRange);
      updateStats();
      updateProgress();
      updatePackUI();
      persist();
    });

    els.pitchRange.addEventListener('input', function () {
      state.settings.pitch = Number(els.pitchRange.value);
      updateVoiceLabels();
      fillRange(els.pitchRange);
      updatePackUI();
      persist();
    });

    els.volumeRange.addEventListener('input', function () {
      state.settings.volume = Number(els.volumeRange.value) / 100;
      updateVoiceLabels();
      fillRange(els.volumeRange);
      if (state.audioGain) state.audioGain.gain.value = state.settings.volume;
      persist();
    });

    els.queueList.addEventListener('click', function (event) {
      const row = event.target.closest('.queue-item');
      if (!row) return;
      jumpTo(Number(row.dataset.index));
    });
    els.queueList.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.queue-item');
      if (!row) return;
      event.preventDefault();
      jumpTo(Number(row.dataset.index));
    });

    [els.helpBtn, els.topHelpBtn].forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof els.helpDialog.showModal === 'function') els.helpDialog.showModal();
        else els.helpDialog.setAttribute('open', '');
      });
    });

    if (els.serverPill) {
      els.serverPill.title = '点击重新连接本地服务';
      els.serverPill.style.cursor = 'pointer';
      els.serverPill.addEventListener('click', function () {
        state.serverRetryCount = 0;
        void checkServer();
      });
    }

    if (els.blockedBtn) {
      els.blockedBtn.addEventListener('click', function () {
        if (!els.blockedPanel) return;
        els.blockedPanel.open = true;
        els.blockedPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { if (els.blockedWordsInput) els.blockedWordsInput.focus(); }, 420);
      });
    }
    [els.closeHelpBtn, els.helpDoneBtn].forEach(function (button) {
      button.addEventListener('click', function () { els.helpDialog.close(); });
    });
    els.helpDialog.addEventListener('click', function (event) {
      if (event.target === els.helpDialog) els.helpDialog.close();
    });

    els.exitBtn.addEventListener('click', async function () {
      if (!window.confirm('退出软件？关闭后需要重新运行启动脚本。')) return;
      stopPlayback({ silent: true, resetSelection: true });
      try {
        await fetch('/api/shutdown', { method: 'POST' });
      } catch (_) { /* ignore */ }
      document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#080b0f;color:#8e9baa;font-family:sans-serif">软件已退出，可以关闭此页面。</div>';
      setTimeout(function () { window.close(); }, 500);
    });

    if (els.navScript) {
      els.navScript.addEventListener('click', function () { switchView('script'); });
    }
    if (els.navChat) {
      els.navChat.addEventListener('click', function () { switchView('chat'); });
    }
    if (els.navQueue) {
      els.navQueue.addEventListener('click', function () {
        switchView('script', { scrollTarget: 'queueCard' });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (els.helpDialog.open) return;
      if (els.scriptView && els.scriptView.hidden) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (els.buildPlaylistBtn) els.buildPlaylistBtn.click();
        return;
      }
      if (event.key === 'Escape' && (state.playing || state.paused)) {
        event.preventDefault();
        stopPlayback({ resetSelection: true, resetClock: true });
        return;
      }
      const tag = (event.target && event.target.tagName) || '';
      if (['TEXTAREA', 'INPUT', 'SELECT', 'BUTTON', 'A'].indexOf(tag) !== -1) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        playNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        playPrevious();
      }
    });

    window.addEventListener('pagehide', function () {
      state.runId += 1;
      try { window.speechSynthesis.cancel(); } catch (_) { /* ignore */ }
      stopAudioSource();
      releaseWakeLock();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && state.playing && !state.paused) requestWakeLock();
    });

    window.addEventListener('error', function (event) {
      console.error(event.error || event.message);
      const box = document.getElementById('jsErrorLog') || document.body.appendChild(document.createElement('div'));
      box.id = 'jsErrorLog';
      box.hidden = true;
      box.textContent += '[error] ' + (event.message || 'unknown') + '\n';
    });
    window.addEventListener('unhandledrejection', function (event) {
      console.error('Unhandled promise rejection', event.reason);
      const box = document.getElementById('jsErrorLog') || document.body.appendChild(document.createElement('div'));
      box.id = 'jsErrorLog';
      box.hidden = true;
      box.textContent += '[rejection] ' + String(event.reason) + '\n';
    });
  }

  async function init() {
    cacheElements();
    const localState = readStorage();
    const remoteState = await readServerState();
    const saved = chooseInitialState(localState, remoteState);
    state.settings = normalizeSettings(saved && saved.settings);
    hydrateScripts(saved);
    state.rawText = scriptText(state.activeModel);

    buildModeOptions();
    buildModelPicker();
    initMultiSelection();
    applySettingsToUI();
    renderMultiModels();
    await loadBlocklist();
    els.scriptInput.value = state.rawText;
    bindEvents();
    refreshParsed();
    renderAll();
    updateModelUI();
    loadVoices();
    setTimeout(loadVoices, 350);
    setTimeout(loadVoices, 1200);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      } catch (_) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    updateEngineUI();
    loadOutputDevices(false);
    loadMusicTracks();
    checkServer();
    persist(true, { server: false });
    state.clockTimer = setInterval(function () {
      if (state.playing && !state.paused) updateElapsed();
    }, 500);

    if (!saved) {
      setTimeout(function () {
        toast('已载入示例讲稿。可直接点击“生成并开始朗读”。', '', 4200);
      }, 600);
    }

    try {
      if (new URLSearchParams(location.search).get('view') === 'chat') {
        setTimeout(function () { switchView('chat'); }, 300);
      }
    } catch (_) { /* ignore */ }
  }

  init().catch(function (err) {
    console.error(err);
  });
})();
