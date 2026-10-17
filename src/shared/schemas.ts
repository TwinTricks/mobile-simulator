import { z } from "zod";

import { DEFAULT_VISIBLE_IDS } from "@/shared/devices";
import { DEFAULT_INLINE_HOSTS } from "@/shared/inline";

export const deviceCategorySchema = z.enum(["phone", "tablet", "desktop", "custom"]);

export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  dpr: z.number(),
  category: deviceCategorySchema,
  ua: z.string().nullable(),
});

export const presetSchema = z.object({
  id: z.string(),
  name: z.string(),
  deviceIds: z.array(z.string()),
});

export const themeChoiceSchema = z.enum(["system", "light", "dark"]);
export const colorSchemeSchema = z.enum(["auto", "light", "dark"]);
/** `strip` removes CSP and X-Frame-Options, `xfo-only` keeps the site's CSP, `off` changes nothing. */
export const cspModeSchema = z.enum(["strip", "xfo-only", "off"]);

export const shotFormatSchema = z.enum(["png", "jpeg", "webp"]);
export const shotRatioSchema = z.enum(["auto", "1:1", "9:16", "4:5", "16:9"]);
export const recordRatioSchema = z.enum(["auto", "16:9", "4:3", "1:1", "9:16", "custom"]);

/** How screenshots are dressed up, remembered from one screenshot to the next. */
export const screenshotSettingsSchema = z.object({
  format: shotFormatSchema.catch("png"),
  /** A gradient's id from the screenshot backgrounds, `solid` or `none`. */
  background: z.string().catch("violet"),
  solidColor: z.string().catch("#f4f4f5"),
  /** Space around the devices, as a percentage of their longer side. */
  padding: z.number().min(0).max(40).catch(10),
  /** 0 is no shadow at all. */
  shadow: z.number().min(0).max(100).catch(50),
  ratio: shotRatioSchema.catch("auto"),
  caption: z.boolean().catch(false),
  captionText: z.string().catch(""),
  frame: z.boolean().catch(true),
});

/** How screen recordings are made, remembered from one recording to the next. */
export const recordingSettingsSchema = z.object({
  /** Seconds counted down before recording starts; 0 starts straight away. */
  countdown: z.union([z.literal(0), z.literal(3), z.literal(5)]).catch(3),
  microphone: z.boolean().catch(false),
  /** `frame` keeps the device's frame in the video, `screen` keeps only what's on its screen. */
  crop: z.enum(["frame", "screen"]).catch("frame"),
  /** A wallpaper's id, `solid`, or `none` for the stage as it is. */
  backdrop: z.string().catch("none"),
  backdropColor: z.string().catch("#f4f4f5"),
  /** The video's shape; `auto` is the shape of what is recorded, `custom` the box drawn. */
  ratio: recordRatioSchema.catch("auto"),
  /** The custom box's edges, in pixels beyond the devices on each side. */
  customBox: z
    .object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() })
    .catch({ left: 80, top: 80, right: 80, bottom: 80 }),
  /** Percentages: the devices' shadow, the backdrop's blur, and the devices' size in the video. */
  shadow: z.number().min(0).max(100).catch(60),
  blur: z.number().min(0).max(100).catch(0),
  size: z.number().min(40).max(100).catch(100),
  /** The cursor drawn into the video, or `none`. */
  cursor: z.string().catch("arrow"),
  /** The webcam in a round bubble in the video's corner. */
  camera: z.boolean().catch(false),
  /** Which camera and microphone; empty for the default one. */
  cameraId: z.string().catch(""),
  microphoneId: z.string().catch(""),
  quality: z.enum(["good", "high", "best"]).catch("high"),
});

/** The phone drawn inside a website's own page, opened with `#mobile-sim` in its address. */
export const inlineSettingsSchema = z.object({
  enabled: z.boolean().catch(true),
  /** Hosts the page may open it on; `*.test` covers every host under `test`. */
  hosts: z.array(z.string()).catch(() => [...DEFAULT_INLINE_HOSTS]),
});

