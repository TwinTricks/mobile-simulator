import { describe, expect, it } from "vitest";

import { parseCustomDevice } from "./custom-device";

const valid = { name: "Test phone", width: "400", height: "800", dpr: "3" };

describe("parseCustomDevice", () => {
  it("builds a custom device", () => {
    expect(parseCustomDevice(valid, "id-1")).toEqual({
      device: {
        id: "id-1",
        name: "Test phone",
        width: 400,
        height: 800,
        dpr: 3,
        category: "custom",
        ua: null,
      },
    });
  });

  it("defaults the pixel ratio to 2", () => {
    const result = parseCustomDevice({ ...valid, dpr: "" }, "id");
    expect("device" in result && result.device.dpr).toBe(2);
  });

  it("requires a name", () => {
    expect(parseCustomDevice({ ...valid, name: "  " }, "id")).toEqual({
      error: "Device name required.",
    });
  });

  it("keeps sizes within range", () => {
    expect(parseCustomDevice({ ...valid, width: "" }, "id")).toEqual({
      error: "Width must be 100–3840.",
    });
    expect(parseCustomDevice({ ...valid, width: "99" }, "id")).toEqual({
      error: "Width must be 100–3840.",
    });
    expect(parseCustomDevice({ ...valid, height: "4000" }, "id")).toEqual({
      error: "Height must be 100–3840.",
    });
  });
});
