# Mobile Simulator — Multi-Device Tester

See how websites look on iPhone, Pixel, iPad, Galaxy, and desktop **side-by-side in one window**.

## v2 — what's new (1.1.0)

- **Per-device User-Agent spoofing** via dynamic `declarativeNetRequest` rules. iOS devices get an iOS UA, Android devices get an Android UA, etc. (toggle in Settings).
- **Device bezels** — visual phone/tablet outlines with notch + home indicator (rotates with the device). Quick toolbar toggle.
- **Saveable presets** — save your current device selection as a named preset and load it later. Ships with 3 starter presets: "Phones only", "Tablets only", "iPhones & iPads".
- **Drag-to-reorder** — grab a device's header row and drag to rearrange the grid.
- **Compact view** — one-click toolbar toggle to shrink everything to 60% (independent of the zoom dropdown).
- **Force color scheme** — set Light / Dark / Auto from the toolbar. Injects CSS into same-origin iframes.
- **CSP handling modes** — pick "Strip CSP + XFO" (default), "Strip XFO only" (keeps site CSP intact), or "Off".
- **Status bar** — bottom strip showing device count, current URL (click to copy), and header-rule status. Dismissible.
- **Per-device loading spinner** — and a "Stop" button if a frame is still loading after 15 seconds.
- **Session-persistent warning dismissal** — close a warning once, it stays closed for the session.
- **Keyboard shortcut** — `Ctrl+Shift+M` (Cmd+Shift+M on Mac) opens the popup directly.

## Features

- **16 preset devices**: iPhone 15 Pro/14/SE, Pixel 8/Pro, Galaxy S24/Ultra/Z Fold, iPad Mini/Air/Pro, Galaxy Tab, Surface Duo, Laptop/Desktop
- **Add custom devices** with any width, height, and DPR
- **Side-by-side comparison** — load any URL and see it on all devices at once
- **Per-device controls** — rotate, refresh, open in new tab, remove
- **Drag-to-reorder devices** in the grid
- **Sync scroll** (same-origin pages)
- **Zoom controls** + quick "Compact view" toggle
- **Header stripping modes** — strip CSP+XFO, strip XFO only, or off
- **Per-device User-Agent rewriting** via dynamic rules
- **Device bezels** — visual phone/tablet outlines with rotation-aware notch
- **Force color scheme** (Auto / Light / Dark) — same-origin iframes
- **Saveable presets** with 3 starter presets
- **Quick simulate** — popup button to simulate the current tab's URL
- **Persistent state** — remembers URL, devices, rotations, presets, and settings
- **Dark / light / system theme**
- **Keyboard shortcuts** — `Ctrl+Shift+M` open popup, `Ctrl+L` focus URL, `Ctrl+R` reload all

## Install (local development)

1. Open `chrome://extensions/`.
2. Toggle **Developer mode**.
3. Click **Load unpacked** → select this `mobile-simulator` folder.
4. Pin the extension icon to the toolbar.
5. Click the icon (or press `Ctrl+Shift+M`) → enter a URL → click **Open simulator**.

## Icons (one-time setup)

Open `icons/make-icons.html` in your browser, click **Download all three**, save the PNGs into the `icons/` folder.

## File map

```
mobile-simulator/
├── manifest.json              MV3 config (commands, dynamic rules)
├── rules.json                 Static DNR rules — strip CSP + XFO
├── rules_xfo_only.json        Static DNR rules — strip XFO only (CSP kept)
├── background.js              Service worker: opens tab, switches rulesets, cleans dynamic rules
├── popup.html/css/js          Toolbar popup (URL entry)
├── simulator.html/css/js      Full-page multi-device view
├── lib/
│   ├── browser.js             Chrome/Firefox shim
│   ├── devices.js             Preset device definitions + UA strings + default presets
│   └── storage.js             State, settings, session-dismissed warnings
└── icons/
    ├── make-icons.html
    └── icon{16,48,128}.png
```

## Permissions explained

| Permission | Why |
|---|---|
| `storage` | Save selected devices, custom devices, presets, settings, current URL |
| `tabs` | Open simulator tab, "open in new tab" on each device |
| `activeTab` | "Simulate current tab" reads the active URL |
| `declarativeNetRequest` | Strip iframe-blocking headers via static rules |
| `declarativeNetRequestWithHostAccess` | Add **dynamic** rules to rewrite the User-Agent per-device on `<all_urls>` |
| `host_permissions: <all_urls>` | Required to apply header rules on any URL the user loads |

Required justification for Web Store review:
> The extension renders user-specified URLs at simulated mobile device dimensions inside iframes on a single tab the user explicitly opens. `<all_urls>` and header modification are required because most websites send headers that block iframe embedding, and the user has explicitly chosen to preview those sites. Dynamic header rules are used solely to rewrite the User-Agent on URLs the user is actively previewing (matched by a unique URL parameter `__sim_device=<id>`). All rules are cleared when the simulator tab is closed. No browsing data is collected or transmitted.

## Limitations

1. **DPR not truly emulated** — iframes render at the host monitor's pixel ratio. The "3x" label is informational. True DPR emulation requires `chrome.debugger`.
2. **UA spoofing adds `?__sim_device=<id>`** to the visible URL — this is a deliberate marker so dynamic rules can match each iframe's requests. It's visible in the address bar of "Open in real tab" actions. Disable "Spoof User-Agent" in Settings to suppress it.
3. **Touch events not synthesized** — mouse events only.
4. **JavaScript framebusting** — a few sites actively redirect out of iframes.
5. **Scroll sync only works same-origin** — same-origin policy blocks cross-origin scroll reads.
6. **Mixed content** — HTTPS extension page loading HTTP URLs is blocked.
7. **Force color scheme** — only works on same-origin iframes (cross-origin documents cannot be modified).
8. **CSP append mode** — `declarativeNetRequest` cannot *append* to existing header values (only `set` / `remove` / `append-for-some-headers`). The "Strip XFO only" mode preserves the site's CSP intact; "Strip CSP + XFO" removes both. Truly modifying a CSP value would require the `webRequest` API on Firefox or a `chrome.debugger`-based approach.

## Edge cases handled

| Scenario | Behaviour |
|---|---|
| Invalid URL entered | Validated, warning shown (dismissible per session) |
| Missing protocol | Auto-prepends `https://` (or `http://` for localhost) |
| Site uses framebust JS | Header rules can't stop it; warning suggested |
| Custom device with extreme dimensions | Clamped to 100–3840px |
| Empty device list | Empty state with CTA |
| Old saved state (v1.0.0) | Loads with new fields filled from defaults |
| Simulator tab closed | All dynamic UA rules cleaned up by the service worker |
| iframe never loads | "Still loading…" + Stop button after 15s |

## Publishing to the Chrome Web Store

1. Zip the folder.
2. Upload at https://chrome.google.com/webstore/devconsole.
3. Provide privacy policy: extension only modifies response headers in user-opened simulator iframes; no data leaves the device.
4. Be ready for manual review — `<all_urls>` + `declarativeNetRequest` + dynamic rules triggers heightened scrutiny.

## License

MIT.
