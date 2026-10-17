import { describe, expect, it } from "vitest";

import { simulatorStateSchema } from "@/shared/schemas";
import { withDefaultDevice } from "./default-device";

const state = simulatorStateSchema.parse({ visibleDeviceIds: ["pixel-8", "iphone-17-pro"] });

describe("withDefaultDevice", () => {
  it("brings the default device to the front and keeps the rest", () => {
    expect(withDefaultDevice(state, "iphone-17-pro").visibleDeviceIds).toEqual([
      "iphone-17-pro",
      "pixel-8",
    ]);
  });

  it("adds a default that wasn't in the list", () => {
    expect(withDefaultDevice(state, "ipad-air").visibleDeviceIds).toEqual([
      "ipad-air",
      "pixel-8",
      "iphone-17-pro",
    ]);
  });

  it("leaves the list alone with no default, or one that no longer exists", () => {
    expect(withDefaultDevice(state, "")).toBe(state);
    expect(withDefaultDevice(state, "deleted-custom-device")).toBe(state);
  });
});
