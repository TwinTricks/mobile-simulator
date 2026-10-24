import type { FrameDeviceSpec } from "@/shared/frames";
import { FRAME_DEVICES } from "@/shared/frames.generated";
import type { Device, Preset } from "@/shared/types";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const PIXEL_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const PIXEL_PRO_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GALAXY_S_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GALAXY_SU_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GALAXY_FOLD_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GALAXY_TAB_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SURFACE_DUO_UA =
  "Mozilla/5.0 (Linux; Android 12; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
// Open, the Fold asks for desktop-class pages as a tablet does, so there is no "Mobile".
const GALAXY_FOLD_OPEN_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ONEPLUS_UA =
  "Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const NOTHING_UA =
  "Mozilla/5.0 (Linux; Android 14; A065) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const APPLE_WATCH_UA =
  "Mozilla/5.0 (Watch; CPU Watch OS 11_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22R349";
const GALAXY_WATCH_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-L310) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.0 Chrome/120.0.0.0 Mobile Safari/537.36";

function frameDeviceUa({ platform, uaModel }: FrameDeviceSpec): string | null {
  switch (platform) {
    case "ios":
      return IOS_UA;
    case "ipad":
      return IPAD_UA;
    case "android":
      return `Mozilla/5.0 (Linux; Android 15; ${uaModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36`;
    case "android-tablet":
      return `Mozilla/5.0 (Linux; Android 15; ${uaModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36`;
    case "desktop":
      return null;
  }
}

/** Devices that come from the frames in mockup-device-frames, newest first. */
const FRAMED_DEVICES: readonly Device[] = FRAME_DEVICES.map((spec) => ({
  id: spec.id,
  name: spec.name,
  width: spec.width,
  height: spec.height,
  dpr: spec.dpr,
  category: spec.category,
  ua: frameDeviceUa(spec),
}));

// One device per line reads as a table, which Prettier would break up.
// prettier-ignore
const CLASSIC_DEVICES: readonly Device[] = [
  // Phones
  { id: "iphone-15-pro", name: "iPhone 15 Pro",    width: 393,  height: 852,  dpr: 3,     category: "phone",   ua: IOS_UA },
  { id: "iphone-14",     name: "iPhone 14",        width: 390,  height: 844,  dpr: 3,     category: "phone",   ua: IOS_UA },
  { id: "iphone-se",     name: "iPhone SE",        width: 375,  height: 667,  dpr: 2,     category: "phone",   ua: IOS_UA },
  { id: "pixel-8",       name: "Pixel 8",          width: 412,  height: 915,  dpr: 2.625, category: "phone",   ua: PIXEL_UA },
  { id: "pixel-8-pro",   name: "Pixel 8 Pro",      width: 448,  height: 998,  dpr: 3,     category: "phone",   ua: PIXEL_PRO_UA },
  { id: "galaxy-s24",    name: "Galaxy S24",       width: 360,  height: 780,  dpr: 3,     category: "phone",   ua: GALAXY_S_UA },
  { id: "galaxy-s24u",   name: "Galaxy S24 Ultra", width: 412,  height: 915,  dpr: 3.5,   category: "phone",   ua: GALAXY_SU_UA },
  { id: "galaxy-fold",   name: "Galaxy Z Fold 5",  width: 344,  height: 882,  dpr: 3,     category: "phone",   ua: GALAXY_FOLD_UA },
  { id: "oneplus-12",    name: "OnePlus 12",       width: 412,  height: 915,  dpr: 2.625, category: "phone",   ua: ONEPLUS_UA },
  { id: "nothing-2",     name: "Nothing Phone (2)", width: 412, height: 915,  dpr: 2.625, category: "phone",   ua: NOTHING_UA },

  // Tablets
  { id: "galaxy-fold-open", name: "Galaxy Z Fold 5 (open)", width: 904, height: 882, dpr: 2.4, category: "tablet", ua: GALAXY_FOLD_OPEN_UA, hinge: true },
  { id: "ipad-mini",     name: "iPad Mini",        width: 768,  height: 1024, dpr: 2,     category: "tablet",  ua: IPAD_UA },
  { id: "ipad-air",      name: "iPad Air",         width: 820,  height: 1180, dpr: 2,     category: "tablet",  ua: IPAD_UA },
  { id: "ipad-pro-11",   name: 'iPad Pro 11"',     width: 834,  height: 1194, dpr: 2,     category: "tablet",  ua: IPAD_UA },
  { id: "ipad-pro-13",   name: 'iPad Pro 13"',     width: 1024, height: 1366, dpr: 2,     category: "tablet",  ua: IPAD_UA },
  { id: "galaxy-tab-s9", name: "Galaxy Tab S9",    width: 753,  height: 1205, dpr: 2,     category: "tablet",  ua: GALAXY_TAB_UA },
  { id: "surface-duo",   name: "Surface Duo",      width: 540,  height: 720,  dpr: 2.5,   category: "tablet",  ua: SURFACE_DUO_UA },

  // Watches
  { id: "apple-watch-ultra-2", name: "Apple Watch Ultra 2", width: 205, height: 251, dpr: 2, category: "watch", ua: APPLE_WATCH_UA },
  { id: "apple-watch-10-46", name: "Apple Watch Series 10 (46mm)", width: 208, height: 248, dpr: 2, category: "watch", ua: APPLE_WATCH_UA },
  { id: "galaxy-watch-7-44", name: "Galaxy Watch 7 (44mm)", width: 240, height: 240, dpr: 2, category: "watch", ua: GALAXY_WATCH_UA, round: true },

  // Desktops keep the browser's real User-Agent.
  { id: "laptop-13",     name: 'Laptop 13"',       width: 1280, height: 800,  dpr: 2,     category: "desktop", ua: null },
  { id: "desktop-fhd",   name: "Desktop 1080p",    width: 1920, height: 1080, dpr: 1,     category: "desktop", ua: null },
];

