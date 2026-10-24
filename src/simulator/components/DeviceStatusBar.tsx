import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { StatusBarSpec } from "../frame-box";
import { isDarkColor } from "../status-color";
import { BatteryIcon, CellularIcon, LOW_BATTERY, WifiIcon } from "./status-icons";

/** Room left in the middle of an `island` bar for the notch or Dynamic Island. */
const ISLAND_WIDTH = 126;

/**
 * The time as the phone's own status bar shows it: the locale's 12- or 24-hour clock, with no
 * AM/PM, so "2:34" or "14:34".
 */
function clock(now = new Date()): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
    .formatToParts(now)
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
}

/** A pinned "HH:MM" as the clock shows it, or null for the real time. */
function pinnedTime(forced: string | undefined): string | null {
  const match = forced ? /^(\d{2}):(\d{2})$/.exec(forced) : null;
  if (!match) return null;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return clock(date);
}

function useClock(): string {
  const [time, setTime] = useState(() => clock());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setTime(clock());
      // Wakes on the minute, so the clock turns over when the real one does.
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => clearTimeout(timer);
  }, []);
  return time;
}

type Props = {
  spec: StatusBarSpec;
  /** The page's own top colour, when it has reported one. */
  color: string | null;
  /** Used while the page has not reported a colour. */
  dark: boolean;
  /** The charge the battery shows, in percent. */
  battery?: number;
  /** "HH:MM" pins the clock; empty or missing follows the real time. */
  forcedTime?: string;
  /** Laid over a page drawn edge to edge, which shows through it. */
  overlay?: boolean;
};

export function DeviceStatusBar({
  spec,
  color,
  dark,
  battery = 100,
  forcedTime,
  overlay = false,
}: Props) {
  const realTime = useClock();
  const time = pinnedTime(forcedTime) ?? realTime;
  const background = color ?? (dark ? "#000000" : "#ffffff");
  const light = color ? isDarkColor(color) : dark;
  const { kind, height } = spec;

  const icons = (
    <span className="flex items-center gap-[7.5px]">
      <CellularIcon />
      <WifiIcon />
      <BatteryIcon level={battery} />
    </span>
  );

  return (
    <div
      aria-hidden
      className={cn(
        "shrink-0 font-semibold tabular-nums transition-colors duration-200 select-none",
        overlay && "pointer-events-none absolute inset-x-0 top-0 z-10",
        light ? "text-white" : "text-black",
      )}
      style={{
        height,
        background: overlay ? "transparent" : background,
        fontFamily: '-apple-system, "SF Pro Text", "SF Pro", system-ui, sans-serif',
      }}
    >
      {kind === "island" && (
        <div
          className="grid h-full items-center pt-1 text-[17px] tracking-[-0.4px]"
          style={{ gridTemplateColumns: `1fr ${ISLAND_WIDTH}px 1fr` }}
        >
          <span className="text-center">{time}</span>
          <span />
          <span className="flex justify-center">{icons}</span>
        </div>
      )}
      {kind === "classic" && (
        <div className="grid h-full grid-cols-3 items-center px-1.5 text-[12px]">
          <span className="flex items-center gap-1">
            <CellularIcon />
            <WifiIcon />
          </span>
          <span className="text-center">{time}</span>
          <span className="flex justify-end">
            <BatteryIcon level={battery} />
          </span>
        </div>
      )}
      {kind === "ipad" && (
        <div className="flex h-full items-center justify-between px-5 text-[12px]">
          <span>
            {time}
            <span className="ml-1.5 font-medium">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </span>
          {icons}
        </div>
      )}
      {kind === "android" && (
        <div
          className="flex h-full items-center justify-between px-5 text-[13px] font-medium"
          style={{ fontFamily: 'Roboto, "Google Sans", system-ui, sans-serif' }}
        >
          <span>{time}</span>
          <span className="flex items-center gap-1">
            <AndroidWifiIcon />
            <AndroidCellularIcon />
            <AndroidBatteryIcon level={battery} />
          </span>
        </div>
      )}
    </div>
  );
}

// Android draws its own, simpler glyphs.
function AndroidCellularIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
      <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
      <rect x="5" y="5" width="3" height="7" rx="1" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  );
}

function AndroidWifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
      <path d="M8 11.6 5.6 9.2a3.4 3.4 0 0 1 4.8 0Z" />
      <path d="M3.5 7.1a6.4 6.4 0 0 1 9 0l-1.4 1.4a4.4 4.4 0 0 0-6.2 0Z" />
      <path d="M1.4 5a9.4 9.4 0 0 1 13.2 0l-1.4 1.4a7.4 7.4 0 0 0-10.4 0Z" />
    </svg>
  );
}

function AndroidBatteryIcon({ level }: { level: number }) {
  const width = Math.max(1.5, (20 * level) / 100);
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" fill="currentColor">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="12"
        rx="3.8"
        fill="none"
        stroke="currentColor"
        opacity="0.4"
      />
      <rect
        x="2"
        y="2"
        width={width}
        height="9"
        rx={Math.min(2.5, width / 2)}
        fill={level <= LOW_BATTERY ? "#ff3b30" : "currentColor"}
      />
      <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" opacity="0.45" />
    </svg>
  );
}
