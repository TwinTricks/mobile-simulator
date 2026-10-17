import { expect, openSimulator, test } from "./harness";

test("a screenshot shows a preview and saves the image", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toHaveText("Hello from the preview page");

  await simulator.getByRole("button", { name: "Screenshot", exact: true }).click();
  const dialog = simulator.getByRole("dialog", { name: "Screenshot" });
  await expect(dialog.getByRole("img", { name: "Screenshot preview" })).toBeVisible();

  await dialog.getByRole("button", { name: "16:9" }).click();
  await dialog.getByRole("button", { name: "JPEG" }).click();
  await dialog.screenshot({ path: "test-results/screenshot-dialog.png" });

  const download = simulator.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^screenshot-127-0-0-1-iphone-17-pro-.+\.jpg$/);
  await expect(dialog).toHaveCount(0);

  // The choices stick for the next screenshot.
  await simulator.getByRole("button", { name: "Screenshot", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "JPEG" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the screenshot dialog swaps to a full-page screenshot", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toHaveText("Hello from the preview page");

  await simulator.getByRole("button", { name: "Screenshot", exact: true }).click();
  const dialog = simulator.getByRole("dialog", { name: "Screenshot" });
  await dialog.getByRole("button", { name: "Full page" }).click();
  await expect(dialog).toHaveCount(0);

  const fullPage = simulator.getByRole("dialog", { name: "Full-page screenshot" });
  await expect(fullPage).toBeVisible({ timeout: 30_000 });
  await expect(fullPage.getByRole("img", { name: "Full page in iPhone 17 Pro" })).toBeVisible();
});
