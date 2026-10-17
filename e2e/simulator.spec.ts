import type { Page } from "@playwright/test";

import { expect, openSimulator, test } from "./harness";

async function showMoreDevices(simulator: Page) {
  await simulator.getByRole("button", { name: "Settings" }).click();
  const settings = simulator.getByRole("complementary", { name: "Settings" });
  await settings.getByLabel("Show more than one device").click();
  return settings;
}

test("the popup opens the simulator on the typed address", async ({ context, popup, origin }) => {
  const simulatorOpened = context.waitForEvent("page", (page) =>
    page.url().includes("/src/simulator/index.html"),
  );
  // Typed without a scheme, which the popup fills in: http for a local address.
  await popup.getByLabel("URL to simulate").fill(`${origin.replace("http://", "")}/landing`);
  await popup.getByRole("button", { name: /open simulator/i }).click();

  const simulator = await simulatorOpened;
  await expect(simulator.getByLabel("URL")).toHaveValue(`${origin}/landing`);
});

test("one device is shown, at its own width", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);

  const iphone = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(iphone.locator("#heading")).toHaveText("Hello from the preview page");
  await expect(iphone.locator("#width")).toHaveText("width:402");
  await expect(simulator.locator("[data-device-id]")).toHaveCount(1);
});

test("spoofed devices reach the site with their own User-Agent", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#ua"),
  ).toContainText("iPhone OS 17_0");

  await simulator.getByRole("button", { name: "Manage devices" }).click();
  const panel = simulator.getByRole("complementary", { name: "Devices" });
  await panel.getByText("Pixel 8", { exact: true }).click();
  await expect(simulator.frameLocator('iframe[title="Pixel 8"]').locator("#ua")).toContainText(
    "Pixel 8",
  );
});

test("rotating the device swaps its size and survives a reload", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const frame = simulator.locator('[data-device-id="iphone-17-pro"]');
  await expect(frame.getByText("402×874 @3x")).toBeVisible();

  await simulator.getByRole("button", { name: "Rotate" }).click();
  await expect(frame.getByText("874×402 @3x")).toBeVisible();

  await simulator.reload();
  await expect(
    simulator.locator('[data-device-id="iphone-17-pro"]').getByText("874×402 @3x"),
  ).toBeVisible();
});

test("picking a device swaps the one on screen", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await simulator.getByRole("button", { name: "Manage devices" }).click();
  const panel = simulator.getByRole("complementary", { name: "Devices" });

  await panel.getByText("iPhone SE", { exact: true }).click();
  await expect(simulator.locator('[data-device-id="iphone-se"]')).toBeVisible();
  await expect(simulator.locator("[data-device-id]")).toHaveCount(1);
});

test("settings turn on more devices side by side", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const settings = await showMoreDevices(simulator);

  const ipad = simulator.frameLocator('iframe[title="iPad Air"]');
  await expect(ipad.locator("#width")).toHaveText("width:820");
  await expect(simulator.locator("[data-device-id]")).toHaveCount(3);

  await settings.getByRole("button", { name: "Add more devices" }).click();
  const panel = simulator.getByRole("complementary", { name: "Devices" });
  await panel.getByText("iPhone SE", { exact: true }).click();
  await expect(simulator.locator('[data-device-id="iphone-se"]')).toBeVisible();

  await panel.getByText("iPhone SE", { exact: true }).click();
  await expect(simulator.locator('[data-device-id="iphone-se"]')).toHaveCount(0);
});

test("a custom device takes the screen", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await simulator.getByRole("button", { name: "Manage devices" }).click();
  const panel = simulator.getByRole("complementary", { name: "Devices" });
  await panel.getByRole("tab", { name: "Custom" }).click();

  await panel.getByLabel("Device name").fill("Kiosk");
  await panel.getByLabel("Width").fill("600");
  await panel.getByLabel("Height").fill("900");
  await panel.getByRole("button", { name: "Add device" }).click();

  const kiosk = simulator.frameLocator('iframe[title="Kiosk"]');
  await expect(kiosk.locator("#width")).toHaveText("width:600");
});
