import { CUSTOM_DEVICE_LIMITS } from "@/shared/constants";
import type { Device } from "@/shared/types";

export type CustomDeviceInput = { name: string; width: string; height: string; dpr: string };

const DEFAULT_DPR = 2;

function size(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  const { minSize, maxSize } = CUSTOM_DEVICE_LIMITS;
  return Number.isFinite(value) && value >= minSize && value <= maxSize ? value : null;
}

/** A custom device from the form's raw text, or the reason it cannot be one. */
export function parseCustomDevice(
  input: CustomDeviceInput,
  id: string,
): { device: Device } | { error: string } {
  const { minSize, maxSize, maxNameLength } = CUSTOM_DEVICE_LIMITS;
  const name = input.name.trim().slice(0, maxNameLength);
  const width = size(input.width);
  const height = size(input.height);

  if (!name) return { error: "Device name required." };
  if (width === null) return { error: `Width must be ${minSize}–${maxSize}.` };
  if (height === null) return { error: `Height must be ${minSize}–${maxSize}.` };

  const dpr = Number(input.dpr) || DEFAULT_DPR;
  return { device: { id, name, width, height, dpr, category: "custom", ua: null } };
}
