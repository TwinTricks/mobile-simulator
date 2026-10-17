import { describe, expect, it } from "vitest";

import { STORAGE_KEYS } from "@/shared/constants";
import { DEFAULT_VISIBLE_IDS, defaultPresets } from "@/shared/devices";
import { MemoryStore } from "./key-value-store";
import {
  DEFAULT_SETTINGS,
  dismissWarning,
  readDismissedWarnings,
  readOverlayImages,
  readSettings,
  readState,
  saveOverlayImage,
  saveState,
} from "./simulator-store";

describe("overlay images", () => {
  it("adds and removes one device's image without touching the others", async () => {
    const store = new MemoryStore();
    await saveOverlayImage("a", "data:image/png;base64,AAA", store);
    await saveOverlayImage("b", "data:image/png;base64,BBB", store);
    await saveOverlayImage("a", null, store);
    expect(await readOverlayImages(store)).toEqual({ b: "data:image/png;base64,BBB" });
  });

  it("drops anything that isn't an image", async () => {
    const store = new MemoryStore();
    await store.set(STORAGE_KEYS.overlayImages, { a: "javascript:1", b: 4 });
    expect(await readOverlayImages(store)).toEqual({});
  });
});

describe("readState", () => {
  it("starts with the default devices and seeds the starter presets", async () => {
    const state = await readState(new MemoryStore());
    expect(state.visibleDeviceIds).toEqual(DEFAULT_VISIBLE_IDS);
    expect(state.presets).toEqual(defaultPresets());
    expect(state.presetsInitialized).toBe(true);
  });

  it("does not seed the presets again once someone has deleted them", async () => {
    const store = new MemoryStore();
    await saveState({ ...(await readState(store)), presets: [] }, store);
    expect((await readState(store)).presets).toEqual([]);
  });

  it("keeps the good fields of a damaged saved state", async () => {
    const store = new MemoryStore();
    await store.set(STORAGE_KEYS.state, {
      url: "https://example.com/",
      visibleDeviceIds: "not a list",
      presetsInitialized: true,
    });
    const state = await readState(store);
    expect(state.url).toBe("https://example.com/");
    expect(state.visibleDeviceIds).toEqual(DEFAULT_VISIBLE_IDS);
  });
});

describe("readSettings", () => {
  it("fills in what an older release did not save", async () => {
    const store = new MemoryStore();
    await store.set(STORAGE_KEYS.settings, { theme: "dark", stripHeaders: true });
    expect(await readSettings(store)).toEqual({ ...DEFAULT_SETTINGS, theme: "dark" });
  });

  it("falls back per field on bad values", async () => {
    const store = new MemoryStore();
    await store.set(STORAGE_KEYS.settings, { zoom: -1, cspMode: "everything", spoofUA: false });
    expect(await readSettings(store)).toEqual({ ...DEFAULT_SETTINGS, spoofUA: false });
  });
});

describe("dismissed warnings", () => {
  it("remembers each dismissal", async () => {
    const store = new MemoryStore();
    await dismissWarning("invalid-url", store);
    await dismissWarning("presets-already-present", store);
    expect(await readDismissedWarnings(store)).toEqual(
      new Set(["invalid-url", "presets-already-present"]),
    );
  });
});
