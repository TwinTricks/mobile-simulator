import { describe, expect, it } from "vitest";

import { fullPageStops, readFullPageStep } from "./full-page";

describe("fullPageStops", () => {
  it("takes one step for a page that fits", () => {
    expect(fullPageStops(800, 600)).toEqual([0]);
    expect(fullPageStops(800, 800)).toEqual([0]);
  });

  it("steps a window at a time and ends flush with the bottom", () => {
    expect(fullPageStops(800, 2000)).toEqual([0, 800, 1200]);
  });

  it("stops at the cap on very long pages", () => {
    expect(fullPageStops(800, 100_000, 2400)).toEqual([0, 800, 1600]);
  });

  it("takes at most 40 steps", () => {
    expect(fullPageStops(10, 100_000)).toHaveLength(40);
  });
});

describe("readFullPageStep", () => {
  const at = { id: "a", scroll: 0, top: 0, height: 800, total: 2000, viewport: 800 };

  it("reads a step meant for this capture", () => {
    expect(readFullPageStep({ __msimFullAt: at }, "a")).toEqual({
      scroll: 0,
      top: 0,
      height: 800,
      total: 2000,
      viewport: 800,
    });
  });

  it("ignores other captures and broken steps", () => {
    expect(readFullPageStep({ __msimFullAt: at }, "b")).toBeNull();
    expect(readFullPageStep({ __msimFullAt: { ...at, height: 0 } }, "a")).toBeNull();
    expect(readFullPageStep({ __msimFullAt: { ...at, total: "x" } }, "a")).toBeNull();
    expect(readFullPageStep(null, "a")).toBeNull();
  });
});
