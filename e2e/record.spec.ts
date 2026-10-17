import fs from "node:fs";

import type { BrowserContext, FrameLocator, Page } from "@playwright/test";

import { expect, openSimulator, test } from "./harness";

async function ready(simulator: Page) {
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toHaveText("Hello from the preview page");
  await expect(simulator.getByText("Loading…")).toHaveCount(0);
}

/** Chrome can't allow the camera for an extension's page from a test, so a canvas stands in. */
function fakeCamera(context: BrowserContext) {
  return context.addInitScript(() => {
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (!constraints?.video) return real(constraints);
      const canvas = Object.assign(document.createElement("canvas"), { width: 320, height: 320 });
      const paint = canvas.getContext("2d")!;
      setInterval(() => {
        paint.fillStyle = `hsl(${Date.now() / 10} 70% 50%)`;
        paint.fillRect(0, 0, 320, 320);
      }, 50);
      return canvas.captureStream(20);
    };
  });
}

/** Opens the studio and its options, with no countdown so recordings start at once. */
async function openStudio(page: Page | FrameLocator) {
  await page.getByRole("button", { name: "Record video" }).click();
  const bar = page.getByRole("toolbar", { name: "Recording studio" });
  const panel = page.getByRole("complementary", { name: "Recording studio" });
  // Only the bar at first; its settings button brings the options.
  await expect(bar).toBeVisible();
  await expect(panel).toBeHidden();
  await bar.getByRole("button", { name: "Studio options" }).click();
  await panel
    .getByRole("group", { name: "Countdown" })
    .getByRole("button", { name: "None" })
    .click();
  return { panel, bar };
}

async function videoOf(page: Page | FrameLocator) {
  const dialog = page.getByRole("dialog", { name: "Recording" });
  const video = dialog.getByLabel("Recording preview");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  const [width, height] = await video.evaluate((v: HTMLVideoElement) => [
    v.videoWidth,
    v.videoHeight,
  ]);
  return { dialog, width: width!, height: height! };
}

test("V counts down to a recording, and Esc calls it off", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await ready(simulator);

  await simulator.keyboard.press("v");
  await expect(simulator.getByRole("status", { name: "Recording starts in 3" })).toBeVisible();
  await expect(simulator.getByRole("status", { name: "Recording starts in 2" })).toBeVisible();
  await simulator.keyboard.press("Escape");
  await expect(simulator.getByRole("status", { name: /^Recording starts/ })).toHaveCount(0);
  await expect(simulator.getByRole("button", { name: "Record video" })).toBeVisible();
  // Called off for good: no recording starts once the count would have run out.
  await simulator.waitForTimeout(2500);
  await expect(simulator.getByRole("button", { name: "Stop recording" })).toHaveCount(0);
});

