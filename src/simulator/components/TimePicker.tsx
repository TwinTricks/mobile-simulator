import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { BatteryIcon, CellularIcon, WifiIcon } from "./status-icons";

/** Height of one row on a wheel; the wheel shows five, the middle one picked. */
const ROW = 32;
const WIDTH = 288;
const HOUR12 =
  new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 ?? false;

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = HOUR12
  ? ["12", ...Array.from({ length: 11 }, (_, i) => String(i + 1))]
  : Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const PERIODS = ["AM", "PM"];

type Parts = { hour: number; minute: number };

function parse(value: string): Parts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

const format = ({ hour, minute }: Parts) => `${pad(hour)}:${pad(minute)}`;

function nowParts(): Parts {
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

/** As the phone's clock shows it: "9:41", or "21:41" on a 24-hour clock. */
function clockText({ hour, minute }: Parts): string {
  return HOUR12 ? `${hour % 12 || 12}:${pad(minute)}` : `${hour}:${pad(minute)}`;
}

const QUICK: { label: string; tip: string; value: () => string }[] = [
  { label: "9:41", tip: "The time on every iPhone in Apple's photos", value: () => "09:41" },
  { label: "Now", tip: "Pin the time it is now", value: () => format(nowParts()) },
  { label: "Noon", tip: "12:00", value: () => "12:00" },
];

/**
 * The time the status bar shows: "Live" follows the real clock, or a pinned "HH:MM" picked on
 * wheels like the phone's own, with the status bar above them showing the pick as it turns.
 */
export function TimePicker({
  id,
  value,
  battery,
  disabled,
  onChange,
}: {
  id: string;
  /** "HH:MM", or empty for the real time. */
  value: string;
  battery: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pinned = parse(value);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Force the time shown: ${pinned ? clockText(pinned) : "Live"}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "border-input bg-card focus-visible:ring-ring/50 flex h-9 min-w-28 items-center gap-2 rounded-[8px] border pr-2 pl-2.5 text-[0.8125rem] outline-none focus-visible:ring-2 disabled:pointer-events-none",
          open && "border-primary ring-primary/20 ring-2",
        )}
      >
        {pinned ? (
          <span className="flex items-baseline gap-1 font-semibold tabular-nums">
            {clockText(pinned)}
            {HOUR12 && (
              <span className="text-muted-foreground text-[0.625rem] font-medium">
                {pinned.hour < 12 ? "AM" : "PM"}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
        <ChevronDown className="text-muted-foreground ml-auto size-3.5" />
      </button>
      {open &&
        createPortal(
          <TimePopover
            anchor={trigger}
            value={pinned}
            battery={battery}
            onChange={onChange}
            onClose={(refocus) => {
              setOpen(false);
              if (refocus) trigger.current?.focus();
            }}
          />,
          document.body,
        )}
    </>
  );
}

function TimePopover({
  anchor,
  value,
  battery,
  onChange,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  value: Parts | null;
  battery: number;
  onChange: (value: string) => void;
  onClose: (refocus: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  // Live opens on the time it is now, and pins only once a wheel turns. Held here as well, so
  // the wheels answer at once rather than after the setting is saved.
  const [shown, setShown] = useState<Parts>(() => value ?? nowParts());
  const saved = value ? format(value) : "";
  useEffect(() => {
    const next = parse(saved);
    if (next) setShown((current) => (format(current) === saved ? current : next));
  }, [saved]);
  const pick = (next: Parts) => {
    setShown(next);
    onChange(format(next));
  };

  useLayoutEffect(() => {
    const update = () => {
      const box = anchor.current?.getBoundingClientRect();
      if (!box) return;
      const height = root.current?.offsetHeight ?? 360;
      let top = box.bottom + 8;
      if (top + height > window.innerHeight - 8) top = Math.max(8, box.top - height - 8);
      const left = Math.min(Math.max(8, box.right - WIDTH), window.innerWidth - WIDTH - 8);
      setPlace({ top, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !anchor.current?.contains(target)) onClose(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose(true);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  const hourIndex = HOUR12 ? shown.hour % 12 : shown.hour;
  const setHour = (index: number) =>
    pick({ ...shown, hour: HOUR12 ? index + (shown.hour >= 12 ? 12 : 0) : index });

  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Time shown on the status bar"
      className="bg-popover text-popover-foreground animate-in fade-in zoom-in-95 fixed z-[60] rounded-2xl border p-3 shadow-2xl duration-150"
      style={{ width: WIDTH, top: place?.top ?? -9999, left: place?.left ?? 0 }}
    >
      <StatusPreview time={clockText(shown)} live={!value} battery={battery} />

      <div className="relative mt-3 flex justify-center gap-1">
        <div
          aria-hidden
          className="bg-primary/10 ring-primary/20 pointer-events-none absolute inset-x-0 rounded-lg ring-1"
          style={{ top: ROW * 2, height: ROW }}
        />
        <Wheel label="Hour" values={HOURS} index={hourIndex} onChange={setHour} />
        <span
          aria-hidden
          className="text-muted-foreground flex items-center text-lg font-semibold"
          style={{ height: ROW * 5 }}
        >
          :
        </span>
        <Wheel
          label="Minute"
          values={MINUTES}
          index={shown.minute}
          onChange={(minute) => pick({ ...shown, minute })}
        />
        {HOUR12 && (
          <Wheel
            label="AM or PM"
            values={PERIODS}
            index={shown.hour >= 12 ? 1 : 0}
            onChange={(period) => pick({ ...shown, hour: (shown.hour % 12) + period * 12 })}
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {QUICK.map((quick) => {
          const next = quick.value();
          const active = !!value && format(value) === next && quick.label !== "Now";
          return (
            <button
              key={quick.label}
              type="button"
              data-tip={quick.tip}
              aria-pressed={active}
              onClick={() => pick(parse(next)!)}
              className={cn(
                "h-7 flex-1 rounded-full border text-xs font-medium tabular-nums transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent border-border",
              )}
            >
              {quick.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={!value}
          data-tip="Follow the real clock"
          onClick={() => {
            setShown(nowParts());
            onChange("");
          }}
          className={cn(
            "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition-colors",
            !value
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "hover:bg-accent border-border",
          )}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live
        </button>
      </div>
    </div>
  );
}

/** The top of a phone, its clock showing the time being picked. */
function StatusPreview({ time, live, battery }: { time: string; live: boolean; battery: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 px-4 pt-2.5 pb-2 text-white shadow-inner">
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center"
        style={{ fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif' }}
      >
        <span
          aria-live="polite"
          className="text-[15px] font-semibold tracking-[-0.3px] tabular-nums"
        >
          {time}
        </span>
        <span className="h-[22px] w-[74px] rounded-full bg-black ring-1 ring-white/5" />
        <span className="flex items-center justify-end gap-[5px] [&_svg]:h-[10px] [&_svg]:w-auto">
          <CellularIcon />
          <WifiIcon />
          <BatteryIcon level={battery} />
        </span>
      </div>
      <p className="mt-2 text-center text-[0.625rem] text-white/50">
        {live ? "Live: follows the real clock. Turn a wheel to pin it." : "Pinned on every device"}
      </p>
    </div>
  );
}

/** A drum of values that scrolls and snaps like the phone's own picker. */
function Wheel({
  label,
  values,
  index,
  onChange,
}: {
  label: string;
  values: string[];
  index: number;
  onChange: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const latest = useRef({ index, onChange });
  latest.current = { index, onChange };
  const frame = useRef(0);
  // Set while the wheel turns itself to a value, so where it passes isn't taken as a pick.
  const turning = useRef(false);

  const paint = () => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollTop;
    [...el.children].forEach((child, i) => {
      const distance = (i * ROW - top) / ROW;
      const away = Math.min(Math.abs(distance), 3);
      const item = child as HTMLElement;
      item.style.transform = `perspective(320px) rotateX(${-distance * 22}deg) scale(${1 - away * 0.07})`;
      item.style.opacity = String(Math.max(0.12, 1 - away * 0.34));
    });
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) !== index) {
      turning.current = placed.current;
      el.scrollTo({ top: index * ROW, behavior: placed.current ? "smooth" : "instant" });
    }
    placed.current = true;
    paint();
  }, [index]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // Picked where the wheel comes to rest, so a spin doesn't pin every value on its way.
    const settle = () => {
      const next = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (turning.current) {
        turning.current = false;
        // Stopped short of its value: turn on to it.
        if (next !== latest.current.index) {
          turning.current = true;
          el.scrollTo({ top: latest.current.index * ROW, behavior: "smooth" });
        }
        return;
      }
      if (next !== latest.current.index) latest.current.onChange(next);
    };
    // A hand on the wheel takes over from its own turning.
    const grab = () => {
      turning.current = false;
    };
    el.addEventListener("scrollend", settle);
    el.addEventListener("wheel", grab, { passive: true });
    el.addEventListener("pointerdown", grab);
    el.addEventListener("touchstart", grab, { passive: true });
    return () => {
      el.removeEventListener("scrollend", settle);
      el.removeEventListener("wheel", grab);
      el.removeEventListener("pointerdown", grab);
      el.removeEventListener("touchstart", grab);
      cancelAnimationFrame(frame.current);
    };
  }, [values.length]);

  const step = (by: number) => onChange(Math.min(values.length - 1, Math.max(0, index + by)));
  const onKeyDown = (event: ReactKeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowUp: () => step(-1),
      ArrowDown: () => step(1),
      PageUp: () => step(-5),
      PageDown: () => step(5),
      Home: () => onChange(0),
      End: () => onChange(values.length - 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  return (
    <div
      ref={scroller}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={values.length - 1}
      aria-valuenow={index}
      aria-valuetext={values[index]}
      onKeyDown={onKeyDown}
      onScroll={() => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(paint);
      }}
      className="focus-visible:ring-ring/50 relative w-14 snap-y snap-mandatory [scrollbar-width:none] overflow-y-scroll rounded-lg outline-none focus-visible:ring-2 [&::-webkit-scrollbar]:hidden"
      style={{
        height: ROW * 5,
        paddingBlock: ROW * 2,
        maskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)",
      }}
    >
      {values.map((text, i) => (
        <button
          key={text}
          type="button"
          tabIndex={-1}
          onClick={() => onChange(i)}
          className={cn(
            "flex w-full snap-center items-center justify-center text-[1.0625rem] tabular-nums will-change-transform",
            i === index ? "text-foreground font-semibold" : "text-muted-foreground",
          )}
          style={{ height: ROW }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
