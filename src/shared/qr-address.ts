import { withoutInlineHash } from "@/shared/inline";

/** The page's address as someone else would open it, without the simulator's own markers. */
export function shareableUrl(href: string): string {
  try {
    const url = new URL(withoutInlineHash(href));
    url.searchParams.delete("__sim_device");
    return url.href;
  } catch {
    return href;
  }
}

/** The origin a phone host is remembered under; the address itself if it has none. */
export function originOf(href: string): string {
  try {
    return new URL(href).origin;
  } catch {
    return href;
  }
}

/** True for addresses only this computer can open, which a phone scanning the code can't reach. */
export function isLocalAddress(href: string): boolean {
  let host: string;
  try {
    host = new URL(href).hostname;
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host)
  );
}

/**
 * The address with its host swapped for one the phone can reach, such as `192.168.1.20:5173`.
 * Without a port, the address keeps its own. Returns null when `host` isn't a host.
 */
export function withHost(href: string, host: string): string | null {
  const trimmed = host
    .trim()
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/\/.*$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(href);
    const swapped = new URL(`${url.protocol}//${trimmed}`);
    url.hostname = swapped.hostname;
    if (swapped.port) url.port = swapped.port;
    return url.href;
  } catch {
    return null;
  }
}
