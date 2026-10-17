/** Puts the shadow host on the page. Everything is `!important`, so the page's styles lose. */
export function placeHost(host: HTMLElement, box: Record<string, string | number>): void {
  const rules = {
    all: "initial",
    position: "fixed",
    "z-index": 2147483647,
    display: "block",
    ...box,
  };
  host.setAttribute(
    "style",
    Object.entries(rules)
      .map(
        ([name, value]) =>
          `${name}:${typeof value === "number" && name !== "z-index" ? `${value}px` : value}!important`,
      )
      .join(";"),
  );
}