// Every field falls back on its own, so a stored value from an older release, or one that was
// edited by hand, costs that one field rather than the whole object.
export const settingsSchema = z.object({
  theme: themeChoiceSchema.catch("system"),
  /**
   * Where the simulator opens: a tab of its own, in place of the page it was opened from, or
   * full screen over that page, where recording needs no share prompt.
   */
  openIn: z.enum(["new-tab", "same-tab", "over-page"]).catch("new-tab"),
  syncScroll: z.boolean().catch(true),
  /** With several devices, a click in one is repeated in the others. */
  syncClicks: z.boolean().catch(true),
  /** With several devices, typing and ticking in one is repeated in the others. */
  syncInput: z.boolean().catch(true),
  /** With several devices, opening a page in one opens it in the others. */
  syncNavigation: z.boolean().catch(true),
  /** 0 fits the devices to the window; anything else is a fixed scale. */
  zoom: z.number().nonnegative().catch(0),
  /** Off shows one device at a time; on lays every picked device out side by side. */
  multiDevice: z.boolean().catch(false),
  spoofUA: z.boolean().catch(true),
  /** Phones and tablets get a fingertip cursor and scroll by dragging. */
  touchMode: z.boolean().catch(true),
  /** Phones and tablets bring up their own keyboard when a text field takes focus. */
  keyboard: z.boolean().catch(true),
  bezelMode: z.boolean().catch(true),
  /** The clock, signal and battery across the top of phones and tablets. */
  statusBar: z.boolean().catch(true),
  /** The bar along the bottom of the screen on phones and tablets without a home button. */
  homeIndicator: z.boolean().catch(true),
  /** Safari's or Chrome's address bar and toolbar around the page, as on the real phone. */
  browserChrome: z.boolean().catch(false),
  compactView: z.boolean().catch(false),
  /** How several devices are laid out: wrapping rows, one row, one column, or one big. */
  layout: z.enum(["wrap", "row", "column", "focus"]).catch("wrap"),
  /** The Tailwind breakpoint each device's width falls in, beside its name. */
  breakpoints: z.boolean().catch(true),
  /** Pixel rulers along the top and left of each screen. */
  rulers: z.boolean().catch(false),
  /** Spacing of the grid laid over each screen, in CSS pixels; 0 is no grid. */
  gridSize: z.union([z.literal(0), z.literal(4), z.literal(8), z.literal(16)]).catch(0),
  /** Off hides the page's scrollbars, as a phone does; on keeps them. */
  nativeScrollbars: z.boolean().catch(false),
  /** Shown first each time the simulator opens; empty keeps the last devices. */
  defaultDeviceId: z.string().max(100).catch(""),
  /** The charge the status bar's battery shows, in percent. */
  batteryLevel: z.number().int().min(1).max(100).catch(100),
  /** "HH:MM" pins the status bar's clock; empty follows the real time. */
  forcedTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$|^$/)
    .catch(""),
  /** Shown in the browser bars in place of the real address; empty shows the real one. */
  displayUrl: z.string().max(500).catch(""),
  /** Pages with a web app manifest are shown as an installed app, without browser bars. */
  detectPwa: z.boolean().catch(true),
  /** The colour behind the devices; empty follows the theme. */
  stageBackground: z
    .string()
    .regex(/^#[0-9a-f]{6}$|^$/i)
    .catch(""),
  /** The rail hides until the pointer comes to the right edge. */
  presentation: z.boolean().catch(false),
  forceColorScheme: colorSchemeSchema.catch("auto"),
  cspMode: cspModeSchema.catch("strip"),
  screenshot: screenshotSettingsSchema.catch(() => screenshotSettingsSchema.parse({})),
  recording: recordingSettingsSchema.catch(() => recordingSettingsSchema.parse({})),
  inline: inlineSettingsSchema.catch(() => inlineSettingsSchema.parse({})),
});

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const frameTintSchema = z.object({ from: hexColor, to: hexColor });

/** How a device's design overlay sits over its screen. The image itself is stored apart. */
export const overlaySchema = z.object({
  visible: z.boolean().catch(true),
  opacity: z.number().min(0).max(1).catch(0.5),
  /** Shows only where the page and the design differ. */
  difference: z.boolean().catch(false),
  x: z.number().catch(0),
  y: z.number().catch(0),
});

export const simulatorStateSchema = z.object({
  url: z.string().catch(""),
  /** Addresses opened from the Page panel, newest first. */
  recentUrls: z.array(z.string()).catch([]),
  visibleDeviceIds: z.array(z.string()).catch(() => [...DEFAULT_VISIBLE_IDS]),
  rotations: z.record(z.string(), z.boolean()).catch({}),
  /** The frame colour picked for each device, by device id. */
  frameColors: z.record(z.string(), z.string()).catch({}),
  /** A gradient laid over a device's frame colour, by device id. */
  frameTints: z.record(z.string(), frameTintSchema).catch({}),
  /** Sites remembered for comparing, as origins. */
  environments: z.array(z.string()).catch([]),
  /** The remembered sites shown side by side; two or more turns comparing on. */
  compareOrigins: z.array(z.string()).catch([]),
  /** Design overlays by device id. */
  overlays: z.record(z.string(), overlaySchema).catch({}),
  /** The device shown big in the focus layout, by pane key. */
  focusKey: z.string().nullable().catch(null),
  customDevices: z.array(deviceSchema).catch([]),
  presets: z.array(presetSchema).catch([]),
  /** True once the starter presets have been seeded, so deleting them all sticks. */
  presetsInitialized: z.boolean().catch(false),
});
