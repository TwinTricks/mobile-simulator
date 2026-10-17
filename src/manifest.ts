import { defineManifest } from "@crxjs/vite-plugin";

import { RECORD_COMMAND } from "./shared/constants";

export const manifest = defineManifest(({ command }) => {
  const dev = command === "serve";

  return {
    manifest_version: 3,
    name: "Mobile Simulator - Multi-Device Tester",
    version: "1.1.0",
    description:
      "Test how websites look on iPhone, Pixel, iPad, Galaxy and more - side by side in one window.",
    icons: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
    action: {
      default_title: "Mobile Simulator",
      default_popup: "src/popup/index.html",
      default_icon: {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
      },
    },
    background: {
      service_worker: "src/background/service-worker.ts",
      type: "module",
    },
    side_panel: {
      default_path: "src/simulator/panel.html",
    },
    commands: {
      _execute_action: {
        suggested_key: { default: "Ctrl+Shift+M", mac: "Command+Shift+M" },
      },
      "toggle-full-screen": {
        suggested_key: { default: "Alt+Shift+F" },
        description: "Preview the current page on a phone, full screen",
      },
      [RECORD_COMMAND]: {
        suggested_key: { default: "Alt+Shift+R" },
        description: "Start or stop recording the simulator, without Chrome asking first",
      },
    },
    // Left off during `bun run dev`, where the pages are served over HTTP by Vite.
    ...(dev
      ? {}
      : {
          content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'self'; base-uri 'self'",
          },
        }),
    permissions: [
      "storage",
      "tabs",
      "activeTab",
      "scripting",
      "declarativeNetRequest",
      "declarativeNetRequestWithHostAccess",
      "contextMenus",
      "sidePanel",
      "tabCapture",
    ],
    // Small, and loads the inline phone only when a page asks for it with `#mobile-sim`.
    content_scripts: [
      {
        matches: ["http://*/*", "https://*/*"],
        js: ["src/content/inline-trigger.ts"],
        run_at: "document_idle",
      },
    ],
    // Full screen lays the simulator page over the website, inside the website's own tab.
    web_accessible_resources: [
      {
        resources: ["src/simulator/index.html", "assets/*", "frames/*", "icons/*"],
        matches: ["<all_urls>"],
      },
    ],
    // Header rules and the scroll bridge have to reach whatever site is being previewed.
    host_permissions: ["<all_urls>"],
    // The ids must match the RULESET_* constants in src/shared/constants.ts.
    declarative_net_request: {
      rule_resources: [
        { id: "iframe_rules", enabled: true, path: "rules/strip-csp-and-xfo.json" },
        { id: "iframe_rules_xfo_only", enabled: false, path: "rules/strip-xfo-only.json" },
      ],
    },
  };
});
