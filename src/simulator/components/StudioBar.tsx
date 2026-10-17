import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ban, ChevronDown, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RecordRatio, RecordingSettings } from "@/shared/types";
import { RECORD_CURSORS, cursorUrl, findCursor } from "../recording/cursors";

const OFF = "__off";
const DEFAULT = "__default";

const SIZES: [RecordRatio, string][] = [
  ["auto", "Auto"],
  ["16:9", "16:9"],
  ["4:3", "4:3"],
  ["1:1", "1:1"],
  ["9:16", "9:16"],
  ["custom", "Custom"],
];

/** The cameras or microphones there are, named as Chrome names them once it may. */
function useMediaDevices(kind: "videoinput" | "audioinput"): { id: string; label: string }[] {
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices) return;
    const read = () =>
      void media.enumerateDevices().then((all) => {
        const found = all.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== "default");
        const noun = kind === "videoinput" ? "Camera" : "Microphone";
        setDevices(found.map((d, i) => ({ id: d.deviceId, label: d.label || `${noun} ${i + 1}` })));
      });
    read();
    media.addEventListener("devicechange", read);
    return () => media.removeEventListener("devicechange", read);
  }, [kind]);
  return devices;
}

/** The recording studio's controls along the bottom of the stage. */
export function StudioBar({
  options,
  onOptions,
  message,
  onStart,
  onClose,
}: {
  options: RecordingSettings;
  onOptions: (patch: Partial<RecordingSettings>) => void;
  /** A line under the controls: why the camera is missing, or what Chrome will ask. */
  message: ReactNode;
  onStart: () => void;
  onClose: () => void;
}) {
  const cameras = useMediaDevices("videoinput");
  const microphones = useMediaDevices("audioinput");
  const camera = !options.camera ? OFF : options.cameraId || DEFAULT;
  const microphone = !options.microphone ? OFF : options.microphoneId || DEFAULT;
  const bar = useRef<HTMLDivElement>(null);

  // The stage and side panels stop short of the bar, so it covers neither. Kept while recording,
  // when the bar is gone, so the devices don't move as the video starts.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--studio-bar", `${el.offsetHeight + 16}px`),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="Recording studio"
      onClick={(e) => e.stopPropagation()}
      className="dark animate-in fade-in slide-in-from-bottom-2 fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-6rem)] -translate-x-[calc(50%+2rem)] rounded-2xl border border-white/10 bg-zinc-900/90 px-3.5 pt-2.5 pb-3 text-white shadow-2xl backdrop-blur-xl duration-200"
    >
      <div className="flex flex-wrap items-end gap-3">
        <BarField label="Camera">
          <Select
            value={camera}
            onValueChange={(value) =>
              onOptions(
                value === OFF
                  ? { camera: false }
                  : { camera: true, cameraId: value === DEFAULT ? "" : value },
              )
            }
          >
            <SelectTrigger aria-label="Camera" className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OFF}>Off</SelectItem>
              {cameras.length === 0 && <SelectItem value={DEFAULT}>Camera</SelectItem>}
              {cameras.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BarField>

        <BarField label="Microphone">
          <Select
            value={microphone}
            onValueChange={(value) =>
              onOptions(
                value === OFF
                  ? { microphone: false }
                  : { microphone: true, microphoneId: value === DEFAULT ? "" : value },
              )
            }
          >
            <SelectTrigger aria-label="Microphone" className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OFF}>Off</SelectItem>
              {microphones.length === 0 && <SelectItem value={DEFAULT}>Microphone</SelectItem>}
              {microphones.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BarField>

        <BarField label="Size">
          <div
            role="group"
            aria-label="Video size"
            className="flex h-9 items-center rounded-lg border border-white/10 bg-white/5 p-0.5"
          >
            {SIZES.map(([ratio, label]) => (
              <button
                key={ratio}
                type="button"
                aria-pressed={options.ratio === ratio}
                onClick={() => onOptions({ ratio })}
                className={cn(
                  "h-full rounded-md px-2.5 text-xs font-semibold transition-colors",
                  options.ratio === ratio
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </BarField>

        <BarField label="Cursor">
          <CursorPicker value={options.cursor} onChange={(cursor) => onOptions({ cursor })} />
        </BarField>

        <button
          type="button"
          onClick={onStart}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors"
        >
          <span className="size-2 rounded-full bg-red-500 ring-2 ring-white/70" aria-hidden />
          Start
        </button>
        <button
          type="button"
          aria-label="Close the studio"
          data-tip="Close the studio"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
      {message && <div className="mt-2 max-w-xl text-[0.6875rem] leading-snug">{message}</div>}
    </div>
  );
}

const TRIGGER =
  "h-9 w-40 border-white/10 bg-white/5 text-[0.8125rem] text-white hover:bg-white/10 data-[placeholder]:text-white/60 [&_svg]:text-white/60";

function BarField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.625rem] font-semibold tracking-wider text-white/55 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function CursorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = findCursor(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Recording cursor: ${current?.label ?? "None"}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg border bg-white/5 px-2.5 transition-colors hover:bg-white/10",
          open ? "border-primary" : "border-white/10",
        )}
      >
        {current ? (
          <img src={cursorUrl(current)} alt="" className="size-5" />
        ) : (
          <Ban className="size-4 text-white/70" />
        )}
        <ChevronDown className="size-3.5 text-white/60" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Recording cursor"
          className="animate-in fade-in zoom-in-95 absolute bottom-full left-1/2 mb-3 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <p className="text-[0.8125rem] font-semibold">Recording cursor</p>
          <p className="mb-2.5 text-[0.6875rem] text-white/55">
            Drawn into the video, since Chrome leaves the real one out.
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            <CursorTile label="None" picked={!current} onClick={() => onChange("none")}>
              <Ban className="size-4 text-white/70" />
            </CursorTile>
            {RECORD_CURSORS.map((c) => (
              <CursorTile
                key={c.id}
                label={c.label}
                picked={current?.id === c.id}
                onClick={() => onChange(c.id)}
              >
                <img src={cursorUrl(c)} alt="" className="size-6" />
              </CursorTile>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CursorTile({
  label,
  picked,
  onClick,
  children,
}: {
  label: string;
  picked: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} cursor`}
      aria-pressed={picked}
      data-tip={label}
      onClick={onClick}
      className={cn(
        "flex aspect-square items-center justify-center rounded-lg border bg-white/5 transition-colors hover:bg-white/10",
        picked ? "border-primary ring-primary/40 ring-2" : "border-white/10",
      )}
    >
      {children}
    </button>
  );
}
