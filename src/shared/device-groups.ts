import type { Device } from "@/shared/types";

export type DeviceGroup = { label: string; devices: Device[] };

const GROUPS: { label: string; match: (d: Device) => boolean; byModel?: boolean }[] = [
  {
    label: "iPhone",
    match: (d) => d.category === "phone" && /^iPhone/.test(d.name),
    byModel: true,
  },
  { label: "Pixel", match: (d) => d.category === "phone" && /^Pixel/.test(d.name), byModel: true },
  {
    label: "Galaxy",
    match: (d) => d.category === "phone" && /^Galaxy/.test(d.name),
    byModel: true,
  },
  { label: "Other phones", match: (d) => d.category === "phone" },
  { label: "iPad", match: (d) => d.category === "tablet" && /^iPad/.test(d.name) },
  { label: "Other tablets", match: (d) => d.category === "tablet" },
  { label: "Watches", match: (d) => d.category === "watch" },
  { label: "Computers", match: (d) => d.category === "desktop" },
  { label: "Custom", match: () => true },
];

/**
 * Newest model first. A name with no model number (iPhone Air, iPhone SE) stays beside the one
 * listed before it, which is where the device list puts it.
 */
function byModel(devices: Device[]): Device[] {
  let last = Infinity;
  const keyed = devices.map((device, index) => {
    const model = /\d+/.exec(device.name);
    if (model) last = Number(model[0]);
    return { device, index, key: last };
  });
  return keyed.sort((a, b) => b.key - a.key || a.index - b.index).map((k) => k.device);
}

/** The devices by family, phones before tablets, each family newest first. Empty ones are left out. */
export function deviceGroups(devices: readonly Device[]): DeviceGroup[] {
  const buckets = GROUPS.map((group) => ({ ...group, devices: [] as Device[] }));
  for (const device of devices) buckets.find((b) => b.match(device))!.devices.push(device);
  return buckets
    .filter((b) => b.devices.length > 0)
    .map((b) => ({ label: b.label, devices: b.byModel ? byModel(b.devices) : b.devices }));
}
