# Roadmap: the next 14 features

This is the plan for the 14 features picked after phases 1–8 (screenshots, touch, zoom, side
panel, keyboard, recording, inline phone, extras). Nothing here is built yet. They are grouped
into five phases, roughly from quickest and most useful to largest. After each phase the work is
checked, committed, pushed, and reviewed before the next phase starts.

| Phase | Theme              | Features                                                             |
| ----- | ------------------ | -------------------------------------------------------------------- |
| 9     | Quick wins         | QR code, tap-target check, safe-area insets, more devices            |
| 10    | Network and region | Slow network and offline, location, language and timezone            |
| 11    | Touch feel         | Pinch-zoom, pull-to-refresh, overscroll bounce, keyboard suggestions |
| 12    | Screenshots and UI | Watermark and caption styles, toolbar on any side, download toast    |
| 13    | Power tools        | Element inspector, scroll sync by section, record and replay, MCP    |

## How every phase is done

1. Build the features, with settings added to `src/shared/schemas.ts` (zod, with `.catch()`
   defaults so old saved settings still load) and their types in `src/shared/types.ts`.
2. Anything that runs inside the previewed page goes in `src/content/mobile-identity.ts` (MAIN
   world, every frame, only active when `window.name` starts with `__msim:`). The simulator talks
   to it with `postMessage` through `src/simulator/frame-bridge.ts`.
3. Unit tests (Vitest) for the pure logic, and Playwright tests in `e2e/` for what a user sees.
   The test pages come from `e2e/harness.ts`.
4. Run all checks: `bunx prettier --write src e2e`, `bun run typecheck`, `bun run lint`,
   `bun run test`, `bun run build`, then `bunx playwright test` (outside the sandbox).
5. Update `README.md`, commit, push to `main`, and check in before the next phase.

---

## Phase 9: Quick wins

### 9.1 QR code of the current address

**Goal.** Open what is on screen on a real phone by scanning a code.

- A "QR code" button in the simulator toolbar opens a small dialog. It shows a QR code of the
  current page address, the address as text, and a "Copy" button.
- The QR code is drawn client-side, with no network call: either a tiny dependency (`uqr`, about
  5 KB, no further dependencies) or a small encoder in `src/lib/qr.ts`.
- `localhost` and `127.0.0.1` can't be reached from a phone. For those, the dialog shows a hint
  and an editable host field (for example `192.168.1.20:5173`), remembered per site. The QR code
  uses the edited address.
- The `#mobile-sim` inline hash and the simulator's own tracking parameters are removed from the
  address first (`withoutInlineHash`, `untagged`).

**Files.** New `src/simulator/components/QrDialog.tsx`, a toolbar button in `App.tsx`, an entry
in `src/simulator/shortcuts.ts` (key `Q`), and `qrHosts` in the state schema.

**Tests.** Unit: the address cleaning and the localhost replacement. E2E: the dialog opens, and
the address shown is the page's without the hash.

### 9.2 Tap-target check

**Goal.** Show buttons and links that are too small to tap comfortably.

- A toggle in the Tools panel, "Show small tap targets".
- In each frame, the identity script finds interactive elements: `a[href]`, `button`, `input`,
  `select`, `textarea`, `[role=button]`, `[onclick]`, `[tabindex]` other than `-1`, and
  `label[for]`.
- An element is too small when its box is under 44×44 CSS px on Apple devices, or under 48×48
  on Android (Apple's and Google's guidance). The minimum can be changed in the setting.
- Hidden elements and elements outside the page are skipped. Inline links inside running text
  are reported separately, as "inline", because WCAG 2.5.8 exempts them.
- Small targets get a red outline drawn in an overlay layer (`pointer-events: none`) that does
  not change the page's own styles. Small targets closer than 8 px to each other get a stripe
  pattern.
- A badge on the device caption shows the count ("6 small targets"). Clicking it lists them
  (selector, size), and choosing one scrolls the page to it and flashes it.
- The check runs again after changes in the page (a debounced MutationObserver, scroll and
  resize).

**Files.** `tapTargets()` in `mobile-identity.ts`, pure measuring in `src/shared/tap-targets.ts`,
the UI in `ToolsPanel.tsx` and `DeviceFrame.tsx`.

