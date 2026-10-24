import { describe, expect, it } from "vitest";

import { findDevice } from "@/shared/devices";
import type { Device } from "@/shared/types";
import {
  browserChrome,
  fitZoom,
  frameBox,
  homeIndicator,
  safeAreaInsets,
  screenRadius,
  statusBar,
} from "./frame-box";

function device(id: string): Device {
  const found = findDevice(id);
  if (!found) throw new Error(`No device ${id}`);
  return found;
}

describe("statusBar", () => {
  it("gives each kind of device its own bar", () => {
    expect(statusBar(device("iphone-17-pro"), false)).toEqual({ kind: "island", height: 62 });
    expect(statusBar(device("iphone-se"), false)).toEqual({ kind: "classic", height: 20 });
    expect(statusBar(device("pixel-8"), false)).toEqual({ kind: "android", height: 32 });
    expect(statusBar(device("ipad-air"), false)).toEqual({ kind: "ipad", height: 24 });
    expect(statusBar(device("laptop-13"), false)).toBeNull();
  });

  it("leaves watches bare: no status bar, browser bars or home indicator", () => {
    const watch = device("apple-watch-ultra-2");
    expect(statusBar(watch, false)).toBeNull();
    expect(browserChrome(watch, false)).toBeNull();
    expect(homeIndicator(watch, false)).toBeNull();
  });

  it("hides it on a phone turned on its side", () => {
    expect(statusBar(device("iphone-17-pro"), true)).toBeNull();
    expect(statusBar(device("ipad-air"), true)).toEqual({ kind: "ipad", height: 24 });
  });
});

describe("browserChrome", () => {
  it("puts Safari's bars at the bottom of an iPhone, with room for the home indicator", () => {
    expect(browserChrome(device("iphone-17-pro"), false)).toEqual({
      kind: "safari",
      top: 0,
      bottom: 132,
    });
    expect(browserChrome(device("iphone-se"), false)?.bottom).toBe(98);
  });

  it("moves Safari to the top on an iPad or a phone on its side", () => {
    expect(browserChrome(device("ipad-air"), false)?.kind).toBe("safari-top");
    expect(browserChrome(device("iphone-17-pro"), true)).toEqual({
      kind: "safari-top",
      top: 44,
      bottom: 0,
    });
  });

  it("gives Android Chrome's bar at the top, and computers none", () => {
    expect(browserChrome(device("pixel-8"), false)).toEqual({ kind: "chrome", top: 56, bottom: 0 });
    expect(browserChrome(device("laptop-13"), false)).toBeNull();
  });
});

describe("homeIndicator", () => {
  it("is on phones and tablets that have no home button", () => {
    expect(homeIndicator(device("iphone-17-pro"), false)?.width).toBe(134);
    expect(homeIndicator(device("iphone-17-pro"), true)?.width).toBe(210);
    expect(homeIndicator(device("pixel-8"), false)?.width).toBe(108);
    expect(homeIndicator(device("ipad-air"), false)).not.toBeNull();
  });

  it("isn't on the iPhone SE or computers", () => {
    expect(homeIndicator(device("iphone-se"), false)).toBeNull();
    expect(homeIndicator(device("laptop-13"), false)).toBeNull();
  });
});

describe("fitZoom", () => {
  it("shows a device at its real size when there is room", () => {
    expect(
      fitZoom(device("iphone-17-pro"), false, true, undefined, { width: 2000, height: 2000 }),
    ).toBe(1);
  });

  it("grows a device past its real size up to the given limit", () => {
    const room = { width: 4000, height: 4000 };
    expect(fitZoom(device("iphone-17-pro"), false, true, undefined, room, 2)).toBe(2);
  });

  it("shrinks a device to the room it has", () => {
    const zoom = fitZoom(device("iphone-17-pro"), false, true, undefined, {
      width: 2000,
      height: 500,
    });
    expect(zoom).toBeGreaterThan(0.4);
    expect(zoom).toBeLessThan(0.6);
  });
});

describe("screenRadius", () => {
  it("makes a round watch a circle and rounds the rest by their kind", () => {
    expect(screenRadius(device("galaxy-watch-7-44"), 240, 240)).toBe(120);
    expect(screenRadius(device("apple-watch-ultra-2"), 205, 251)).toBeCloseTo(205 * 0.22);
    expect(screenRadius(device("laptop-13"), 1280, 800)).toBe(0);
  });
});

describe("frameBox", () => {
  it("puts a watch in a thin case on every side", () => {
    expect(frameBox(device("apple-watch-ultra-2"), false, true, undefined)).toEqual({
      width: 205 + 24,
      height: 251 + 24,
    });
  });
});

describe("safeAreaInsets", () => {
  it("keeps a Dynamic Island iPhone clear of the island and the home indicator", () => {
    expect(safeAreaInsets(device("iphone-17-pro"), false)).toEqual({
      top: 62,
      right: 0,
      bottom: 34,
      left: 0,
    });
    expect(safeAreaInsets(device("iphone-17-pro"), true)).toEqual({
      top: 0,
      right: 62,
      bottom: 21,
      left: 62,
    });
  });

  it("gives the home-button iPhone only its status bar, and Android its own", () => {
    expect(safeAreaInsets(device("iphone-se"), false)?.top).toBe(20);
    expect(safeAreaInsets(device("iphone-se"), true)).toBeNull();
    expect(safeAreaInsets(device("pixel-8"), false)).toEqual({
      top: 32,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it("has nothing to keep clear of on watches and computers", () => {
    expect(safeAreaInsets(device("apple-watch-ultra-2"), false)).toBeNull();
    expect(safeAreaInsets(device("laptop-13"), false)).toBeNull();
  });
});
