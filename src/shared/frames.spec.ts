import { describe, expect, it } from "vitest";

import { PRESET_DEVICES } from "./devices";
import { DEVICE_FRAMES } from "./frames.generated";
import { frameVariant, placeFrame, type FrameImage, type FrameVariant } from "./frames";

const image = (width: number, height: number): FrameImage => ({
  src: "frames/test.webp",
  width,
  height,
  screen: { x: 10, y: 10, width: width - 20, height: height - 20 },
});

describe("frames", () => {
  it("only has frames for devices that exist", () => {
    const ids = new Set(PRESET_DEVICES.map((d) => d.id));
    for (const id of Object.keys(DEVICE_FRAMES)) expect(ids.has(id)).toBe(true);
  });

  it("falls back on the first colour when the saved one is gone", () => {
    const [first] = DEVICE_FRAMES["iphone-17-pro"];
    expect(frameVariant("iphone-17-pro", "No such colour")).toBe(first);
    expect(frameVariant("iphone-se", undefined)).toBeNull();
  });

  it("turns a phone frame on its side, but never a desktop", () => {
    const upright: FrameVariant = { color: "Black", portrait: image(100, 200) };
    expect(placeFrame(upright, "phone", 100, 200)).toEqual({
      image: upright.portrait,
      turned: false,
    });
    expect(placeFrame(upright, "phone", 200, 100)).toEqual({
      image: upright.portrait,
      turned: true,
    });

    const monitor: FrameVariant = { color: "Silver", landscape: image(200, 100) };
    expect(placeFrame(monitor, "desktop", 100, 200)).toBeNull();
  });
});