test("the studio puts the device on a backdrop in a 16:9 video, with camera and cursor", async ({
  context,
  extensionId,
  origin,
}) => {
  await fakeCamera(context);
  const simulator = await openSimulator(context, extensionId, origin);
  await ready(simulator);
  const { panel, bar } = await openStudio(simulator);

  await panel.getByRole("button", { name: "Ocean backdrop" }).click();
  const backdrop = simulator.locator("[data-studio-backdrop] > div");
  await expect
    .poll(() => backdrop.evaluate((d) => getComputedStyle(d).backgroundImage))
    .toContain("linear-gradient");
  await bar
    .getByRole("group", { name: "Video size" })
    .getByRole("button", { name: "16:9" })
    .click();
  await expect(simulator.getByRole("region", { name: "Recording area, 16:9" })).toBeVisible();
  await bar.getByRole("combobox", { name: "Camera" }).click();
  await simulator.getByRole("option").nth(1).click();
  await expect(simulator.getByRole("img", { name: "Camera" })).toBeVisible();
  await bar.getByRole("button", { name: /^Recording cursor/ }).click();
  await simulator.getByRole("button", { name: "Blue cursor" }).click();
  await expect(bar.getByRole("button", { name: "Recording cursor: Blue" })).toBeVisible();
  // Allowed to capture the tab, so Chrome's prompt never shows and the bar says nothing of it.
  await expect(bar).not.toContainText("Chrome will ask");

  await bar.getByRole("button", { name: "Start" }).click();
  await expect(simulator.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await expect(bar).toBeHidden();
  await expect(simulator.locator("[data-device-caption]")).toBeHidden();
  const box = (await simulator.locator("[data-record-box]").boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  const bubble = (await simulator.getByRole("img", { name: "Camera" }).boundingBox())!;
  expect(bubble.x).toBeGreaterThanOrEqual(box.x);
  expect(bubble.y + bubble.height).toBeLessThanOrEqual(box.y + box.height + 1);

  // The drawn cursor follows the pointer over the stage and inside the device's page.
  const cursor = simulator.locator("[data-drawn-cursor]");
  await simulator.mouse.move(box.x + 20, box.y + 20);
  await expect(cursor).toHaveCSS("opacity", "1");
  const phone = (await simulator.locator('iframe[title="iPhone 17 Pro"]').boundingBox())!;
  await simulator.mouse.move(phone.x + 60, phone.y + 120);
  await expect.poll(async () => (await cursor.boundingBox())!.x).toBeGreaterThan(phone.x + 40);

  await simulator.waitForTimeout(1000);
  await simulator.getByRole("button", { name: "Stop recording" }).click();
  const { dialog, width, height } = await videoOf(simulator);
  expect(width / height).toBeCloseTo(16 / 9, 1);
  const scale = await simulator.evaluate(() => window.devicePixelRatio);
  expect(Math.abs(width - box.width * scale)).toBeLessThan(box.width * scale * 0.05);
  await expect(cursor).toHaveCount(0);

  await dialog.getByRole("button", { name: "Discard" }).click();
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Close the studio" }).click();
  await expect(bar).toHaveCount(0);
  await expect(simulator.locator("[data-studio-backdrop]")).toHaveCount(0);
  await expect(simulator.getByRole("img", { name: "Camera" })).toHaveCount(0);
  await expect(simulator.locator("[data-device-caption]")).toBeVisible();
});

test("a custom size is a box dragged by its handles", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await ready(simulator);
  const { bar } = await openStudio(simulator);
  await bar
    .getByRole("group", { name: "Video size" })
    .getByRole("button", { name: "Custom" })
    .click();
  const area = simulator.getByRole("region", { name: "Recording area, Custom" });
  const before = (await area.boundingBox())!;

  // The top-right corner: wider to the right, shorter from the top.
  const handle = (await area.locator('[data-handle="ne"]').boundingBox())!;
  await simulator.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await simulator.mouse.down();
  await simulator.mouse.move(handle.x + 100, handle.y + 60, { steps: 5 });
  await simulator.mouse.up();
  await expect
    .poll(async () => (await area.boundingBox())!.width)
    .toBeGreaterThan(before.width + 80);
  const after = (await area.boundingBox())!;
  expect(after.y).toBeGreaterThan(before.y + 40);
  expect(after.height).toBeLessThan(before.height - 40);
  expect(after.x).toBeCloseTo(before.x, 0);

  // Kept for next time.
  await simulator.reload();
  await ready(simulator);
  await openStudio(simulator);
  await expect.poll(async () => (await area.boundingBox())?.width).toBeCloseTo(after.width, -1);
});

test("a recording plays back and saves as MP4 the shape of the device", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await ready(simulator);
  const { bar } = await openStudio(simulator);
  await bar.getByRole("button", { name: "Start" }).click();
  const stop = simulator.getByRole("button", { name: "Stop recording" });
  await expect(stop).toBeVisible();
  await simulator.waitForTimeout(1500);
  await expect(simulator.getByText(/^0:0[1-9]$/)).toBeVisible();
  await stop.click();

  const { dialog, width, height } = await videoOf(simulator);
  await expect(dialog).toContainText("MP4");
  // Cropped to the phone: tall and narrow, not the shape of the whole tab.
  const body = (await simulator.locator("[data-device-body]").boundingBox())!;
  expect(height / width).toBeCloseTo(body.height / body.width, 1);

  const download = simulator.waitForEvent("download");
  await dialog.getByRole("button", { name: /^Save (MP4|WEBM)$/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^recording-127-0-0-1-iphone-17-pro-.+\.mp4$/);
  const bytes = fs.readFileSync((await file.path())!);
  expect(bytes.subarray(4, 8).toString("latin1")).toBe("ftyp");
  await expect(dialog).toHaveCount(0);
});

test("over a website's page, the studio records its own tab", async ({
  context,
  popup,
  origin,
}) => {
  const site = await context.newPage();
  await site.goto(origin);
  const tabId = await popup.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => tab.url?.startsWith(prefix))!.id!;
  }, origin);
  await popup.evaluate(
    (id) => chrome.runtime.sendMessage({ type: "open-full-screen", tabId: id }),
    tabId,
  );
  const overlay = site.frameLocator("#__msim-overlay");
  await expect(
    overlay.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toHaveText("Hello from the preview page");
  await site.bringToFront();

  const { panel, bar } = await openStudio(overlay);
  await panel.getByRole("button", { name: "Sonoma backdrop" }).click();
  await bar.getByRole("group", { name: "Video size" }).getByRole("button", { name: "1:1" }).click();
  await bar.getByRole("button", { name: "Start" }).click();
  await expect(overlay.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await site.waitForTimeout(1200);
  await overlay.getByRole("button", { name: "Stop recording" }).click();
  const { width, height } = await videoOf(overlay);
  expect(width / height).toBeCloseTo(1, 1);
});
