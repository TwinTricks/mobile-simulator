import { describe, expect, it } from "vitest";

import { isDarkColor, parseRgb } from "./status-color";

describe("parseRgb", () => {
  it("reads both rgb syntaxes", () => {
    expect(parseRgb("rgb(249, 115, 22)")).toEqual({ r: 249, g: 115, b: 22, a: 1 });
    expect(parseRgb("rgba(0, 0, 0, 0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseRgb("rgb(10 20 30 / 0)")).toEqual({ r: 10, g: 20, b: 30, a: 0 });
  });

  it("refuses anything else", () => {
    expect(parseRgb("orange")).toBeNull();
    expect(parseRgb("")).toBeNull();
  });
});

describe("isDarkColor", () => {
  it("puts white text on dark colours and black on light ones", () => {
    expect(isDarkColor("rgb(0, 0, 0)")).toBe(true);
    expect(isDarkColor("rgb(122, 80, 220)")).toBe(true);
    expect(isDarkColor("rgb(255, 255, 255)")).toBe(false);
    expect(isDarkColor("rgb(249, 115, 22)")).toBe(false);
  });
});
