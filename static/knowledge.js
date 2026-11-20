'use strict';

(function () {
  const state = {
    entries: [],
    pending: [],
    session: null,
    deepseek: null,
    editingId: '',
    loading: false,
    searchTimer: null
  };
  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function cache() {
    [
      'kbCount', 'kbPendingCount', 'kbSessionCount',
      'kbSearchInput', 'kbRefreshBtn', 'kbQuestion', 'kbKeywords', 'kbAnswer',
      'kbAddBtn', 'kbList', 'pendingCount', 'pendingRefreshBtn', 'pendingList',
      'deepseekEnabled', 'deepseekKey', 'deepseekModel', 'deepseekBase',
      'deepseekSaveBtn', 'deepseekTestBtn', 'deepseekTestQuestion', 'deepseekState',
      'sessionPath', 'sessionCurrentList', 'sessionDownloadBtn', 'sessionRefreshBtn',
      'sessionHistory'
    ].forEach(function (id) { els[id] = $(id); });
  }

  function toast(message, type) {
    const el = $('toast');
    if (!el) return;
    clearTimeout(el._knowledgeTimer);
    el.textContent = message;
    el.className = 'toast show' + (type ? ' ' + type : '');
    el._knowledgeTimer = setTimeout(function () {
      el.className = 'toast' + (type ? ' ' + type : '');
    }, 2800);
  }

  async function fetchJSON(path, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs || 8000);
    try {
      const response = await fetch(path, Object.assign({
        cache: 'no-store',
        signal: controller.signal
      }, options || {}));
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.message || 'HTTP ' + response.status);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function empty(text) {
    const node = document.createElement('div');
    node.className = 'kb-empty';
    node.textContent = text;
    return node;
  }

  function formatTime(value) {
    const date = new Date(Number(value) || Date.now());
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  function renderEntries() {
    if (!els.kbList) return;
    els.kbList.textContent = '';
    if (!state.entries.length) {
      els.kbList.appendChild(empty('还没有知识条目。可以手动添加，也可以在“待人工回复”里回复后自动入库。'));
      return;
    }
    state.entries.forEach(function (entry) {
      const row = document.createElement('div');
      row.className = 'kb-item' + (entry.source === 'deepseek' ? ' ds-source' : '');

      const head = document.createElement('div');
      head.className = 'kb-item-head';
      const question = document.createElement('b');
      question.className = 'kb-item-question';
      question.textContent = entry.question || '';
      const meta = document.createElement('span');
      meta.className = 'kb-item-meta';
      meta.textContent = (entry.category || '公屏问答') + ' · 命中 ' + (entry.hits || 0);
      head.appendChild(question);
      head.appendChild(meta);

      const answer = document.createElement('div');
      answer.className = 'kb-item-answer';
      answer.textContent = entry.answer || '';

      const actions = document.createElement('div');
      actions.className = 'kb-item-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'text-btn';
      edit.textContent = '编辑';
      edit.addEventListener('click', function () { beginEdit(entry); });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'text-btn';
      del.textContent = '删除';
      del.addEventListener('click', function () { deleteEntry(entry); });
      actions.appendChild(edit);
      actions.appendChild(del);

      row.appendChild(head);
      row.appendChild(answer);
      row.appendChild(actions);
      els.kbList.appendChild(row);
    });
  }

  function beginEdit(entry) {
    state.editingId = entry.id;
    els.kbQuestion.value = entry.question || '';
    els.kbKeywords.value = (entry.keywords || []).join(', ');
    els.kbAnswer.value = entry.answer || '';
    if (els.kbAddBtn) els.kbAddBtn.textContent = '更新知识库';
    els.kbQuestion.focus();
    els.kbQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function resetEditor() {
    state.editingId = '';
    if (els.kbQuestion) els.kbQuestion.value = '';
    if (els.kbKeywords) els.kbKeywords.value = '';
    if (els.kbAnswer) els.kbAnswer.value = '';
    if (els.kbAddBtn) els.kbAddBtn.textContent = '加入知识库';
  }

  async function saveEntry() {
    const question = els.kbQuestion ? els.kbQuestion.value.trim() : '';
    const answer = els.kbAnswer ? els.kbAnswer.value.trim() : '';
    if (!question || !answer) {
      toast('请填写标准问题和答案。', 'error');
      return;
    }
    const payload = {
      id: state.editingId || undefined,
      question: question,
      keywords: els.kbKeywords ? els.kbKeywords.value.trim() : '',
      answer: answer,
      category: '公屏问答',
      source: state.editingId ? 'manual' : 'manual'
    };
    try {
      if (els.kbAddBtn) els.kbAddBtn.disabled = true;
      const data = await fetchJSON('/api/knowledge/' + (state.editingId ? 'update' : 'add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!data.ok) throw new Error('保存失败');
      const wasEditing = Boolean(state.editingId);
      resetEditor();
      await refreshKnowledge();
      toast(wasEditing ? '知识库已更新。' : '已加入知识库。', 'success');
    } catch (err) {
      toast(err.message || '知识库保存失败。', 'error');
    } finally {
      if (els.kbAddBtn) els.kbAddBtn.disabled = false;
    }
  }

  async function deleteEntry(entry) {
    if (!entry || !entry.id) return;
    if (!window.confirm('删除这条知识？\n\n' + (entry.question || ''))) return;
    try {
      await fetchJSON('/api/knowledge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id })
      });
      await refreshKnowledge();
      toast('已删除。', '', 1800);
    } catch (_) {
      toast('删除失败。', 'error');
    }
  }

  function renderPending() {
    if (!els.pendingList) return;
    els.pendingList.textContent = '';
    if (els.pendingCount) els.pendingCount.textContent = String(state.pending.length);
    if (els.kbPendingCount) els.kbPendingCount.textContent = String(state.pending.length);
    if (!state.pending.length) {
      els.pendingList.appendChild(empty('暂时没有待人工回复的问题。'));
      return;
    }
    state.pending.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'pending-item';
      const head = document.createElement('div');
      head.className = 'pending-head';
      const question = document.createElement('div');
      question.className = 'pending-question';
      question.textContent = item.question || '';
      const meta = document.createElement('span');
      meta.className = 'kb-item-meta';
      meta.textContent = (item.nickname || '观众') + ' · ' + formatTime(item.time) + (item.count > 1 ? ' · 重复 ' + item.count + ' 次' : '');
      head.appendChild(question);
      head.appendChild(meta);

      const answer = document.createElement('textarea');
      answer.className = 'pending-answer';
      answer.rows = 3;
      answer.placeholder = '人工回复内容，会加入知识库，下次自动回答。';
      const actions = document.createElement('div');
      actions.className = 'pending-actions';
      const sendAndSave = document.createElement('button');
      sendAndSave.type = 'button';
      sendAndSave.className = 'btn small primary';
      sendAndSave.textContent = '发送并入库';
      const onlySave = document.createElement('button');
      onlySave.type = 'button';
      onlySave.className = 'btn small ghost';
      onlySave.textContent = '仅入库';

      async function submitAnswer(sendToChat) {
        const text = answer.value.trim();
        if (!text) {
          toast('先填写回复内容。', 'error');
          return;
        }
        sendAndSave.disabled = true;
        onlySave.disabled = true;
        try {
          await fetchJSON('/api/knowledge/pending/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: item.id,
              question: item.question,
              answer: text,
              keywords: item.question,
              sendToChat: Boolean(sendToChat)
            })
          }, 12000);
          await refreshKnowledge();
          toast(sendToChat ? '已发送到公屏并加入知识库。' : '已加入知识库。', 'success');
        } catch (err) {
          toast(err.message || '保存失败。', 'error');
        } finally {
          sendAndSave.disabled = false;
          onlySave.disabled = false;
        }
      }

      sendAndSave.addEventListener('click', function () { void submitAnswer(true); });
      onlySave.addEventListener('click', function () { void submitAnswer(false); });
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'text-btn';
      dismiss.textContent = '忽略';
      dismiss.addEventListener('click', async function () {
        try {
          await fetchJSON('/api/knowledge/pending/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id })
          });
          await refreshKnowledge();
        } catch (_) { /* ignore */ }
      });
      actions.appendChild(sendAndSave);
      actions.appendChild(onlySave);
      actions.appendChild(dismiss);
      row.appendChild(head);
      row.appendChild(answer);
      row.appendChild(actions);
      els.pendingList.appendChild(row);
    });
  }

  function renderDeepSeek() {
    const cfg = state.deepseek || {};
    if (els.deepseekEnabled) els.deepseekEnabled.checked = Boolean(cfg.enabled);
    if (els.deepseekKey) els.deepseekKey.value = cfg.apiKey || '';
    if (els.deepseekModel) els.deepseekModel.value = cfg.model || 'deepseek-chat';
    if (els.deepseekBase) els.deepseekBase.value = cfg.baseUrl || 'https://api.deepseek.com';
    if (els.deepseekState) {
      els.deepseekState.textContent = cfg.apiKey
        ? (cfg.enabled ? 'DeepSeek 已启用；关键词和知识库都找不到时才会调用。' : '已保存 Key，但未启用。')
        : '还没有配置 DeepSeek；只使用关键词、知识库和兜底话术。';
    }
  }

  function renderSession() {
    const current = state.session || {};
    const records = current.records || [];
    if (els.sessionPath) {
      els.sessionPath.textContent = '当前场次：' + (current.file || '—') + ' · ' + records.length + ' 条最近记录';
    }
    if (els.kbSessionCount) els.kbSessionCount.textContent = String(records.length);
    if (els.sessionCurrentList) {
      els.sessionCurrentList.textContent = '';
      if (!records.length) {
        els.sessionCurrentList.appendChild(empty('本场还没有公屏提问记录。'));
      } else {
        records.slice(-20).reverse().forEach(function (record) {
          const item = document.createElement('div');
          item.className = 'session-item';
          const name = document.createElement('b');
          name.textContent = (record.question || '').slice(0, 80) || '（空消息）';
          const meta = document.createElement('span');
          const source = record.answerSource || '';
          meta.textContent = (record.type === 'welcome' ? '欢迎' : (source === 'kb' ? '知识库' : source === 'deepseek' ? 'DeepSeek' : source === 'rule' ? '关键词' : '兜底'));
          item.appendChild(name);
          item.appendChild(meta);
          els.sessionCurrentList.appendChild(item);
        });
      }
    }
    if (els.sessionDownloadBtn) {
      els.sessionDownloadBtn.disabled = !current.file;
      els.sessionDownloadBtn.onclick = function () {
        if (current.file) window.location.href = '/api/chat/session/file/' + encodeURIComponent(current.file);
      };
    }
    if (els.sessionHistory) {
      els.sessionHistory.textContent = '';
      const sessions = current.sessions || [];
      if (sessions.length > 1) {
        const title = document.createElement('div');
        title.textContent = '历史场次：';
        els.sessionHistory.appendChild(title);
        sessions.slice(0, 8).forEach(function (item) {
          const line = document.createElement('div');
          line.textContent = (item.current ? '● ' : '') + item.name + ' · ' + item.lines + ' 条';
          els.sessionHistory.appendChild(line);
        });
      }
    }
  }

  async function refreshKnowledge() {
    if (state.loading) return;
    state.loading = true;
    try {
      const query = els.kbSearchInput ? els.kbSearchInput.value.trim() : '';
      const [list, pending, deepseek, session] = await Promise.all([
        fetchJSON('/api/knowledge/list' + (query ? '?q=' + encodeURIComponent(query) : ''), null, 10000),
        fetchJSON('/api/knowledge/pending', null, 10000),
        fetchJSON('/api/deepseek/config', null, 10000),
        fetchJSON('/api/chat/session/current?limit=80', null, 10000)
      ]);
      state.entries = list.entries || [];
      state.pending = pending.items || [];
      state.deepseek = deepseek.config || {};
      state.session = session;
      if (els.kbCount) els.kbCount.textContent = String(list.total || state.entries.length);
      if (els.sessionPath && session.sessionId) {
        els.sessionPath.textContent = '当前场次：' + (session.file || session.sessionId) + ' · ' + (session.records || []).length + ' 条最近记录';
      }
      renderEntries();
      renderPending();
      renderDeepSeek();
      renderSession();
    } catch (err) {
      toast('知识库读取失败：' + (err.message || '服务未响应'), 'error');
    } finally {
      state.loading = false;
    }
  }

  async function saveDeepSeek() {
    const payload = {
      enabled: els.deepseekEnabled ? els.deepseekEnabled.checked : false,
      apiKey: els.deepseekKey ? els.deepseekKey.value.trim() : '',
      model: els.deepseekModel ? els.deepseekModel.value.trim() : 'deepseek-chat',
      baseUrl: els.deepseekBase ? els.deepseekBase.value.trim() : 'https://api.deepseek.com',
      timeoutSec: 8
    };
    try {
      await fetchJSON('/api/deepseek/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 12000);
      await refreshKnowledge();
      toast('DeepSeek 设置已保存。', 'success');
    } catch (err) {
      toast('保存失败：' + (err.message || '服务未响应'), 'error');
    }
  }

  async function testDeepSeek() {
    if (els.deepseekTestBtn) els.deepseekTestBtn.disabled = true;
    try {
      const question = els.deepseekTestQuestion && els.deepseekTestQuestion.value.trim()
        ? els.deepseekTestQuestion.value.trim()
        : '这台车现在有什么优惠？';
      const data = await fetchJSON('/api/deepseek/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question })
      }, 20000);
      if (els.deepseekState) {
        els.deepseekState.textContent = data.answer
          ? '测试回答：' + data.answer
          : (data.message || '没有返回可用回答。');
      }
    } catch (err) {
      if (els.deepseekState) els.deepseekState.textContent = '测试失败：' + (err.message || '服务未响应');
    } finally {
      if (els.deepseekTestBtn) els.deepseekTestBtn.disabled = false;
    }
  }

  function bind() {
    if (els.kbRefreshBtn) els.kbRefreshBtn.addEventListener('click', refreshKnowledge);
    if (els.pendingRefreshBtn) els.pendingRefreshBtn.addEventListener('click', refreshKnowledge);
    if (els.sessionRefreshBtn) els.sessionRefreshBtn.addEventListener('click', refreshKnowledge);
    if (els.kbAddBtn) els.kbAddBtn.addEventListener('click', saveEntry);
    if (els.kbSearchInput) {
      els.kbSearchInput.addEventListener('input', function () {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(refreshKnowledge, 260);
      });
    }
    if (els.deepseekSaveBtn) els.deepseekSaveBtn.addEventListener('click', saveDeepSeek);
    if (els.deepseekTestBtn) els.deepseekTestBtn.addEventListener('click', testDeepSeek);
  }

  function refresh() {
    void refreshKnowledge();
  }

  cache();
  bind();
  window.KnowledgeUI = { refresh: refresh };
  setTimeout(refresh, 500);
})();
