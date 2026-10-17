import { describe, expect, it } from "vitest";

import { shortcutFor, stepZoom } from "./shortcuts";

describe("shortcutFor", () => {
  it("maps single keys, either case", () => {
    expect(shortcutFor({ key: "r" })).toBe("rotate");
    expect(shortcutFor({ key: "S" })).toBe("screenshot");
    expect(shortcutFor({ key: "+" })).toBe("zoom-in");
    expect(shortcutFor({ key: "=" })).toBe("zoom-in");
    expect(shortcutFor({ key: "0" })).toBe("zoom-fit");
    expect(shortcutFor({ key: "Escape" })).toBe("close");
  });

  it("leaves other keys and browser shortcuts alone", () => {
    expect(shortcutFor({ key: "x" })).toBeNull();
    expect(shortcutFor({ key: "r", metaKey: true })).toBeNull();
    expect(shortcutFor({ key: "s", ctrlKey: true })).toBeNull();
    expect(shortcutFor({ key: "d", altKey: true })).toBeNull();
  });
});

describe("stepZoom", () => {
  it("goes to the next step from wherever Fit left the zoom", () => {
    expect(stepZoom(0.8, 1)).toBe(0.9);
    expect(stepZoom(0.8, -1)).toBe(0.75);
  });

  it("moves off a step it is already on", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
  });

  it("stops at either end", () => {
    expect(stepZoom(2, 1)).toBe(2);
    expect(stepZoom(0.25, -1)).toBe(0.25);
  });
});
