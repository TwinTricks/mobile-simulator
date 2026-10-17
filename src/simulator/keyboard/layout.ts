import { identityPlatform } from "@/shared/identity";
import type { Device } from "@/shared/types";

export type KeyboardOs = "ios" | "android" | "ipad";

/** What the focused field asks for. Must match FieldInfo in src/content/mobile-identity.ts. */
export type FieldInfo = {
  kind: "text" | "email" | "url" | "search" | "number" | "decimal";
  /** The field's `enterkeyhint`, or empty. */
  enter: string;
  multiline: boolean;
};

export type KeyLayer = "abc" | "num" | "sym";

export type KeyIcon =
  | "shift"
  | "shift-on"
  | "backspace"
  | "enter"
  | "search"
  | "send"
  | "next"
  | "done"
  | "go"
  | "emoji";

/**
 * One key. `k` is what pressing it does: a character to type, or one of `shift`, `backspace`,
 * `enter`, `space`, `emoji`, `.com`, or `layer:abc`, `layer:num`, `layer:sym`.
 */
export type Key = {
  k: string;
  kind: "char" | "fn" | "space" | "enter" | "pad" | "blank";
  label?: string;
  icon?: KeyIcon;
  /** The small letters under a number pad digit. */
  sub?: string;
  /** Share of the row's width, relative to a letter key. */
  grow: number;
  /** The return key in blue, when it does something (go, search, send, done). */
  action?: boolean;
};

export type KeyRow = { keys: Key[]; inset?: boolean };

export type KeyboardLayout = {
  rows: KeyRow[];
  pad: boolean;
  /** The globe and microphone strip under an iPhone keyboard, which landscape hides. */
  systemBar: boolean;
};

// Heights in CSS pixels, as the real keyboards are, the system area under them included.
const HEIGHTS: Record<KeyboardOs, { portrait: number; landscape: number }> = {
  ios: { portrait: 336, landscape: 209 },
  android: { portrait: 316, landscape: 220 },
  ipad: { portrait: 398, landscape: 352 },
};

export function keyboardHeight(os: KeyboardOs, landscape: boolean): number {
  return HEIGHTS[os][landscape ? "landscape" : "portrait"];
}

/** The keyboard a device brings up, or null for desktops and custom sizes. */
export function keyboardOs(device: Device): KeyboardOs | null {
  if (device.category !== "phone" && device.category !== "tablet") return null;
  switch (identityPlatform(device.ua)) {
    case "ios":
      return "ios";
    case "ipad":
      return "ipad";
    case "android":
    case "android-tablet":
      return "android";
    case null:
      return device.category === "tablet" ? "ipad" : "ios";
  }
}

const LETTERS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const IOS_NUM = ["1234567890", '-/:;()$&@"', ".,?!'"];
const IOS_SYM = ["[]{}#%^*+=", "_\\|~<>€£¥•", ".,?!'"];
const ANDROID_NUM = ["1234567890", "@#$_&-+()/", "*\"':;!?"];
const ANDROID_SYM = ["~`|•√π÷×¶∆", "£¢€¥^°={}\\", "%©®™✓[]"];

const char = (k: string): Key => ({ k, kind: "char", grow: 1 });
const fn = (k: string, label: string, grow = 1): Key => ({ k, kind: "fn", label, grow });

const ENTER_WORDS: Record<string, string> = {
  go: "go",
  search: "search",
  send: "send",
  done: "done",
  next: "next",
};
const ACTIONS = ["go", "search", "send", "done"];

/** iOS spells out what return does; Gboard shows an icon. */
function enterKey(os: KeyboardOs, enter: string): Key {
  const action = ACTIONS.includes(enter);
  if (os === "android") {
    const icon = (["search", "send", "next", "done", "go"] as const).find((i) => i === enter);
    return { k: "enter", kind: "enter", icon: icon ?? "enter", grow: 1.5, action: true };
  }
  return { k: "enter", kind: "enter", label: ENTER_WORDS[enter] ?? "return", grow: 2.3, action };
}

