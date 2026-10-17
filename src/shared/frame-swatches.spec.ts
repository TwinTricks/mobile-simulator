import { describe, expect, it } from "vitest";

import { swatchColor } from "./frame-swatches";

describe("swatchColor", () => {
  it("prefers the longest matching name", () => {
    expect(swatchColor("Sky Blue")).not.toBe(swatchColor("Blue"));
    expect(swatchColor("Space Black")).not.toBe(swatchColor("Black"));
  });

  it("ignores extra words around the colour", () => {
    expect(swatchColor("Silver (M1)")).toBe(swatchColor("Silver"));
    expect(swatchColor("Tilt-Adjustable Stand Dark")).toBe(swatchColor("Dark"));
  });

  it("falls back to a neutral grey", () => {
    expect(swatchColor("Default")).toBe(swatchColor("VESA Mount"));
  });
});
