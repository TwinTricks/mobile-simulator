export const APP_NAME = "Mobile Simulator";

/** Where the build puts the simulator page, relative to the extension root. */
export const SIMULATOR_PATH = "src/simulator/index.html";
/** The same simulator, laid out for Chrome's side panel. */
export const SIDE_PANEL_PATH = "src/simulator/panel.html";
/** On the simulator's address when it took a website's place: the address to go back to. */
export const RETURN_PARAM = "return";
/**
 * The extension's shortcut for recording. Pressed on the simulator's tab, it lets the extension
 * capture that tab without Chrome's share prompt, there and then and until the tab leaves.
 */
export const RECORD_COMMAND = "record-video";
/** Sent to the simulator's tab when the recording shortcut is pressed there. */
export type RecordTabMessage = { __msimRecord: "toggle" };

/** In `chrome.storage.session`: the token the full-screen simulator must arrive with. */
export const OVERLAY_TOKEN_KEY = "overlay-token";

/**
 * Appended to each frame's URL while User-Agent spoofing is on, so a dynamic rule can match the
 * requests of exactly one device.
 */
export const SIM_PARAM = "__sim_device";

/** Dynamic rule ids start here, clear of the static rulesets, which use small ids. */
export const DYNAMIC_RULE_BASE = 1000;

// Must match the ids in src/manifest.ts.
export const RULESET_STRIP_CSP_AND_XFO = "iframe_rules";
export const RULESET_STRIP_XFO_ONLY = "iframe_rules_xfo_only";

// Unchanged from the plain-JS releases, so an update keeps everyone's devices and settings.
export const STORAGE_KEYS = {
  state: "sim-state",
  settings: "sim-settings",
  dismissedWarnings: "sim-dismissed-warnings",
  /** Design overlay images by device id, apart from the state that is saved on every change. */
  overlayImages: "sim-overlay-images",
} as const;

/** Overlay images past this size are refused, as chrome.storage.local holds 10 MB in all. */
export const MAX_OVERLAY_BYTES = 3 * 1024 * 1024;

/** After this long a frame offers a Stop button instead of spinning forever. */
export const SLOW_LOAD_MS = 15_000;

/** The zoom button walks these in order. 0 fits the devices to the window. */
export const ZOOM_LEVELS = [0, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Compact view shrinks everything to this fraction on top of the chosen zoom. */
export const COMPACT_SCALE = 0.6;

export const CUSTOM_DEVICE_LIMITS = {
  minSize: 100,
  maxSize: 3840,
  maxNameLength: 40,
} as const;

export const MAX_PRESET_NAME_LENGTH = 60;
