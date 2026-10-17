// The pages' side of these messages is interactionSync in src/content/mobile-identity.ts.

/** Ways to find the element a click or keystroke went to in another device's copy of the page. */
export type SyncTarget = { selectors: string[]; tag: string; text: string; link: boolean };

export type SyncAction =
  | { kind: "click"; target: SyncTarget }
  | { kind: "check"; target: SyncTarget; checked: boolean }
  | { kind: "value"; target: SyncTarget; value: string };

/** A page's new address; `soft` when the page changed it without loading a new document. */
export type NavReport = { url: string; soft: boolean };

function isTarget(value: unknown): value is SyncTarget {
  const t = value as SyncTarget | null;
  return (
    typeof t === "object" &&
    t !== null &&
    Array.isArray(t.selectors) &&
    t.selectors.every((s) => typeof s === "string") &&
    typeof t.tag === "string" &&
    typeof t.text === "string" &&
    typeof t.link === "boolean"
  );
}

export function readSyncAction(data: unknown): SyncAction | null {
  const act = (data as { __msimAct?: Record<string, unknown> } | null)?.__msimAct;
  if (!act || !isTarget(act.target)) return null;
  if (act.kind === "click") return { kind: "click", target: act.target };
  if (act.kind === "check" && typeof act.checked === "boolean") {
    return { kind: "check", target: act.target, checked: act.checked };
  }
  if (act.kind === "value" && typeof act.value === "string") {
    return { kind: "value", target: act.target, value: act.value };
  }
  return null;
}

export function readNavReport(data: unknown): NavReport | null {
  const nav = (data as { __msimNav?: Record<string, unknown> } | null)?.__msimNav;
  if (!nav || typeof nav.url !== "string" || typeof nav.soft !== "boolean") return null;
  return /^https?:\/\//.test(nav.url) ? { url: nav.url, soft: nav.soft } : null;
}

/** What a page reports when a synced action finds nothing to act on. */
export function readMissed(data: unknown): string | null {
  const missed = (data as { __msimActMissed?: unknown } | null)?.__msimActMissed;
  return typeof missed === "string" ? missed : null;
}

export type SyncOptions = { clicks: boolean; input: boolean; navigation: boolean };

/** Whether an action is passed on. A link click is left to navigation sync when that is on. */
export function shouldRelay(action: SyncAction, options: SyncOptions): boolean {
  if (action.kind === "click") {
    return options.clicks && !(action.target.link && options.navigation);
  }
  return options.input;
}

const LOOP_WINDOW_MS = 10_000;
const LOOP_LIMIT = 6;

/**
 * Decides which reported addresses go to the other devices. The others report the same address
 * back once they get there, which is skipped; addresses changing faster than anyone clicks mean
 * two pages are bouncing each other, and sync should stop.
 */
export function createNavRelay(now: () => number = Date.now) {
  let last = "";
  let times: number[] = [];
  return {
    next(url: string): "relay" | "skip" | "loop" {
      if (url === last) return "skip";
      const t = now();
      times = times.filter((at) => t - at < LOOP_WINDOW_MS);
      if (times.length >= LOOP_LIMIT) return "loop";
      times.push(t);
      last = url;
      return "relay";
    },
    /** Called when the address is changed from the simulator, which every device loads anyway. */
    reset(url = "") {
      last = url;
      times = [];
    },
  };
}
