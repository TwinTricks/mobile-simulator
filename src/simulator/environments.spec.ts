import { describe, expect, it } from "vitest";

import { findDevice } from "@/shared/devices";
import { onOrigin, panesFor, parseOrigin } from "./environments";

const phone = findDevice("iphone-17-pro")!;
const pixel = findDevice("pixel-8")!;

describe("panesFor", () => {
  it("keeps one pane per device until two sites are picked", () => {
    expect(panesFor([phone, pixel], ["http://localhost:3000"]).map((p) => p.key)).toEqual([
      "iphone-17-pro",
      "pixel-8",
    ]);
  });

  it("shows each device once per site", () => {
    const panes = panesFor([phone], ["http://localhost:3000", "https://staging.app.test"]);
    expect(panes.map((p) => p.origin)).toEqual([
      "http://localhost:3000",
      "https://staging.app.test",
    ]);
    expect(new Set(panes.map((p) => p.key)).size).toBe(2);
  });
});

describe("onOrigin", () => {
  it("keeps the path, query and hash", () => {
    expect(onOrigin("https://app.test/a/b?c=1#d", "http://localhost:3000")).toBe(
      "http://localhost:3000/a/b?c=1#d",
    );
  });

  it("leaves the address alone without an origin", () => {
    expect(onOrigin("https://app.test/a", null)).toBe("https://app.test/a");
  });
});

describe("parseOrigin", () => {
  it("reads origins from loose input", () => {
    expect(parseOrigin("localhost:5173/some/page")).toBe("http://localhost:5173");
    expect(parseOrigin("staging.app.test")).toBe("https://staging.app.test");
    expect(parseOrigin("")).toBeNull();
  });
});
