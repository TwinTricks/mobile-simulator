import sharp from "sharp";

export type ScreenRect = { x: number; y: number; width: number; height: number };

export type FrameScan = {
  width: number;
  height: number;
  /** Where anything is drawn at all, so the empty margin around the device can be cropped. */
  content: ScreenRect;
  screen: ScreenRect;
  /** Share of the image the screen covers, which flags a frame whose cutout was not found. */
  coverage: number;
};

/** Pixels at or below this alpha count as see-through. */
const CLEAR_ALPHA = 16;

/**
 * Finds the screen of a device frame: the largest see-through area that is closed in by the
 * device, as opposed to the clear background around it, which reaches the image's edge.
 */
export async function detectScreen(file: string): Promise<FrameScan | null> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const total = width * height;

  // 0 = solid, 1 = clear and unvisited, 2 = visited.
  const cells = new Uint8Array(total);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let i = 0; i < total; i++) {
    if (data[i] <= CLEAR_ALPHA) {
      cells[i] = 1;
      continue;
    }
    const x = i % width;
    const y = (i - x) / width;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  if (right < 0) return null;
  const content = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };

  const queue = new Int32Array(total);

  function fill(start: number): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    count: number;
  } {
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    cells[start] = 2;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let count = 0;
    const visit = (i: number) => {
      if (cells[i] !== 1) return;
      cells[i] = 2;
      queue[tail++] = i;
    };
    while (head < tail) {
      const i = queue[head++];
      const x = i % width;
      const y = (i - x) / width;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0) visit(i - 1);
      if (x < width - 1) visit(i + 1);
      if (y > 0) visit(i - width);
      if (y < height - 1) visit(i + width);
    }
    return { minX, minY, maxX, maxY, count };
  }

  for (let x = 0; x < width; x++) {
    if (cells[x] === 1) fill(x);
    const bottom = (height - 1) * width + x;
    if (cells[bottom] === 1) fill(bottom);
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    if (cells[left] === 1) fill(left);
    const right = left + width - 1;
    if (cells[right] === 1) fill(right);
  }

  let best: ReturnType<typeof fill> | null = null;
  for (let i = 0; i < total; i++) {
    if (cells[i] !== 1) continue;
    const region = fill(i);
    if (!best || region.count > best.count) best = region;
  }
  if (!best) return null;

  const screen = {
    x: best.minX,
    y: best.minY,
    width: best.maxX - best.minX + 1,
    height: best.maxY - best.minY + 1,
  };
  return { width, height, content, screen, coverage: (screen.width * screen.height) / total };
}
