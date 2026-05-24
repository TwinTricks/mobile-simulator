---
title: Mobile Simulator — Privacy Policy
---

# Privacy Policy — Mobile Simulator

**Last updated:** May 24, 2026
**Extension:** Mobile Simulator — Multi-Device Tester
**Publisher:** TwinTechies

## Summary

Mobile Simulator **does not collect, store, transmit, sell, or share** any personal information, browsing data, or user content. Everything happens entirely on your local machine. There are no servers, no analytics, no telemetry, no ads.

## What data the extension handles

Mobile Simulator stores the following **locally in your browser** (via `chrome.storage.local`) for the extension to function:

- Your selected devices and any custom device definitions you create
- Saved presets (named device groups)
- Per-device rotation state
- The last URL you previewed (for convenience on next open)
- Your settings: theme, zoom, bezel mode, compact view, color-scheme override, CSP handling mode, User-Agent spoofing toggle
- Session-only state in `chrome.storage.session` (dismissed warnings) — cleared on browser restart

When you preview a URL inside the simulator, your browser fetches that URL **directly** — exactly as if you'd typed it into the address bar. The extension does not intercept, record, or transmit the content of those pages anywhere.

## How the header modifications work

To make the simulator functional, the extension uses Chrome's `declarativeNetRequest` API to:

1. **Remove iframe-blocking headers** (`X-Frame-Options`, `Content-Security-Policy`) on responses to URLs you preview, so they can render inside the simulator's iframes. You can disable or limit this in Settings.
2. **Rewrite the `User-Agent` header** per device, so target sites serve their mobile HTML. Each iframe URL gets a unique parameter `?__sim_device=<id>` that the dynamic rules match against — these rules **cannot affect your regular browsing**.

All dynamic rules are **automatically removed** when you close the simulator tab. No rules persist across browser sessions.

## What we do NOT do

- ❌ We do not collect personally identifiable information
- ❌ We do not collect browsing history
- ❌ We do not collect cookies, credentials, or form data
- ❌ We do not transmit any data to any server (we don't operate any)
- ❌ We do not use analytics or telemetry
- ❌ We do not sell, share, or transfer data to third parties
- ❌ We do not inject content scripts into pages you browse outside the simulator
- ❌ We do not use the data for any purpose unrelated to the extension's stated function

## Permissions explained

| Permission | Purpose |
|---|---|
| `storage` | Saves your selected devices, custom devices, presets, and settings on your device only |
| `tabs` | Opens the simulator interface; provides "Open in real tab" per device frame |
| `activeTab` | Reads the active tab's URL one time when you click "Simulate current tab" |
| `scripting` | Injects a small "scroll-bridge" script into each iframe inside the simulator so they can scroll in sync. Not used on any other tabs. |
| `webNavigation` | Enumerates the frame IDs inside the simulator tab (via `getAllFrames`) so we inject the scroll-bridge only into iframes, not the extension's own page. Read-only, scoped to the simulator tab. |
| `declarativeNetRequest` | Strips iframe-blocking headers on URLs inside the simulator |
| `declarativeNetRequestWithHostAccess` | Rewrites the User-Agent per device via dynamic rules |
| `host_permissions: <all_urls>` | Required so the header rules apply to whatever URL you preview |

The `<all_urls>` permission is required only because the simulator allows you to preview **any** URL of your choosing — the extension does not know in advance which sites you'll test. No content scripts are injected into general browsing.

## Data retention and deletion

All extension data lives in your browser's local storage. You can delete it at any time by:

- Removing the extension (uninstalls all data automatically), or
- Resetting state from within the simulator UI

## Source code

This extension is open source. The full source code is available at:
[github.com/TwinTricks/mobile-simulator](https://github.com/TwinTricks/mobile-simulator)

You can verify the privacy claims above by reading the code yourself.

## Children's privacy

This extension is a general-purpose developer tool and is not directed at children under 13. We do not knowingly collect any data, so no children's data could be collected.

## Changes to this policy

Any changes will be reflected in this document with an updated "Last updated" date. Material changes will be highlighted in extension update notes on the Chrome Web Store listing.

## Contact

Questions, concerns, or bug reports:

- **Email:** twinntricks@gmail.com
- **GitHub Issues:** [github.com/TwinTricks/mobile-simulator/issues](https://github.com/TwinTricks/mobile-simulator/issues)
- **Publisher:** TwinTechies

## Legal

This extension is provided "as is" without warranty of any kind. Use at your own discretion. Licensed under MIT.
