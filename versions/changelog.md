# Changelog — yOS Userscripts

## yos-panel.user.js

### v1.1.0 — 2026-04-26
- Shadow DOM isolation — CSP-safe on manus.im and all strict-CSP pages
- MutationObserver mount for SPA compatibility
- @updateURL + @downloadURL headers for auto-update via Tampermonkey/Gear
- Zero secrets — all API calls routed through VIVI backend

### v1.0.0 — 2026-04-25
- Initial release
- Mémoriser page, Mémoriser sélection, Hydrater, Open VIVI
- GM_xmlhttpRequest for cross-origin calls