function numberPad(os: KeyboardOs, decimal: boolean, enter: string): KeyRow[] {
  if (os === "android") {
    const digit = (d: string) => char(d);
    return [
      { keys: ["1", "2", "3"].map(digit).concat(fn("-", "-")) },
      { keys: ["4", "5", "6"].map(digit).concat(fn("space", "␣")) },
      {
        keys: ["7", "8", "9"]
          .map(digit)
          .concat({ k: "backspace", kind: "fn", icon: "backspace", grow: 1 }),
      },
      { keys: [fn(",", ","), digit("0"), fn(".", "."), enterKey(os, enter)] },
    ];
  }
  const letters: Record<string, string> = {
    "2": "ABC",
    "3": "DEF",
    "4": "GHI",
    "5": "JKL",
    "6": "MNO",
    "7": "PQRS",
    "8": "TUV",
    "9": "WXYZ",
  };
  const digit = (d: string): Key => ({
    k: d,
    kind: "pad",
    label: d,
    sub: letters[d] ?? "",
    grow: 1,
  });
  return [
    { keys: ["1", "2", "3"].map(digit) },
    { keys: ["4", "5", "6"].map(digit) },
    { keys: ["7", "8", "9"].map(digit) },
    {
      keys: [
        decimal
          ? { k: ".", kind: "blank", label: ".", grow: 1 }
          : { k: "", kind: "blank", grow: 1 },
        digit("0"),
        { k: "backspace", kind: "blank", icon: "backspace", grow: 1 },
      ],
    },
  ];
}

/** The keys to draw for a field, on the given layer, with or without shift. */
export function keyboardLayout(
  os: KeyboardOs,
  info: FieldInfo,
  layer: KeyLayer,
  shift: boolean,
): KeyboardLayout {
  const enter = info.enter || (info.kind === "search" ? "search" : "");
  const systemBar = os === "ios";
  if (info.kind === "number" || info.kind === "decimal") {
    return { rows: numberPad(os, info.kind === "decimal", enter), pad: true, systemBar };
  }

  const android = os === "android";
  const sets =
    layer === "abc"
      ? LETTERS
      : layer === "num"
        ? android
          ? ANDROID_NUM
          : IOS_NUM
        : android
          ? ANDROID_SYM
          : IOS_SYM;
  const chars = (s: string) =>
    [...s].map((c) => char(layer === "abc" && shift ? c.toUpperCase() : c));

  const left: Key =
    layer === "abc"
      ? { k: "shift", kind: "fn", icon: shift ? "shift-on" : "shift", grow: 1.35 }
      : layer === "num"
        ? fn("layer:sym", android ? "=\\<" : "#+=", 1.35)
        : fn("layer:num", android ? "?123" : "123", 1.35);
  const backspace: Key = { k: "backspace", kind: "fn", icon: "backspace", grow: 1.35 };
  const toggle =
    layer === "abc"
      ? fn("layer:num", android ? "?123" : "123", 1.35)
      : fn("layer:abc", "ABC", 1.35);

  let middle: Key[];
  const space: Key = {
    k: "space",
    kind: "space",
    label: android ? "" : "space",
    grow: android ? 4.5 : 5,
  };
  if (info.kind === "email") middle = [space, fn("@", "@"), fn(".", ".")];
  else if (info.kind === "url") middle = [fn("/", "/"), fn(".", "."), fn(".com", ".com", 1.6)];
  else middle = android ? [fn(",", ","), space, fn(".", ".")] : [space];
  const emoji: Key[] = android ? [] : [{ k: "emoji", kind: "fn", icon: "emoji", grow: 1.35 }];

  return {
    rows: [
      { keys: chars(sets[0]!) },
      { keys: chars(sets[1]!), inset: layer === "abc" },
      { keys: [left, ...chars(sets[2]!), backspace] },
      { keys: [toggle, ...emoji, ...middle, enterKey(os, enter)] },
    ],
    pad: false,
    systemBar,
  };
}

/** The on-screen key a physical key press lights up. */
export function keyForPress(key: string, shift: boolean): string {
  const special: Record<string, string> = {
    Backspace: "backspace",
    Enter: "enter",
    " ": "space",
    Shift: "shift",
  };
  if (special[key]) return special[key];
  if (key.length !== 1) return "";
  return shift ? key : key.toLowerCase();
}
