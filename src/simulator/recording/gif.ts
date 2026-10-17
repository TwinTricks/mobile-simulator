import { applyPalette, GIFEncoder, quantize } from "gifenc";

export type GifPlan = { width: number; height: number; fps: number; frames: number; delay: number };

// A GIF holds every frame whole, so long or large ones get heavy fast: past these they are
// slowed down and scaled down rather than refused.
const MAX_WIDTH = 480;
const MAX_FRAMES = 300;
const FPS = 12;

/** The size, rate and frame count a GIF of a `durationMs`-long, `width` × `height` video gets. */
export function gifPlan(durationMs: number, width: number, height: number): GifPlan {
  const scale = Math.min(1, MAX_WIDTH / Math.max(1, width));
  const seconds = Math.max(0.1, durationMs / 1000);
  const fps = Math.max(1, Math.min(FPS, MAX_FRAMES / seconds));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
    fps,
    frames: Math.max(1, Math.ceil(seconds * fps)),
    delay: Math.round(1000 / fps),
  };
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The video couldn't be read.")), 5000);
    video.addEventListener(
      "seeked",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    video.currentTime = time;
  });
}

/** Turns a recorded video into a looping GIF, frame by frame. */
export async function videoToGif(
  blob: Blob,
  durationMs: number,
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("The video couldn't be read."));
    });
    const plan = gifPlan(durationMs, video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const gif = GIFEncoder();

    for (let i = 0; i < plan.frames; i++) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      await seek(video, Math.min(i / plan.fps, durationMs / 1000 - 0.001));
      context.drawImage(video, 0, 0, plan.width, plan.height);
      const { data } = context.getImageData(0, 0, plan.width, plan.height);
      const palette = quantize(data, 256, { format: "rgb565" });
      gif.writeFrame(applyPalette(data, palette, "rgb565"), plan.width, plan.height, {
        palette,
        delay: plan.delay,
      });
      onProgress((i + 1) / plan.frames);
    }
    gif.finish();
    return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
