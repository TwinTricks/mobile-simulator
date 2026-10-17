/** Tailwind's default breakpoints, the ones most sites are built against. */
export const BREAKPOINTS = [
  { name: "2xl", min: 1536 },
  { name: "xl", min: 1280 },
  { name: "lg", min: 1024 },
  { name: "md", min: 768 },
  { name: "sm", min: 640 },
] as const;

/** The largest breakpoint a viewport `width` CSS pixels wide is at, or `xs` below them all. */
export function breakpointFor(width: number): string {
  return BREAKPOINTS.find((b) => width >= b.min)?.name ?? "xs";
}
