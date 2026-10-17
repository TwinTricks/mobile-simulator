import { expect, openSimulator, test } from "./harness";

test("single keys rotate, zoom and open the devices", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const frame = simulator.locator('[data-device-id="iphone-17-pro"]');
  await expect(frame.getByText("402×874 @3x")).toBeVisible();

  await simulator.keyboard.press("r");
  await expect(frame.getByText("874×402 @3x")).toBeVisible();

  const zoom = simulator.getByRole("button", { name: /^Zoom:/ });
  await simulator.keyboard.press("+");
  await expect(zoom).not.toHaveAccessibleName("Zoom: Fit");
  await simulator.keyboard.press("0");
  await expect(zoom).toHaveAccessibleName("Zoom: Fit");

  await simulator.keyboard.press("d");
  await expect(simulator.getByRole("complementary", { name: "Devices" })).toBeVisible();
  await simulator.keyboard.press("Escape");
  await expect(simulator.getByRole("complementary", { name: "Devices" })).toBeHidden();
});

test("shortcuts still work while the page has focus", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const page = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  await page.locator("#heading").click();

  await simulator.keyboard.press("r");
  await expect(
    simulator.locator('[data-device-id="iphone-17-pro"]').getByText("874×402 @3x"),
  ).toBeVisible();
});
