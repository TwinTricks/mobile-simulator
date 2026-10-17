/**
 * What the inline phone is doing, on `<html data-mobile-sim>`, for testing tools to wait on:
 * `loading`, `ready`, `closed`, `disabled` (turned off in Settings), `not-allowed` (the site
 * isn't on the list), `blocked:framing` (the page refused to load in a frame) or
 * `blocked:frame-busting` (the page broke out of its frame).
 */
export type InlineStatus =
  | "loading"
  | "ready"
  | "closed"
  | "disabled"
  | "not-allowed"
  | "blocked:framing"
  | "blocked:frame-busting";

export function setStatus(status: InlineStatus): void {
  document.documentElement.dataset.mobileSim = status;
}
