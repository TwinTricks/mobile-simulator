import type { Device } from "@/shared/types";

/** Marks a device frame's `name`. Must match the prefix in src/content/mobile-identity.ts. */
export const IDENTITY_PREFIX = "__msim:";

export type IdentityPlatform = "ios" | "ipad" | "android" | "android-tablet";

/** What the identity script in a device's page needs. Must match the type in that script. */
export type FrameIdentity = {
  /** Null leaves the browser's own identity alone. */
  ua: string | null;
  platform: IdentityPlatform | null;
  /** The screen in portrait, in CSS pixels. */
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
  /** Keeps the page's own scrollbars rather than hiding them as a phone does. */
  scrollbars: boolean;
};

export function identityPlatform(ua: string | null): IdentityPlatform | null {
  if (!ua) return null;
  if (/iPad/.test(ua)) return "ipad";
  if (/iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "android" : "android-tablet";
  return null;
}

export function frameIdentity(
  device: Device,
  {
    spoofUA,
    touchMode,
    nativeScrollbars,
  }: { spoofUA: boolean; touchMode: boolean; nativeScrollbars: boolean },
): FrameIdentity {
  const ua = spoofUA ? device.ua : null;
  const handheld = device.category === "phone" || device.category === "tablet";
  return {
    ua,
    platform: identityPlatform(ua),
    width: Math.min(device.width, device.height),
    height: Math.max(device.width, device.height),
    dpr: device.dpr,
    touch: touchMode && handheld,
    scrollbars: nativeScrollbars,
  };
}

/** The iframe `name` that hands the identity to the page's script before any of its own run. */
export function identityName(identity: FrameIdentity): string {
  return IDENTITY_PREFIX + JSON.stringify(identity);
}

/** Sent to a frame to switch touch mode without reloading it. */
export type TouchMessage = { __msimTouch: boolean };

/** Sent to a frame to show or hide its scrollbars without reloading it. */
export type ScrollbarsMessage = { __msimScrollbars: boolean };

/** Sent up by a frame whose page has a web app manifest that opens as an app. */
export type PwaMessage = { __msimPwa: boolean };
