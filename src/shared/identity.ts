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
  const handheld =
    device.category === "phone" || device.category === "tablet" || device.category === "watch";
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

/**
 * Sent up by a frame checking its tap targets, with the ones under `min` CSS pixels. Must match
 * the payload `tapTargets()` in the identity script posts.
 */
export type TapTargetReport = {
  min: number;
  /** Small targets, not counting links in running text. */
  count: number;
  /** Of those, the ones less than 8px from another target. */
  crowded: number;
  /** Small links inside running text, which WCAG 2.5.8 lets off. */
  inline: number;
  items: { label: string; width: number; height: number; inline: boolean; crowded: boolean }[];
};

/** The smallest comfortable tap target: Apple asks for 44 points, Google for 48dp. */
export function tapTargetMinimum(device: Device, chosen: number): number {
  if (chosen > 0) return chosen;
  return /Android/.test(device.ua ?? "") ? 48 : 44;
}

/** Sent up by a frame whose page has a web app manifest that opens as an app. */
export type PwaMessage = { __msimPwa: boolean };
