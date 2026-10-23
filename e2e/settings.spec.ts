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

test("the time is picked on wheels, with quick picks and a way back to the real clock", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const figure = simulator.getByRole("figure", { name: /iPhone 17 Pro/ });
  await simulator.getByRole("button", { name: "Settings" }).click();
  await simulator.getByRole("button", { name: "Force the time shown: Live" }).click();
  const picker = simulator.getByRole("dialog", { name: "Time shown on the status bar" });

  await picker.getByRole("button", { name: "9:41" }).click();
  await expect(figure.getByText(/^0?9:41$/)).toBeVisible();
  const minute = picker.getByRole("spinbutton", { name: "Minute" });
  await expect(minute).toHaveAttribute("aria-valuetext", "41");

  // The wheels turn with the keys as well as by scrolling.
  await minute.focus();
  await simulator.keyboard.press("ArrowDown");
  await expect(figure.getByText(/^0?9:42$/)).toBeVisible();
  await expect(minute).toHaveAttribute("aria-valuetext", "42");
  await picker.getByRole("spinbutton", { name: "Hour" }).focus();
  await simulator.keyboard.press("ArrowDown");
  await expect(figure.getByText(/^10:42$/)).toBeVisible();
  // The wheels come to rest on the time picked.
  await expect
    .poll(() => picker.getByRole("spinbutton", { name: "Hour" }).evaluate((el) => el.scrollTop))
    .toBe(10 * 32);

  await picker.getByRole("button", { name: "Live" }).click();
  await expect(figure.getByText(/^10:42$/)).toHaveCount(0);
  await simulator.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(simulator.getByRole("button", { name: "Force the time shown: Live" })).toBeFocused();
});

test("a recording's stop after inactivity is set in settings, and the pages report activity", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toBeVisible();
  await simulator.getByRole("button", { name: "Settings" }).click();
  const choice = simulator.getByRole("combobox", { name: "Stop after inactivity" });
  await choice.scrollIntoViewIfNeeded();
  await expect(choice).toHaveText("2 mins");
  await choice.click();
  await simulator.getByRole("option", { name: "5 mins" }).click();
  await expect(choice).toHaveText("5 mins");
  await expect
    .poll(() => simulator.evaluate(() => chrome.storage.local.get("sim-settings")))
    .toMatchObject({ "sim-settings": { recording: { stopAfterIdle: 5 } } });
  await simulator.screenshot({ path: test.info().outputPath("idle-setting.png") });

  // While watched, a page tells the simulator when it is used.
  await simulator.evaluate(() => {
    (window as unknown as { active: number }).active = 0;
    window.addEventListener("message", (event) => {
      if ((event.data as { __msimActive?: boolean } | null)?.__msimActive) {
        (window as unknown as { active: number }).active++;
      }
    });
    document.querySelector("iframe")!.contentWindow!.postMessage({ __msimWatch: true }, "*");
  });
  const phone = (await simulator.locator('iframe[title="iPhone 17 Pro"]').boundingBox())!;
  await simulator.mouse.move(phone.x + 50, phone.y + 200);
  await simulator.mouse.move(phone.x + 80, phone.y + 260);
  await expect
    .poll(() => simulator.evaluate(() => (window as unknown as { active: number }).active))
    .toBeGreaterThan(0);
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

  // Anywhere on the field is the colour input itself, so a click opens Chrome's picker.
  await simulator.mouse.move(simulator.viewportSize()!.width - 3, 300);
  await simulator.getByRole("button", { name: "Settings" }).click();
  const input = simulator.locator('input[type="color"][aria-label="Background colour"]');
  await input.locator("..").scrollIntoViewIfNeeded();
  const field = (await input.locator("..").boundingBox())!;
  const hit = await simulator.evaluate(
    ([x, y]) => (document.elementFromPoint(x!, y!) as HTMLInputElement | null)?.type,
    [field.x + 12, field.y + field.height / 2],
  );
  expect(hit).toBe("color");
  await input.fill("#445566");
  await expect(simulator.locator("main")).toHaveCSS("background-color", "rgb(68, 85, 102)");
  await simulator.keyboard.press("Escape");
  await expect(simulator.getByRole("complementary", { name: "Settings" })).toHaveCount(0);

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
