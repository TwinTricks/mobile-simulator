import { chromium, expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const distDir = path.join(here, "..", "dist");

/** The id Chrome gives an extension loaded from `dir`: its real path, hashed. */
function unpackedExtensionId(dir: string): string {
  const hash = crypto.createHash("sha256").update(fs.realpathSync(dir)).digest("hex");
  return [...hash.slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}

/**
 * Shows the User-Agent header the request arrived with. The extension rewrites that header, not
 * `navigator.userAgent`, so the header is what a site actually sees.
 */
function testPage(userAgentHeader: string): string {
  const escaped = userAgentHeader.replace(/[<>&]/g, "");
  return `<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview</title></head>
  <body style="margin:0;height:4000px">
    <h1 id="heading">Hello from the preview page</h1>
    <p id="width"></p>
    <p id="ua">${escaped}</p>
    <p id="js"></p>
    <form id="form" onsubmit="event.preventDefault()" style="display:grid;gap:8px;max-width:240px">
      <input id="name" type="text" aria-label="Name">
      <input id="email" type="email" aria-label="Email">
      <input id="code" inputmode="numeric" aria-label="Code">
    </form>
    <script>
      document.getElementById("width").textContent = "width:" + window.innerWidth;
      document.getElementById("js").textContent = [
        "ua=" + navigator.userAgent,
        "platform=" + navigator.platform,
        "touch=" + navigator.maxTouchPoints,
        "screen=" + screen.width + "x" + screen.height,
        "dpr=" + devicePixelRatio,
        "coarse=" + matchMedia("(pointer: coarse)").matches,
      ].join(" | ");
    </script>
  </body>
</html>`;
}

/** A web app whose manifest opens standalone, as an installed app would. */
const PWA_PAGE = `<!doctype html>
<html>
  <head><title>Test app</title><link rel="manifest" href="/manifest.json"></head>
  <body><h1 id="heading">An installable app</h1></body>
</html>`;

/**
 * A tall page that wants its scrollbar: a layered `!important` rule, as a Tailwind utility
 * gives, and a script that throws away every adopted stylesheet once it has loaded.
 */
const SCROLLBAR_PAGE = `<!doctype html>
<html>
  <head>
    <title>Scrollbars</title>
    <style>
      @layer base { html, body, #box { scrollbar-width: auto !important; } }
      ::-webkit-scrollbar { width: 14px; }
    </style>
  </head>
  <body style="margin:0;height:4000px">
    <div id="box" style="height:200px;overflow-y:scroll"><div style="height:1000px"></div></div>
    <script>
      addEventListener("load", () => { document.adoptedStyleSheets = []; });
    </script>
  </body>
</html>`;

type Harness = {
  context: BrowserContext;
  extensionId: string;
  /** The popup, opened as an ordinary tab. Anything it throws fails the test. */
  popup: Page;
};

type WorkerHarness = {
  /**
   * A real local server rather than `context.route`, which answers before Chrome applies the
   * extension's header rules and so would never see a rewritten User-Agent.
   */
  origin: string;
};

export function newProfile(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mobile-simulator-e2e-"));
}

/** Starts Chrome with the built extension loaded. */
export async function launchExtension(profile: string): Promise<BrowserContext> {
  if (!fs.existsSync(path.join(distDir, "manifest.json"))) {
    throw new Error("No build found in dist. Run `bun run build` before the e2e suite.");
  }
  // Extensions only load in a real browser window, so this suite is always headed.
  return chromium.launchPersistentContext(profile, {
    headless: false,
    args: [
      `--disable-extensions-except=${distDir}`,
      `--load-extension=${distDir}`,
      // Recording: lets the extension capture a tab without its icon being clicked there first,
      // which a test can't do. Chrome's share prompt is left on, so a test that meets it fails.
      `--allowlisted-extension-id=${unpackedExtensionId(distDir)}`,
    ],
  });
}

export async function extensionIdOf(context: BrowserContext): Promise<string> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  return new URL(worker.url()).host;
}

export const test = base.extend<Harness, WorkerHarness>({
  origin: [
    async ({}, use) => {
      const server = http.createServer((request, response) => {
        if (request.url === "/manifest.json") {
          response.writeHead(200, { "content-type": "application/manifest+json" });
          response.end(JSON.stringify({ name: "Test app", display: "standalone" }));
          return;
        }
        if (request.url?.startsWith("/pwa")) {
          response.writeHead(200, { "content-type": "text/html" });
          response.end(PWA_PAGE);
          return;
        }
        response.writeHead(200, { "content-type": "text/html" });
        response.end(
          request.url?.startsWith("/scrollbars")
            ? SCROLLBAR_PAGE
            : testPage(request.headers["user-agent"] ?? ""),
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const { port } = server.address() as AddressInfo;
      await use(`http://127.0.0.1:${port}`);
      server.close();
    },
    { scope: "worker" },
  ],

  context: async ({}, use) => {
    const profile = newProfile();
    const context = await launchExtension(profile);
    await use(context);
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  },

  extensionId: async ({ context }, use) => {
    await use(await extensionIdOf(context));
  },

  popup: async ({ context, extensionId }, use) => {
    const crashes: string[] = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => crashes.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await use(page);
    expect(crashes, "the popup threw while the test ran").toEqual([]);
  },
});

/** Opens the simulator straight on a URL, the way the popup does. */
export async function openSimulator(
  context: BrowserContext,
  extensionId: string,
  url: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(
    `chrome-extension://${extensionId}/src/simulator/index.html?url=${encodeURIComponent(url)}`,
  );
  return page;
}

export { expect };
