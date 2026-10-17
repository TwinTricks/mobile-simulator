import { expect, openSimulator, test } from "./harness";

test("the page's scripts see the phone it runs on", async ({ context, extensionId, origin }) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const js = simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#js");

  await expect(js).toContainText("ua=Mozilla/5.0 (iPhone;");
  await expect(js).toContainText("platform=iPhone");
  await expect(js).toContainText("touch=5");
  await expect(js).toContainText("screen=402x874");
  await expect(js).toContainText("dpr=3");
  await expect(js).toContainText("coarse=true");
});

test("dragging the page scrolls it and a flick keeps it going", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  const iframe = simulator.locator('iframe[title="iPhone 17 Pro"]');
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toBeVisible();
  const page = simulator.frames().find((f) => f.url().startsWith(origin))!;
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.value))
    .toContain("__msim-touch");

  await expect(simulator.getByText("Loading…")).toHaveCount(0);

  // The device scales itself to fit the window once the stage has its size.
  let box = (await iframe.boundingBox())!;
  for (;;) {
    await simulator.waitForTimeout(100);
    const next = (await iframe.boundingBox())!;
    if (next.y === box.y && next.height === box.height) break;
    box = next;
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.8;
  await simulator.mouse.move(x, y);
  await simulator.mouse.down();
  await simulator.mouse.move(x, y - 100, { steps: 5 });
  await simulator.mouse.move(x, y - 250, { steps: 3 });
  await simulator.mouse.up();

  const afterDrag = await page.evaluate(() => window.scrollY);
  expect(afterDrag).toBeGreaterThan(100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(afterDrag + 20);
});

test("touch mode can be switched off without a reload", async ({
  context,
  extensionId,
  origin,
}) => {
  const simulator = await openSimulator(context, extensionId, origin);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#heading"),
  ).toBeVisible();
  const page = simulator.frames().find((f) => f.url().startsWith(origin))!;
  const classes = () => page.evaluate(() => document.documentElement.classList.value);
  await expect.poll(classes).toContain("__msim-touch");

  await simulator.getByRole("button", { name: "Settings" }).click();
  await simulator.getByRole("switch", { name: "Touch scroll and finger cursor" }).click();
  await expect.poll(classes).not.toContain("__msim-touch");
});
