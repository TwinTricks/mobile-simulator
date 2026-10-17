import { describe, expect, it } from "vitest";

import { formatElapsed, pickFormat } from "./recorder";

describe("pickFormat", () => {
  it("prefers MP4 with H.264 and AAC", () => {
    expect(pickFormat(() => true)).toEqual({
      mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2",
      extension: "mp4",
    });
  });

  it("falls back to WebM on a Chrome that can't write MP4", () => {
    expect(pickFormat((type) => type.startsWith("video/webm"))).toEqual({
      mimeType: "video/webm;codecs=vp9,opus",
      extension: "webm",
    });
  });

  it("gives up when nothing can be written", () => {
    expect(pickFormat(() => false)).toBeNull();
  });
});

describe("formatElapsed", () => {
  it("counts minutes and seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9_999)).toBe("0:09");
    expect(formatElapsed(75_000)).toBe("1:15");
  });

  it("adds hours once past one", () => {
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
  });

  it("never goes below zero", () => {
    expect(formatElapsed(-500)).toBe("0:00");
  });
});
