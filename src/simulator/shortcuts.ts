export type ShortcutAction =
  | "rotate"
  | "compare"
  | "devices"
  | "screenshot"
  | "record"
  | "frame-color"
  | "zoom-in"
  | "zoom-out"
  | "zoom-fit"
  | "close";

// Must match SHORTCUT_KEYS in src/content/mobile-identity.ts, which forwards them from the pages.
const KEYS: Record<string, ShortcutAction> = {
  r: "rotate",
  c: "compare",
  d: "devices",
  s: "screenshot",
  v: "record",
  f: "frame-color",
  "+": "zoom-in",
  "=": "zoom-in",
  "-": "zoom-out",
  _: "zoom-out",
  "0": "zoom-fit",
  escape: "close",
};

/** The keys, for the list in Settings. */
export const SHORTCUT_HELP: [keys: string[], what: string][] = [
  [["R"], "Rotate"],
  [["C"], "Compare devices side by side"],
  [["D"], "Devices"],
  [["S"], "Screenshot"],
  [["V"], "Start or stop recording"],
  [["F"], "Next frame colour"],
  [["+", "−"], "Zoom in and out"],
  [["0"], "Zoom to fit"],
  [["Esc"], "Close panels"],
];

type KeyLike = { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean };

/** The shortcut a key press stands for. Presses with Ctrl, Cmd or Alt belong to the browser. */
export function shortcutFor({ key, ctrlKey, metaKey, altKey }: KeyLike): ShortcutAction | null {
  if (ctrlKey || metaKey || altKey) return null;
  return KEYS[key.toLowerCase()] ?? null;
}

/** True when a key press is typing, which no shortcut may steal. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || !!target.closest("input, textarea, select, [role='combobox']");
}

// Steps the zoom keys walk, as fractions of the devices' real size.
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;

/** The next zoom step past `current` in the given direction, or `current` at either end. */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > current * 1.001) ?? current;
  return [...ZOOM_STEPS].reverse().find((step) => step < current * 0.999) ?? current;
}
