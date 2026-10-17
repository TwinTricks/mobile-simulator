import { describe, expect, it } from "vitest";

import { MAX_ENTRIES, appendCapped, formatBytes, readDevReport } from "./devtools";

describe("readDevReport", () => {
  it("tags entries with the device and drops malformed ones", () => {
    const report = readDevReport(
      {
        __msimDev: {
          logs: [
            { level: "warn", text: "careful", at: 1 },
            { level: "shout", text: "nope", at: 2 },
            { level: "log", text: 5 },
          ],
          requests: [{ method: "POST", url: "https://a.test/api", status: 201, type: "fetch" }],
        },
      },
      "pixel-8",
    );
    expect(report?.logs).toHaveLength(1);
    expect(report?.logs[0]).toMatchObject({ deviceId: "pixel-8", level: "warn", text: "careful" });
    expect(report?.requests[0]).toMatchObject({ method: "POST", status: 201, failed: false });
  });

  it("ignores other messages", () => {
    expect(readDevReport({ __simScroll: true }, "x")).toBeNull();
  });
});

describe("appendCapped", () => {
  it("keeps the newest entries", () => {
    const full = Array.from({ length: MAX_ENTRIES }, (_, i) => i);
    const next = appendCapped(full, [MAX_ENTRIES, MAX_ENTRIES + 1]);
    expect(next).toHaveLength(MAX_ENTRIES);
    expect(next.at(-1)).toBe(MAX_ENTRIES + 1);
    expect(next[0]).toBe(2);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(0)).toBe("–");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 kB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
