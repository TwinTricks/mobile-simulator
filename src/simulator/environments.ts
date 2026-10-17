import type { Device } from "@/shared/types";
import { normalizeUrl } from "@/shared/url";

/**
 * One device showing one site. Comparing sites shows each device once per site; otherwise
 * there is one pane per device, keyed by the device's id as before.
 */
export type Pane = { key: string; device: Device; origin: string | null };

export function panesFor(devices: readonly Device[], origins: readonly string[]): Pane[] {
  if (origins.length < 2)
    return devices.map((device) => ({ key: device.id, device, origin: null }));
  return devices.flatMap((device) =>
    origins.map((origin) => ({ key: `${device.id}@${origin}`, device, origin })),
  );
}

/** `url` with its scheme, host and port swapped for `origin`'s, keeping the path. */
export function onOrigin(url: string, origin: string | null): string {
  if (!origin || !url) return url;
  try {
    const from = new URL(url);
    return new URL(`${from.pathname}${from.search}${from.hash}`, origin).href;
  } catch {
    return url;
  }
}

/** The origin of what someone typed, or null when it isn't a web address. */
export function parseOrigin(input: string): string | null {
  const url = normalizeUrl(input);
  if (!url) return null;
  try {
    const { origin, protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

/** A short name for an origin: its host, with the port when there is one. */
export function originLabel(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

// Distinct enough side by side, and readable on either theme.
const ENV_COLORS = ["#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777", "#4f46e5"];

export function originColor(origins: readonly string[], origin: string): string {
  const index = Math.max(0, origins.indexOf(origin));
  return ENV_COLORS[index % ENV_COLORS.length]!;
}
