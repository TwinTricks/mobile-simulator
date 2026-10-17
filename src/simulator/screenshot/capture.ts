import type { Device } from "@/shared/types";

/** `key` picks out one copy of a device shown more than once, as when comparing sites. */
export type ShotSubject = { device: Device; rotated: boolean; key?: string };

export type CapturedScreen = ShotSubject & {
  /** The device's screen, cut out of the tab at the tab's own pixel density. */
  bitmap: ImageBitmap;
};

export type Capture = {
  screens: CapturedScreen[];
  /** Devices left out because part of their screen was scrolled out of view. */
  skipped: string[];
};

/** Lets the browser paint whatever was just hidden before the tab is captured. */
export function settle(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())), ms),
  );
}

/**
 * Captures the simulator tab and cuts each device's screen out of it. The pages inside the
 * devices belong to other sites, so taking the tab's own pixels is the only way to see them.
 */
export async function captureScreens(subjects: readonly ShotSubject[]): Promise<Capture> {
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
  const whole = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const density = whole.width / window.innerWidth;

  const screens: CapturedScreen[] = [];
  const skipped: string[] = [];
  for (const subject of subjects) {
    const element = document.querySelector(
      `[data-device-id="${CSS.escape(subject.key ?? subject.device.id)}"] [data-screen]`,
    );
    const rect = element?.getBoundingClientRect();
    const inView =
      rect &&
      rect.width > 0 &&
      rect.left >= -0.5 &&
      rect.top >= -0.5 &&
      rect.right <= window.innerWidth + 0.5 &&
      rect.bottom <= window.innerHeight + 0.5;
    if (!rect || !inView) {
      skipped.push(subject.device.name);
      continue;
    }
    const bitmap = await createImageBitmap(
      whole,
      Math.round(rect.left * density),
      Math.round(rect.top * density),
      Math.round(rect.width * density),
      Math.round(rect.height * density),
    );
    screens.push({ ...subject, bitmap });
  }
  whole.close();
  return { screens, skipped };
}
