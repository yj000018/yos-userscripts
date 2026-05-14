// ==UserScript==
// @name         yOS Life Panel
// @namespace    https://github.com/yj000018/yos-userscripts
// @version      2.0.0
// @description  Y-OS Life Panel — Smart Capture + Memory + Hydrate + Y Life Router. Shadow DOM, CSP-safe.
// @author       Yannick Jolliet / Y-OS
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      yos-voice-vision.vercel.app
// @connect      api.manus.im
// @updateURL    https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
// @downloadURL  https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
// @supportURL   https://github.com/yj000018/yos-userscripts/issues
// ==/UserScript==

(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const VIVI_BASE = 'https://yos-voice-vision.vercel.app';
  const INTAKE_URL = VIVI_BASE + '/api/intake';
  const CONTEXT_URL = VIVI_BASE + '/api/context-builder';
  const MANUS_API = 'https://api.manus.im/v2';
  const YLIFE_PROJECT_ID = GM_getValue('ylife_project_id', 'jipiV8WJS6hyCh9FW2MTLU');
  const MANUS_API_KEY = GM_getValue('manus_api_key', '');

  // ─── State ─────────────────────────────────────────────────────────────────
  let panelVisible = false;
  let captureMode = false;
  let isProcessing = false;
  let currentView = 'main'; // main | capture | result | settings

  // ─── Shadow DOM host ───────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'yos-panel-host';
  host.style.cssText = [
    'position:fixed', 'top:12px', 'right:12px', 'z-index:2147483647',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'user-select:none'
  ].join(';');

  const shadow = host.attachShadow({ mode: 'open' });

  // ─── Styles ────────────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    *{box-sizing:border-box;margin:0;padding:0}

    /* Toggle Button */
    #toggle{
      width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,#0a0c14,#141825);
      border:1.5px solid rgba(79,110,247,.35);cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 16px rgba(79,110,247,.25);
      transition:all .2s ease;font-size:18px;
      position:absolute;top:0;right:0;
    }
    #toggle:hover{
      border-color:rgba(79,110,247,.7);
      box-shadow:0 4px 24px rgba(79,110,247,.45);
      transform:scale(1.08);
    }
    #toggle.active{
      background:linear-gradient(135deg,#1a2040,#252d4a);
      border-color:rgba(79,110,247,.6);
    }

    /* Panel */
    #panel{
      position:absolute;top:0;right:0;
      width:320px;max-height:520px;
      background:#0c0e16;
      border:1px solid rgba(255,255,255,.08);
      border-radius:16px;
      box-shadow:0 12px 48px rgba(0,0,0,.7), 0 0 0 1px rgba(79,110,247,.1);
      display:none;flex-direction:column;
      overflow:hidden;
    }
    #panel.open{display:flex;animation:slideIn .18s ease}
    @keyframes slideIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}

    /* Header */
    .hdr{
      display:flex;align-items:center;gap:8px;
      padding:14px 16px 10px;
      border-bottom:1px solid rgba(255,255,255,.05);
    }
    .hdr-dot{width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#4f6ef7,#7c3aed)}
    .hdr-title{color:rgba(255,255,255,.92);font-size:13px;font-weight:600;letter-spacing:.04em}
    .hdr-ver{color:rgba(255,255,255,.2);font-size:9px;margin-left:auto}
    .hdr-close{
      width:24px;height:24px;border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;color:rgba(255,255,255,.3);font-size:14px;
      transition:all .15s;border:none;background:transparent;
    }
    .hdr-close:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.7)}

    /* Content area */
    .content{padding:10px 12px;overflow-y:auto;max-height:420px;display:flex;flex-direction:column;gap:6px}

    /* URL bar */
    .url-bar{
      color:rgba(255,255,255,.25);font-size:9px;
      padding:0 4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }

    /* Section label */
    .sec{
      color:rgba(255,255,255,.35);font-size:9px;font-weight:600;
      letter-spacing:.08em;text-transform:uppercase;
      padding:8px 4px 4px;
    }

    /* Buttons */
    .btn{
      display:flex;align-items:center;gap:10px;
      padding:10px 12px;border-radius:10px;
      border:1px solid rgba(255,255,255,.06);
      background:rgba(255,255,255,.02);
      cursor:pointer;transition:all .15s;
      color:rgba(255,255,255,.85);font-size:12px;font-weight:500;
      width:100%;text-align:left;
    }
    .btn:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12)}
    .btn:active{transform:scale(.98)}
    .btn.primary{
      background:linear-gradient(135deg,rgba(79,110,247,.15),rgba(124,58,237,.1));
      border-color:rgba(79,110,247,.25);
    }
    .btn.primary:hover{
      background:linear-gradient(135deg,rgba(79,110,247,.25),rgba(124,58,237,.15));
      border-color:rgba(79,110,247,.4);
    }
    .btn .ico{font-size:15px;width:20px;text-align:center;flex-shrink:0}
    .btn .lbl{display:block;line-height:1.3}
    .btn .sub{display:block;font-size:9px;color:rgba(255,255,255,.35);font-weight:400;margin-top:1px}

    /* Divider */
    .div{height:1px;background:rgba(255,255,255,.04);margin:4px 0}

    /* Status */
    .st{
      padding:8px 12px;border-radius:8px;font-size:10px;text-align:center;
      display:none;margin-top:4px;
    }
    .st.show{display:block;animation:fadeIn .2s}
    .st.ld{background:rgba(79,110,247,.08);color:rgba(79,110,247,.9);border:1px solid rgba(79,110,247,.15)}
    .st.ok{background:rgba(34,197,94,.08);color:rgba(34,197,94,.9);border:1px solid rgba(34,197,94,.15)}
    .st.er{background:rgba(239,68,68,.08);color:rgba(239,68,68,.9);border:1px solid rgba(239,68,68,.15)}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}

    /* Capture textarea */
    .capture-area{
      width:100%;min-height:80px;max-height:160px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.08);
      border-radius:10px;padding:10px 12px;
      color:rgba(255,255,255,.85);font-size:12px;
      font-family:inherit;resize:vertical;
      outline:none;transition:border-color .15s;
      line-height:1.5;
    }
    .capture-area:focus{border-color:rgba(79,110,247,.4)}
    .capture-area::placeholder{color:rgba(255,255,255,.2)}

    /* Result card */
    .result-card{
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.08);
      border-radius:10px;padding:12px;
      font-size:11px;color:rgba(255,255,255,.7);
      line-height:1.6;
    }
    .result-card .r-title{color:rgba(255,255,255,.95);font-weight:600;font-size:12px;margin-bottom:6px}
    .result-card .r-field{display:flex;gap:6px;margin:3px 0}
    .result-card .r-key{color:rgba(79,110,247,.8);font-weight:500;min-width:60px}
    .result-card .r-val{color:rgba(255,255,255,.7)}
    .result-card .r-actions{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
    .result-card .r-act{
      padding:5px 10px;border-radius:6px;font-size:10px;font-weight:500;
      cursor:pointer;transition:all .15s;
      border:1px solid rgba(79,110,247,.25);
      background:rgba(79,110,247,.08);color:rgba(79,110,247,.9);
    }
    .result-card .r-act:hover{background:rgba(79,110,247,.2);border-color:rgba(79,110,247,.4)}
    .result-card .r-act.exec{
      border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08);color:rgba(34,197,94,.9);
    }
    .result-card .r-act.exec:hover{background:rgba(34,197,94,.2)}

    /* Context display */
    .ctx{
      background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
      border-radius:8px;padding:8px 10px;font-size:9px;color:rgba(255,255,255,.5);
      max-height:100px;overflow-y:auto;white-space:pre-wrap;display:none;line-height:1.5;
    }
    .ctx.show{display:block}

    /* Settings */
    .settings-field{margin:8px 0}
    .settings-field label{display:block;color:rgba(255,255,255,.5);font-size:9px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
    .settings-field input{
      width:100%;padding:8px 10px;border-radius:8px;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
      color:rgba(255,255,255,.8);font-size:11px;font-family:monospace;
      outline:none;transition:border-color .15s;
    }
    .settings-field input:focus{border-color:rgba(79,110,247,.4)}

    /* Back button */
    .back{
      display:inline-flex;align-items:center;gap:4px;
      color:rgba(255,255,255,.4);font-size:10px;cursor:pointer;
      padding:4px 8px;border-radius:6px;transition:all .15s;
      border:none;background:transparent;
    }
    .back:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.04)}

    /* Keyboard shortcut hint */
    .kbd{
      display:inline-block;padding:2px 5px;border-radius:4px;
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
      color:rgba(255,255,255,.4);font-size:9px;font-family:monospace;
      margin-left:auto;
    }
  `;
  shadow.appendChild(styleEl);

  // ─── Panel markup ──────────────────────────────────────────────────────────
  const panelEl = document.createElement('div');
  panelEl.innerHTML = `
    <div id="panel">
      <div class="hdr">
        <div class="hdr-dot"></div>
        <span class="hdr-title">Y Life</span>
        <span class="hdr-ver">v2.0</span>
        <button class="hdr-close" id="close-btn">✕</button>
      </div>

      <!-- MAIN VIEW -->
      <div class="content" id="view-main">
        <div class="url-bar" id="url-bar"></div>

        <div class="sec">Smart Capture</div>
        <button class="btn primary" id="b-smart">
          <span class="ico">🧠</span>
          <span><span class="lbl">Smart Capture</span><span class="sub">AI extracts + routes intelligently</span></span>
          <span class="kbd">⌘K</span>
        </button>
        <button class="btn" id="b-smart-sel">
          <span class="ico">✂️</span>
          <span><span class="lbl">Capture Selection</span><span class="sub">Selected text → Y Life Router</span></span>
        </button>
        <button class="btn" id="b-smart-page">
          <span class="ico">📄</span>
          <span><span class="lbl">Capture Page</span><span class="sub">Full page → extract & route</span></span>
        </button>

        <div class="div"></div>
        <div class="sec">Memory</div>
        <button class="btn" id="b-mem-page">
          <span class="ico">📥</span>
          <span><span class="lbl">Mémoriser page</span><span class="sub">Save to yOS Notion Inbox</span></span>
        </button>
        <button class="btn" id="b-hyd">
          <span class="ico">💧</span>
          <span><span class="lbl">Hydrater</span><span class="sub">Load context → clipboard</span></span>
        </button>

        <div class="div"></div>
        <div class="sec">Quick Actions</div>
        <button class="btn" id="b-vivi">
          <span class="ico">🎙</span>
          <span><span class="lbl">Voice (VIVI)</span><span class="sub">Open Voice & Vision</span></span>
        </button>
        <button class="btn" id="b-settings">
          <span class="ico">⚙️</span>
          <span><span class="lbl">Settings</span><span class="sub">API keys & config</span></span>
        </button>

        <div class="st" id="st-main"></div>
        <div class="ctx" id="ctx-main"></div>
      </div>

      <!-- CAPTURE VIEW -->
      <div class="content" id="view-capture" style="display:none">
        <button class="back" id="back-capture">← Back</button>
        <div class="sec">Smart Capture — Type or paste anything</div>
        <textarea class="capture-area" id="capture-input" placeholder="Paste text, URL, event details, contact info...&#10;&#10;Examples:&#10;• Restaurant Le Comptoir, 14 juillet 19h, réserver pour 4&#10;• Jean Dupont plombier 06 12 34 56 78&#10;• Conférence AI Paris 25 juin, lien: https://..."></textarea>
        <button class="btn primary" id="b-send-capture">
          <span class="ico">⚡</span>
          <span><span class="lbl">Process & Route</span><span class="sub">Send to Y Life Router</span></span>
        </button>
        <div class="st" id="st-capture"></div>
      </div>

      <!-- RESULT VIEW -->
      <div class="content" id="view-result" style="display:none">
        <button class="back" id="back-result">← Back</button>
        <div class="result-card" id="result-card">
          <div class="r-title">Processing...</div>
        </div>
        <div class="st" id="st-result"></div>
      </div>

      <!-- SETTINGS VIEW -->
      <div class="content" id="view-settings" style="display:none">
        <button class="back" id="back-settings">← Back</button>
        <div class="sec">Y Life Configuration</div>
        <div class="settings-field">
          <label>Manus API Key</label>
          <input type="password" id="set-apikey" placeholder="Enter your Manus API key">
        </div>
        <div class="settings-field">
          <label>Y Life Project ID</label>
          <input type="text" id="set-project" placeholder="Manus project ID">
        </div>
        <button class="btn primary" id="b-save-settings">
          <span class="ico">💾</span>
          <span><span class="lbl">Save Settings</span></span>
        </button>
        <div class="st" id="st-settings"></div>
      </div>
    </div>
    <div id="toggle" title="Y Life (⌘K)">🧠</div>
  `;
  shadow.appendChild(panelEl);

  // ─── Mount ─────────────────────────────────────────────────────────────────
  function mount() {
    if (document.body && !document.getElementById('yos-panel-host')) {
      document.body.appendChild(host);
      initListeners();
    }
  }

  if (document.body) { mount(); }
  else {
    const obs = new MutationObserver(() => {
      if (document.body) { obs.disconnect(); mount(); }
    });
    obs.observe(document.documentElement, { childList: true });
  }

  // ─── Listeners ─────────────────────────────────────────────────────────────
  function initListeners() {
    const toggle = shadow.getElementById('toggle');
    const panel = shadow.getElementById('panel');
    const closeBtn = shadow.getElementById('close-btn');
    const urlBar = shadow.getElementById('url-bar');

    // Views
    const viewMain = shadow.getElementById('view-main');
    const viewCapture = shadow.getElementById('view-capture');
    const viewResult = shadow.getElementById('view-result');
    const viewSettings = shadow.getElementById('view-settings');

    // Status elements
    const stMain = shadow.getElementById('st-main');
    const stCapture = shadow.getElementById('st-capture');
    const stResult = shadow.getElementById('st-result');
    const stSettings = shadow.getElementById('st-settings');
    const ctxMain = shadow.getElementById('ctx-main');

    // Inputs
    const captureInput = shadow.getElementById('capture-input');
    const setApiKey = shadow.getElementById('set-apikey');
    const setProject = shadow.getElementById('set-project');

    if (urlBar) urlBar.textContent = location.hostname + location.pathname.slice(0, 40);

    // ── View management ──
    function showView(view) {
      currentView = view;
      viewMain.style.display = view === 'main' ? 'flex' : 'none';
      viewCapture.style.display = view === 'capture' ? 'flex' : 'none';
      viewResult.style.display = view === 'result' ? 'flex' : 'none';
      viewSettings.style.display = view === 'settings' ? 'flex' : 'none';
    }

    // ── Toggle panel ──
    function openPanel() {
      panelVisible = true;
      panel.classList.add('open');
      toggle.classList.add('active');
      toggle.style.display = 'none';
    }
    function closePanel() {
      panelVisible = false;
      panel.classList.remove('open');
      toggle.classList.remove('active');
      toggle.style.display = 'flex';
      showView('main');
    }

    toggle.addEventListener('click', (e) => { e.stopPropagation(); openPanel(); });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });
    document.addEventListener('click', (e) => {
      if (panelVisible && !host.contains(e.target)) closePanel();
    });

    // ── Keyboard shortcut (Cmd+K / Ctrl+K) ──
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!panelVisible) {
          openPanel();
          showView('capture');
          setTimeout(() => captureInput && captureInput.focus(), 100);
        } else {
          closePanel();
        }
      }
      // Escape to close
      if (e.key === 'Escape' && panelVisible) closePanel();
    });

    // ── Navigation ──
    shadow.getElementById('back-capture').addEventListener('click', () => showView('main'));
    shadow.getElementById('back-result').addEventListener('click', () => showView('main'));
    shadow.getElementById('back-settings').addEventListener('click', () => showView('main'));

    // ── Helpers ──
    function st(el, msg, cls) {
      if (!el) return;
      el.textContent = msg;
      el.className = 'st show ' + cls;
    }
    function stHide(el) { if (el) el.className = 'st'; }

    function pageText() {
      for (const s of ['main','article','[role="main"]','.content','#content','body']) {
        const el = document.querySelector(s);
        if (el && el.innerText && el.innerText.length > 100) return el.innerText.slice(0, 4000);
      }
      return document.body.innerText.slice(0, 4000);
    }

    function sel() { return window.getSelection() ? window.getSelection().toString() : ''; }

    function project() {
      const u = location.href.toLowerCase();
      if (u.includes('notion')) return 'yOS';
      if (u.includes('casatao') || u.includes('home-assistant')) return 'CasaTAO';
      if (u.includes('github') || u.includes('manus.im')) return 'yOS';
      return '';
    }

    function getApiKey() { return GM_getValue('manus_api_key', ''); }
    function getProjectId() { return GM_getValue('ylife_project_id', 'jipiV8WJS6hyCh9FW2MTLU'); }

    // ── VIVI Intake (legacy memory) ──
    function intake(payload, statusEl) {
      if (isProcessing) return;
      isProcessing = true;
      st(statusEl, 'Sending to yOS Memory...', 'ld');
      GM_xmlhttpRequest({
        method: 'POST', url: INTAKE_URL,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(payload),
        onload: (r) => {
          isProcessing = false;
          try {
            const d = JSON.parse(r.responseText);
            if (d.success) { st(statusEl, '✓ Saved to Notion Inbox', 'ok'); setTimeout(() => stHide(statusEl), 3000); }
            else st(statusEl, 'Error: ' + (d.error || '?'), 'er');
          } catch { st(statusEl, 'Parse error', 'er'); }
        },
        onerror: () => { isProcessing = false; st(statusEl, 'Connection error', 'er'); }
      });
    }

    // ── Y LIFE ROUTER — Smart Capture via Manus API ──
    function smartCapture(content, statusEl) {
      const apiKey = getApiKey();
      if (!apiKey) {
        st(statusEl, 'API key missing → Settings', 'er');
        setTimeout(() => { stHide(statusEl); showView('settings'); }, 1500);
        return;
      }

      if (isProcessing) return;
      isProcessing = true;
      st(statusEl, '🧠 Y Life processing...', 'ld');

      // Step 1: Create a task in the Y Life project
      const taskPayload = {
        project_id: getProjectId(),
        prompt: 'capture\n\n' + content + '\n\nSource URL: ' + location.href + '\nPage title: ' + document.title,
      };

      GM_xmlhttpRequest({
        method: 'POST',
        url: MANUS_API + '/task.create',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        data: JSON.stringify(taskPayload),
        onload: (r) => {
          try {
            const d = JSON.parse(r.responseText);
            if (d.task && d.task.id) {
              st(statusEl, '✓ Sent to Y Life Router — Task: ' + d.task.id.slice(0, 8) + '...', 'ok');
              // Show result view with task link
              showResult({
                title: 'Capture sent to Y Life',
                fields: [
                  { key: 'Task', val: d.task.id },
                  { key: 'Status', val: 'Processing...' },
                  { key: 'Content', val: content.slice(0, 100) + (content.length > 100 ? '...' : '') }
                ],
                actions: [
                  { label: 'Open in Manus', url: 'https://manus.im/app/tasks/' + d.task.id },
                ]
              });
              // Poll for result
              pollTaskResult(d.task.id, apiKey);
            } else {
              st(statusEl, 'Error: ' + (d.error || JSON.stringify(d).slice(0, 80)), 'er');
            }
          } catch (e) {
            st(statusEl, 'Parse error: ' + e.message, 'er');
          }
          isProcessing = false;
        },
        onerror: (e) => {
          isProcessing = false;
          st(statusEl, 'Connection error', 'er');
        }
      });
    }

    // ── Poll task result ──
    function pollTaskResult(taskId, apiKey) {
      let attempts = 0;
      const maxAttempts = 20;
      const interval = 5000;

      function check() {
        attempts++;
        if (attempts > maxAttempts) {
          updateResult({ title: 'Y Life — Timeout', fields: [{ key: 'Status', val: 'Still processing. Check Manus.' }], actions: [{ label: 'Open in Manus', url: 'https://manus.im/app/tasks/' + taskId }] });
          return;
        }

        GM_xmlhttpRequest({
          method: 'GET',
          url: MANUS_API + '/task.listMessages?task_id=' + taskId,
          headers: { 'Authorization': 'Bearer ' + apiKey },
          onload: (r) => {
            try {
              const d = JSON.parse(r.responseText);
              const msgs = d.messages || [];
              const agentMsgs = msgs.filter(m => m.role === 'assistant' && m.content);
              if (agentMsgs.length > 0) {
                const lastMsg = agentMsgs[agentMsgs.length - 1].content;
                updateResult({
                  title: '✅ Y Life — Capture Processed',
                  fields: [{ key: 'Response', val: lastMsg.slice(0, 300) }],
                  actions: [{ label: 'Open in Manus', url: 'https://manus.im/app/tasks/' + taskId }]
                });
                return;
              }
            } catch {}
            setTimeout(check, interval);
          },
          onerror: () => setTimeout(check, interval)
        });
      }

      setTimeout(check, interval);
    }

    // ── Result display ──
    function showResult(data) {
      showView('result');
      const card = shadow.getElementById('result-card');
      let html = '<div class="r-title">' + escHtml(data.title) + '</div>';
      for (const f of data.fields || []) {
        html += '<div class="r-field"><span class="r-key">' + escHtml(f.key) + '</span><span class="r-val">' + escHtml(f.val) + '</span></div>';
      }
      if (data.actions && data.actions.length) {
        html += '<div class="r-actions">';
        for (const a of data.actions) {
          if (a.url) {
            html += '<span class="r-act" data-url="' + escHtml(a.url) + '">' + escHtml(a.label) + '</span>';
          } else {
            html += '<span class="r-act exec" data-action="' + escHtml(a.action || '') + '">' + escHtml(a.label) + '</span>';
          }
        }
        html += '</div>';
      }
      card.innerHTML = html;

      // Bind action clicks
      card.querySelectorAll('.r-act[data-url]').forEach(el => {
        el.addEventListener('click', () => window.open(el.dataset.url, '_blank'));
      });
    }

    function updateResult(data) { showResult(data); }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Button handlers ──

    // Smart Capture (open textarea)
    shadow.getElementById('b-smart').addEventListener('click', () => {
      showView('capture');
      setTimeout(() => captureInput && captureInput.focus(), 50);
    });

    // Smart Capture Selection
    shadow.getElementById('b-smart-sel').addEventListener('click', () => {
      const s = sel();
      if (!s) { st(stMain, 'No text selected', 'er'); setTimeout(() => stHide(stMain), 2000); return; }
      smartCapture(s, stMain);
    });

    // Smart Capture Page
    shadow.getElementById('b-smart-page').addEventListener('click', () => {
      const content = 'URL: ' + location.href + '\nTitle: ' + document.title + '\n\n' + pageText();
      smartCapture(content, stMain);
    });

    // Send capture from textarea
    shadow.getElementById('b-send-capture').addEventListener('click', () => {
      const val = captureInput.value.trim();
      if (!val) { st(stCapture, 'Nothing to capture', 'er'); setTimeout(() => stHide(stCapture), 2000); return; }
      smartCapture(val, stCapture);
      captureInput.value = '';
    });

    // Ctrl+Enter to send capture
    captureInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        shadow.getElementById('b-send-capture').click();
      }
    });

    // Mémoriser page (legacy VIVI)
    shadow.getElementById('b-mem-page').addEventListener('click', () => {
      intake({
        type: 'url',
        content: 'URL: ' + location.href + '\n\nTitle: ' + document.title + '\n\nContent:\n' + pageText(),
        title: '[WEB] ' + document.title.slice(0, 80),
        source_app: 'Web',
        project: project() || undefined,
        tags: ['web', 'capture'],
        priority: 'Medium',
      }, stMain);
    });

    // Hydrater
    shadow.getElementById('b-hyd').addEventListener('click', () => {
      if (isProcessing) return;
      isProcessing = true;
      st(stMain, 'Loading yOS context...', 'ld');
      if (ctxMain) ctxMain.className = 'ctx';
      GM_xmlhttpRequest({
        method: 'POST', url: CONTEXT_URL,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ type: 'context_request', mode: 'voice', project: project() || undefined }),
        onload: (r) => {
          isProcessing = false;
          try {
            const d = JSON.parse(r.responseText);
            stHide(stMain);
            if (ctxMain) { ctxMain.textContent = d.context || 'No context'; ctxMain.className = 'ctx show'; }
            const full = (d.instructions || '') + '\n\n' + (d.context || '');
            navigator.clipboard.writeText(full)
              .then(() => { st(stMain, '✓ Copied (' + (d.sources || 0) + ' items)', 'ok'); setTimeout(() => stHide(stMain), 3000); })
              .catch(() => { st(stMain, '✓ Loaded (' + (d.sources || 0) + ' items)', 'ok'); setTimeout(() => stHide(stMain), 3000); });
          } catch { st(stMain, 'Parse error', 'er'); }
        },
        onerror: () => { isProcessing = false; st(stMain, 'Connection error', 'er'); }
      });
    });

    // Open VIVI
    shadow.getElementById('b-vivi').addEventListener('click', () => {
      window.open(VIVI_BASE, '_blank', 'width=420,height=720,left=80,top=80');
      closePanel();
    });

    // Settings
    shadow.getElementById('b-settings').addEventListener('click', () => {
      showView('settings');
      setApiKey.value = GM_getValue('manus_api_key', '');
      setProject.value = GM_getValue('ylife_project_id', 'jipiV8WJS6hyCh9FW2MTLU');
    });

    shadow.getElementById('b-save-settings').addEventListener('click', () => {
      const key = setApiKey.value.trim();
      const proj = setProject.value.trim();
      if (key) GM_setValue('manus_api_key', key);
      if (proj) GM_setValue('ylife_project_id', proj);
      st(stSettings, '✓ Settings saved', 'ok');
      setTimeout(() => { stHide(stSettings); showView('main'); }, 1500);
    });
  }

})();
