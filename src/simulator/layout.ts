import type { Settings } from "@/shared/types";

export type Layout = Settings["layout"];

export const LAYOUT_OPTIONS: [Layout, string][] = [
  ["wrap", "Rows that wrap"],
  ["row", "One row, side by side"],
  ["column", "One column, stacked"],
  ["focus", "One big, the rest small"],
];

/** Moves `id` to just before or just after `target`. Unknown ids leave the list as it was. */
export function moveId(
  ids: readonly string[],
  id: string,
  target: string,
  after: boolean,
): string[] {
  if (id === target || !ids.includes(id) || !ids.includes(target)) return [...ids];
  const rest = ids.filter((x) => x !== id);
  const at = rest.indexOf(target) + (after ? 1 : 0);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}
