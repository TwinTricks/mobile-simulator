import { describe, expect, it } from "vitest";

import { breakpointFor } from "./breakpoints";

describe("breakpointFor", () => {
  it("names the largest breakpoint reached", () => {
    expect(breakpointFor(402)).toBe("xs");
    expect(breakpointFor(640)).toBe("sm");
    expect(breakpointFor(820)).toBe("md");
    expect(breakpointFor(1180)).toBe("lg");
    expect(breakpointFor(1440)).toBe("xl");
    expect(breakpointFor(1920)).toBe("2xl");
  });
});
