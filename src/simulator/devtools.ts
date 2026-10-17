// The pages' side of these messages is devtoolsBridge in src/content/mobile-identity.ts.

export type LogLevel = "log" | "info" | "warn" | "error" | "debug" | "sync";

export type LogEntry = { id: number; deviceId: string; level: LogLevel; text: string; at: number };

export type RequestEntry = {
  id: number;
  deviceId: string;
  method: string;
  url: string;
  status: number;
  type: string;
  ms: number;
  size: number;
  at: number;
  failed: boolean;
};

/** Older lines are dropped past this many, in each list. */
export const MAX_ENTRIES = 500;

const LEVELS = new Set<string>(["log", "info", "warn", "error", "debug"]);

let nextId = 1;

/** The logs and requests in a page's report, tagged with the device it came from. */
export function readDevReport(
  data: unknown,
  deviceId: string,
): { logs: LogEntry[]; requests: RequestEntry[] } | null {
  const report = (data as { __msimDev?: { logs?: unknown; requests?: unknown } } | null)?.__msimDev;
  if (!report || !Array.isArray(report.logs) || !Array.isArray(report.requests)) return null;
  const logs: LogEntry[] = [];
  for (const raw of report.logs as Record<string, unknown>[]) {
    if (typeof raw?.text !== "string" || typeof raw.level !== "string" || !LEVELS.has(raw.level)) {
      continue;
    }
    logs.push({
      id: nextId++,
      deviceId,
      level: raw.level as LogLevel,
      text: raw.text.slice(0, 4000),
      at: typeof raw.at === "number" ? raw.at : Date.now(),
    });
  }
  const requests: RequestEntry[] = [];
  for (const raw of report.requests as Record<string, unknown>[]) {
    if (typeof raw?.url !== "string") continue;
    requests.push({
      id: nextId++,
      deviceId,
      method: typeof raw.method === "string" ? raw.method.slice(0, 10) : "GET",
      url: raw.url.slice(0, 2000),
      status: typeof raw.status === "number" ? raw.status : 0,
      type: typeof raw.type === "string" ? raw.type.slice(0, 20) : "other",
      ms: typeof raw.ms === "number" ? raw.ms : 0,
      size: typeof raw.size === "number" ? raw.size : 0,
      at: typeof raw.at === "number" ? raw.at : Date.now(),
      failed: raw.failed === true,
    });
  }
  return { logs, requests };
}

export function syncMissEntry(deviceId: string, what: string): LogEntry {
  return {
    id: nextId++,
    deviceId,
    level: "sync",
    text: `Sync couldn't find “${what}” on this device, so it was skipped.`,
    at: Date.now(),
  };
}

/** `list` with `more` on the end, keeping only the newest `MAX_ENTRIES`. */
export function appendCapped<T>(list: readonly T[], more: readonly T[]): T[] {
  if (more.length === 0) return list as T[];
  const next = [...list, ...more];
  return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
