import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { distDir } from "./harness";

type BuiltManifest = {
  permissions?: string[];
  host_permissions?: string[];
  icons?: Record<string, string>;
  action?: { default_popup?: string };
  side_panel?: { default_path?: string };
  declarative_net_request?: { rule_resources: { id: string; path: string }[] };
};

const manifest = () =>
  JSON.parse(fs.readFileSync(path.join(distDir, "manifest.json"), "utf8")) as BuiltManifest;

test("the build asks for exactly the permissions the README explains", () => {
  expect(manifest().permissions?.sort()).toEqual(
    [
      "activeTab",
      "contextMenus",
      "declarativeNetRequest",
      "declarativeNetRequestWithHostAccess",
      "scripting",
      "sidePanel",
      "storage",
      "tabCapture",
      "tabs",
    ].sort(),
  );
  expect(manifest().host_permissions).toEqual(["<all_urls>"]);
});

test("every file the manifest names is in the build", () => {
  const built = manifest();
  const files = [
    ...Object.values(built.icons ?? {}),
    built.action?.default_popup,
    "src/simulator/index.html",
    built.side_panel?.default_path,
    "content/mobile-identity.js",
    ...(built.declarative_net_request?.rule_resources ?? []).map((r) => r.path),
  ];
  for (const file of files) {
    expect(file && fs.existsSync(path.join(distDir, file)), `${file} is missing`).toBe(true);
  }
});