**Tests.** Unit: the size rules and the inline exemption. E2E: a harness page with one 30×30 and
one 60×60 button outlines only the small one, and the count updates when a button is added.

### 9.3 Safe-area insets

**Goal.** Pages that use `env(safe-area-inset-*)` lay out as they would on the real device (for
example, behind the notch or Dynamic Island, and above the home indicator).

- The insets for each device come from its frame. Top is the status bar or island area, bottom
  is the home indicator area, and left and right apply when rotated. They are added to the device
  data in `src/shared/devices.ts` as `safeArea: {top, right, bottom, left}`, with a rotated
  version worked out in `frame-box.ts`.
- Chrome always resolves `env(safe-area-inset-*)` to 0 in a desktop iframe, and a script can't
  change that. So the identity script rewrites the stylesheets it can read:
  - Every `env(safe-area-inset-X…)` in a rule becomes
    `var(--msim-safe-X, env(safe-area-inset-X…))`, and the four variables are set on `:root`.
  - Same-origin sheets, `<style>` tags and `style=""` attributes are rewritten in place.
  - Cross-origin sheets can't be read through the CSSOM, so the extension fetches their text
    (it has host access), rewrites it, and adds the result as a constructed sheet in the same
    position.
  - A MutationObserver handles sheets added later.
- Insets only apply when the page asks for them with `viewport-fit=cover` in its viewport meta,
  as on a real device. Otherwise they stay 0.
- A setting "Safe-area insets" with On, Off, or "On even without viewport-fit=cover".
- An optional "Show safe areas" guide in the Tools panel shades the inset areas over the screen.

**Files.** `safeAreas()` in `mobile-identity.ts`, the rewriting in `src/shared/safe-area.ts`, a
fetch-sheet message in `service-worker.ts` (checked against the sender like `inline-rules`),
`ScreenGuides.tsx`.

**Tests.** Unit: the `env()` rewriting, including fallbacks and `max()`/`calc()`. E2E: a harness
page with `padding-top: env(safe-area-inset-top)` gets the iPhone's top inset, gets 0 without
`viewport-fit=cover`, and gets the side insets when rotated.

**Limit.** `env()` written inside JavaScript-set inline styles after load is caught by the
observer, but closed shadow roots can't be reached.

### 9.4 More devices

**Goal.** Fill gaps against competitors.

| Device                       | CSS size (to confirm from spec sheets) | DPR  | Notes                            |
| ---------------------------- | -------------------------------------- | ---- | -------------------------------- |
| Apple Watch Series 10 (46mm) | 208×248                                | 2    | New `watch` category, watchOS UA |
| Apple Watch Ultra 2          | 205×251                                | 2    |                                  |
| Galaxy Watch 7 (44mm)        | about 240×240, round                   | 2    | Round screen, Wear OS UA         |
| Galaxy Z Fold 6, open        | 904×882                                | 2.33 | The inner screen, nearly square  |
| Nothing Phone (3)            | about 412×915                          | 3    | Android UA                       |
| OnePlus 13                   | about 412×919                          | 3.5  | Android UA                       |

- A new `watch` category in `devices.ts` and `device-groups.ts`, shown as its own group in the
  Devices panel. It is off by default in the device presets.
- A round screen (`screenShape: "round"`) clips the iframe and screenshots to a circle, in both
  `DeviceFrame.tsx` and `screenshot/compose.ts`.
- Frames: where there's no frame image, use the drawn rounded frame the custom devices already
  use. Frame images can be added to `public/frames/` and `frames.generated.ts` later.
- Watches get no status bar, keyboard or home indicator, and no browser bars.
- The open Fold gets a thin hinge guide line that can be turned off.

**Tests.** Update `devices.spec.ts`, `device-groups.spec.ts` and `frame-box.spec.ts`. E2E: a
watch is picked and shows at its size, and the round screen is clipped.

---

## Phase 10: Network and region

### 10.1 Slow network and offline

**Goal.** See loading states and offline handling without the DevTools network panel.

- Presets: No throttling, Fast 4G, Slow 4G, 3G, Slow 3G (2G), and Offline, plus a custom
  download, upload and latency.
