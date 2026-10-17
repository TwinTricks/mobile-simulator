import type { RecordQuality, RecordRatio, RecordingSettings } from "@/shared/types";
import { findWallpaper } from "./wallpapers";

export type Rect = { left: number; top: number; width: number; height: number };

/** Space around the devices in a studio video, as a share of their longer side. */
export const STUDIO_PADDING = 0.08;
/** The camera bubble's width, as a share of the shorter side of what is recorded. */
const BUBBLE_SIZE = 0.24;
const BUBBLE_INSET = 0.04;
const MIN_BUBBLE = 72;
const MAX_BUBBLE = 220;

export const QUALITY: Record<RecordQuality, { frameRate: number; bitsPerPixel: number }> = {
  good: { frameRate: 30, bitsPerPixel: 4 },
  high: { frameRate: 60, bitsPerPixel: 8 },
  best: { frameRate: 60, bitsPerPixel: 14 },
};

const RATIOS: Record<Exclude<RecordRatio, "auto" | "custom">, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

/** Whether the video is framed by the simulator: a backdrop behind the devices or a set shape. */ export function isStudio(
  options: Pick<RecordingSettings, "backdrop" | "ratio">,
): boolean {
  return options.backdrop !== "none" || options.ratio !== "auto";
}

/** The CSS background of the backdrop, or null to leave the stage as it is. */
export function backdropCss(
  options: Pick<RecordingSettings, "backdrop" | "backdropColor">,
): string | null {
  if (options.backdrop === "none") return null;
  if (options.backdrop === "solid") return options.backdropColor;
  return findWallpaper(options.backdrop)?.css ?? null;
}

/** A plain colour of the backdrop, for bars the video may need around it. */
export function backdropColor(
  options: Pick<RecordingSettings, "backdrop" | "backdropColor">,
): string | null {
  if (options.backdrop === "none") return null;
  if (options.backdrop === "solid") return options.backdropColor;
  return findWallpaper(options.backdrop)?.base ?? null;
}

export function unionRect(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}

export type BoxEdges = { left: number; top: number; right: number; bottom: number };

/**
 * The part of the stage a studio video shows: `content` with room around it, grown to `ratio`
 * about its middle, and kept inside `bounds` since only what is on screen can be recorded.
 * `size` (40 to 100) is how much of the video the devices fill; a custom box has its own edges.
 */
export function studioBox(
  content: Rect,
  ratio: RecordRatio,
  bounds: Rect,
  { size = 100, custom }: { size?: number; custom?: BoxEdges } = {},
): Rect {
  let left: number;
  let top: number;
  let right: number;
  let bottom: number;
  if (ratio === "custom" && custom) {
    left = content.left - custom.left;
    top = content.top - custom.top;
    right = content.left + content.width + custom.right;
    bottom = content.top + content.height + custom.bottom;
  } else {
    const share = STUDIO_PADDING + (100 / Math.max(40, size) - 1) / 2;
    const pad = Math.round(Math.max(content.width, content.height) * share);
    let width = content.width + pad * 2;
    let height = content.height + pad * 2;
    if (ratio !== "auto" && ratio !== "custom") {
      const shape = RATIOS[ratio];
      if (width / height < shape) width = height * shape;
      else height = width / shape;
    }
    const middleX = content.left + content.width / 2;
    const middleY = content.top + content.height / 2;
    left = middleX - width / 2;
    top = middleY - height / 2;
    right = middleX + width / 2;
    bottom = middleY + height / 2;
  }
  left = Math.max(bounds.left, left);
  top = Math.max(bounds.top, top);
  right = Math.min(bounds.left + bounds.width, right);
  bottom = Math.min(bounds.top + bounds.height, bottom);
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(Math.max(0, right - left)),
    height: Math.round(Math.max(0, bottom - top)),
  };
}

/** The custom box's edges for a box drawn on screen around `content`. */
export function edgesOf(box: Rect, content: Rect): BoxEdges {
  return {
    left: Math.round(content.left - box.left),
    top: Math.round(content.top - box.top),
    right: Math.round(box.left + box.width - content.left - content.width),
    bottom: Math.round(box.top + box.height - content.top - content.height),
  };
}

/** Where the camera bubble sits: the bottom left corner of `area`, sized to it. */
export function cameraBubble(area: Rect): Rect {
  const short = Math.min(area.width, area.height);
  const size = Math.round(Math.min(MAX_BUBBLE, Math.max(MIN_BUBBLE, short * BUBBLE_SIZE)));
  const inset = Math.round(short * BUBBLE_INSET);
  return {
    left: area.left + inset,
    top: area.top + area.height - inset - size,
    width: size,
    height: size,
  };
}
