import type { Page } from "@playwright/test";

import { expect, openSimulator, test } from "./harness";

/** Waits until the page's scripts are in and the device has stopped resizing to fit. */
async function settled(simulator: Page, origin: string) {
  const iframe = simulator.locator('iframe[title="iPhone 17 Pro"]');
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toBeVisible();
  const page = simulator.frames().find((f) => f.url().startsWith(origin))!;
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.value))
    .toContain("__msim-touch");
  await expect(simulator.getByText("Loading…")).toHaveCount(0);
  let box = await iframe.boundingBox();
  for (;;) {
    await simulator.waitForTimeout(100);
    const next = await iframe.boundingBox();
    if (next?.y === box?.y && next?.height === box?.height) break;
    box = next;
  }
}

test("a text field brings up the phone's keyboard, which types into it", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const page = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  const keyboard = simulator.locator('[data-keyboard="ios"]');
  const key = (k: string) => keyboard.locator(`[data-k="${k}"]`);
  const pageHeight = () =>
    simulator.locator('iframe[title="iPhone 17 Pro"]').evaluate((f) => f.clientHeight);

  await settled(simulator, origin);
  const fullHeight = await pageHeight();
  await expect(keyboard).toHaveAttribute("aria-hidden", "true");

  await page.getByLabel("Name").focus();
  await expect(keyboard).toHaveAttribute("aria-hidden", "false");
  await expect.poll(pageHeight).toBeLessThan(fullHeight - 300);

  await key("h").click();
  await key("i").click();
  await key("shift").click();
  await key("A").click();
  await key("space").click();
  await expect(page.getByLabel("Name")).toHaveValue("hiA ");
  await key("backspace").click();
  await simulator.keyboard.type("b");
  await expect(page.getByLabel("Name")).toHaveValue("hiAb");

  await page.getByLabel("Email").focus();
  await expect(key("@")).toBeVisible();
  await page.getByLabel("Code").focus();
  await expect(key("0")).toBeVisible();
  await expect(key("q")).toHaveCount(0);

  await page.getByLabel("Code").blur();
  await expect(keyboard).toHaveAttribute("aria-hidden", "true");
  await expect.poll(pageHeight).toBe(fullHeight);
});

test("the keyboard stays away while the setting is off", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await settled(simulator, origin);
  await simulator.getByRole("button", { name: "Settings" }).click();
  await simulator.getByRole("switch", { name: "Simulate keyboard while typing" }).click();
  await simulator.keyboard.press("Escape");

  const page = simulator.frameLocator('iframe[title="iPhone 17 Pro"]');
  await page.getByLabel("Name").focus();
  await simulator.keyboard.type("x");
  await expect(page.getByLabel("Name")).toHaveValue("x");
  await expect(simulator.locator("[data-keyboard]")).toHaveCount(0);
});
