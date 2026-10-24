import { deviceSize } from "@/shared/devices";
import type { FrameImage } from "@/shared/frames";
import type { FrameTint, ScreenshotSettings } from "@/shared/types";
import {
  PHONE_BEZEL,
  TABLET_BEZEL,
  WATCH_BEZEL,
  frameLayout,
  placedFrame,
  screenRadius,
  type FrameLayout,
} from "../frame-box";
import { tintMask } from "../frame-tint";
import { findGradient, isDarkHex } from "./backgrounds";
import type { CapturedScreen } from "./capture";
import { planShot } from "./plan";

/** One device ready to draw, measured in the captured screen's pixels. */
type Art = {
  width: number;
  height: number;
  screenX: number;
  screenY: number;
  screenRadius: number;
  frame:
    | { kind: "image"; image: CanvasImageSource; layout: FrameLayout; turned: boolean }
    | { kind: "bezel"; radius: number; color: string; marks: Mark[] }
    | null;
};

/** A notch or home bar painted on a drawn bezel. */
type Mark = { x: number; y: number; width: number; height: number; color: string };

const BEZEL_COLOR = "#1f1f24";
const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = images.get(src);
  if (!pending) {
    const image = new Image();
    image.src = `/${src}`;
    pending = image.decode().then(() => image);
    images.set(src, pending);
  }
  return pending;
}

const tinted = new Map<string, Promise<HTMLCanvasElement>>();

/** The frame image with a gradient laid over its colour, as the device shows it on screen. */
function tintedImage(src: string, tint: FrameTint): Promise<HTMLCanvasElement> {
  const key = `${src}|${tint.from}|${tint.to}`;
  let pending = tinted.get(key);
  if (!pending) {
    pending = Promise.all([loadImage(src), tintMask(`/${src}`)]).then(([image, mask]) => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      ctx.globalCompositeOperation = "color";
      const fill = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      fill.addColorStop(0, tint.from);
      fill.addColorStop(1, tint.to);
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Only the frame's body takes the colour, not its glass or the space around it.
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask ?? image, 0, 0);
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(image, 0, 0);
      return canvas;
    });
    tinted.set(key, pending);
  }
  return pending;
}

async function artFor(
  shot: CapturedScreen,
  frame: boolean,
  frameColor: string | undefined,
  tint: FrameTint | undefined,
): Promise<Art> {
  const { device, rotated, bitmap } = shot;
  const sw = bitmap.width;
  const sh = bitmap.height;
  const rounding = screenRadius(device, sw, sh);

  const placed = frame ? placedFrame(device, rotated, true, frameColor) : null;
  if (placed) {
    const layout = frameLayout(placed, sw, sh);
    return {
      width: layout.width,
      height: layout.height,
      screenX: layout.screenX,
      screenY: layout.screenY,
      screenRadius: rounding,
      frame: {
        kind: "image",
        image: tint
          ? await tintedImage((placed.image as FrameImage).src, tint)
          : await loadImage((placed.image as FrameImage).src),
        layout,
        turned: placed.turned,
      },
    };
  }

  // The same proportions the CSS bezel has at 100% zoom.
  const k = sw / deviceSize(device, rotated).width;
  if (frame && device.category === "phone") {
    const across = PHONE_BEZEL.side * k;
    const along = PHONE_BEZEL.end * k;
    const [padX, padY] = rotated ? [along, across] : [across, along];
    const width = sw + 2 * padX;
    const height = sh + 2 * padY;
    const notch = rotated
      ? { x: 8 * k, y: height / 2 - 40 * k, width: 18 * k, height: 80 * k }
      : { x: width / 2 - 40 * k, y: 8 * k, width: 80 * k, height: 18 * k };
    const bar = rotated
      ? { x: width - 14 * k, y: height / 2 - 50 * k, width: 4 * k, height: 100 * k }
      : { x: width / 2 - 50 * k, y: height - 14 * k, width: 100 * k, height: 4 * k };
    return {
      width,
      height,
      screenX: padX,
      screenY: padY,
      screenRadius: 6 * k,
      frame: {
        kind: "bezel",
        radius: 36 * k,
        color: BEZEL_COLOR,
        marks: [
          { ...notch, color: "#000" },
          { ...bar, color: "#555" },
        ],
      },
    };
  }
  if (frame && device.category === "tablet") {
    const pad = TABLET_BEZEL * k;
    return {
      width: sw + 2 * pad,
      height: sh + 2 * pad,
      screenX: pad,
      screenY: pad,
      screenRadius: 6 * k,
      frame: { kind: "bezel", radius: 20 * k, color: "#2d2d34", marks: [] },
    };
  }
  if (frame && device.category === "watch") {
    const pad = WATCH_BEZEL * k;
    return {
      width: sw + 2 * pad,
      height: sh + 2 * pad,
      screenX: pad,
      screenY: pad,
      screenRadius: rounding,
      frame: { kind: "bezel", radius: rounding + pad, color: BEZEL_COLOR, marks: [] },
    };
  }
  return { width: sw, height: sh, screenX: 0, screenY: 0, screenRadius: rounding, frame: null };
}