- **Offline**
  - The identity script makes `navigator.onLine` false and fires `offline`, then `online` when
    it's turned back on.
  - `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` fail as a real offline
    browser would (a `TypeError: Failed to fetch`).
  - New loads of images, scripts, styles and fonts are blocked with a session
    `declarativeNetRequest` rule limited to the simulator's tab. A reload shows an offline page
    drawn by the simulator over the device screen.
- **Throttling**
  - `fetch` and XHR are slowed in the page: the latency is added before the request, and the
    response body is streamed out at the chosen speed with a `ReadableStream`.
  - Images, styles and scripts can't be slowed from a script. The setting explains this, and
    offers an optional "Throttle everything" mode that attaches `chrome.debugger` to the tab and
    calls `Network.emulateNetworkConditions`. This needs the `debugger` permission, which is
    asked for only when used, and Chrome shows its "is debugging this browser" bar.
- The choice is per device, so one phone can be offline while another isn't. A chip under the
  device shows it ("Slow 3G").

**Files.** `networkConditions()` in `mobile-identity.ts`, presets in
`src/shared/network-presets.ts`, `EnvironmentControls.tsx`, `dynamic-rules.ts` for the offline
block, and `debugger` in `optional_permissions` in `src/manifest.ts`.

**Tests.** Unit: the presets and the delay maths. E2E: offline makes a `fetch` fail and
`navigator.onLine` false, and a 2 s latency delays a fetch by about 2 s.

### 10.2 Location

- Pick a place from a list (London, New York, Tokyo, São Paulo, Sydney, Bengaluru, and so on),
  type latitude and longitude, or choose "Permission denied" or "Position unavailable".
- The identity script replaces `navigator.geolocation.getCurrentPosition` and `watchPosition`
  (with `clearWatch`), and `navigator.permissions.query({name: "geolocation"})` answers to match.
- Accuracy and an optional moving route for `watchPosition` (a few points repeated) for testing
  map pages.

### 10.3 Language and timezone

- **Language.** `navigator.language` and `navigator.languages`, plus the `Accept-Language`
  request header through the existing header rules (`src/lib/header-rules.ts`), so the server
  sees it too. The default `Intl` locale is changed by wrapping the `Intl` constructors and
  `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` when no locale is given.
- **Timezone.** `Intl.DateTimeFormat().resolvedOptions().timeZone` reports the chosen zone, and
  `Date` local-time methods (`getHours`, `toString`, `getTimezoneOffset`, and so on) work in that
  zone, using `Intl` to find the offset at each moment so daylight saving is right.
- The status bar clock follows the chosen timezone unless a time is forced.
- **Presets** combine all three ("Tokyo, ja-JP, Asia/Tokyo") in the Environment controls.

**Files.** `region()` in `mobile-identity.ts`, `src/shared/region.ts` (places, zones, offset
maths), `EnvironmentControls.tsx`, `header-rules.ts`.

**Tests.** Unit: the timezone offsets across a DST change, and the header rule. E2E: a harness
page prints `navigator.language`, the time zone, `new Date().getHours()` and a geolocation
result, and they match the choices. The `Accept-Language` the server receives is checked too.

**Limit.** Pages that read the time in a worker, or create a fresh iframe before the script
runs, see the real zone.

---

## Phase 11: Touch feel

### 11.1 Pinch-zoom

- Holding Alt (Option) while dragging on a device shows two touch points mirrored around the
  screen's centre, as the iOS Simulator does. Dragging them apart or together pinches. The trackpad
  pinch (a `wheel` with `ctrlKey`) works too.
- Pages get `touchstart`, `touchmove` and `touchend` events with two touches, in the existing
  `touchMode()` in `mobile-identity.ts`, so pages that handle pinch themselves (maps, galleries)
  respond.
- Otherwise the page zooms the way a phone does: the visual viewport scales, from 1 to 5, and
  can be panned. `user-scalable=no` or `maximum-scale=1` in the viewport meta stops it, as on a
  phone. Double tap zooms in and back out.
- `window.visualViewport.scale` and its events report the zoom.

### 11.2 Pull-to-refresh

