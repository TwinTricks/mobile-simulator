import type { Page } from "@playwright/test";

import { expect, test } from "./harness";

async function tabIdOf(extensionPage: Page, url: string): Promise<number> {
  return extensionPage.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => tab.url?.startsWith(prefix))!.id!;
  }, url);
}

test("full screen lays the simulator over the page, and Esc takes it away", async ({
  context,
  popup,
  origin,
}) => {
  const site = await context.newPage();
  await site.goto(origin);
  const tabId = await tabIdOf(popup, origin);
  await popup.evaluate(
    (id) => chrome.runtime.sendMessage({ type: "open-full-screen", tabId: id }),
    tabId,
  );

  const overlay = site.locator("#__msim-overlay");
  await expect(overlay).toBeVisible();
  const phone = site.frameLocator("#__msim-overlay").frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(phone.locator("#heading")).toHaveText("Hello from the preview page");
  await expect(phone.locator("#js")).toContainText("platform=iPhone");

  await site
    .frameLocator("#__msim-overlay")
    .getByRole("button", { name: "Exit full screen" })
    .focus();
  await site.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
});

test("full screen comes back after a reload, until it is closed or the tab leaves the site", async ({
  context,
  popup,
  origin,
}) => {
  const site = await context.newPage();
  await site.goto(origin);
  const tabId = await tabIdOf(popup, origin);
  const open = () =>
    popup.evaluate(
      (id) => chrome.runtime.sendMessage({ type: "open-full-screen", tabId: id }),
      tabId,
    );
  const overlay = site.locator("#__msim-overlay");
  const heading = site
    .frameLocator("#__msim-overlay")
    .frameLocator('iframe[title="iPhone 17 Pro"]')
    .locator("#heading");

  await open();
  await expect(heading).toHaveText("Hello from the preview page");
  await site.reload();
  await expect(heading).toHaveText("Hello from the preview page");

  // Back as the page starts, not once it has loaded: here an image holds the load up for 4s.
  await site.route(`${origin}/slow-image`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.fulfill({ status: 204 });
  });
  await site.route(`${origin}/slow`, (route) =>
    route.fulfill({ contentType: "text/html", body: '<p>Slow page</p><img src="/slow-image">' }),
  );
  const start = Date.now();
  await site.goto(`${origin}/slow`, { waitUntil: "commit" });
  expect(await site.evaluate(() => document.readyState)).not.toBe("complete");
  await expect(overlay).toBeAttached({ timeout: 2000 });
  expect(Date.now() - start).toBeLessThan(2000);
  await site.waitForLoadState("load");
  // Another page of the same site keeps it too.
  await site.goto(`${origin}/another-page`);
  await expect(heading).toHaveText("Hello from the preview page");

  // Closed, it stays closed.
  await site
    .frameLocator("#__msim-overlay")
    .getByRole("button", { name: "Exit full screen" })
    .click();
  await expect(overlay).toHaveCount(0);
  await site.reload();
  await site.waitForTimeout(1000);
  await expect(overlay).toHaveCount(0);

  // Another site leaves it behind.
  await open();
  await expect(heading).toHaveText("Hello from the preview page");
  await site.goto(origin.replace("127.0.0.1", "localhost"));
  await site.waitForTimeout(1000);
  await expect(overlay).toHaveCount(0);
});

test("opened in the same tab, closing goes back to the page", async ({
  context,
  popup,
  origin,
}) => {
  await popup.evaluate(async () => {
    const stored = (await chrome.storage.local.get("sim-settings"))["sim-settings"] ?? {};
    await chrome.storage.local.set({ "sim-settings": { ...stored, openMode: "same-tab" } });
  });
  const site = await context.newPage();
  await site.goto(`${origin}/start`);
  await site.bringToFront();
  await popup.evaluate(
    (url) => chrome.runtime.sendMessage({ type: "open-simulator", url }),
    `${origin}/start`,
  );

  await expect(site).toHaveURL(/src\/simulator\/index\.html\?url=.*&return=/);
  const phone = site.frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(phone.locator("#heading")).toHaveText("Hello from the preview page");

  await site.getByRole("button", { name: "Close simulator" }).click();
  await expect(site).toHaveURL(`${origin}/start`);
});

test("a website that embeds the simulator on its own gets nothing", async ({
  context,
  extensionId,
  origin,
}) => {
  const site = await context.newPage();
  await site.goto(origin);
  await site.evaluate(
    ([id, url]) => {
      const frame = document.createElement("iframe");
      frame.id = "sneaky";
      frame.src = `chrome-extension://${id}/src/simulator/index.html?mode=overlay&token=guess&url=${encodeURIComponent(url!)}`;
      document.body.appendChild(frame);
    },
    [extensionId, origin],
  );
  const sneaky = site.frameLocator("#sneaky");
  await expect(sneaky.locator("#root")).toBeAttached();
  await site.waitForTimeout(1000);
  await expect(sneaky.locator("iframe")).toHaveCount(0);
  await expect(sneaky.getByRole("navigation")).toHaveCount(0);
});

test("the side panel follows the active tab", async ({ context, extensionId, origin }) => {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/src/simulator/panel.html`);
  await expect(panel.getByText("Open a website in this tab")).toBeVisible();

  const site = await context.newPage();
  await site.goto(`${origin}/followed`);
  await site.bringToFront();

  const phone = panel.frameLocator('iframe[title="iPhone 17 Pro"]');
  await expect(phone.locator("#heading")).toHaveText("Hello from the preview page");
  await expect(panel.getByRole("button", { name: "Page address" })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Full screen" })).toBeVisible();
});
