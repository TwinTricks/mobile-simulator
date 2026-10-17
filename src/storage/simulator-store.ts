import { STORAGE_KEYS } from "@/shared/constants";
import { defaultPresets } from "@/shared/devices";
import { settingsSchema, simulatorStateSchema } from "@/shared/schemas";
import type { Settings, SimulatorState } from "@/shared/types";
import {
  chromeLocalStore,
  chromeSessionStore,
  type KeyValueStore,
} from "@/storage/key-value-store";

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export async function readSettings(store: KeyValueStore = chromeLocalStore): Promise<Settings> {
  try {
    return settingsSchema.parse((await store.get(STORAGE_KEYS.settings)) ?? {});
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: Settings,
  store: KeyValueStore = chromeLocalStore,
): Promise<void> {
  await store.set(STORAGE_KEYS.settings, settings);
}

/** The saved state, with the starter presets seeded the first time it is ever read. */
export async function readState(store: KeyValueStore = chromeLocalStore): Promise<SimulatorState> {
  let state: SimulatorState;
  try {
    state = simulatorStateSchema.parse((await store.get(STORAGE_KEYS.state)) ?? {});
  } catch {
    state = simulatorStateSchema.parse({});
  }
  if (!state.presetsInitialized) {
    state = {
      ...state,
      presets: [...state.presets, ...defaultPresets()],
      presetsInitialized: true,
    };
  }
  return state;
}

export async function saveState(
  state: SimulatorState,
  store: KeyValueStore = chromeLocalStore,
): Promise<void> {
  await store.set(STORAGE_KEYS.state, state);
}

export type OverlayImages = Record<string, string>;

/** Design overlay images by device id, as data URLs. */
export async function readOverlayImages(
  store: KeyValueStore = chromeLocalStore,
): Promise<OverlayImages> {
  try {
    const saved = await store.get<unknown>(STORAGE_KEYS.overlayImages);
    if (typeof saved !== "object" || saved === null) return {};
    return Object.fromEntries(
      Object.entries(saved).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].startsWith("data:image/"),
      ),
    );
  } catch {
    return {};
  }
}

/** Sets one device's overlay image, or removes it with `null`. */
export async function saveOverlayImage(
  deviceId: string,
  dataUrl: string | null,
  store: KeyValueStore = chromeLocalStore,
): Promise<OverlayImages> {
  const images = await readOverlayImages(store);
  if (dataUrl) images[deviceId] = dataUrl;
  else delete images[deviceId];
  await store.set(STORAGE_KEYS.overlayImages, images);
  return images;
}

/** Warnings closed in this browser session, which stay closed until the browser restarts. */
export async function readDismissedWarnings(
  store: KeyValueStore = chromeSessionStore,
): Promise<Set<string>> {
  try {
    return new Set((await store.get<string[]>(STORAGE_KEYS.dismissedWarnings)) ?? []);
  } catch {
    return new Set();
  }
}

export async function dismissWarning(
  key: string,
  store: KeyValueStore = chromeSessionStore,
): Promise<void> {
  try {
    const current = await readDismissedWarnings(store);
    current.add(key);
    await store.set(STORAGE_KEYS.dismissedWarnings, [...current]);
  } catch {
    // Forgetting a dismissal only means the warning can come back.
  }
}
