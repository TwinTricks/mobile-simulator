import type { Page } from "@playwright/test";

import { expect, openSimulator, test } from "./harness";

async function store(popup: Page, settings: object, state: object = {}) {
  await popup.evaluate(
    ([settings, state]) =>
      chrome.storage.local.set({ "sim-settings": settings, "sim-state": state }),
    [settings, state],
  );
}

test("the status bar shows the battery level and the time it is told to", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { batteryLevel: 15, forcedTime: "09:41" });
  const simulator = await openSimulator(context, extensionId, origin);
  const figure = simulator.getByRole("figure", { name: /iPhone 17 Pro/ });
  await expect(figure.getByText(/^0?9:41$/)).toBeVisible();
  // Low charge is drawn red, as iOS does.
  await expect(figure.locator('rect[fill="#ff3b30"]')).toHaveCount(1);
});

test("the browser bars show the address they are given, and web apps show without them", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { browserChrome: true, displayUrl: "shop.example.com" });
  const simulator = await openSimulator(context, extensionId, origin);
  const address = simulator.getByRole("button", { name: "Change the address" }).first();
  await expect(address).toContainText("shop.example.com");

  await simulator.goto(
    `chrome-extension://${extensionId}/src/simulator/index.html?url=${encodeURIComponent(`${origin}/pwa`)}`,
  );
  const phone = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(phone.locator("#heading")).toHaveText("An installable app");
  await expect(simulator.getByRole("button", { name: "Change the address" })).toHaveCount(0);
});

test("native scrollbars can be kept, and hidden again without a reload", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { nativeScrollbars: true });
  const simulator = await openSimulator(context, extensionId, origin);
  const phone = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(phone.locator("#heading")).toHaveText("Hello from the preview page");
  await expect(phone.locator("#__msim-no-scrollbars")).toHaveCount(0);

  await simulator.getByRole("button", { name: "Settings" }).click();
  await simulator.getByRole("switch", { name: "Show native scrollbar in the device" }).click();
  await expect(phone.locator("#__msim-no-scrollbars")).toHaveCount(1);
});

test("the default device is the one shown each time the simulator opens", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { defaultDeviceId: "pixel-8" }, { visibleDeviceIds: ["iphone-17-pro"] });
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(simulator.locator('iframe[title="Pixel 8"]')).toHaveCount(1);
  await expect(simulator.locator('iframe[title="iPhone 17 Pro"]')).toHaveCount(0);
});

test("the background colour and presentation mode change the stage", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { stageBackground: "#112233", presentation: true });
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(simulator.locator("main")).toHaveCSS("background-color", "rgb(17, 34, 51)");

  const rail = simulator.getByRole("navigation", { name: "Simulator" });
  await simulator.mouse.move(200, 200);
  await expect(rail).not.toBeInViewport();
  const { width, height } = simulator.viewportSize()!;
  await simulator.mouse.move(width - 3, height / 2);
  await expect(rail).toBeInViewport();
});

test("one switch turns every kind of sync on or off", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await store(popup, { multiDevice: true });
  const simulator = await openSimulator(context, extensionId, origin);
  await simulator.getByRole("button", { name: "Settings" }).click();
  const sync = simulator.getByRole("switch", { name: "Sync events between devices" });
  await expect(sync).toBeChecked();
  await sync.click();
  await expect
    .poll(() => simulator.evaluate(() => chrome.storage.local.get("sim-settings")))
    .toMatchObject({
      "sim-settings": {
        syncScroll: false,
        syncClicks: false,
        syncInput: false,
        syncNavigation: false,
      },
    });
});
