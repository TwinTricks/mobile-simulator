/**
 * Which device each folder of frames in mockup-device-frames belongs to.
 *
 * `match` is tested against the image's path under `Exports/`. A model either points at a device
 * that already exists in src/shared/devices.ts, or describes a new one. Width and height are the
 * portrait CSS viewport; leave them out and they are worked out from the frame's screen and the
 * DPR, which is exact for Apple's frames since those are drawn at the panel's native resolution.
 *
 * Frames that match nothing here are still picked up, one device per folder, with a viewport
 * guessed the same way. The sync script lists them so a proper entry can be added.
 */
export type Platform = "ios" | "ipad" | "android" | "android-tablet" | "desktop";
export type Category = "phone" | "tablet" | "desktop";

export type ModelSpec = {
  match: RegExp;
  id: string;
  /** For frames attached to an existing device, which is not described here. */
  category?: Category;
  /** Leave out to attach the frames to the existing device with this id. */
  device?: {
    name: string;
    category: Category;
    platform: Platform;
    dpr: number;
    width?: number;
    height?: number;
    /** The model string Android puts in its User-Agent. */
    uaModel?: string;
  };
  /** Added to every colour name, to tell apart frames that share a device. */
  colorSuffix?: string;
  /** Words taken out of the file name before the colour is read from it. */
  colorStrip?: RegExp;
};

const phone = (name: string, dpr: number, size?: [number, number], uaModel?: string) => ({
  name,
  category: "phone" as const,
  platform: uaModel ? ("android" as const) : ("ios" as const),
  dpr,
  ...(size && { width: size[0], height: size[1] }),
  ...(uaModel && { uaModel }),
});
const ipad = (name: string, size?: [number, number]) => ({
  name,
  category: "tablet" as const,
  platform: "ipad" as const,
  dpr: 2,
  ...(size && { width: size[0], height: size[1] }),
});
const desktop = (name: string, dpr: number, size?: [number, number]) => ({
  name,
  category: "desktop" as const,
  platform: "desktop" as const,
  dpr,
  ...(size && { width: size[0], height: size[1] }),
});

