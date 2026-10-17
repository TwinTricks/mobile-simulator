import { describe, expect, it } from "vitest";

import {
  createNavRelay,
  readNavReport,
  readSyncAction,
  shouldRelay,
  type SyncTarget,
} from "./interaction-sync";

const target: SyncTarget = { selectors: ["#buy"], tag: "button", text: "Buy", link: false };
const link: SyncTarget = { ...target, tag: "a", link: true };
const all = { clicks: true, input: true, navigation: true };

describe("readSyncAction", () => {
  it("accepts well-formed actions only", () => {
    expect(readSyncAction({ __msimAct: { kind: "click", target } })).toEqual({
      kind: "click",
      target,
    });
    expect(readSyncAction({ __msimAct: { kind: "value", target, value: 3 } })).toBeNull();
    expect(readSyncAction({ __msimAct: { kind: "click", target: { selectors: "x" } } })).toBeNull();
    expect(readSyncAction("hello")).toBeNull();
  });
});

describe("readNavReport", () => {
  it("only takes web addresses", () => {
    expect(readNavReport({ __msimNav: { url: "https://a.test/x", soft: true } })).toEqual({
      url: "https://a.test/x",
      soft: true,
    });
    expect(readNavReport({ __msimNav: { url: "javascript:alert(1)", soft: false } })).toBeNull();
  });
});

describe("shouldRelay", () => {
  it("leaves link clicks to navigation sync", () => {
    expect(shouldRelay({ kind: "click", target: link }, all)).toBe(false);
    expect(shouldRelay({ kind: "click", target: link }, { ...all, navigation: false })).toBe(true);
    expect(shouldRelay({ kind: "click", target }, all)).toBe(true);
  });

  it("follows the input switch for typing", () => {
    const typed = { kind: "value" as const, target, value: "hi" };
    expect(shouldRelay(typed, all)).toBe(true);
    expect(shouldRelay(typed, { ...all, input: false })).toBe(false);
  });
});

describe("createNavRelay", () => {
  it("skips the address it just passed on", () => {
    const relay = createNavRelay(() => 0);
    expect(relay.next("https://a/1")).toBe("relay");
    expect(relay.next("https://a/1")).toBe("skip");
  });

  it("stops pages bouncing each other", () => {
    let t = 0;
    const relay = createNavRelay(() => t);
    for (let i = 0; i < 6; i++) {
      t += 100;
      expect(relay.next(`https://a/${i}`)).toBe("relay");
    }
    expect(relay.next("https://a/x")).toBe("loop");
    t += 11_000;
    expect(relay.next("https://a/y")).toBe("relay");
  });
});
