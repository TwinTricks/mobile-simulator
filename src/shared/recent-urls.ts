export const MAX_RECENT_URLS = 15;

/** `url` moved to the front of the list, without repeats, and the list cut to its limit. */
export function rememberUrl(list: readonly string[], url: string): string[] {
  return [url, ...list.filter((u) => u !== url)].slice(0, MAX_RECENT_URLS);
}

/** Local dev servers worth a button of their own. */
export const QUICK_URLS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:4200",
] as const;
