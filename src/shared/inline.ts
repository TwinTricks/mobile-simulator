/**
 * The inline phone: a device drawn inside a website's own page, showing that page in a
 * same-origin frame. The site keeps its cookies and login, and testing tools that can't reach
 * extension pages can drive it.
 */

/** Sites it opens on unless the user changes the list: local development hosts. */
export const DEFAULT_INLINE_HOSTS = ["localhost", "127.0.0.1", "*.localhost", "*.test"];

export type InlineLayout = "dock" | "full";

export type InlineConfig = {
  /** Null keeps the device used last. */
  deviceId: string | null;
  rotated: boolean;
  layout: InlineLayout;
};

const HASH = /^#mobile-sim(?:=(.*))?$/;

/**
 * What `#mobile-sim`, `#mobile-sim=pixel-8,landscape,full` or `#mobile-sim=off` in an address
 * asks for. `undefined` when the hash isn't ours, `null` for off.
 */
export function readInlineHash(hash: string): InlineConfig | null | undefined {
  let decoded = hash;
  try {
    decoded = decodeURIComponent(hash);
  } catch {
    // Kept as it was.
  }
  const match = HASH.exec(decoded);
  if (!match) return undefined;
  return parseInlineSpec(match[1] ?? "");
}

/** Parts in any order; anything unknown is left out. A device id is anything else. */
export function parseInlineSpec(spec: string): InlineConfig | null {
  if (spec.trim().toLowerCase() === "off") return null;
  const config: InlineConfig = { deviceId: null, rotated: false, layout: "dock" };
  for (const raw of spec.split(",")) {
    const part = raw.trim().toLowerCase();
    if (!part) continue;
    if (part === "portrait") config.rotated = false;
    else if (part === "landscape") config.rotated = true;
    else if (part === "dock" || part === "full") config.layout = part;
    else if (/^[a-z0-9-]{1,60}$/.test(part)) config.deviceId = part;
  }
  return config;
}

/** The page's address without our trigger, which the phone loads and the site's router sees. */
export function withoutInlineHash(href: string): string {
  try {
    const url = new URL(href);
    if (readInlineHash(url.hash) !== undefined) url.hash = "";
    return url.href;
  } catch {
    return href;
  }
}

/** `*.test` matches any host under `test`, but not `test` itself. */
export function hostAllowed(hostname: string, patterns: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  return patterns.some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) return false;
    if (pattern.startsWith("*.")) return host.endsWith(pattern.slice(1));
    return host === pattern;
  });
}

/** The hosts typed into Settings, one per line or separated by commas, without repeats. */
export function parseHostList(text: string): string[] {
  const hosts = text
    .split(/[\s,]+/)
    .map((host) => host.trim().toLowerCase())
    .filter((host) => /^(\*\.)?[a-z0-9.-]+$/.test(host));
  return [...new Set(hosts)];
}
