import { describe, expect, it } from "vitest";

import {
  backdropColor,
  backdropCss,
  cameraBubble,
  edgesOf,
  isStudio,
  studioBox,
  unionRect,
} from "./studio";

const STAGE = { left: 0, top: 0, width: 2000, height: 1200 };
const PHONE = { left: 800, top: 200, width: 400, height: 800 };

describe("studioBox", () => {
  it("leaves room around the devices", () => {
    expect(studioBox(PHONE, "auto", STAGE)).toEqual({
      left: 736,
      top: 136,
      width: 528,
      height: 928,
    });
  });

  it("grows to the chosen shape about the devices' middle", () => {
    const box = studioBox(PHONE, "16:9", STAGE);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
    expect(box.left + box.width / 2).toBe(1000);
    expect(box.height).toBe(928);
    const tall = studioBox({ left: 600, top: 1200, width: 800, height: 400 }, "9:16", {
      ...STAGE,
      height: 3000,
    });
    expect(tall.height / tall.width).toBeCloseTo(16 / 9, 2);
  });

  it("stays on the stage", () => {
    const box = studioBox({ ...PHONE, left: 400 }, "16:9", {
      left: 0,
      top: 0,
      width: 1400,
      height: 1200,
    });
    expect(box.left).toBe(0);
    expect(box.left + box.width).toBe(1400);
  });
});

describe("studioBox size and custom edges", () => {
  it("gives the devices less of the video as the size goes down", () => {
    const full = studioBox(PHONE, "auto", STAGE);
    const half = studioBox(PHONE, "auto", { ...STAGE, top: -1000, height: 4000 }, { size: 50 });
    expect(half.height).toBeGreaterThan(full.height * 1.8);
  });

  it("draws a custom box from its own edges, and reads them back", () => {
    const custom = { left: 10, top: 20, right: 30, bottom: 40 };
    const box = studioBox(PHONE, "custom", STAGE, { custom });
    expect(box).toEqual({ left: 790, top: 180, width: 440, height: 860 });
    expect(edgesOf(box, PHONE)).toEqual(custom);
  });
});

describe("unionRect", () => {
  it("spans every rectangle", () => {
    expect(
      unionRect([
        { left: 10, top: 20, width: 100, height: 50 },
        { left: 200, top: 0, width: 50, height: 300 },
      ]),
    ).toEqual({ left: 10, top: 0, width: 240, height: 300 });
    expect(unionRect([])).toBeNull();
  });
});

describe("cameraBubble", () => {
  it("sits in the bottom left corner, sized to what is recorded", () => {
    const bubble = cameraBubble({ left: 100, top: 100, width: 1000, height: 600 });
    expect(bubble.width).toBe(144);
    expect(bubble.left).toBe(124);
    expect(bubble.top + bubble.height).toBe(676);
  });

  it("is never too small to see or too big", () => {
    expect(cameraBubble({ left: 0, top: 0, width: 100, height: 100 }).width).toBe(72);
    expect(cameraBubble({ left: 0, top: 0, width: 4000, height: 4000 }).width).toBe(220);
  });
});

describe("backdrops", () => {
  it("is a studio video with a backdrop or a set shape", () => {
    expect(isStudio({ backdrop: "none", ratio: "auto" })).toBe(false);
    expect(isStudio({ backdrop: "ocean", ratio: "auto" })).toBe(true);
    expect(isStudio({ backdrop: "none", ratio: "1:1" })).toBe(true);
  });

  it("paints gradients, plain colours, or nothing", () => {
    expect(backdropCss({ backdrop: "none", backdropColor: "#fff" })).toBeNull();
    expect(backdropCss({ backdrop: "solid", backdropColor: "#123456" })).toBe("#123456");
    expect(backdropCss({ backdrop: "ocean", backdropColor: "#fff" })).toBe(
      "linear-gradient(135deg, #0ea5e9, #6366f1)",
    );
    expect(backdropColor({ backdrop: "ocean", backdropColor: "#fff" })).toBe("#0ea5e9");
    expect(backdropCss({ backdrop: "gone", backdropColor: "#fff" })).toBeNull();
  });
});
