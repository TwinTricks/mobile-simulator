import { describe, expect, it } from "vitest";

import { isSimulatableUrl, normalizeUrl, safeReturnUrl } from "./url";

describe("normalizeUrl", () => {
  it("returns an empty string for blank input", () => {
    expect(normalizeUrl("   ")).toBe("");
  });

  it("adds https to a bare host", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  it("adds http to localhost and IP addresses", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000/");
    expect(normalizeUrl("192.168.1.4:8080/app")).toBe("http://192.168.1.4:8080/app");
  });

  it("keeps an explicit scheme", () => {
    expect(normalizeUrl("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
  });

  it("returns null for something that cannot be a URL", () => {
    expect(normalizeUrl("https://exa mple.com")).toBeNull();
  });
});

describe("isSimulatableUrl", () => {
  it("accepts web pages only", () => {
    expect(isSimulatableUrl("https://example.com")).toBe(true);
    expect(isSimulatableUrl("http://localhost:5173")).toBe(true);
    expect(isSimulatableUrl("chrome://extensions")).toBe(false);
    expect(isSimulatableUrl("chrome-extension://abc/page.html")).toBe(false);
    expect(isSimulatableUrl(undefined)).toBe(false);
  });
});

describe("safeReturnUrl", () => {
  it("goes back to web pages, local files and the new tab page", () => {
    expect(safeReturnUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeReturnUrl("file:///Users/me/index.html")).toBe("file:///Users/me/index.html");
    expect(safeReturnUrl("chrome://newtab/")).toBe("chrome://newtab/");
  });

  it("refuses scripts and other browser or extension pages", () => {
    expect(safeReturnUrl("javascript:alert(1)")).toBeNull();
    expect(safeReturnUrl("chrome://settings")).toBeNull();
    expect(safeReturnUrl("chrome-extension://abc/page.html")).toBeNull();
    expect(safeReturnUrl(null)).toBeNull();
  });
});
