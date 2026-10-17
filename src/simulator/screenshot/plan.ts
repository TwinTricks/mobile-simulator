import type { ShotRatio } from "@/shared/types";

export type Size = { width: number; height: number };
export type Box = { x: number; y: number; width: number; height: number };

export type ShotPlan = {
  width: number;
  height: number;
  /** Where each device's outer box goes, in the order they were given. */
  devices: Box[];
  /** Where the caption's baseline sits, and how big it is, when there is one. */
  caption: { x: number; y: number; fontSize: number } | null;
};

const RATIOS: Record<Exclude<ShotRatio, "auto">, number> = {
  "1:1": 1,
  "9:16": 9 / 16,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
};

/** Gap between devices, as a share of the tallest. */
const GAP = 0.08;
const CAPTION_SIZE = 0.045;
const MIN_CAPTION_SIZE = 14;
/** Largest side of the image. Bigger canvases fail to encode in Chrome. */
export const MAX_SIDE = 8000;

/**
 * Lays devices out side by side, centred on one line, with the caption under them, the
 * padding around everything, and the canvas widened or heightened to the chosen ratio.
 */
export function planShot(
  devices: readonly Size[],
  options: { padding: number; ratio: ShotRatio; caption: boolean },
): ShotPlan {
  const tallest = Math.max(...devices.map((d) => d.height));
  const gap = devices.length > 1 ? tallest * GAP : 0;
  const rowWidth = devices.reduce((sum, d) => sum + d.width, 0) + gap * (devices.length - 1);

  const fontSize = options.caption ? Math.max(MIN_CAPTION_SIZE, tallest * CAPTION_SIZE) : 0;
  const captionSpace = options.caption ? fontSize * 2 : 0;
  const contentWidth = rowWidth;
  const contentHeight = tallest + captionSpace;

  const pad = (options.padding / 100) * Math.max(contentWidth, contentHeight);
  let width = contentWidth + 2 * pad;
  let height = contentHeight + 2 * pad;
  if (options.ratio !== "auto") {
    const ratio = RATIOS[options.ratio];
    if (width / height < ratio) width = height * ratio;
    else height = width / ratio;
  }

  // Scales everything down together when the image would be too big to encode.
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const left = (width - contentWidth) / 2;
  const top = (height - contentHeight) / 2;

  let x = left;
  const boxes = devices.map((d) => {
    const box = { x, y: top + (tallest - d.height) / 2, width: d.width, height: d.height };
    x += d.width + gap;
    return box;
  });

  const scaled = (b: Box): Box => ({
    x: b.x * scale,
    y: b.y * scale,
    width: b.width * scale,
    height: b.height * scale,
  });
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    devices: boxes.map(scaled),
    caption: options.caption
      ? {
          x: (width / 2) * scale,
          y: (top + tallest + fontSize * 1.45) * scale,
          fontSize: fontSize * scale,
        }
      : null,
  };
}
