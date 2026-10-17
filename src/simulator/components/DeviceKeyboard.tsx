import type { CSSProperties, ReactNode } from "react";
import {
  ArrowBigUp,
  ArrowRight,
  Check,
  CornerDownLeft,
  Delete,
  Globe,
  Mic,
  Search,
  Send,
  Smile,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Key, KeyIcon, KeyboardLayout, KeyboardOs } from "../keyboard/layout";

type Palette = { bg: string; key: string; fn: string; ink: string; shadow: string };

// The keyboards' own colours, light and dark.
const PALETTES: Record<"apple" | "android", { light: Palette; dark: Palette }> = {
  apple: {
    light: {
      bg: "#d1d3d9",
      key: "#fff",
      fn: "#abb0ba",
      ink: "#000",
      shadow: "0 1px 0 rgba(0,0,0,.35)",
    },
    dark: {
      bg: "#2b2b2d",
      key: "#6b6b6e",
      fn: "#464648",
      ink: "#fff",
      shadow: "0 1px 0 rgba(0,0,0,.5)",
    },
  },
  android: {
    light: { bg: "#e8eaed", key: "#fff", fn: "#c8ccd3", ink: "#1f1f1f", shadow: "none" },
    dark: { bg: "#202124", key: "#3c4043", fn: "#5f6368", ink: "#e8eaed", shadow: "none" },
  },
};

const ICONS: Record<KeyIcon, ReactNode> = {
  shift: <ArrowBigUp />,
  "shift-on": <ArrowBigUp fill="currentColor" />,
  backspace: <Delete />,
  enter: <CornerDownLeft />,
  search: <Search />,
  send: <Send />,
  next: <ArrowRight />,
  go: <ArrowRight />,
  done: <Check />,
  emoji: <Smile />,
};

type DeviceKeyboardProps = {
  os: KeyboardOs;
  layout: KeyboardLayout;
  height: number;
  landscape: boolean;
  dark: boolean;
  open: boolean;
  /** The key to light up for a moment, after a press. */
  pressed: string | null;
  onKey: (key: string) => void;
};

/** A phone or tablet keyboard, drawn in the device's own CSS pixels at the bottom of its screen. */
export function DeviceKeyboard({
  os,
  layout,
  height,
  landscape,
  dark,
  open,
  pressed,
  onKey,
}: DeviceKeyboardProps) {
  const android = os === "android";
  const ipad = os === "ipad";
  const palette = PALETTES[android ? "android" : "apple"][dark ? "dark" : "light"];
  const keyHeight = ipad ? 62 : layout.pad ? 46 : android ? 44 : 42;
  const gap = ipad ? 10 : 6;

  return (
    <div
      aria-label="On-screen keyboard"
      aria-hidden={!open}
      data-keyboard={os}
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex flex-col transition-transform duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)] select-none motion-reduce:transition-none",
        !open && "pointer-events-none translate-y-full",
      )}
      style={{
        height,
        background: palette.bg,
        color: palette.ink,
        fontFamily: android
          ? 'Roboto, "Google Sans", system-ui, sans-serif'
          : '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        fontSize: ipad ? 26 : android ? 21 : 22,
        paddingBottom: android ? 24 : 0,
      }}
      // Pressing a key must leave the focus in the page's field.
      onMouseDown={(event) => event.preventDefault()}
    >
      <div
        className={cn("flex flex-1 flex-col", layout.pad ? "justify-start" : "justify-evenly")}
        style={{ padding: layout.pad ? "6px 6px 0" : "6px 3px 2px", gap: layout.pad ? 6 : 0 }}
      >
        {layout.rows.map((row, index) => (
          <div
            key={index}
            className="flex justify-center"
            style={{
              gap,
              padding: `0 ${row.inset ? (ipad ? 40 : 22) : layout.pad ? 0 : ipad ? 8 : 3}px`,
            }}
          >
            {row.keys.map((key, i) => (
              <KeyButton
                key={`${key.k}-${i}`}
                spec={key}
                palette={palette}
                height={keyHeight}
                os={os}
                pressed={pressed !== null && pressed === key.k}
                onKey={onKey}
              />
            ))}
          </div>
        ))}
      </div>
      {layout.systemBar && !landscape ? (
        <div className="flex h-[74px] shrink-0 items-start justify-between px-[26px] pt-2 opacity-75 [&_svg]:size-[26px] [&_svg]:stroke-[1.6]">
          <Globe />
          <Mic />
        </div>
      ) : null}
    </div>
  );
}

function KeyButton({
  spec,
  palette,
  height,
  os,
  pressed,
  onKey,
}: {
  spec: Key;
  palette: Palette;
  height: number;
  os: KeyboardOs;
  pressed: boolean;
  onKey: (key: string) => void;
}) {
  const android = os === "android";
  const blank = spec.kind === "blank";
  const quiet = spec.kind === "fn" || spec.kind === "enter";
  let background = blank ? "transparent" : quiet ? palette.fn : palette.key;
  let color: string | undefined;
  if (spec.kind === "enter" && spec.action) {
    background = android ? (palette.ink === "#1f1f1f" ? "#c2e7ff" : "#a8c7fa") : "#0a84ff";
    color = android ? "#001d35" : "#fff";
  }
  if (spec.k === "shift" && spec.icon === "shift-on") background = palette.key;
  if (pressed) background = quiet ? palette.key : palette.fn;
  const style: CSSProperties = {
    flex: `${spec.grow} 1 0`,
    height,
    background,
    color,
    boxShadow: blank ? "none" : palette.shadow,
    borderRadius: android ? (spec.kind === "enter" ? 22 : 7) : os === "ipad" ? 7 : 5,
    fontSize: spec.kind === "char" || spec.kind === "pad" ? undefined : 16,
  };

  if (!spec.k) return <span className="min-w-0" style={style} />;
  return (
    <button
      type="button"
      tabIndex={-1}
      data-k={spec.k}
      aria-label={spec.icon ?? spec.label ?? spec.k}
      className={cn(
        "grid min-w-0 place-items-center p-0 leading-none transition-transform duration-75 [&_svg]:size-[22px] [&_svg]:stroke-[1.7]",
        spec.kind === "pad" && "flex flex-col justify-center gap-px text-[25px]",
        pressed && "scale-[.96]",
      )}
      style={style}
      onClick={() => onKey(spec.k)}
    >
      {spec.icon ? ICONS[spec.icon] : (spec.label ?? spec.k)}
      {spec.kind === "pad" ? (
        <small className="text-[10px] font-semibold tracking-[.14em]">{spec.sub || "\u00a0"}</small>
      ) : null}
    </button>
  );
}