export const PRESET_DEVICES: readonly Device[] = [...FRAMED_DEVICES, ...CLASSIC_DEVICES];

// The first one is the device shown while only one is on screen.
export const DEFAULT_VISIBLE_IDS: readonly string[] = ["iphone-17-pro", "pixel-8", "ipad-air"];

export function findDevice(id: string, customDevices: readonly Device[] = []): Device | null {
  return PRESET_DEVICES.find((d) => d.id === id) ?? customDevices.find((d) => d.id === id) ?? null;
}

// Picked by hand: with every framed model in the list, "all phones" would be twenty-odd frames.
export function defaultPresets(): Preset[] {
  return [
    {
      id: "preset-phones",
      name: "Phones only",
      deviceIds: [
        "iphone-17-pro",
        "iphone-16",
        "iphone-se",
        "pixel-9-pro",
        "pixel-8",
        "galaxy-s24",
      ],
    },
    {
      id: "preset-tablets",
      name: "Tablets only",
      deviceIds: [
        "ipad-mini-a17",
        "ipad-air",
        "ipad-pro-13-m4",
        "pixel-tablet",
        "galaxy-tab-s11-ultra",
      ],
    },
    {
      id: "preset-iphones",
      name: "iPhones & iPads",
      deviceIds: [
        "iphone-17-pro-max",
        "iphone-17-pro",
        "iphone-16",
        "iphone-se",
        "ipad-mini-a17",
        "ipad-air",
        "ipad-pro-13-m4",
      ],
    },
    {
      id: "preset-laptops",
      name: "Laptops",
      deviceIds: ["macbook-air-13", "macbook-pro-16", "dell-xps-14", "surface-laptop-13"],
    },
  ];
}

/** Width and height as shown, which swap when the device is turned on its side. */
export function deviceSize(device: Device, rotated: boolean): { width: number; height: number } {
  return rotated
    ? { width: device.height, height: device.width }
    : { width: device.width, height: device.height };
}
