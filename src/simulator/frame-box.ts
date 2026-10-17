import type { CSSProperties } from "react";

import { deviceSize } from "@/shared/devices";
import { frameVariant, placeFrame, type PlacedFrame } from "@/shared/frames";
import type { Device, DeviceCategory } from "@/shared/types";

// Padding of the drawn CSS bezels, for devices that have no frame image.
export const PHONE_BEZEL = { side: 14, end: 28 };
export const TABLET_BEZEL = 22;

/**
 * Screen corner radius as a share of the short side, so the page's corners stay inside the
 * frame image's rounded cut-out instead of poking past it.
 */
export const SCREEN_ROUNDING: Record<DeviceCategory, number> = {
  phone: 0.13,
  tablet: 0.03,
  desktop: 0,
  custom: 0,
};
// The screen border drawn when bezels are off.
const PLAIN_BORDER = 1;

export type FrameLayout = {
  width: number;
  height: number;
  screenX: number;
  screenY: number;
  image: CSSProperties;
};

/**
 * Sizes a frame so its screen comes out exactly `screenWidth` by `screenHeight`. Each axis is
 * scaled on its own, so a viewport a hair off the frame's own proportions still fills it.
 */
export function frameLayout(
  { image, turned }: PlacedFrame,
  screenWidth: number,
  screenHeight: number,
): FrameLayout {
  const { width, height, screen } = image;
  if (!turned) {
    const kx = screenWidth / screen.width;
    const ky = screenHeight / screen.height;
    return {
      width: width * kx,
      height: height * ky,
      screenX: screen.x * kx,
      screenY: screen.y * ky,
      image: { left: 0, top: 0, width: width * kx, height: height * ky },
    };
  }
  // Turned a quarter anticlockwise, so the image's top edge, and any notch on it, ends up on the left.
  const kx = screenWidth / screen.height;
  const ky = screenHeight / screen.width;
  return {
    width: height * kx,
    height: width * ky,
    screenX: screen.y * kx,
    screenY: (width - screen.x - screen.width) * ky,
    image: {
      left: "50%",
      top: "50%",
      width: width * ky,
      height: height * kx,
      transform: "translate(-50%, -50%) rotate(-90deg)",
    },
  };
}

/** `island` is any iPhone with a notch or Dynamic Island; `classic` is the home-button kind. */
export type StatusBarKind = "island" | "classic" | "ipad" | "android";

export type StatusBarSpec = { kind: StatusBarKind; height: number };

/**
 * The system status bar at the top of the screen, which the page starts below as it does on the
 * real device. Phones on their side hide it, as iOS does; laptops and desktops have none.
 */
export function statusBar(device: Device, rotated: boolean): StatusBarSpec | null {
  const ua = device.ua ?? "";
  if (ua.includes("iPad")) return { kind: "ipad", height: 24 };
  if (rotated && device.category === "phone") return null;
  if (device.id.startsWith("iphone-se")) return { kind: "classic", height: 20 };
  // Apple's status bar artwork for the 402-point iPhones is 62 tall.
  if (ua.includes("iPhone")) return { kind: "island", height: 62 };
  if (ua.includes("Android")) {
    return { kind: "android", height: device.category === "phone" ? 32 : 26 };
  }
  return null;
}

/**
 * `safari` is the iPhone's bottom address bar and toolbar; `safari-top` the single bar along the
 * top of an iPad, or an iPhone on its side; `chrome` Android's bar under the status bar.
 */
export type BrowserChromeKind = "safari" | "safari-top" | "chrome";

export type BrowserChromeSpec = { kind: BrowserChromeKind; top: number; bottom: number };

// Safari's address bar and toolbar on iOS 18, and the safe area left under them for the home
// indicator on iPhones that have one.
const SAFARI_BAR = 52;
const SAFARI_TOOLBAR = 46;
const SAFARI_SAFE_AREA = 34;

