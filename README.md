# yOS Userscripts

Auto-updatable userscripts for Y-OS — managed by Manus, deployed via GitHub, installed once.

## Scripts

| Script | Description | Install URL |
|---|---|---|
| `yos-panel.user.js` | Floating yOS panel — Mémoriser, Hydrater, VIVI | [Install](https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js) |

---

## Install — One URL, all platforms

### macOS — Chrome/Edge/Firefox + Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open this URL in your browser:
   ```
   https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
   ```
3. Tampermonkey intercepts → click **Install**
4. Done. Auto-updates on every version bump.

### iOS / iPadOS — Gear Browser

1. Install [Gear Browser](https://apps.apple.com/app/gear-browser/id1458962238) from App Store
2. In Gear: Settings → UserScript Manager → Add Script → paste the raw URL:
   ```
   https://raw.githubusercontent.com/yj000018/yos-userscripts/main/scripts/yos-panel.user.js
   ```
3. Or open the raw URL directly in Gear — it should prompt to install.
4. To update: UserScript Manager → long-press script → Check for Update.

### Galaxy Tab — Kiwi Browser + Tampermonkey

1. Install [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) (supports Chrome extensions)
2. Install Tampermonkey from Chrome Web Store inside Kiwi
3. Open the raw URL — Tampermonkey intercepts → Install

---

## Update workflow

Manus handles all updates autonomously:
1. Modifies the script
2. Bumps `@version` (e.g. `1.1.0` → `1.2.0`)
3. Commits + pushes to `main`

**To pull the update on your device:**
- **Tampermonkey (macOS/Android):** Dashboard → script → Check for updates (or wait for auto-check every 24h)
- **Gear (iOS):** UserScript Manager → long-press → Check for Update
- **Manual fallback:** Re-open the raw URL in your browser — reinstall takes 5 seconds

---

## Architecture

```
Manus modifies script
  → bumps @version
  → git commit + push → github.com/yj000018/yos-userscripts/main
                          ↓
                   raw.githubusercontent.com (public, no auth)
                          ↓
        Tampermonkey / Gear polls @updateURL
                          ↓
              Browser loads new version automatically
```

## Security

Scripts contain **zero secrets**. All API calls route through the VIVI backend (`yos-voice-vision.vercel.app`) which holds the keys server-side.
