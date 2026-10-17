import { describe, expect, it } from "vitest";

import { readRequest } from "./messages";

describe("readRequest", () => {
  it("accepts every known request", () => {
    expect(readRequest({ type: "open-simulator", url: "https://example.com" })).toEqual({
      type: "open-simulator",
      url: "https://example.com",
    });
    expect(readRequest({ type: "get-active-url" })).toEqual({ type: "get-active-url" });
    expect(readRequest({ type: "set-csp-mode", mode: "xfo-only" })).toEqual({
      type: "set-csp-mode",
      mode: "xfo-only",
    });
    expect(readRequest({ type: "open-full-screen" })).toEqual({ type: "open-full-screen" });
    expect(readRequest({ type: "open-full-screen", tabId: 4 })).toEqual({
      type: "open-full-screen",
      tabId: 4,
    });
  });

  it("ignores unknown or malformed requests", () => {
    expect(readRequest(null)).toBeNull();
    expect(readRequest({ type: "toggle-rules", enabled: true })).toBeNull();
    expect(readRequest({ type: "set-csp-mode", mode: "everything" })).toBeNull();
    expect(readRequest({ type: "open-simulator" })).toBeNull();
  });
});