- On Android devices, and in the iOS browser bars mode, dragging down while the page is at the
  top shows the platform's refresh spinner. Letting go past the threshold reloads the frame.
- It is skipped when the page sets `overscroll-behavior-y: contain` or `none` on the root, as
  Chrome does.

### 11.3 Overscroll bounce

- On iOS devices, dragging or flicking past the top or bottom stretches the page with a rubber-
  band curve, then springs back. This is a transform on the root during the touch drag and the
  existing flick momentum. Android shows its stretch effect instead.
- `overscroll-behavior: none` turns it off.
- A setting "Overscroll effect": Device default, iOS bounce, Android stretch, or None.

### 11.4 Keyboard suggestion bar

- A bar of three suggestions above the keys in `DeviceKeyboard.tsx`, styled like iOS
  QuickType or Gboard on Android.
- The suggestions finish the word being typed, from a built-in list of about 5,000 common English
  words, ranked by frequency (`src/simulator/keyboard/words.ts`, loaded only when the keyboard
  opens). The middle one is the best match. After a space, the bar shows common next words.
- Tapping a suggestion replaces the current word and adds a space through the existing keyboard
  bridge.
- It is hidden for `type=password`, `email`, `number` and `tel`, and when `autocomplete="off"` or
  `autocorrect="off"` is set, as real keyboards do.

**Files.** `touchMode()` and `scrollBridge()` in `mobile-identity.ts`, new
`src/simulator/gestures.ts` (the rubber band and pinch maths), `DeviceKeyboard.tsx`,
`keyboard/layout.ts`, and `src/simulator/keyboard/suggest.ts`.

**Tests.** Unit: the rubber-band curve, the pinch scale limits, and the suggestion ranking. E2E:
a pinch changes `visualViewport.scale` and is refused with `user-scalable=no`, a pull at the top
reloads the frame, and typing "hel" offers "hello" and tapping it fills the field.

---

## Phase 12: Screenshots and UI

### 12.1 Screenshot watermark and caption styles

- **Watermark.** Text or an uploaded logo image, kept in storage. It can be placed in a corner,
  the centre, or tiled, with opacity, size and colour. It's drawn in `screenshot/compose.ts`, so
  it appears in screenshots and recordings, and is previewed live in `ScreenshotDialog.tsx`.
- **Caption styles.** For the device name and size under each phone in screenshots: font (system,
  serif, mono, or a few bundled fonts), size, weight, colour, opacity, and above or below. An
  optional custom caption text per device ("Checkout, iPhone").
- Saved as named styles, so a team look can be reused.

### 12.2 Toolbar on any side

- A setting "Toolbar position": left (now), right, top or bottom. `Rail.tsx` lays out as a
  column or a row, and the stage leaves room on that side. Tooltips open away from the edge.
- Presentation mode's slide-in edge (`PresentationEdge.tsx`) follows the toolbar's side.

### 12.3 "Show in folder" download toast

- After a screenshot, recording or GIF is saved, a toast shows the file name with "Show in
  folder" and "Open".
- Saving goes through `chrome.downloads.download` instead of an `<a download>` link, so the
  download ID is known. The toast then calls `chrome.downloads.show(id)` or
  `chrome.downloads.open(id)`.
- This needs the `downloads` permission. It's added to `optional_permissions` and asked for the
  first time "Show in folder" is clicked, so installs aren't asked for more.

**Files.** `compose.ts`, `ScreenshotDialog.tsx`, `Rail.tsx`, `App.tsx`, a new
`src/simulator/components/DownloadToast.tsx` and `src/lib/downloads.ts`, `manifest.ts`.

**Tests.** Unit: watermark placement and tiling maths. E2E: the toolbar moves to each side and
stays usable, a watermarked screenshot has the watermark pixels where expected, and the toast
appears after a download.

---

## Phase 13: Power tools

### 13.1 Element inspector

- An "Inspect" toggle (key `I`). Hovering an element in any device outlines it with margin,
  border and padding drawn as in DevTools. A label shows its tag, classes, size, font and
  colours.
- Clicking pins it, and the same element is outlined on every other device, found with the
  selectors the interaction sync already makes (`cssPath`/`describe`/`findTarget`). That makes
  it easy to compare one element across sizes.
