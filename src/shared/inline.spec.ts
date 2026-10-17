import { describe, expect, it } from "vitest";

import {
  DEFAULT_INLINE_HOSTS,
  hostAllowed,
  parseHostList,
  readInlineHash,
  withoutInlineHash,
} from "./inline";

describe("readInlineHash", () => {
  it("opens with the defaults on a bare #mobile-sim", () => {
    expect(readInlineHash("#mobile-sim")).toEqual({
      deviceId: null,
      rotated: false,
      layout: "dock",
    });
  });

  it("reads the device, the way round and the layout in any order", () => {
    expect(readInlineHash("#mobile-sim=full,pixel-8,landscape")).toEqual({
      deviceId: "pixel-8",
      rotated: true,
      layout: "full",
    });
  });

  it("closes on off", () => {
    expect(readInlineHash("#mobile-sim=off")).toBeNull();
  });

  it("leaves every other hash to the site", () => {
    expect(readInlineHash("")).toBeUndefined();
    expect(readInlineHash("#pricing")).toBeUndefined();
    expect(readInlineHash("#mobile-simulator")).toBeUndefined();
  });

  it("reads an encoded hash", () => {
    expect(readInlineHash("#mobile-sim%3Dpixel-8")?.deviceId).toBe("pixel-8");
  });
});

describe("withoutInlineHash", () => {
  it("drops our hash and keeps the rest of the address", () => {
    expect(withoutInlineHash("http://localhost:3000/a?b=1#mobile-sim=pixel-8")).toBe(
      "http://localhost:3000/a?b=1",
    );
  });

  it("keeps the site's own hash", () => {
    expect(withoutInlineHash("http://localhost:3000/#pricing")).toBe(
      "http://localhost:3000/#pricing",
    );
  });
});

describe("hostAllowed", () => {
  it("allows local development hosts by default", () => {
    for (const host of ["localhost", "127.0.0.1", "app.localhost", "shop.test"]) {
      expect(hostAllowed(host, DEFAULT_INLINE_HOSTS)).toBe(true);
    }
  });

  it("keeps everything else out by default", () => {
    for (const host of ["example.com", "test", "localhost.example.com", ""]) {
      expect(hostAllowed(host, DEFAULT_INLINE_HOSTS)).toBe(false);
    }
  });

  it("ignores case and a trailing dot", () => {
    expect(hostAllowed("LOCALHOST.", DEFAULT_INLINE_HOSTS)).toBe(true);
  });
});

describe("parseHostList", () => {
  it("splits on lines, spaces and commas and drops repeats and junk", () => {
    expect(parseHostList("localhost, *.test\nExample.com localhost  http://x/")).toEqual([
      "localhost",
      "*.test",
      "example.com",
    ]);
  });
});
