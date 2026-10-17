type Rgba = { r: number; g: number; b: number; a: number };

/** Reads the `rgb()`/`rgba()` strings `getComputedStyle` hands back, in either syntax. */
export function parseRgb(css: string): Rgba | null {
  const match = /^rgba?\(([^)]+)\)$/i.exec(css.trim());
  if (!match) return null;
  const parts = match[1]!
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((part) => (part.endsWith("%") ? (parseFloat(part) / 100) * 255 : parseFloat(part)));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [r, g, b, a = 1] = parts as [number, number, number, number?];
  return { r, g, b, a: a > 1 ? a / 255 : a };
}

/** True where white text reads better than black, by the usual perceived-brightness weights. */
export function isDarkColor(css: string): boolean {
  const rgb = parseRgb(css);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 < 128;
}
