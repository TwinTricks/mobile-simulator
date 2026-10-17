import { describe, expect, it } from "vitest";

import { moveId } from "./layout";

describe("moveId", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves forward, before or after the target", () => {
    expect(moveId(ids, "a", "c", false)).toEqual(["b", "a", "c", "d"]);
    expect(moveId(ids, "a", "c", true)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves backward, before or after the target", () => {
    expect(moveId(ids, "d", "b", false)).toEqual(["a", "d", "b", "c"]);
    expect(moveId(ids, "d", "a", false)).toEqual(["d", "a", "b", "c"]);
  });

  it("leaves the list alone for itself or unknown ids", () => {
    expect(moveId(ids, "b", "b", true)).toEqual(ids);
    expect(moveId(ids, "x", "b", true)).toEqual(ids);
    expect(moveId(ids, "b", "x", true)).toEqual(ids);
  });
});
