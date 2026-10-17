import type { Page } from "@playwright/test";

import { expect, test } from "./harness";

const status = (page: Page) => page.locator("html").getAttribute("data-mobile-sim");

async function waitForStatus(page: Page, value: string) {
  await expect.poll(() => status(page), { timeout: 15_000 }).toBe(value);
}

test("#mobile-sim docks a phone beside the page, comes back after a reload, and Esc closes it", async ({
  context,
  origin,
}) => {
  const page = await context.newPage();
  await page.goto(`${origin}/#mobile-sim`);
  await waitForStatus(page, "ready");

  // The site's router never sees the trigger.
  expect(new URL(page.url()).hash).toBe("");

  const phone = page.frameLocator("mobile-sim-host iframe");
  await expect(phone.locator("#heading")).toBeVisible();
  await expect(phone.locator("#ua")).toContainText("iPhone");
  await expect(page.locator("#ua")).not.toContainText("iPhone");
  const picker = page.getByRole("button", { name: "Device" });
  await expect(picker).toHaveAttribute("data-value", "iphone-17-pro");
  await picker.click();
  await page.getByRole("textbox", { name: "Search devices" }).fill("pixel 8 pro");
  await page.getByRole("option", { name: /Pixel 8 Pro/ }).click();
  await expect(picker).toHaveAttribute("data-value", "pixel-8-pro");
  await expect(phone.locator("#ua")).toContainText("Pixel 8 Pro");
  await picker.click();
  await page.getByRole("option", { name: /iPhone 17 Pro\b(?! Max)/ }).click();
  await expect(picker).toHaveAttribute("data-value", "iphone-17-pro");

  const margin = () =>
    page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).marginRight));
  expect(await margin()).toBeGreaterThan(300);

  // A reload after the phone has settled brings it back.
  await page.waitForTimeout(2000);
  await page.reload();
  await waitForStatus(page, "ready");
  await expect(phone.locator("#ua")).toContainText("iPhone");

  await page.locator("#heading").click();
  await page.keyboard.press("Escape");
  await waitForStatus(page, "closed");
  await expect(page.locator("mobile-sim-host")).toHaveCount(0);
  expect(await margin()).toBe(0);

  // Closed stays closed.
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator("mobile-sim-host")).toHaveCount(0);
});

test("#mobile-sim takes a device, a way round and a layout", async ({ context, origin }) => {
  const page = await context.newPage();
  await page.goto(`${origin}/#mobile-sim=pixel-8,landscape,full`);
  await waitForStatus(page, "ready");

  const phone = page.frameLocator("mobile-sim-host iframe");
  await expect(phone.locator("#ua")).toContainText("Pixel 8");
  await expect(phone.locator("#width")).toHaveText("width:915");
  await expect(page.getByRole("button", { name: "Device" })).toHaveAttribute(
    "data-value",
    "pixel-8",
  );
  await expect(page.getByRole("button", { name: "Dock to the side" })).toBeVisible();

  const box = await page.locator("mobile-sim-host").boundingBox();
  const viewport = page.viewportSize()!;
  expect(box?.width).toBe(viewport.width);

  // Turning resizes the page in place, as turning a phone does.
  await page.getByRole("button", { name: "Rotate" }).click();
  await expect.poll(() => phone.locator("body").evaluate(() => window.innerWidth)).toBe(412);

  // Pages and testing tools can drive it with a message, too.
  await page.evaluate(() => window.postMessage({ __mobileSimPage: "close" }, "*"));
  await waitForStatus(page, "closed");
  await page.evaluate(() => window.postMessage({ __mobileSimPage: "open", spec: "ipad-air" }, "*"));
  await waitForStatus(page, "ready");
  await expect(phone.locator("#ua")).toContainText("iPad");
});

test("a site that isn't on the list asks first", async ({ context, origin, popup }) => {
  await popup.evaluate(() =>
    chrome.storage.local.set({ "sim-settings": { inline: { enabled: true, hosts: [] } } }),
  );

  const page = await context.newPage();
  await page.goto(`${origin}/#mobile-sim`);
  await waitForStatus(page, "not-allowed");
  await expect(page.locator("mobile-sim-host iframe")).toHaveCount(0);

  await page.getByRole("button", { name: "Allow on 127.0.0.1" }).click();
  await waitForStatus(page, "ready");
  await expect(page.frameLocator("mobile-sim-host iframe").locator("#ua")).toContainText("iPhone");

  const hosts = await popup.evaluate(async () => {
    const stored = await chrome.storage.local.get("sim-settings");
    return (stored["sim-settings"] as { inline: { hosts: string[] } }).inline.hosts;
  });
  expect(hosts).toEqual(["127.0.0.1"]);
});
