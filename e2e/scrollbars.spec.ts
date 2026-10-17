import { expect, openSimulator, test } from "./harness";

const gutters = () => ({
  page: window.innerWidth - document.documentElement.clientWidth,
  box: (() => {
    const box = document.getElementById("box")!;
    return box.offsetWidth - box.clientWidth;
  })(),
});

test("a phone shows no scrollbars, even on a page that asks for them", async ({
  context,
  extensionId,
  origin,
}) => {
  // Outside the simulator the page does get its scrollbars, so the check below means something.
  const plain = await context.newPage();
  await plain.goto(`${origin}/scrollbars`);
  const outside = await plain.evaluate(gutters);
  test.skip(outside.page === 0, "This system draws overlay scrollbars, which take no room.");
  expect(outside.box).toBeGreaterThan(0);

  const simulator = await openSimulator(context, extensionId, `${origin}/scrollbars`);
  await expect(
    simulator.frameLocator('iframe[title="iPhone 17 Pro"]').locator("#box"),
  ).toBeVisible();
  const frame = simulator.frames().find((f) => f.url().startsWith(origin))!;
  await frame.waitForLoadState("load");

  await expect.poll(() => frame.evaluate(gutters)).toEqual({ page: 0, box: 0 });
  // The page's load handler threw away the adopted sheet; the layered style still holds.
  await frame.waitForTimeout(300);
  expect(await frame.evaluate(gutters)).toEqual({ page: 0, box: 0 });
});
