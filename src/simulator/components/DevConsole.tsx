import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Ban, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Device } from "@/shared/types";
import { formatBytes, type LogEntry, type LogLevel, type RequestEntry } from "../devtools";

type Tab = "console" | "network";

const MIN_HEIGHT = 140;
const DEFAULT_HEIGHT = 260;

const LEVEL_STYLE: Record<LogLevel, string> = {
  log: "",
  debug: "text-muted-foreground",
  info: "text-sky-700 dark:text-sky-300",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  error: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  sync: "text-primary",
};

type DevConsoleProps = {
  devices: readonly Device[];
  logs: readonly LogEntry[];
  requests: readonly RequestEntry[];
  onClear: () => void;
  onClose: () => void;
};

function time(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DevConsole({ devices, logs, requests, onClear, onClose }: DevConsoleProps) {
  const [tab, setTab] = useState<Tab>("console");
  const [chosenDevice, setDeviceId] = useState<string>("all");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const listRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);

  const names = new Map(devices.map((d) => [d.id, d.name]));
  const several = devices.length > 1;
  // A device taken off the stage stops filtering the list.
  const deviceId = names.has(chosenDevice) ? chosenDevice : "all";
  const needle = query.trim().toLowerCase();
  const pick = (entryDevice: string) => deviceId === "all" || entryDevice === deviceId;

  const shownLogs = logs.filter(
    (l) =>
      pick(l.deviceId) &&
      (!errorsOnly || l.level === "error" || l.level === "warn") &&
      (!needle || l.text.toLowerCase().includes(needle)),
  );
  const shownRequests = requests.filter(
    (r) =>
      pick(r.deviceId) &&
      (!errorsOnly || r.failed) &&
      (!needle || r.url.toLowerCase().includes(needle)),
  );
  const errorCount = logs.filter((l) => l.level === "error").length;
  const failedCount = requests.filter((r) => r.failed).length;
  const count = tab === "console" ? shownLogs.length : shownRequests.length;

  // Follows new lines while scrolled to the bottom, and stays put while reading further up.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stuck.current) list.scrollTop = list.scrollHeight;
  }, [count, tab]);

  function startResize(event: PointerEvent) {
    const startY = event.clientY;
    const startHeight = height;
    const max = window.innerHeight * 0.7;
    const move = (e: globalThis.PointerEvent) =>
      setHeight(Math.min(max, Math.max(MIN_HEIGHT, startHeight + startY - e.clientY)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section
      aria-label="Console"
      className="border-border/70 bg-card relative flex shrink-0 flex-col border-t text-xs"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize console"
        onPointerDown={startResize}
        className="hover:bg-primary/30 absolute inset-x-0 -top-1 h-2 cursor-row-resize"
      />
      <header className="border-border/60 flex h-9 shrink-0 items-center gap-1 border-b px-2">
        {(["console", "network"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium capitalize",
              tab === value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
            {value === "console" && errorCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[0.625rem] text-white">
                {errorCount}
              </span>
            )}
            {value === "network" && failedCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[0.625rem] text-white">
                {failedCount}
              </span>
            )}
          </button>
        ))}
        <span className="bg-border/80 mx-1 h-4 w-px" aria-hidden />
        <label className="border-border/70 bg-background flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2 sm:max-w-56">
          <Search className="text-muted-foreground size-3 shrink-0" aria-hidden />
          <input
            aria-label="Filter"
            placeholder={tab === "console" ? "Filter messages" : "Filter addresses"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        {several && (
          <select
            aria-label="Device"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="border-border/70 bg-background h-6 max-w-40 rounded-md border px-1.5"
          >
            <option value="all">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <label className="text-muted-foreground flex items-center gap-1.5 px-1.5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(e) => setErrorsOnly(e.target.checked)}
            className="accent-primary"
          />
          {tab === "console" ? "Problems only" : "Failed only"}
        </label>
        <div className="flex-1" />
        <button
          type="button"
          data-tip="Clear"
          aria-label="Clear console"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1"
        >
          <Ban className="size-3.5" />
        </button>
        <button
          type="button"
          data-tip="Close"
          aria-label="Close console"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 scrollbar-thin overflow-auto font-mono text-[0.6875rem]"
      >
        {count === 0 ? (
          <p className="text-muted-foreground p-4 text-center font-sans">
            {tab === "console"
              ? "Nothing logged yet. Pages' console messages and errors show up here."
              : "No requests yet. Reload the page to see everything it loads."}
          </p>
        ) : tab === "console" ? (
          shownLogs.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "border-border/50 flex gap-2 border-b px-2 py-1",
                LEVEL_STYLE[entry.level],
              )}
            >
              <span className="text-muted-foreground shrink-0 tabular-nums">{time(entry.at)}</span>
              {several && (
                <span className="text-muted-foreground w-24 shrink-0 truncate font-sans">
                  {names.get(entry.deviceId) ?? entry.deviceId}
                </span>
              )}
              <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{entry.text}</span>
            </div>
          ))
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-card text-muted-foreground sticky top-0 font-sans">
              <tr className="border-border/60 border-b text-left">
                <th className="w-14 px-2 py-1 font-medium">Status</th>
                <th className="w-14 px-2 py-1 font-medium">Method</th>
                <th className="px-2 py-1 font-medium">Address</th>
                {several && <th className="w-28 px-2 py-1 font-medium">Device</th>}
                <th className="w-20 px-2 py-1 font-medium">Type</th>
                <th className="w-16 px-2 py-1 text-right font-medium">Size</th>
                <th className="w-16 px-2 py-1 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {shownRequests.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-border/50 border-b",
                    r.failed && "text-red-700 dark:text-red-300",
                  )}
                >
                  <td className="px-2 py-1 tabular-nums">{r.status || (r.failed ? "ERR" : "–")}</td>
                  <td className="px-2 py-1">{r.method}</td>
                  <td className="truncate px-2 py-1" data-tip={r.url}>
                    {r.url.replace(/^https?:\/\//, "")}
                  </td>
                  {several && (
                    <td className="text-muted-foreground truncate px-2 py-1 font-sans">
                      {names.get(r.deviceId) ?? r.deviceId}
                    </td>
                  )}
                  <td className="text-muted-foreground truncate px-2 py-1">{r.type}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatBytes(r.size)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{Math.round(r.ms)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