- A side card lists the pinned element's main computed styles on each device side by side, with
  the values that differ highlighted. "Copy selector" and "Copy styles" buttons.
- Esc leaves inspect mode. While inspecting, clicks don't reach the page.

### 13.2 Scroll sync by section

- Today, following a real tab syncs scroll by percentage, which drifts when layouts differ.
  A new "By section" mode keeps the same heading or element at the top instead.
- In the real tab and in each device, a reporter finds the element at the top of the viewport
  that has an `id`, or the closest heading (`h1`–`h6`, `section`, `[data-section]`), and how far
  into it the viewport is.
- The others scroll so the same element is at the top, at the same fraction through it. If no
  match is found, they fall back to percentage.
- It works both ways, with the existing guard against scroll echo loops.

**Files.** `use-followed-tab.ts`, `scrollBridge()` in `mobile-identity.ts`, a new
`src/shared/section-anchor.ts`, and the Sync section in `ToolsPanel.tsx`.

### 13.3 Record and replay

- "Record steps" captures clicks, typing, scrolling, navigation and waits in one device, as steps
  that use the same element descriptions as the interaction sync.
- "Replay" plays the steps on any device or on all at once, at 1× or faster, with a progress bar.
  Each step waits for its element to appear (up to a timeout). Failed steps are shown with the
  reason.
- Recordings are saved by name in storage. They can be exported as JSON, and also as a Playwright
  test file for use in a project's own tests.
- Can be combined with screen recording: replay while recording gives the same demo on each
  device.

**Files.** New `src/simulator/replay/` (recorder, player, export), the hooks in
`interactionSync()` in `mobile-identity.ts`, and a new `ReplayPanel.tsx`.

### 13.4 MCP server for AI agents

**Goal.** Let AI agents (Cursor, Claude, and others) drive the simulator: open a page on a
device, take screenshots, read the console, click and type.

- An extension can't open a server itself. So there's a small separate program, `mcp/`, run with
  `bunx mobile-simulator-mcp`. It's an MCP server over stdio, using `@modelcontextprotocol/sdk`.
- The program also listens on a local WebSocket (`127.0.0.1` only, default port 17321). The
  extension's service worker connects to it when "Allow AI agents" is on in settings. The open
  socket keeps the service worker awake (Chrome 116 and later).
- **Pairing.** The program prints a one-time code, and the user types it into the extension once.
  After that, every message is signed with the shared key. Nothing connects without it, and the
  setting is off by default.
- **Tools:**
  - `list_devices`, `open(url, devices)`, `set_device`, `rotate`, `set_zoom`
  - `screenshot(device?, framed?)`, returning a PNG
  - `get_console(device)` and `get_page_errors`, through the existing DevTools bridge
  - `click(selector)`, `type(selector, text)`, `scroll(to)`, `navigate`, `reload`
  - `set_network`, `set_location`, `set_region`, the controls from phase 10
  - `tap_targets(device)` and `inspect(selector)`, the reports from phases 9 and 13
- A README section with the setup for Cursor (`.cursor/mcp.json`) and Claude.

**Files.** New `mcp/` package (server, WebSocket bridge, tool definitions with zod), the agent
connection in `service-worker.ts`, and a new `src/background/agent-bridge.ts`. Messages to the
simulator page go through the existing message types in `src/shared/messages.ts`.

**Tests.** Unit: the pairing check and the message signing. A test that starts the MCP program,
connects a test client, and runs `list_devices` and `screenshot` against the extension loaded in
Playwright.

**Risk.** This is the biggest item. It may be split into its own phase (13b) if phase 13 grows
too large.

---

## Permissions summary

| Permission  | Phase | Why                                      | How it's asked            |
| ----------- | ----- | ---------------------------------------- | ------------------------- |
| `debugger`  | 10    | Optional "Throttle everything" mode      | Optional, asked when used |
| `downloads` | 12    | "Show in folder" and "Open" in the toast | Optional, asked when used |

Everything else uses permissions the extension already has.

## Status

| Phase | Status      |
| ----- | ----------- |
| 9     | Not started |
| 10    | Not started |
| 11    | Not started |
| 12    | Not started |
| 13    | Not started |
