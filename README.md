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
- **Keyboard shortcuts** — `Ctrl+Shift+M` open popup, `Ctrl+L` focus URL, `Ctrl+R` reload all; in the simulator `R` rotate, `C` compare, `D` devices, `S` screenshot, `V` record, `F` frame colour, `+` `−` `0` zoom, `Esc` close
- **Real device frames** from [mockup-device-frames](https://github.com/jamesjingyi/mockup-device-frames) in every colour (`bun run frames:sync` pulls new ones), plus a **custom gradient** laid over any of them (the rainbow dot after a device's colours), in screenshots too
- **Status bar and home indicator** — both drawn as on the device, and each can be turned off in Settings
- **Screenshots** — framed, on a gradient or solid background, with padding, shadow, aspect ratio and caption; save as PNG/JPEG/WebP or copy
- **Screen recording** — MP4 (WebM on older Chrome) cropped to the device's frame or just its screen, with a countdown, the page's sound and optionally your microphone and a camera bubble; put it on a backdrop in a 16:9, 4:3, 1:1 or 9:16 video; play it back before saving. `Alt+Shift+R` records without Chrome's share prompt, and after it the record button does too, in that tab
- **Touch mode** — fingertip cursor, drag to scroll with momentum; pages see a phone in JavaScript too
- **On-screen keyboard** — focusing a text field slides up an iOS, iPadOS or Android keyboard that types into it; the layout follows `type`, `inputmode` and `enterkeyhint`, and the page shrinks above it as on a phone
- **Side panel** — the phone next to your page, following whichever tab is active
- **Full screen over the page** — `Alt+Shift+F`, the right-click menu, or the side panel's button; `Esc` leaves
- **Right-click menus** — open a page or link in the simulator, or go full screen
- **Phone inside the page** — add `#mobile-sim` to a page's address (or use the popup's **In the page** button or the right-click menu) and a phone showing that page docks beside it, logged in as you are; see below

## Phone inside the page

The phone is drawn in the website's own tab and loads the page in a same-origin frame, so it
shares the site's cookies and login. Testing tools that can't reach extension pages, such as
Playwright or Cypress, can open it from the address alone.

```text
http://localhost:3000/#mobile-sim                           docked beside the page
http://localhost:3000/#mobile-sim=pixel-8,landscape,full    device, way round and layout in any order
http://localhost:3000/#mobile-sim=off                       closes it
```

The hash is taken off the address straight away, so the site's router never sees it. A page's
scripts can do the same with `window.postMessage({ __mobileSimPage: "open", spec: "pixel-8" })`
and `{ __mobileSimPage: "close" }`. `Esc` or the toolbar's close button closes the phone, and it
comes back after the page reloads.

`<html data-mobile-sim>` says what it's doing, for a test to wait on: `loading`, `ready`,
`closed`, `disabled`, `not-allowed`, `blocked:framing` or `blocked:frame-busting`.

It opens on `localhost`, `127.0.0.1`, `*.localhost` and `*.test` (Settings → Phone inside the
page). Any other site shows a prompt first, and **Allow** adds that site to the list.

## Tech stack

