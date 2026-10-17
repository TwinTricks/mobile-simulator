import { DEVICE_FRAMES } from "@/shared/frames.generated";
import type { DeviceCategory } from "@/shared/types";

export type FramePlatform = "ios" | "ipad" | "android" | "android-tablet" | "desktop";

/** A device that exists because there is a frame for it. */
export type FrameDeviceSpec = {
  id: string;
  name: string;
  width: number;
  height: number;
  dpr: number;
  category: Exclude<DeviceCategory, "custom">;
  platform: FramePlatform;
  uaModel?: string;
};

/** One frame image. Sizes are in the source image's pixels; only their ratios matter. */
export type FrameImage = {
  src: string;
  width: number;
  height: number;
  screen: { x: number; y: number; width: number; height: number };
};

export type FrameVariant = {
  color: string;
  portrait?: FrameImage;
  landscape?: FrameImage;
};

/** A frame laid out for one orientation, with `turned` set when the image is drawn on its side. */
export type PlacedFrame = { image: FrameImage; turned: boolean };

export function frameVariants(deviceId: string): readonly FrameVariant[] {
  return DEVICE_FRAMES[deviceId] ?? [];
}

/** The chosen colour, or the first one when that colour is gone after a frames update. */
export function frameVariant(deviceId: string, color: string | undefined): FrameVariant | null {
  const variants = frameVariants(deviceId);
  return variants.find((v) => v.color === color) ?? variants[0] ?? null;
}

/**
 * The image to draw for a device shown `width` by `height`. A phone or tablet frame that only
 * exists the other way up is turned on its side; a desktop is never turned, so it goes without.
 */
export function placeFrame(
  variant: FrameVariant,
  category: DeviceCategory,
  width: number,
  height: number,
): PlacedFrame | null {
  const want = height >= width ? "portrait" : "landscape";
  const other = want === "portrait" ? "landscape" : "portrait";
  const exact = variant[want];
  if (exact) return { image: exact, turned: false };
  const sideways = variant[other];
  if (sideways && category !== "desktop") return { image: sideways, turned: true };
  return null;
}
