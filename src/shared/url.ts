/**
 * Turns what someone typed into a URL a frame can load.
 *
 * Returns `""` for empty input and `null` for input that cannot be a URL. A bare host gets
 * `https://`, except localhost and IP addresses, which are almost always a local dev server.
 */
export function normalizeUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return "";
  if (value.startsWith("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(value)) {
    value = `http://${value}`;
  } else if (!/^[a-z]+:\/\//i.test(value) && !value.startsWith("//")) {
    value = `https://${value}`;
  }
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

/**
 * The page the simulator may go back to when it closes, or null. Anyone can link to the
 * simulator, so this keeps out `javascript:` and other extensions' pages.
 */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^(https?|file):\/\//i.test(url) || /^chrome:\/\/newtab\/?$/i.test(url) ? url : null;
}

/** Only web pages can be framed: not chrome://, not other extensions, not this one. */
export function isSimulatableUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