/** The browser's own bars, which take room from the page: null on computers and custom sizes. */
export function browserChrome(device: Device, rotated: boolean): BrowserChromeSpec | null {
  if (device.category !== "phone" && device.category !== "tablet") return null;
  const ua = device.ua ?? "";
  if (ua.includes("iPad")) return { kind: "safari-top", top: 50, bottom: 0 };
  if (ua.includes("iPhone")) {
    if (rotated) return { kind: "safari-top", top: 44, bottom: 0 };
    const safe = device.id.startsWith("iphone-se") ? 0 : SAFARI_SAFE_AREA;
    return { kind: "safari", top: 0, bottom: SAFARI_BAR + SAFARI_TOOLBAR + safe };
  }
  if (ua.includes("Android")) return { kind: "chrome", top: 56, bottom: 0 };
  return null;
}

export type HomeIndicatorSpec = { width: number; height: number; bottom: number };

/**
 * The bar along the bottom of the screen that a swipe up starts from, on phones and tablets
 * without a home button. Android draws a shorter, thinner one.
 */
export function homeIndicator(device: Device, rotated: boolean): HomeIndicatorSpec | null {
  const ua = device.ua ?? "";
  if (device.category !== "phone" && device.category !== "tablet") return null;
  if (device.id.startsWith("iphone-se")) return null;
  if (ua.includes("iPad")) return { width: rotated ? 320 : 300, height: 5, bottom: 7 };
  if (ua.includes("iPhone")) return { width: rotated ? 210 : 134, height: 5, bottom: 8 };
  if (ua.includes("Android")) return { width: 108, height: 4, bottom: 10 };
  return null;
}

/** The frame image a device is drawn in, or null when it gets a CSS bezel or none. */
export function placedFrame(
  device: Device,
  rotated: boolean,
  bezel: boolean,
  frameColor: string | undefined,
): PlacedFrame | null {
  if (!bezel) return null;
  const variant = frameVariant(device.id, frameColor);
  const { width, height } = deviceSize(device, rotated);
  return variant ? placeFrame(variant, device.category, width, height) : null;
}

/** The outer size of a device at zoom 1, frame or bezel included. */
export function frameBox(
  device: Device,
  rotated: boolean,
  bezel: boolean,
  frameColor: string | undefined,
): { width: number; height: number } {
  const { width, height } = deviceSize(device, rotated);
  const placed = placedFrame(device, rotated, bezel, frameColor);
  if (placed) {
    const layout = frameLayout(placed, width, height);
    return { width: layout.width, height: layout.height };
  }
  if (bezel && device.category === "phone") {
    const across = 2 * PHONE_BEZEL.side;
    const along = 2 * PHONE_BEZEL.end;
    return rotated
      ? { width: width + along, height: height + across }
      : { width: width + across, height: height + along };
  }
  if (bezel && device.category === "tablet") {
    return { width: width + 2 * TABLET_BEZEL, height: height + 2 * TABLET_BEZEL };
  }
  return { width: width + 2 * PLAIN_BORDER, height: height + 2 * PLAIN_BORDER };
}

/**
 * The largest zoom, up to `max`, at which a device fits in `room`. A frame image scales with the
 * screen; a CSS bezel keeps its padding at every zoom.
 */
export function fitZoom(
  device: Device,
  rotated: boolean,
  bezel: boolean,
  frameColor: string | undefined,
  room: { width: number; height: number },
  max = 1,
): number {
  const screen = deviceSize(device, rotated);
  const box = frameBox(device, rotated, bezel, frameColor);
  const scales = placedFrame(device, rotated, bezel, frameColor);
  const padWidth = scales ? 0 : box.width - screen.width;
  const padHeight = scales ? 0 : box.height - screen.height;
  const across = scales ? box.width : screen.width;
  const along = scales ? box.height : screen.height;
  return Math.max(
    0.1,
    Math.min(max, (room.width - padWidth) / across, (room.height - padHeight) / along),
  );
}
