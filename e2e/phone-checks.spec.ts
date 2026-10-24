import { expect, openSimulator, test } from "./harness";

const PHONE = 'iframe[title="iPhone 17 Pro"]';

test("a QR code opens the page on a phone, through a reachable host for a local site", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(
    context,
    extensionId,
    `${origin}/?__sim_device=x#mobile-sim`,
  );
  await expect(simulator.frameLocator(PHONE).locator("#heading")).toBeVisible();
  await simulator.getByRole("button", { name: "Open on your phone" }).click();
  const dialog = simulator.getByRole("dialog", { name: "Open on your phone" });
  const code = dialog.getByRole("img", { name: /^QR code for / });
  await expect(code).toHaveAttribute("data-qr", `${origin}/`);
  await expect(code.locator("path")).toHaveAttribute("d", /^M\d/);

  // 127.0.0.1 only opens on this computer, so the code can use the network address instead.
  const port = new URL(origin).port;
  await dialog.getByLabel("This computer's address on your network").fill("192.168.1.20");
  await expect(code).toHaveAttribute("data-qr", `http://192.168.1.20:${port}/`);
  await simulator.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // Remembered for the site, and Q opens it again.
  await simulator.locator("main").click({ position: { x: 5, y: 5 } });
  await simulator.keyboard.press("q");
  await expect(code).toHaveAttribute("data-qr", `http://192.168.1.20:${port}/`);
});

test("small tap targets are counted under the device and listed", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await popup.evaluate(() => chrome.storage.local.set({ "sim-settings": { tapTargets: true } }));
  const simulator = await openSimulator(context, extensionId, `${origin}/tap-targets`);
  const frame = simulator.frameLocator(PHONE);
  await expect(frame.locator("#big")).toBeVisible();

  // The 30px button is too small; the 60px one and the link in running text are not counted.
  const badge = simulator.locator("[data-tap-targets]");
  await expect(badge).toHaveText("1 small tap target");
  await expect(frame.locator("msim-tap-targets")).toHaveCount(1);

  await badge.click();
  const list = simulator.getByRole("list", { name: "Small tap targets" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByRole("listitem").first()).toContainText('button "x"');
  await expect(list.getByRole("listitem").first()).toContainText("30×30");
  await expect(list.getByRole("listitem").nth(1)).toContainText("in text");

  // Buttons the page adds later are counted too.
  await frame.locator("body").evaluate((body) => {
    const button = document.createElement("button");
    button.textContent = "+";
    button.style.cssText = "width:20px;height:20px";
    body.append(button);
  });
  await expect(badge).toHaveText("2 small tap targets");

  // Turned off, the page is left as it was.
  await simulator.getByRole("button", { name: "Tools" }).click();
  await simulator.locator("#tool-tap-targets").click();
  await expect(badge).toHaveCount(0);
  await expect(frame.locator("msim-tap-targets")).toHaveCount(0);
});

test("a page that asks for viewport-fit=cover draws under the status bar with the real insets", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, `${origin}/safe-area`);
  const iframe = simulator.locator(PHONE);
  const frame = simulator.frameLocator(PHONE);
  const style = (selector: string, property: string) =>
    frame
      .locator(selector)
      .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

  await expect
    .poll(() => iframe.evaluate((el) => (el as HTMLIFrameElement).offsetHeight))
    .toBe(874);
  await expect.poll(() => style("#top", "padding-top")).toBe("62px");
  await expect.poll(() => style("#linked", "padding-bottom")).toBe("34px");
  expect(await style("#linked", "padding-top")).toBe("62px");
  await expect.poll(() => style("#cross", "margin-top")).toBe("63px");
  expect(await style("#inline", "padding-left")).toBe("3px");
  await expect.poll(() => style("#late", "padding-bottom")).toBe("34px");

  // On its side, the cut-out could be on either edge.
  await simulator.keyboard.press("r");
  await expect.poll(() => style("#inline", "padding-left")).toBe("62px");
  await expect.poll(() => style("#top", "padding-top")).toBe("0px");
});

test("a page that doesn't ask stays below the status bar, unless every page is set to", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, `${origin}/safe-area-plain`);
  const iframe = simulator.locator(PHONE);
  const top = () =>
    simulator
      .frameLocator(PHONE)
      .locator("#top")
      .evaluate((el) => getComputedStyle(el).paddingTop);
  await expect(simulator.frameLocator(PHONE).locator("#top")).toBeVisible();
  expect(await iframe.evaluate((el) => (el as HTMLIFrameElement).offsetHeight)).toBe(874 - 62);
  expect(await top()).toBe("0px");

  await simulator.getByRole("button", { name: "Settings" }).click();
  const choice = simulator.locator("#setting-safe-area");
  await choice.scrollIntoViewIfNeeded();
  await choice.click();
  await simulator.getByRole("option", { name: "Every page" }).click();
  await expect.poll(top).toBe("62px");
  expect(await iframe.evaluate((el) => (el as HTMLIFrameElement).offsetHeight)).toBe(874);

  await simulator.getByRole("button", { name: "Tools" }).click();
  await simulator.locator("#tool-safe-area-guides").click();
  await expect(simulator.locator("[data-safe-area-guides] > div")).toHaveCount(2);
});

test("watches are round or rounded, with no status bar, and the open Fold shows its hinge", async ({
  context,
  extensionId,
  origin,
  popup,
}) => {
  await popup.evaluate(() =>
    chrome.storage.local.set({
      "sim-settings": { multiDevice: true },
      "sim-state": {
        visibleDeviceIds: ["galaxy-watch-7-44", "apple-watch-ultra-2", "galaxy-fold-open"],
      },
    }),
  );
  const simulator = await openSimulator(context, extensionId, origin);
  const watch = simulator.locator('iframe[title="Galaxy Watch 7 (44mm)"]');
  await expect(watch).toBeVisible();
  expect(await watch.evaluate((el) => [el.clientWidth, el.clientHeight])).toEqual([240, 240]);
  const round = simulator.locator('[data-device-id="galaxy-watch-7-44"] [data-screen]');
  await expect(round).toHaveCSS("border-radius", /^\d+(\.\d+)?px$/);
  const radius = await round.evaluate((el) => [
    parseFloat(getComputedStyle(el).borderTopLeftRadius),
    el.getBoundingClientRect().width,
  ]);
  expect(radius[0]).toBeCloseTo(radius[1]! / 2, 0);

  const ultra = simulator.locator('iframe[title="Apple Watch Ultra 2"]');
  expect(await ultra.evaluate((el) => [el.clientWidth, el.clientHeight])).toEqual([205, 251]);
  await expect(simulator.locator('[data-device-id="galaxy-fold-open"] [data-hinge]')).toHaveCount(
    1,
  );
  await expect(simulator.getByRole("figure", { name: /Watch/ })).toHaveCount(2);
});
