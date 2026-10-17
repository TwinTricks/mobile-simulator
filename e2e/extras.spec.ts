import { expect, openSimulator, test } from "./harness";

test("the status bar and home indicator can be turned off", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const iframe = simulator.locator('iframe[title="iPhone 17 Pro"]');
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toBeVisible();
  await expect(simulator.locator("[data-home-indicator]")).toHaveCount(1);
  const height = () => iframe.evaluate((el) => (el as HTMLIFrameElement).offsetHeight);
  expect(await height()).toBe(874 - 62);

  await simulator.getByRole("button", { name: "Settings" }).click();
  await simulator.locator("#setting-status-bar").click();
  await simulator.locator("#setting-home-indicator").click();

  await expect.poll(height).toBe(874);
  await expect(simulator.locator("[data-home-indicator]")).toHaveCount(0);
});

test("a gradient goes over the frame colour", async ({ context, extensionId, origin, popup }) => {
  await popup.evaluate(() =>
    chrome.storage.local.set({
      "sim-state": {
        visibleDeviceIds: ["iphone-17-pro"],
        frameColors: { "iphone-17-pro": "Silver" },
        frameTints: { "iphone-17-pro": { from: "#ff5f6d", to: "#ffc371" } },
      },
    }),
  );
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(simulator.locator("[data-frame-tint]")).toHaveCount(1);

  await simulator.getByRole("button", { name: "Frame colour" }).click();
  const pressed = simulator
    .getByRole("group", { name: /^iPhone 17 Pro (colours|gradients)$/ })
    .locator('[aria-pressed="true"]');
  await expect(pressed).toHaveCount(1);
  await expect(pressed).toHaveAccessibleName("Sunset");

  // One choice at a time: a frame colour takes the gradient away.
  await simulator.getByRole("button", { name: "iPhone 17 Pro in Deep Blue" }).click();
  await expect(simulator.locator("[data-frame-tint]")).toHaveCount(0);
  await expect(pressed).toHaveAccessibleName("iPhone 17 Pro in Deep Blue");

  await simulator.getByRole("button", { name: "iPhone 17 Pro in a custom colour" }).click();
  await expect(pressed).toHaveCount(1);
  await expect(simulator.locator("[data-frame-tint]")).toHaveCount(1);
  await expect
    .poll(() => simulator.evaluate(() => chrome.storage.local.get("sim-state")))
    .toMatchObject({
      "sim-state": { frameTints: { "iphone-17-pro": { from: "#6366f1", to: "#6366f1" } } },
    });
});