React 19 + TypeScript, built by Vite with [`@crxjs/vite-plugin`](https://crxjs.dev), styled with
Tailwind CSS v4 and shadcn/ui (Radix) components, icons from [Lucide](https://lucide.dev). Bun is
the package manager and script runner. Unit tests run on Vitest + Testing Library, end-to-end tests
on Playwright with the real extension loaded.

## Develop

```sh
bun install
bun run dev        # Vite with hot reload; load dist-dev/ in Chrome
bun run build      # typecheck + production build into dist/
bun run test       # unit tests
bun run test:e2e   # builds, then drives Chrome with the extension (opens a window)
bun run lint
bun run format
bun run package    # builds and zips dist/ into dist-crx/ for the Web Store
```

The first `test:e2e` needs a browser: `bunx playwright install chromium`.

## Install (load the build in Chrome)

1. `bun install && bun run build`
2. Open `chrome://extensions/` and toggle **Developer mode**.
3. Click **Load unpacked** → select the `dist/` folder (not the project root).
4. Pin the extension icon to the toolbar.
5. Click the icon (or press `Ctrl+Shift+M`) → enter a URL → click **Open simulator**.

After a rebuild, press the reload arrow on the extension's card in `chrome://extensions/`.

## File map

```
mobile-simulator/
├── src/
│   ├── manifest.ts                  MV3 manifest (commands, permissions, static rulesets)
│   ├── background/
│   │   └── service-worker.ts        Opens the simulator, full screen and menus; rulesets and rules
│   ├── content/mobile-identity.ts   Runs in each device frame: identity, touch, shortcuts, scroll sync
│   ├── content/inline-trigger.ts    Runs on every site, loads the inline phone on #mobile-sim
│   ├── inline/                      The inline phone: shadow-root app, allow prompt, session restore
│   ├── popup/                       Toolbar popup (URL entry, "Simulate current tab")
│   ├── simulator/                   Full-page multi-device view
│   │   ├── App.tsx                  Grid, panels, keyboard shortcuts, scroll-sync wiring
│   │   ├── components/              Toolbar, DeviceFrame, DevicesPanel, SettingsPanel, StatusBar…
│   │   ├── use-simulator.ts         Loads and persists state + settings, applies theme and CSP mode
│   │   ├── frame-bridge.ts          Scroll relay, top colour, color-scheme override, frame history
│   │   ├── keyboard/                On-screen keyboard layouts and state
│   │   ├── recording/               Tab capture cropped to the devices, MP4 recorder
│   │   ├── mode.ts                  Tab, side panel or full screen
│   │   └── dynamic-rules.ts         Serialised updates of the per-device User-Agent rules
│   ├── shared/                      Constants, zod schemas + types, devices, URL handling, messages
│   ├── storage/                     chrome.storage wrappers for state, settings, dismissed warnings
│   ├── lib/                         Pure helpers: header rules, reorder, custom-device parsing, theme
│   ├── components/ui/               shadcn/ui components
│   └── styles/globals.css           Tailwind entry + theme tokens (light/dark)
├── public/
│   ├── icons/icon-{16,48,128}.png
│   └── rules/                       Static DNR rulesets: strip CSP + XFO, strip XFO only
├── test/setup.ts                    Vitest setup (jsdom stubs)
├── e2e/                             Playwright specs + harness that loads dist/ into Chrome
├── scripts/package-zip.ts           Zips dist/ for the Chrome Web Store
└── docs/index.md                    Privacy policy (published page)
```

## Permissions explained

| Permission                            | Why                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `storage`                             | Save selected devices, custom devices, presets, settings, current URL       |
| `tabs`                                | Open simulator tab; the side panel follows the active tab's URL             |
| `activeTab`                           | "Simulate current tab" reads the active URL; screenshots capture the tab    |
| `scripting`                           | Register the device-frame script; lay the full-screen simulator over a tab  |
| `contextMenus`                        | Right-click "Open in Mobile Simulator" on pages, links and the toolbar icon |
| `content_scripts` on http(s) pages    | Watch for `#mobile-sim` and load the inline phone; nothing else runs        |
| `sidePanel`                           | Show the simulator in Chrome's side panel                                   |
| `tabCapture`                          | Record the simulator's tab without the share prompt, after its shortcut     |
| `declarativeNetRequest`               | Strip iframe-blocking headers via static rules                              |
| `declarativeNetRequestWithHostAccess` | Add **dynamic** rules to rewrite the User-Agent per-device on `<all_urls>`  |
| `host_permissions: <all_urls>`        | Required to apply header rules on any URL the user loads                    |

Required justification for Web Store review:

> The extension renders user-specified URLs at simulated mobile device dimensions inside iframes on a single tab the user explicitly opens. `<all_urls>` and header modification are required because most websites send headers that block iframe embedding, and the user has explicitly chosen to preview those sites. Dynamic header rules are used solely to rewrite the User-Agent on URLs the user is actively previewing (matched by a unique URL parameter `__sim_device=<id>`). A rule only ever matches URLs carrying that parameter, and all rules are cleared when the browser starts. The device-frame script registered with `scripting` exits immediately anywhere except the simulator's own device frames. The content script on web pages only reads the page's address for `#mobile-sim`, and draws the inline phone on sites the user allowed. No browsing data is collected or transmitted.

## Limitations

1. **DPR not truly emulated** — iframes render at the host monitor's pixel ratio. The "3x" label is informational. True DPR emulation requires `chrome.debugger`.
2. **UA spoofing adds `?__sim_device=<id>`** to the visible URL — this is a deliberate marker so dynamic rules can match each iframe's requests. It's visible in the address bar of "Open in real tab" actions. Disable "Spoof User-Agent" in Settings to suppress it. The page's scripts also see the device (`navigator.userAgent`, `platform`, `maxTouchPoints`, `screen`, `devicePixelRatio`, `matchMedia("(pointer: coarse)")`), but CSS media queries for `pointer` and `hover` still see the real mouse.
3. **Touch events not synthesized** — touch mode drags to scroll with momentum, but pages receive mouse and pointer events, not `touchstart`/`touchmove`. On-screen keyboard keys type with `insertText`, so the page sees `input` events but no `keydown` for them; there's no autocorrect, word suggestions or long-press accents.
4. **JavaScript framebusting** — a few sites actively redirect out of iframes. The inline phone notices when a page reloads before it has settled and doesn't reopen (`blocked:frame-busting`).
5. **Scroll sync** — works across any origin via a tiny postMessage bridge in the device-frame script, which only wakes up inside the simulator's device frames.
6. **Side panel screenshots and recordings** — Chrome captures tabs, not its side panel, so the side panel has no screenshot or record button. Use full screen or the simulator tab.
7. **Mixed content** — HTTPS extension page loading HTTP URLs is blocked.
8. **Force color scheme** — only works on same-origin iframes (cross-origin documents cannot be modified).
9. **CSP append mode** — `declarativeNetRequest` cannot _append_ to existing header values (only `set` / `remove` / `append-for-some-headers`). The "Strip XFO only" mode preserves the site's CSP intact; "Strip CSP + XFO" removes both. Truly modifying a CSP value would require the `webRequest` API on Firefox or a `chrome.debugger`-based approach.
10. **Inline phone** — docked, the page makes room with a right margin on `<html>`, which elements with `position: fixed` ignore, so a fixed header can run under the phone. The phone's toolbar has no screenshot or record button; use the simulator tab for those.
11. **Recording** — Chrome asks to share the tab each time (no extra permission is needed for that). The video keeps the shape it starts with, so a device turned mid-recording shrinks to fit inside it. Full screen over a site whose `Permissions-Policy` blocks `display-capture` can't record; use the simulator tab.

## Edge cases handled

| Scenario                              | Behaviour                                                    |
| ------------------------------------- | ------------------------------------------------------------ |
| Invalid URL entered                   | Validated, warning shown (dismissible per session)           |
| Missing protocol                      | Auto-prepends `https://` (or `http://` for localhost)        |
| Site uses framebust JS                | Header rules can't stop it; warning suggested                |
| Custom device with extreme dimensions | Clamped to 100–3840px                                        |
| Empty device list                     | Empty state with CTA                                         |
| Old saved state (v1.0.0)              | Loads with new fields filled from defaults                   |
| Simulator open in several places      | Each keeps its own devices' UA rules; none removes another's |
| Browser restarted                     | Leftover dynamic UA rules cleaned up by the service worker   |
| iframe never loads                    | "Still loading…" + Stop button after 15s                     |

## Publishing to the Chrome Web Store

1. `bun run package` — writes `dist-crx/mobile-simulator-<version>.zip`.
2. Upload at https://chrome.google.com/webstore/devconsole.
3. Provide privacy policy: extension only modifies response headers in user-opened simulator iframes; no data leaves the device.
4. Be ready for manual review — `<all_urls>` + `declarativeNetRequest` + dynamic rules triggers heightened scrutiny.

## License

MIT.
