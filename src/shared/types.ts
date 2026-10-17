import type { z } from "zod";

import type {
  colorSchemeSchema,
  cspModeSchema,
  deviceCategorySchema,
  deviceSchema,
  frameTintSchema,
  inlineSettingsSchema,
  overlaySchema,
  presetSchema,
  recordRatioSchema,
  recordingSettingsSchema,
  screenshotSettingsSchema,
  settingsSchema,
  shotFormatSchema,
  shotRatioSchema,
  simulatorStateSchema,
  themeChoiceSchema,
} from "@/shared/schemas";

export type DeviceCategory = z.infer<typeof deviceCategorySchema>;
export type Device = z.infer<typeof deviceSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type ThemeChoice = z.infer<typeof themeChoiceSchema>;
export type ColorScheme = z.infer<typeof colorSchemeSchema>;
export type CspMode = z.infer<typeof cspModeSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ScreenshotSettings = z.infer<typeof screenshotSettingsSchema>;
export type FrameTint = z.infer<typeof frameTintSchema>;
export type InlineSettings = z.infer<typeof inlineSettingsSchema>;
export type Overlay = z.infer<typeof overlaySchema>;
export type RecordingSettings = z.infer<typeof recordingSettingsSchema>;
export type RecordRatio = z.infer<typeof recordRatioSchema>;
export type RecordQuality = RecordingSettings["quality"];
export type ShotFormat = z.infer<typeof shotFormatSchema>;
export type ShotRatio = z.infer<typeof shotRatioSchema>;
export type SimulatorState = z.infer<typeof simulatorStateSchema>;
