# Changelog — yOS Userscripts

## yos-panel.user.js

### v2.0.0 — 2026-05-14 — Y Life Panel

Major upgrade: from "yOS Memory Panel" to **Y Life Panel** — the unified Y-OS interaction layer.

**New Features:**
- Smart Capture — AI-powered extraction & routing via Manus Y Life Router
  - Free-text capture (paste anything → AI extracts & routes)
  - Selection capture (selected text → Y Life Router)
  - Full page capture (entire page → extract & route)
- Result View — Shows structured extraction results with action buttons
- Polling — Automatically checks task completion and displays Manus response
- Settings View — Configure API key and Project ID directly in the panel
- Keyboard Shortcut — ⌘K / Ctrl+K to open Smart Capture instantly
- Ctrl+Enter — Send capture from textarea

**Improvements:**
- Panel repositioned to top-right (user preference)
- Refined dark UI with gradient accents and smoother animations
- View-based navigation (main → capture → result → settings)
- Better status indicators with fade animations
- Escape key to close panel

**Preserved:**
- Mémoriser page (legacy VIVI intake)
- Hydrater (context builder → clipboard)
- Open VIVI (voice & vision)
- Shadow DOM isolation (CSP-safe)
- Auto-update via GitHub raw URL

### v1.1.0 — 2026-04-26
- Shadow DOM isolation — CSP-safe on manus.im and all strict-CSP pages
- MutationObserver mount for SPA compatibility
- @updateURL + @downloadURL headers for auto-update via Tampermonkey/Gear
- Zero secrets — all API calls routed through VIVI backend

### v1.0.0 — 2026-04-25
- Initial release
- Mémoriser page, Mémoriser sélection, Hydrater, Open VIVI
- GM_xmlhttpRequest for cross-origin calls
