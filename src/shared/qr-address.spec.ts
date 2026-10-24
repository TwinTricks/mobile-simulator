import { describe, expect, it } from "vitest";

import { isLocalAddress, shareableUrl, withHost } from "./qr-address";

describe("shareableUrl", () => {
  it("drops the simulator's device marker and the #mobile-sim hash", () => {
    expect(shareableUrl("https://shop.example/cart?__sim_device=pixel-8&id=4#mobile-sim")).toBe(
      "https://shop.example/cart?id=4",
    );
  });

  it("keeps the page's own hash", () => {
    expect(shareableUrl("https://docs.example/guide#install")).toBe(
      "https://docs.example/guide#install",
    );
  });
});

describe("isLocalAddress", () => {
  it("spots addresses only this computer can open", () => {
    expect(isLocalAddress("http://localhost:5173/")).toBe(true);
    expect(isLocalAddress("http://127.0.0.1:3000/")).toBe(true);
    expect(isLocalAddress("http://app.localhost/")).toBe(true);
    expect(isLocalAddress("http://[::1]:8080/")).toBe(true);
    expect(isLocalAddress("http://192.168.1.20:5173/")).toBe(false);
    expect(isLocalAddress("https://example.com/")).toBe(false);
  });
});

describe("withHost", () => {
  it("swaps the host and keeps the path, and the port unless a new one is given", () => {
    expect(withHost("http://localhost:5173/a?b=1", "192.168.1.20")).toBe(
      "http://192.168.1.20:5173/a?b=1",
    );
    expect(withHost("http://localhost:5173/a", "192.168.1.20:8080")).toBe(
      "http://192.168.1.20:8080/a",
    );
    expect(withHost("http://localhost:5173/a", "http://my-mac.local:5173/")).toBe(
      "http://my-mac.local:5173/a",
    );
  });

  it("refuses something that isn't a host", () => {
    expect(withHost("http://localhost/", "  ")).toBeNull();
    expect(withHost("http://localhost/", "not a host")).toBeNull();
  });
});
