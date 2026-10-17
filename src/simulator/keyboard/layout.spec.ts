import { describe, expect, it } from "vitest";

import { findDevice } from "@/shared/devices";
import { keyForPress, keyboardHeight, keyboardLayout, keyboardOs, type FieldInfo } from "./layout";

const text: FieldInfo = { kind: "text", enter: "", multiline: false };
const keysOf = (layout: ReturnType<typeof keyboardLayout>) =>
  layout.rows.flatMap((row) => row.keys.map((key) => key.k));

describe("keyboardOs", () => {
  it("brings up each platform's own keyboard", () => {
    expect(keyboardOs(findDevice("iphone-15-pro")!)).toBe("ios");
    expect(keyboardOs(findDevice("ipad-air")!)).toBe("ipad");
    expect(keyboardOs(findDevice("pixel-8")!)).toBe("android");
    expect(keyboardOs(findDevice("galaxy-tab-s9")!)).toBe("android");
    expect(keyboardOs(findDevice("laptop-13")!)).toBeNull();
  });

  it("is shorter in landscape", () => {
    expect(keyboardHeight("ios", true)).toBeLessThan(keyboardHeight("ios", false));
  });
});

describe("keyboardLayout", () => {
  it("lays out letters with shift, backspace and a return key", () => {
    const layout = keyboardLayout("ios", text, "abc", false);
    expect(layout.rows).toHaveLength(4);
    expect(keysOf(layout)).toEqual(
      expect.arrayContaining(["q", "p", "shift", "backspace", "space", "enter"]),
    );
    expect(layout.rows[3]!.keys.at(-1)).toMatchObject({ label: "return", action: false });
  });

  it("capitalises with shift on", () => {
    expect(keysOf(keyboardLayout("ios", text, "abc", true))).toContain("Q");
  });

  it("adapts to email, URL and search fields", () => {
    expect(keysOf(keyboardLayout("ios", { ...text, kind: "email" }, "abc", false))).toEqual(
      expect.arrayContaining(["@", "."]),
    );
    expect(keysOf(keyboardLayout("ios", { ...text, kind: "url" }, "abc", false))).toContain(".com");
    const search = keyboardLayout("ios", { ...text, kind: "search" }, "abc", false);
    expect(search.rows[3]!.keys.at(-1)).toMatchObject({ label: "search", action: true });
  });

  it("follows enterkeyhint", () => {
    const send = keyboardLayout("android", { ...text, enter: "send" }, "abc", false);
    expect(send.rows[3]!.keys.at(-1)).toMatchObject({ icon: "send" });
  });

  it("shows a number pad for numeric fields", () => {
    const pad = keyboardLayout("ios", { ...text, kind: "number" }, "abc", false);
    expect(pad.pad).toBe(true);
    expect(keysOf(pad)).toEqual(expect.arrayContaining(["1", "0", "backspace"]));
    expect(keysOf(pad)).not.toContain(".");
    expect(keysOf(keyboardLayout("ios", { ...text, kind: "decimal" }, "abc", false))).toContain(
      ".",
    );
  });

  it("switches to numbers and symbols", () => {
    expect(keysOf(keyboardLayout("ios", text, "num", false))).toEqual(
      expect.arrayContaining(["1", "layer:sym", "layer:abc"]),
    );
    expect(keysOf(keyboardLayout("ios", text, "sym", false))).toContain("layer:num");
  });
});

describe("keyForPress", () => {
  it("maps a physical key to the on-screen one", () => {
    expect(keyForPress("A", false)).toBe("a");
    expect(keyForPress("A", true)).toBe("A");
    expect(keyForPress("Backspace", false)).toBe("backspace");
    expect(keyForPress(" ", false)).toBe("space");
    expect(keyForPress("ArrowLeft", false)).toBe("");
  });
});
