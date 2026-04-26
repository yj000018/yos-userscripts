// ==UserScript==
// @name         yOS Memory Panel
// @namespace    https://github.com/yj000018/yos-userscripts
// @version      1.1.0
// @description  Floating yOS panel — Mémoriser & Hydrater on any page. CSP-safe via Shadow DOM.
// @author       Yannick Jolliet / Y-OS
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      yos-voice-vision.vercel.app
// @updateURL    https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
// @downloadURL  https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
// @supportURL   https://github.com/yj000018/yos-userscripts/issues
// ==/UserScript==

(function () {
  'use strict';

  // ─── Config — NO secrets here. All API calls go through the VIVI backend. ─
  const VIVI_BASE = 'https://yos-voice-vision.vercel.app';
  const INTAKE_URL = VIVI_BASE + '/api/intake';
  const CONTEXT_URL = VIVI_BASE + '/api/context-builder';

  // ─── State ─────────────────────────────────────────────────────────────────
  let panelVisible = false;
  let isProcessing = false;

  // ─── Shadow DOM host — fully isolated from page CSP ───────────────────────
  const host = document.createElement('div');
  host.id = 'yos-panel-host';
  host.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'user-select:none'
  ].join(';');

  const shadow = host.attachShadow({ mode: 'open' });

  // ─── Styles inside Shadow DOM (not subject to page CSP) ───────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    *{box-sizing:border-box;margin:0;padding:0}
    #toggle{
      width:48px;height:48px;border-radius:50%;
      background:linear-gradient(135deg,#0f1117,#1a1f2e);
      border:1px solid rgba(79,110,247,.4);cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 20px rgba(79,110,247,.3);
      transition:all .2s;font-size:20px;
    }
    #toggle:hover{border-color:rgba(79,110,247,.8);box-shadow:0 4px 24px rgba(79,110,247,.5);transform:scale(1.05)}
    #menu{
      position:absolute;bottom:58px;right:0;
      background:#0f1117;border:1px solid rgba(255,255,255,.1);
      border-radius:16px;padding:12px;min-width:240px;
      box-shadow:0 8px 32px rgba(0,0,0,.6);
      display:none;flex-direction:column;gap:8px;
    }
    #menu.open{display:flex;animation:fi .15s ease}
    @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .hdr{display:flex;align-items:center;gap:8px;padding:4px 4px 8px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:4px}
    .dot{width:6px;height:6px;border-radius:50%;background:#4f6ef7}
    .ttl{color:rgba(255,255,255,.9);font-size:12px;font-weight:600;letter-spacing:.05em}
    .ver{color:rgba(255,255,255,.25);font-size:10px;margin-left:auto}
    .url{color:rgba(255,255,255,.3);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
    .btn{
      display:flex;align-items:center;gap:10px;
      padding:10px 12px;border-radius:10px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      cursor:pointer;transition:all .15s;
      color:rgba(255,255,255,.85);font-size:13px;font-weight:500;
      width:100%;text-align:left;
    }
    .btn:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.15)}
    .btn.m:hover{background:rgba(79,110,247,.15);border-color:rgba(79,110,247,.3)}
    .btn.h:hover{background:rgba(34,211,238,.1);border-color:rgba(34,211,238,.25)}
    .btn.v:hover{background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.25)}
    .ico{font-size:16px;width:20px;text-align:center;flex-shrink:0}
    .lbl{display:block;line-height:1.2}
    .sub{display:block;font-size:10px;color:rgba(255,255,255,.4);font-weight:400;margin-top:1px}
    .div{height:1px;background:rgba(255,255,255,.06)}
    .st{padding:8px 12px;border-radius:8px;font-size:11px;text-align:center;display:none}
    .st.show{display:block}
    .st.ld{background:rgba(79,110,247,.1);color:rgba(79,110,247,.9);border:1px solid rgba(79,110,247,.2)}
    .st.ok{background:rgba(34,197,94,.1);color:rgba(34,197,94,.9);border:1px solid rgba(34,197,94,.2)}
    .st.er{background:rgba(239,68,68,.1);color:rgba(239,68,68,.9);border:1px solid rgba(239,68,68,.2)}
    .ctx{
      background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
      border-radius:8px;padding:8px 10px;font-size:10px;color:rgba(255,255,255,.6);
      max-height:120px;overflow-y:auto;white-space:pre-wrap;display:none;line-height:1.5;
    }
    .ctx.show{display:block}
  `;
  shadow.appendChild(styleEl);

  // ─── Panel markup ──────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.innerHTML = `
    <div id="menu">
      <div class="hdr">
        <div class="dot"></div>
        <span class="ttl">Y-OS</span>
        <span class="ver">v1.1</span>
      </div>
      <div class="url" id="url"></div>

      <button class="btn m" id="b-page">
        <span class="ico">📥</span>
        <span><span class="lbl">Mémoriser page</span><span class="sub">Save this page to yOS Memory</span></span>
      </button>

      <button class="btn m" id="b-sel">
        <span class="ico">✂️</span>
        <span><span class="lbl">Mémoriser sélection</span><span class="sub">Save selected text</span></span>
      </button>

      <div class="div"></div>

      <button class="btn h" id="b-hyd">
        <span class="ico">💧</span>
        <span><span class="lbl">Hydrater</span><span class="sub">Load yOS context → clipboard</span></span>
      </button>

      <div class="div"></div>

      <button class="btn v" id="b-vivi">
        <span class="ico">🎙</span>
        <span><span class="lbl">Open VIVI</span><span class="sub">Voice & Vision Interface</span></span>
      </button>

      <div class="st" id="st"></div>
      <div class="ctx" id="ctx"></div>
    </div>
    <div id="toggle" title="yOS Panel">🧠</div>
  `;
  shadow.appendChild(panel);

  // ─── Mount — works on SPAs and CSP-strict pages ────────────────────────────
  function mount() {
    if (document.body && !document.getElementById('yos-panel-host')) {
      document.body.appendChild(host);
      initListeners();
    }
  }

  if (document.body) {
    mount();
  } else {
    const obs = new MutationObserver(() => {
      if (document.body) { obs.disconnect(); mount(); }
    });
    obs.observe(document.documentElement, { childList: true });
  }

  // ─── Listeners ─────────────────────────────────────────────────────────────
  function initListeners() {
    const toggle = shadow.getElementById('toggle');
    const menu   = shadow.getElementById('menu');
    const stEl   = shadow.getElementById('st');
    const ctxEl  = shadow.getElementById('ctx');
    const urlEl  = shadow.getElementById('url');

    if (urlEl) urlEl.textContent = location.hostname + location.pathname.slice(0, 35);

    // Toggle open/close
    toggle && toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      panelVisible = !panelVisible;
      menu && menu.classList.toggle('open', panelVisible);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (panelVisible && !host.contains(e.target)) {
        panelVisible = false;
        menu && menu.classList.remove('open');
      }
    });

    // ── Helpers ──
    function st(msg, cls) {
      if (!stEl) return;
      stEl.textContent = msg;
      stEl.className = 'st show ' + cls;
    }
    function stHide() { if (stEl) stEl.className = 'st'; }

    function pageText() {
      for (const s of ['main','article','[role="main"]','.content','#content','body']) {
        const el = document.querySelector(s);
        if (el && el.innerText && el.innerText.length > 100) return el.innerText.slice(0, 3000);
      }
      return document.body.innerText.slice(0, 3000);
    }

    function sel() { return window.getSelection() ? window.getSelection().toString() : ''; }

    function project() {
      const u = location.href.toLowerCase();
      if (u.includes('notion')) return 'yOS';
      if (u.includes('casatao') || u.includes('home-assistant')) return 'CasaTAO';
      if (u.includes('github') || u.includes('manus.im')) return 'yOS';
      return '';
    }

    function intake(payload) {
      if (isProcessing) return;
      isProcessing = true;
      st('Sending to yOS Memory...', 'ld');
      GM_xmlhttpRequest({
        method: 'POST', url: INTAKE_URL,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(payload),
        onload: (r) => {
          isProcessing = false;
          try {
            const d = JSON.parse(r.responseText);
            if (d.success) { st('✓ Saved to Notion Inbox', 'ok'); setTimeout(stHide, 3000); }
            else st('Error: ' + (d.error || '?'), 'er');
          } catch { st('Parse error', 'er'); }
        },
        onerror: () => { isProcessing = false; st('Connection error', 'er'); }
      });
    }

    // ── Mémoriser page ──
    shadow.getElementById('b-page') && shadow.getElementById('b-page').addEventListener('click', () => {
      intake({
        type: 'url',
        content: 'URL: ' + location.href + '\n\nTitle: ' + document.title + '\n\nContent:\n' + pageText(),
        title: '[WEB] ' + document.title.slice(0, 80),
        source_app: 'Web',
        project: project() || undefined,
        tags: ['web', 'capture'],
        priority: 'Medium',
      });
    });

    // ── Mémoriser sélection ──
    shadow.getElementById('b-sel') && shadow.getElementById('b-sel').addEventListener('click', () => {
      const s = sel();
      if (!s) { st('No text selected', 'er'); setTimeout(stHide, 2000); return; }
      intake({
        type: 'text', content: s,
        title: '[SEL] ' + s.slice(0, 60),
        source_app: 'Web',
        tags: ['selection'], priority: 'Medium',
      });
    });

    // ── Hydrater ──
    shadow.getElementById('b-hyd') && shadow.getElementById('b-hyd').addEventListener('click', () => {
      if (isProcessing) return;
      isProcessing = true;
      st('Loading yOS context...', 'ld');
      if (ctxEl) ctxEl.className = 'ctx';
      GM_xmlhttpRequest({
        method: 'POST', url: CONTEXT_URL,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ type: 'context_request', mode: 'voice', project: project() || undefined }),
        onload: (r) => {
          isProcessing = false;
          try {
            const d = JSON.parse(r.responseText);
            stHide();
            if (ctxEl) { ctxEl.textContent = d.context || 'No context'; ctxEl.className = 'ctx show'; }
            const full = (d.instructions || '') + '\n\n' + (d.context || '');
            navigator.clipboard.writeText(full)
              .then(() => { st('✓ Copied (' + (d.sources || 0) + ' items)', 'ok'); setTimeout(stHide, 3000); })
              .catch(() => { st('✓ Loaded (' + (d.sources || 0) + ' items)', 'ok'); setTimeout(stHide, 3000); });
          } catch { st('Parse error', 'er'); }
        },
        onerror: () => { isProcessing = false; st('Connection error', 'er'); }
      });
    });

    // ── Open VIVI ──
    shadow.getElementById('b-vivi') && shadow.getElementById('b-vivi').addEventListener('click', () => {
      window.open(VIVI_BASE, '_blank', 'width=420,height=720,left=80,top=80');
      panelVisible = false;
      menu && menu.classList.remove('open');
    });
  }

})();