// One model per line reads as a table, which Prettier would break up.
// prettier-ignore
export const MODELS: ModelSpec[] = [
  // iPhone
  { match: /^iOS\/18 Pro Max\//, id: "iphone-18-pro-max", device: phone("iPhone 18 Pro Max", 3) },
  { match: /^iOS\/18 Pro\//, id: "iphone-18-pro", device: phone("iPhone 18 Pro", 3) },
  { match: /^iOS\/Duo\/.*Inner/, id: "iphone-duo-inner", device: { ...phone("iPhone Duo (open)", 3, [890, 626]), category: "tablet" } },
  { match: /^iOS\/Duo\/.*Outer/, id: "iphone-duo-outer", device: phone("iPhone Duo (closed)", 3) },
  { match: /^iOS\/17 Pro Max\//, id: "iphone-17-pro-max", device: phone("iPhone 17 Pro Max", 3) },
  { match: /^iOS\/17 Pro\//, id: "iphone-17-pro", device: phone("iPhone 17 Pro", 3) },
  // The Air frame reuses the 6.7" screen, but the phone itself is 420 points wide.
  { match: /^iOS\/Air\//, id: "iphone-air", device: phone("iPhone Air", 3, [420, 912]) },
  { match: /^iOS\/16 Pro Max\//, id: "iphone-16-pro-max", device: phone("iPhone 16 Pro Max", 3) },
  { match: /^iOS\/16 Pro\//, id: "iphone-16-pro", device: phone("iPhone 16 Pro", 3) },
  { match: /^iOS\/16 Plus\//, id: "iphone-16-plus", device: phone("iPhone 16 Plus", 3) },
  { match: /^iOS\/16\//, id: "iphone-16", device: phone("iPhone 16", 3) },
  { match: /^iOS\/15 Pro Max\//, id: "iphone-15-pro-max", device: phone("iPhone 15 Pro Max", 3) },
  { match: /^iOS\/14 Pro Max\//, id: "iphone-14-pro-max", device: phone("iPhone 14 Pro Max", 3) },
  { match: /^iOS\/13 mini\//, id: "iphone-13-mini", device: phone("iPhone 13 mini", 3) },

  // Pixel. These frames are drawn smaller than the real panel, so the viewport is given.
  { match: /^Android Phone\/Pixel 9 Pro XL\//, id: "pixel-9-pro-xl", device: phone("Pixel 9 Pro XL", 3, [448, 998], "Pixel 9 Pro XL") },
  { match: /^Android Phone\/Pixel 9 Pro\//, id: "pixel-9-pro", device: phone("Pixel 9 Pro", 3.12, [410, 914], "Pixel 9 Pro") },
  { match: /^Android Phone\/Pixel 8 Pro\//, id: "pixel-8-pro", category: "phone" },
  { match: /^Android Phone\/Pixel 8\//, id: "pixel-8", category: "phone" },

  // iPad
  { match: /^iPadOS\/iPad Pro\/M4 & M5\/13\//, id: "ipad-pro-13-m4", device: ipad('iPad Pro 13" (M4)') },
  { match: /^iPadOS\/iPad Pro\/M4 & M5\/11\//, id: "ipad-pro-11-m4", device: ipad('iPad Pro 11" (M4)') },
  { match: /^iPadOS\/iPad Pro\/A12X to M2\/13\//, id: "ipad-pro-13", category: "tablet" },
  { match: /^iPadOS\/iPad Pro\/A12X to M2\/11\//, id: "ipad-pro-11", category: "tablet" },
  { match: /^iPadOS\/iPad Air\/M2 & M3\/13\//, id: "ipad-air-13", device: ipad('iPad Air 13"') },
  { match: /^iPadOS\/iPad Air\/M2 & M3\/11\//, id: "ipad-air", category: "tablet" },
  { match: /^iPadOS\/iPad Air\/M1\//, id: "ipad-air", category: "tablet", colorSuffix: " (M1)" },
  { match: /^iPadOS\/iPad mini\/A17 Pro\//, id: "ipad-mini-a17", device: ipad("iPad mini (A17 Pro)", [744, 1133]) },

  // Android tablets, whose frames are landscape.
  { match: /^Android Tablet\/Samsung Galaxy Tab S11 Ultra\//, id: "galaxy-tab-s11-ultra", device: { name: "Galaxy Tab S11 Ultra", category: "tablet", platform: "android-tablet", dpr: 2, uaModel: "SM-X930" } },
  { match: /^Android Tablet\/Pixel Tablet\//, id: "pixel-tablet", device: { name: "Pixel Tablet", category: "tablet", platform: "android-tablet", dpr: 2, width: 800, height: 1280, uaModel: "Pixel Tablet" } },

  // Mac. Width and height are landscape here, as desktops are.
  { match: /^MacBook\/MacBook Pro\/16\//, id: "macbook-pro-16", device: desktop('MacBook Pro 16"', 2) },
  { match: /^MacBook\/MacBook Pro\/14\//, id: "macbook-pro-14", device: desktop('MacBook Pro 14"', 2) },
  { match: /^MacBook\/MacBook Air\/15\//, id: "macbook-air-15", device: desktop('MacBook Air 15"', 2) },
  { match: /^MacBook\/MacBook Air\/13\//, id: "macbook-air-13", device: desktop('MacBook Air 13"', 2) },
  { match: /^MacBook\/MacBook Neo\//, id: "macbook-neo", device: desktop("MacBook Neo", 2) },
  { match: /^Mac Desktop\/iMac 24\//, id: "imac-24", device: desktop('iMac 24"', 2) },
  { match: /^Mac Desktop\/Studio Display\//, id: "studio-display", device: desktop("Studio Display", 2) },
  { match: /^Mac Desktop\/Pro Display XDR\//, id: "pro-display-xdr", device: desktop("Pro Display XDR", 2) },

  // Windows. Viewports follow each panel at Windows' default scaling.
  { match: /^Windows Laptop\/Dell\/2024 XPS 16/, id: "dell-xps-16", device: desktop("Dell XPS 16", 2.4, [1600, 1000]) },
  { match: /^Windows Laptop\/Dell\/2024 XPS 14/, id: "dell-xps-14", device: desktop("Dell XPS 14", 2, [1600, 1000]) },
  { match: /^Windows Laptop\/Dell\/2024 XPS 13 OLED/, id: "dell-xps-13", device: desktop("Dell XPS 13", 2, [1440, 900]) },
  { match: /^Windows Laptop\/Dell\/2023 XPS 13 Plus/, id: "dell-xps-13-plus", device: desktop("Dell XPS 13 Plus", 2, [1440, 900]) },
  { match: /^Windows Laptop\/Lenovo\/ThinkPad P14s/, id: "thinkpad-p14s", device: desktop("ThinkPad P14s", 1.25, [1536, 960]) },
  { match: /^Windows Laptop\/Microsoft\/Surface Laptop 15/, id: "surface-laptop-15", device: desktop("Surface Laptop 15", 1.5, [1664, 1109]) },
  { match: /^Windows Laptop\/Microsoft\/Surface Laptop 13/, id: "surface-laptop-13", device: desktop("Surface Laptop 13", 1.5, [1536, 1024]) },
  { match: /^Windows Desktop\/Dell UltraSharp/, id: "dell-ultrasharp-5k", device: desktop('Dell UltraSharp 27" 5K', 2) },
  { match: /^Windows Desktop\/Samsung S90PC/, id: "samsung-viewfinity-5k", device: desktop("Samsung ViewFinity 5K", 2) },
  { match: /^Windows Desktop\/Huawei MateView/, id: "huawei-mateview", device: desktop("Huawei MateView", 1.5) },
];

/** Frames that are left out: a drop shadow, or an Apple Pencil laid alongside. */
export const SKIP = /Shadow|Pencil|Wallpapers/;

/**
 * Apple's own bezels, from the Apple Design Resources disk images unpacked into ref/apple-bezels
 * by `bun run frames:extract`. `match` is tested against the path under that folder. These come
 * in every colour and both orientations, so they are read first and win over the frames above
 * for the same device and colour; colours only the other repo has are kept alongside.
 */
// prettier-ignore
export const APPLE_MODELS: ModelSpec[] = [
  // iPhone
  { match: /^iPhone 18 Pro Max\//, id: "iphone-18-pro-max", device: phone("iPhone 18 Pro Max", 3) },
  { match: /^iPhone 18 Pro\//, id: "iphone-18-pro", device: phone("iPhone 18 Pro", 3) },
  { match: /^iPhone Duo - .* - Inner Open/, id: "iphone-duo-inner", device: { ...phone("iPhone Duo (open)", 3, [890, 626]), category: "tablet" }, colorStrip: /Inner Open/ },
  { match: /^iPhone Duo - .* - Outer Closed/, id: "iphone-duo-outer", device: phone("iPhone Duo (closed)", 3), colorStrip: /Outer Closed/ },
  { match: /^iPhone 17 Pro Max\//, id: "iphone-17-pro-max", device: phone("iPhone 17 Pro Max", 3) },
  { match: /^iPhone 17 Pro\//, id: "iphone-17-pro", device: phone("iPhone 17 Pro", 3) },
  { match: /^iPhone 17\//, id: "iphone-17", device: phone("iPhone 17", 3) },
  { match: /^iPhone Air\//, id: "iphone-air", device: phone("iPhone Air", 3, [420, 912]) },
  { match: /^iPhone 16 Pro Max\//, id: "iphone-16-pro-max", device: phone("iPhone 16 Pro Max", 3) },
  { match: /^iPhone 16 Pro\//, id: "iphone-16-pro", device: phone("iPhone 16 Pro", 3) },
  { match: /^iPhone 16 Plus\//, id: "iphone-16-plus", device: phone("iPhone 16 Plus", 3) },
  { match: /^iPhone 16\//, id: "iphone-16", device: phone("iPhone 16", 3) },

  // iPad
  { match: /^iPad Pro \(M5\) 13"/, id: "ipad-pro-13-m4", device: ipad('iPad Pro 13" (M5)') },
  { match: /^iPad Pro \(M5\) 11"/, id: "ipad-pro-11-m4", device: ipad('iPad Pro 11" (M5)') },
  { match: /^iPad Air 13" \(M4\)/, id: "ipad-air-13-m4", device: ipad('iPad Air 13" (M4)') },
  { match: /^iPad Air 11" \(M4\)/, id: "ipad-air-11-m4", device: ipad('iPad Air 11" (M4)') },
  { match: /^iPad mini \(A17 Pro\)/, id: "ipad-mini-a17", device: ipad("iPad mini (A17 Pro)", [744, 1133]) },
  { match: /^iPad \(A16\)/, id: "ipad-a16", device: ipad("iPad (A16)") },

  // Mac. Width and height are landscape, as desktops are.
  { match: /^MacBook Pro M5 16-inch/, id: "macbook-pro-16", device: desktop('MacBook Pro 16"', 2) },
  { match: /^MacBook Pro M5 14-inch/, id: "macbook-pro-14", device: desktop('MacBook Pro 14"', 2) },
  { match: /^MacBook Air M5 15-inch/, id: "macbook-air-15", device: desktop('MacBook Air 15"', 2) },
  { match: /^MacBook Air M5 13-inch/, id: "macbook-air-13", device: desktop('MacBook Air 13"', 2) },
  { match: /^MacBook Neo/, id: "macbook-neo", device: desktop("MacBook Neo", 2) },
  { match: /^iMac M4 24-inch/, id: "imac-24", device: desktop('iMac 24"', 2) },
  { match: /^Studio Display XDR 2026/, id: "studio-display-xdr", device: desktop("Studio Display XDR", 2), colorStrip: /\bOn\b|\bBackground\b/g },
  { match: /^Studio Display 2026/, id: "studio-display-2026", device: desktop("Studio Display (2026)", 2), colorStrip: /\bOn\b|\bBackground\b/g },
];

/** The Duo shown open from the back has no screen, and the Apple TV image is the box. */
export const APPLE_SKIP = /Outer Open|Apple TV/;
