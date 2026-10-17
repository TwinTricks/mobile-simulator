import css from "@/styles/globals.css?inline";

const PROPERTY_RULE = /@property\s+[^{}]+\{[^{}]*\}/g;

/**
 * The simulator's stylesheet, made to work in a shadow root on someone else's page. Its theme
 * variables move from `:root` to the shadow host, and sizes in `rem` become pixels, because a
 * `rem` follows the page's root font size, which plenty of sites change.
 */
export function shadowStyles(): string {
  return css
    .replace(PROPERTY_RULE, "")
    .replace(/:root\b/g, ":host")
    .replace(/(-?\d*\.?\d+)rem\b/g, (_, n: string) => `${+(Number(n) * 16).toFixed(3)}px`);
}

/**
 * The `@property` rules Tailwind relies on. They only take effect in the document's own
 * stylesheets, and registering a property the page doesn't use changes nothing for the page.
 */
export function documentStyles(): string {
  return (css.match(PROPERTY_RULE) ?? []).join("\n");
}
