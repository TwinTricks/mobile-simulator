import { describe, expect, it } from "vitest";

import { findDevice } from "@/shared/devices";
import { IDENTITY_PREFIX, frameIdentity, identityName, identityPlatform } from "@/shared/identity";
import type { Device } from "@/shared/types";

const device = (id: string): Device => findDevice(id, [])!;

describe("identityPlatform", () => {
  it("tells the platforms apart by their user agent", () => {
    expect(identityPlatform(device("iphone-15-pro").ua)).toBe("ios");
    expect(identityPlatform(device("ipad-air").ua)).toBe("ipad");
    expect(identityPlatform(device("pixel-8").ua)).toBe("android");
    expect(identityPlatform(device("galaxy-tab-s9").ua)).toBe("android-tablet");
    expect(identityPlatform(null)).toBeNull();
  });
});

describe("frameIdentity", () => {
  it("gives a phone its user agent, portrait screen and touch", () => {
    const identity = frameIdentity(device("pixel-8"), {
      spoofUA: true,
      touchMode: true,
      nativeScrollbars: false,
    });
    expect(identity).toMatchObject({ platform: "android", width: 412, height: 915, touch: true });
    expect(identity.ua).toContain("Pixel 8");
  });

  it("leaves the browser's identity alone while spoofing is off", () => {
    const identity = frameIdentity(device("pixel-8"), {
      spoofUA: false,
      touchMode: true,
      nativeScrollbars: false,
    });
    expect(identity).toMatchObject({ ua: null, platform: null, touch: true });
  });

  it("keeps the mouse on desktops and when touch mode is off", () => {
    expect(
      frameIdentity(device("laptop-13"), {
        spoofUA: true,
        touchMode: true,
        nativeScrollbars: false,
      }).touch,
    ).toBe(false);
    expect(
      frameIdentity(device("pixel-8"), { spoofUA: true, touchMode: false, nativeScrollbars: false })
        .touch,
    ).toBe(false);
  });

  it("hides scrollbars unless native ones are asked for", () => {
    const off = { spoofUA: true, touchMode: true, nativeScrollbars: false };
    expect(frameIdentity(device("pixel-8"), off).scrollbars).toBe(false);
    expect(frameIdentity(device("pixel-8"), { ...off, nativeScrollbars: true }).scrollbars).toBe(
      true,
    );
  });

  it("round-trips through the frame name", () => {
    const identity = frameIdentity(device("ipad-air"), {
      spoofUA: true,
      touchMode: true,
      nativeScrollbars: false,
    });
    const name = identityName(identity);
    expect(name.startsWith(IDENTITY_PREFIX)).toBe(true);
    expect(JSON.parse(name.slice(IDENTITY_PREFIX.length))).toEqual(identity);
  });
});
