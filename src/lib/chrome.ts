/**
 * A file shipped with the extension, by its full address, which a website's page needs too when
 * the inline phone draws a frame image there.
 */
export function assetUrl(path: string): string {
  return typeof globalThis.chrome?.runtime?.getURL === "function"
    ? chrome.runtime.getURL(path)
    : `/${path}`;
}

export function logoUrl(): string {
  return assetUrl("icons/icon-128.png");
}
