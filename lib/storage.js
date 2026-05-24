import { browserAPI } from './browser.js';
import { DEFAULT_VISIBLE_IDS, defaultPresets } from './devices.js';

const STATE_KEY = 'sim-state';
const SETTINGS_KEY = 'sim-settings';

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  syncScroll: true,
  zoom: 1,
  stripHeaders: true,
  spoofUA: true,
  bezelMode: true,
  compactView: false,
  forceColorScheme: 'auto',
  // 'strip' = remove CSP+XFO (default), 'xfo-only' = strip XFO only, 'off' = no header changes
  cspMode: 'strip',
});

export const DEFAULT_STATE = Object.freeze({
  url: '',
  visibleDeviceIds: [...DEFAULT_VISIBLE_IDS],
  rotations: {},
  customDevices: [],
  presets: [],
  presetsInitialized: false,
});

export async function getState() {
  try {
    const res = await browserAPI.storage.local.get(STATE_KEY);
    const merged = { ...DEFAULT_STATE, ...(res[STATE_KEY] || {}) };
    // Seed default presets once
    if (!merged.presetsInitialized) {
      merged.presets = [...(merged.presets || []), ...defaultPresets()];
      merged.presetsInitialized = true;
    }
    return merged;
  } catch {
    return { ...DEFAULT_STATE, presets: defaultPresets(), presetsInitialized: true };
  }
}

export async function saveState(state) {
  await browserAPI.storage.local.set({ [STATE_KEY]: state });
}

export async function getSettings() {
  try {
    const res = await browserAPI.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await browserAPI.storage.local.set({ [SETTINGS_KEY]: settings });
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Session-only dismissed warnings (Feature 6)
const DISMISSED_KEY = 'sim-dismissed-warnings';

export async function getDismissedWarnings() {
  try {
    const session = browserAPI.storage.session;
    if (!session) return new Set();
    const res = await session.get(DISMISSED_KEY);
    return new Set(res[DISMISSED_KEY] || []);
  } catch {
    return new Set();
  }
}

export async function dismissWarning(key) {
  try {
    const session = browserAPI.storage.session;
    if (!session) return;
    const current = await getDismissedWarnings();
    current.add(key);
    await session.set({ [DISMISSED_KEY]: [...current] });
  } catch {}
}
