import { describe, expect, it } from "vitest";

import { MAX_SIDE, planShot } from "./plan";

const phone = { width: 400, height: 800 };

describe("planShot", () => {
  it("fits one device snugly with no padding", () => {
    const plan = planShot([phone], { padding: 0, ratio: "auto", caption: false });
    expect(plan).toMatchObject({ width: 400, height: 800, caption: null });
    expect(plan.devices[0]).toEqual({ x: 0, y: 0, width: 400, height: 800 });
  });

  it("pads by a share of the longer side", () => {
    const plan = planShot([phone], { padding: 10, ratio: "auto", caption: false });
    expect(plan.width).toBe(560);
    expect(plan.height).toBe(960);
    expect(plan.devices[0]).toMatchObject({ x: 80, y: 80 });
  });

  it("widens to the ratio and keeps the device centred", () => {
    const plan = planShot([phone], { padding: 0, ratio: "1:1", caption: false });
    expect(plan.width).toBe(800);
    expect(plan.height).toBe(800);
    expect(plan.devices[0]!.x).toBe(200);
  });

  it("lines devices up side by side, centred on the tallest", () => {
    const tablet = { width: 600, height: 1000 };
    const plan = planShot([phone, tablet], { padding: 0, ratio: "auto", caption: false });
    const [first, second] = plan.devices;
    expect(first!.y).toBe(100);
    expect(second!.x).toBe(400 + 80);
    expect(plan.width).toBe(1080);
  });

  it("leaves room for the caption under the devices", () => {
    const plan = planShot([phone], { padding: 0, ratio: "auto", caption: true });
    expect(plan.height).toBeGreaterThan(800);
    expect(plan.caption!.y).toBeGreaterThan(800);
  });

  it("never goes past the largest size Chrome can encode", () => {
    const huge = { width: 6000, height: 6000 };
    const plan = planShot([huge, huge], { padding: 20, ratio: "auto", caption: false });
    expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(MAX_SIDE);
  });
});
