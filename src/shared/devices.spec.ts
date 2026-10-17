import { describe, expect, it } from "vitest";

import type { Device } from "@/shared/types";
import {
  DEFAULT_VISIBLE_IDS,
  PRESET_DEVICES,
  defaultPresets,
  deviceSize,
  findDevice,
} from "./devices";

const custom: Device = {
  id: "my-phone",
  name: "My phone",
  width: 400,
  height: 800,
  dpr: 2,
  category: "custom",
  ua: null,
};

describe("devices", () => {
  it("has unique preset ids", () => {
    const ids = PRESET_DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shows only real presets by default", () => {
    for (const id of DEFAULT_VISIBLE_IDS) expect(findDevice(id)).not.toBeNull();
  });

  it("finds presets and custom devices, and nothing else", () => {
    expect(findDevice("pixel-8")?.name).toBe("Pixel 8");
    expect(findDevice("my-phone", [custom])).toBe(custom);
    expect(findDevice("missing", [custom])).toBeNull();
  });

  it("builds starter presets out of real devices", () => {
    for (const preset of defaultPresets()) {
      expect(preset.deviceIds.length).toBeGreaterThan(0);
      for (const id of preset.deviceIds) expect(findDevice(id)).not.toBeNull();
    }
  });

  it("swaps width and height when rotated", () => {
    expect(deviceSize(custom, false)).toEqual({ width: 400, height: 800 });
    expect(deviceSize(custom, true)).toEqual({ width: 800, height: 400 });
  });
});
