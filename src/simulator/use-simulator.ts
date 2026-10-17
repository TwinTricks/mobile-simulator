import { useCallback, useEffect, useState } from "react";

import { applyTheme, cacheTheme } from "@/lib/theme";
import { sendRequest } from "@/shared/messages";
import type { Settings, SimulatorState } from "@/shared/types";
import { readSettings, readState, saveSettings, saveState } from "@/storage/simulator-store";
import { withDefaultDevice } from "./default-device";

/**
 * The simulator's saved state and settings. Both are `null` until storage answers, and every
 * change is written back as it happens.
 */
export function useSimulator() {
  const [state, setState] = useState<SimulatorState | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void Promise.all([readState(), readSettings()]).then(([savedState, savedSettings]) => {
      // The popup and "Simulate current tab" open the simulator with the address in the query.
      const initialUrl = new URLSearchParams(window.location.search).get("url");
      const opened = withDefaultDevice(savedState, savedSettings.defaultDeviceId);
      setState(initialUrl ? { ...opened, url: initialUrl } : opened);
      setSettings(savedSettings);
    });
  }, []);

  useEffect(() => {
    if (state) void saveState(state);
  }, [state]);

  useEffect(() => {
    if (settings) void saveSettings(settings);
  }, [settings]);

  const theme = settings?.theme;
  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    cacheTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  // Also on load, in case the mode was changed in another session.
  const cspMode = settings?.cspMode;
  useEffect(() => {
    if (cspMode) void sendRequest({ type: "set-csp-mode", mode: cspMode });
  }, [cspMode]);

  const updateState = useCallback((recipe: (current: SimulatorState) => SimulatorState) => {
    setState((current) => (current ? recipe(current) : current));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return { state, settings, updateState, updateSettings };
}
