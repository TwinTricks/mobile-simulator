import type { InlineConfig } from "@/shared/inline";
import { setStatus } from "./status";

/**
 * The open phone is kept in the page's session storage, so it comes back after the page reloads,
 * as a development server's reload does. It is the site's storage, so everything read from it
 * is checked.
 */
const OPEN_KEY = "__msimInline";
const LAST_DEVICE_KEY = "__msimInlineDevice";

/** How long the phone must stay up before a reload brings it back. */
export const STABLE_MS = 1500;

type Saved = InlineConfig & { stable: boolean };

function read(): Saved | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? "null") as Partial<Saved> | null;
    if (!raw || typeof raw !== "object") return null;
    return {
      deviceId: typeof raw.deviceId === "string" ? raw.deviceId : null,
      rotated: raw.rotated === true,
      layout: raw.layout === "full" ? "full" : "dock",
      stable: raw.stable === true,
    };
  } catch {
    return null;
  }
}

/**
 * The phone to bring back after a reload. A page that reloaded before the phone had settled
 * most likely broke out of its frame (a "frame-busting" script sends the whole tab to the
 * frame's address), and bringing the phone back would only start that again.
 */
export function savedInline(): InlineConfig | null {
  const saved = read();
  if (!saved) return null;
  if (!saved.stable) {
    forgetInline();
    setStatus("blocked:frame-busting");
    return null;
  }
  const { stable: _stable, ...config } = saved;
  return config;
}

export function saveInline(config: InlineConfig, stable: boolean): void {
  try {
    sessionStorage.setItem(OPEN_KEY, JSON.stringify({ ...config, stable }));
    if (config.deviceId) sessionStorage.setItem(LAST_DEVICE_KEY, config.deviceId);
  } catch {
    // Storage the site turned off only means the phone doesn't come back after a reload.
  }
}

export function forgetInline(): void {
  try {
    sessionStorage.removeItem(OPEN_KEY);
  } catch {
    // As above.
  }
}

/** The device shown last in this tab, which the phone opens on when none is asked for. */
export function lastInlineDevice(): string | null {
  try {
    return sessionStorage.getItem(LAST_DEVICE_KEY);
  } catch {
    return null;
  }
}
