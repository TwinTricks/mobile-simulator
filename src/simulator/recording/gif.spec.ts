import { describe, expect, it } from "vitest";

import { gifPlan } from "./gif";

describe("gifPlan", () => {
  it("scales wide videos down to 480 pixels across, keeping the shape", () => {
    expect(gifPlan(2000, 960, 2000)).toMatchObject({ width: 480, height: 1000 });
  });

  it("keeps small videos at their own size", () => {
    expect(gifPlan(2000, 300, 600)).toMatchObject({ width: 300, height: 600 });
  });

  it("uses 12 frames a second for short clips", () => {
    expect(gifPlan(5000, 300, 600)).toMatchObject({ fps: 12, frames: 60, delay: 83 });
  });

  it("drops the frame rate so long clips stay within 300 frames", () => {
    const plan = gifPlan(60_000, 300, 600);
    expect(plan.frames).toBeLessThanOrEqual(300);
    expect(plan.fps).toBe(5);
  });
});
