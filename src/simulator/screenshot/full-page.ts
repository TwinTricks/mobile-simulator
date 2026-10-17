import { settle } from "./capture";

/** Where the page stood at one step, in the page's own pixels. */
export type FullPageStep = {
  scroll: number;
  /** The part of the frame that scrolls: the whole of it, or a box inside when the page scrolls one. */
  top: number;
  height: number;
  total: number;
  viewport: number;
};

export type FullPageShot = { name: string; blob: Blob; width: number; height: number };

// Chrome refuses more than two tab captures a second.
const CAPTURE_GAP_MS = 550;
const ANSWER_MS = 4000;
// Canvases taller than this fail to draw in Chrome.
const MAX_CANVAS_PX = 32_000;
const MAX_STEPS = 40;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function readFullPageStep(data: unknown, id: string): FullPageStep | null {
  const at = (data as { __msimFullAt?: Record<string, unknown> } | null)?.__msimFullAt;
  if (!at || at.id !== id) return null;
  const { scroll, top, height, total, viewport } = at;
  if (![scroll, top, height, total, viewport].every(finite)) return null;
  if ((height as number) <= 0 || (viewport as number) <= 0) return null;
  return {
    scroll: scroll as number,
    top: top as number,
    height: height as number,
    total: total as number,
    viewport: viewport as number,
  };
}

/** The scroll positions that show all of `total` through a window `height` tall, at most `cap`. */
export function fullPageStops(height: number, total: number, cap = total): number[] {
  const last = Math.max(0, Math.min(total, cap) - height);
  const stops: number[] = [];
  for (let y = 0; y < last; y += height) stops.push(y);
  stops.push(last);
  return stops.slice(0, MAX_STEPS);
}

function frameRect(key: string): DOMRect {
  const frame = document.querySelector(`[data-device-id="${CSS.escape(key)}"] iframe`);
  const rect = frame?.getBoundingClientRect();
  if (
    !rect ||
    rect.width === 0 ||
    rect.left < -0.5 ||
    rect.top < -0.5 ||
    rect.right > window.innerWidth + 0.5 ||
    rect.bottom > window.innerHeight + 0.5
  ) {
    throw new Error("Scroll the whole device into view first.");
  }
  return rect;
}

/**
 * Scrolls the page in one device from top to bottom, capturing the tab at each step, and stitches
 * the steps into one tall picture at the tab's pixel density.
 */
export async function captureFullPage(
  key: string,
  name: string,
  onProgress: (done: number) => void,
): Promise<FullPageShot> {
  const frame = document.querySelector<HTMLIFrameElement>(
    `[data-device-id="${CSS.escape(key)}"] iframe`,
  );
  const target = frame?.contentWindow;
  if (!target) throw new Error(`${name} has no page open.`);
  frameRect(key);

  const id = crypto.randomUUID();
  const ask = (message: Record<string, unknown>) =>
    new Promise<FullPageStep>((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", listen);
        reject(new Error(`The page in ${name} didn't answer. Reload it and try again.`));
      }, ANSWER_MS);
      function listen(event: MessageEvent) {
        if (event.source !== target) return;
        const step = readFullPageStep(event.data, id);
        if (!step) return;
        clearTimeout(timer);
        window.removeEventListener("message", listen);
        resolve(step);
      }
      window.addEventListener("message", listen);
      target.postMessage({ ...message, id }, "*");
    });

  const html = document.documentElement;
  html.dataset.fullPage = "";
  const slices: { step: FullPageStep; bitmap: ImageBitmap }[] = [];
  try {
    const first = await ask({ __msimFull: "start" });
    const density = window.devicePixelRatio || 1;
    const scale = (frameRect(key).height * density) / first.viewport;
    const cap = MAX_CANVAS_PX / scale - (first.viewport - first.height);
    const stops = fullPageStops(first.height, first.total, cap);

    let lastCapture = 0;
    for (const [i, y] of stops.entries()) {
      const step = await ask({
        __msimFull: "scroll",
        y,
        first: i === 0,
        last: i === stops.length - 1,
      });
      await settle(Math.max(0, lastCapture + CAPTURE_GAP_MS - performance.now()));
      lastCapture = performance.now();
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
      const whole = await createImageBitmap(await (await fetch(dataUrl)).blob());
      const tabDensity = whole.width / window.innerWidth;
      const rect = frameRect(key);
      slices.push({
        step,
        bitmap: await createImageBitmap(
          whole,
          Math.round(rect.left * tabDensity),
          Math.round(rect.top * tabDensity),
          Math.round(rect.width * tabDensity),
          Math.round(rect.height * tabDensity),
        ),
      });
      whole.close();
      onProgress((i + 1) / stops.length);
    }
  } finally {
    target.postMessage({ __msimFull: "end", id }, "*");
    delete html.dataset.fullPage;
  }

  const { top, height, viewport } = slices[0]!.step;
  const width = slices[0]!.bitmap.width;
  const ratio = slices[0]!.bitmap.height / viewport;
  const contentEnd = Math.max(...slices.map(({ step }) => step.scroll + height));
  const canvas = new OffscreenCanvas(
    width,
    Math.min(MAX_CANVAS_PX, Math.round((viewport - height + contentEnd) * ratio)),
  );
  const context = canvas.getContext("2d")!;
  const band = (bitmap: ImageBitmap, from: number, size: number, to: number) => {
    if (size <= 0) return;
    context.drawImage(
      bitmap,
      0,
      from * ratio,
      width,
      size * ratio,
      0,
      to * ratio,
      width,
      size * ratio,
    );
  };
  for (const [i, { step, bitmap }] of slices.entries()) {
    band(bitmap, top, height, top + step.scroll);
    if (i === 0) band(bitmap, 0, top, 0);
    if (i === slices.length - 1) {
      band(bitmap, top + height, viewport - top - height, top + step.scroll + height);
    }
    bitmap.close();
  }
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return { name, blob, width: canvas.width, height: canvas.height };
}
