import { describe, expect, it } from "vitest";

import { MAX_RECENT_URLS, rememberUrl } from "./recent-urls";

describe("rememberUrl", () => {
  it("puts the newest first without repeats", () => {
    expect(rememberUrl(["https://a/", "https://b/"], "https://b/")).toEqual([
      "https://b/",
      "https://a/",
    ]);
  });

  it("keeps the list to its limit", () => {
    const many = Array.from({ length: MAX_RECENT_URLS }, (_, i) => `https://${i}/`);
    const next = rememberUrl(many, "https://new/");
    expect(next).toHaveLength(MAX_RECENT_URLS);
    expect(next[0]).toBe("https://new/");
  });
});