function drawFrameImage(
  ctx: CanvasRenderingContext2D,
  frame: Extract<NonNullable<Art["frame"]>, { kind: "image" }>,
) {
  const { image, layout, turned } = frame;
  if (!turned) {
    ctx.drawImage(image, 0, 0, layout.width, layout.height);
    return;
  }
  const w = layout.image.width as number;
  const h = layout.image.height as number;
  ctx.save();
  ctx.translate(layout.width / 2, layout.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawDevice(ctx: CanvasRenderingContext2D, art: Art, bitmap: ImageBitmap, shadow: number) {
  const { frame } = art;

  // The shadow is cast by the device's outline, drawn once on its own.
  if (shadow > 0) {
    ctx.save();
    const strength = shadow / 100;
    ctx.shadowColor = `rgba(0, 0, 0, ${0.12 + 0.3 * strength})`;
    ctx.shadowBlur = art.height * 0.07 * strength;
    ctx.shadowOffsetY = art.height * 0.025 * strength;
    if (frame?.kind === "image") {
      drawFrameImage(ctx, frame);
    } else {
      ctx.fillStyle = frame?.color ?? "#fff";
      ctx.beginPath();
      if (frame) ctx.roundRect(0, 0, art.width, art.height, frame.radius);
      else ctx.roundRect(art.screenX, art.screenY, bitmap.width, bitmap.height, art.screenRadius);
      ctx.fill();
    }
    ctx.restore();
  }

  if (frame?.kind === "bezel") {
    ctx.fillStyle = frame.color;
    ctx.beginPath();
    ctx.roundRect(0, 0, art.width, art.height, frame.radius);
    ctx.fill();
    for (const mark of frame.marks) {
      ctx.fillStyle = mark.color;
      ctx.beginPath();
      ctx.roundRect(mark.x, mark.y, mark.width, mark.height, Math.min(mark.width, mark.height) / 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(art.screenX, art.screenY, bitmap.width, bitmap.height, art.screenRadius);
  ctx.clip();
  ctx.drawImage(bitmap, art.screenX, art.screenY);
  ctx.restore();

  if (frame?.kind === "image") drawFrameImage(ctx, frame);
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ScreenshotSettings,
): boolean {
  const opaque = options.format === "jpeg";
  const gradient = findGradient(options.background);
  if (gradient) {
    // CSS angles: 0deg points up and they turn clockwise.
    const radians = (gradient.angle * Math.PI) / 180;
    const dx = Math.sin(radians);
    const dy = -Math.cos(radians);
    const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
    const fill = ctx.createLinearGradient(
      width / 2 - dx * half,
      height / 2 - dy * half,
      width / 2 + dx * half,
      height / 2 + dy * half,
    );
    gradient.stops.forEach((stop, i) => fill.addColorStop(i / (gradient.stops.length - 1), stop));
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    return gradient.dark;
  }
  if (options.background === "solid" || opaque) {
    const color = options.background === "solid" ? options.solidColor : "#ffffff";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return isDarkHex(color);
  }
  return false;
}

/** Draws the finished screenshot: background, devices, shadow and caption. */
export async function composeShot(
  screens: readonly CapturedScreen[],
  options: ScreenshotSettings,
  frameColors: Readonly<Record<string, string>>,
  frameTints: Readonly<Record<string, FrameTint>> = {},
): Promise<HTMLCanvasElement> {
  const arts = await Promise.all(
    screens.map((shot) =>
      artFor(shot, options.frame, frameColors[shot.device.id], frameTints[shot.device.id]),
    ),
  );
  const caption = options.caption && options.captionText.trim() !== "";
  const plan = planShot(arts, { padding: options.padding, ratio: options.ratio, caption });

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const dark = paintBackground(ctx, plan.width, plan.height, options);

  arts.forEach((art, i) => {
    const box = plan.devices[i]!;
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.width / art.width, box.height / art.height);
    drawDevice(ctx, art, screens[i]!.bitmap, options.shadow);
    ctx.restore();
  });

  if (plan.caption && caption) {
    ctx.fillStyle = dark ? "rgba(255, 255, 255, 0.92)" : "rgba(24, 24, 27, 0.88)";
    ctx.font = `600 ${plan.caption.fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(options.captionText.trim(), plan.caption.x, plan.caption.y, plan.width * 0.9);
  }
  return canvas;
}

const MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" } as const;

export function canvasBlob(canvas: HTMLCanvasElement, format: keyof typeof MIME): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be encoded."))),
      MIME[format],
      format === "png" ? undefined : 0.95,
    ),
  );
}

/** `screenshot-<site>-<device>-<date>.<ext>`, with anything a file name can't hold dropped. */
export function shotFileName(
  url: string,
  deviceNames: readonly string[],
  format: string,
  kind = "screenshot",
): string {
  const clean = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  let site = "page";
  try {
    site = clean(new URL(url).hostname.replace(/^www\./, "")) || site;
  } catch {
    // No address yet: keep the generic name.
  }
  const device =
    deviceNames.length === 1 ? clean(deviceNames[0]!) : `${deviceNames.length}-devices`;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${kind}-${site}-${device}-${stamp}.${format === "jpeg" ? "jpg" : format}`;
}
