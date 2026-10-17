import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { InlineMessage } from "@/components/app/InlineMessage";
import { frameUrl, spoofedDevices } from "@/lib/header-rules";
import { nextInCycle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { COMPACT_SCALE, ZOOM_LEVELS, type RecordTabMessage } from "@/shared/constants";
import { PRESET_DEVICES, findDevice } from "@/shared/devices";
import { frameVariant, frameVariants } from "@/shared/frames";
import {
  frameIdentity,
  identityName,
  type PwaMessage,
  type ScrollbarsMessage,
  type TouchMessage,
} from "@/shared/identity";
import { sendRequest } from "@/shared/messages";
import { overlaySchema } from "@/shared/schemas";
import type { Device, Overlay, RecordingSettings, Settings, SimulatorState } from "@/shared/types";
import { rememberUrl } from "@/shared/recent-urls";
import { normalizeUrl } from "@/shared/url";
import {
  dismissWarning,
  readDismissedWarnings,
  readOverlayImages,
  saveOverlayImage,
  type OverlayImages,
} from "@/storage/simulator-store";
import { DevConsole } from "./components/DevConsole";
import { DeviceFrame } from "./components/DeviceFrame";
import { DevicesPanel } from "./components/DevicesPanel";
import { FrameColorPanel } from "./components/FrameColorPanel";
import { EmptyState } from "./components/EmptyState";
import { PagePanel } from "./components/PagePanel";
import { PresentationEdge } from "./components/PresentationEdge";
import { Rail, type RailPanel } from "./components/Rail";
import { RecordingCountdown } from "./components/RecordingCountdown";
import { RecordingDialog } from "./components/RecordingDialog";
import { ScreenshotDialog } from "./components/ScreenshotDialog";
import { SettingsPanel } from "./components/SettingsPanel";
import { SidePanel } from "./components/SidePanel";
import { ToolsPanel } from "./components/ToolsPanel";
import { syncUserAgentRules } from "./dynamic-rules";
import { onOrigin, originColor, originLabel, panesFor, type Pane } from "./environments";
import { moveId, type Layout } from "./layout";
import { fitZoom } from "./frame-box";
import { readTopColor, relayScroll, stepHistory } from "./frame-bridge";
import {
  appendCapped,
  readDevReport,
  syncMissEntry,
  type LogEntry,
  type RequestEntry,
} from "./devtools";
import {
  createNavRelay,
  readMissed,
  readNavReport,
  readSyncAction,
  shouldRelay,
  type SyncOptions,
} from "./interaction-sync";
import { MODE, closeSimulator, overlayAllowed } from "./mode";
import { formatElapsed } from "./recording/recorder";
import { useRecorder } from "./recording/use-recorder";
import { backdropColor, backdropCss, isStudio } from "./recording/studio";
import { StudioBar } from "./components/StudioBar";
import { StudioPanel } from "./components/StudioPanel";
import { RecordingStudio, placeStudioBox } from "./components/RecordingStudio";
import { captureScreens, settle, type Capture } from "./screenshot/capture";
import { captureFullPage, type FullPageShot } from "./screenshot/full-page";
import { FullPageDialog } from "./components/FullPageDialog";
import { isTyping, shortcutFor, stepZoom, type ShortcutAction } from "./shortcuts";
import { useFollowedTabUrl } from "./use-followed-tab";
import { useSimulator } from "./use-simulator";

// Room kept around the devices, and under each one for its name.
const STAGE_PADDING = MODE === "panel" ? 16 : 32;
const CAPTION_HEIGHT = 30;
// One device on Fit grows past its real size to fill this share of the stage's height.
const SINGLE_FIT_SHARE = 0.94;
const SINGLE_FIT_MAX = 2;
// The small devices beside the big one in the focus layout.
const THUMB_ROOM = { width: 150, height: 300 };
const LAYOUT_GAP = 40;
// Long enough for a closing side panel to finish fading out before the tab is captured.
const PANEL_FADE_MS = 250;
// A zoom someone asked for animates; one the window caused by resizing does not.
const ZOOM_ANIMATION_MS = 400;

export function App() {
  const { state, settings, updateState, updateSettings } = useSimulator();
  const [allowed, setAllowed] = useState(MODE !== "overlay");

  useEffect(() => {
    if (MODE === "overlay") void overlayAllowed().then(setAllowed);
  }, []);

  if (!state || !settings || !allowed) return null;
  return (
    <Simulator
      state={state}
      settings={settings}
      updateState={updateState}
      updateSettings={updateSettings}
    />
  );
}

type SimulatorProps = {
  state: SimulatorState;
  settings: Settings;
  updateState: (recipe: (current: SimulatorState) => SimulatorState) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

function Simulator({ state, settings, updateState, updateSettings }: SimulatorProps) {
  // The side panel shows whatever the window's active tab shows, and has no address of its own.
  const followedUrl = useFollowedTabUrl(MODE === "panel");
  const url = MODE === "panel" ? followedUrl : state.url;
  const [openPanel, setOpenPanel] = useState<RailPanel | null>(
    state.url || MODE === "panel" ? null : "page",
  );
  const [warning, setWarning] = useState<{ text: string; key: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [appliedUaIds, setAppliedUaIds] = useState<ReadonlySet<string> | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  /** The colour each device's page shows at its top edge, as the page last reported it. */
  const [topColors, setTopColors] = useState<Record<string, string>>({});
  /** Which frames are showing a page that opens like an installed web app. */
  const [pwaKeys, setPwaKeys] = useState<Record<string, boolean>>({});
  const [capturing, setCapturing] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [fullPages, setFullPages] = useState<FullPageShot[] | null>(null);
  const [fullPageProgress, setFullPageProgress] = useState<number | null>(null);
  const [overlayImages, setOverlayImages] = useState<OverlayImages>({});
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [animateZoom, setAnimateZoom] = useState(false);
  const zoomTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissed = useRef<Set<string>>(new Set());
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const stageRef = useRef<HTMLElement>(null);
  const devicesRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const devices = state.visibleDeviceIds
      .map((id) => findDevice(id, state.customDevices))
      .filter((d): d is Device => d !== null);
    return settings.multiDevice ? devices : devices.slice(0, 1);
  }, [state.visibleDeviceIds, state.customDevices, settings.multiDevice]);

  const spoofed = useMemo(() => spoofedDevices(shown, settings.spoofUA), [shown, settings.spoofUA]);

  const compareOrigins = useMemo(
    () => state.compareOrigins.filter((o) => state.environments.includes(o)),
    [state.compareOrigins, state.environments],
  );
  const panes = useMemo(() => panesFor(shown, compareOrigins), [shown, compareOrigins]);
  /** Each pane as a device of its own, named for the site it shows, for lists of panes. */
  const paneDevices = useMemo(
    () =>
      panes.map((p) => ({
        ...p.device,
        id: p.key,
        name: p.origin ? `${p.device.name} · ${originLabel(p.origin)}` : p.device.name,
      })),
    [panes],
  );
  const several = panes.length > 1;

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setStage({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout: Layout = several ? settings.layout : "wrap";
  const focusPane =
    layout === "focus" ? (panes.find((p) => p.key === state.focusKey) ?? panes[0]!) : null;

  const fitDevice = useCallback(
    (device: Device, room: { width: number; height: number }, max: number) =>
      fitZoom(
        device,
        !!state.rotations[device.id],
        settings.bezelMode,
        state.frameColors[device.id],
        room,
        max,
      ),
    [state.rotations, settings.bezelMode, state.frameColors],
  );

  // Fit gives every device the same scale, the largest at which the tallest still fits. One
  // device, or the big one in focus, also has to fit across; rows wrap or scroll instead, and a
  // column fits across alone.
  const baseZoom = useMemo(() => {
    const width = stage.width - 2 * STAGE_PADDING;
    if (settings.zoom !== 0) {
      // The side panel is as narrow as Chrome or the user makes it, and can't be scrolled
      // sideways comfortably, so a chosen zoom never takes a device past its width.
      if (MODE !== "panel" || stage.width === 0 || shown.length === 0) return settings.zoom;
      const across = { width, height: Infinity };
      return Math.min(...shown.map((device) => fitDevice(device, across, settings.zoom)));
    }
    if (stage.height === 0 || shown.length === 0) return 1;
    const height = stage.height - 2 * STAGE_PADDING - CAPTION_HEIGHT;
    if (focusPane) {
      return fitDevice(
        focusPane.device,
        { width: width - THUMB_ROOM.width - LAYOUT_GAP, height: height * SINGLE_FIT_SHARE },
        SINGLE_FIT_MAX,
      );
    }
    const room = !several
      ? { width, height: height * SINGLE_FIT_SHARE }
      : layout === "column"
        ? { width, height: Infinity }
        : { width: Infinity, height };
    const max = several ? 1 : SINGLE_FIT_MAX;
    return Math.min(...shown.map((device) => fitDevice(device, room, max)));
  }, [settings.zoom, several, layout, focusPane, stage, shown, fitDevice]);
  // Compact is for fitting a row of devices; one device is always shown at its chosen size.
  const zoom = settings.compactView && several && !focusPane ? baseZoom * COMPACT_SCALE : baseZoom;
  const zoomFor = (pane: Pane) =>
    focusPane && pane.key !== focusPane.key ? fitDevice(pane.device, THUMB_ROOM, 1) : zoom;

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ key: string; after: boolean } | null>(null);
  const endDrag = () => {
    setDragId(null);
    setDropAt(null);
    delete document.documentElement.dataset.dragging;
  };

  const single = shown.length === 1 ? shown[0]! : null;
  const colorChoices = single && settings.bezelMode ? frameVariants(single.id) : [];
  const currentColor =
    single && colorChoices.length > 1
      ? frameVariant(single.id, state.frameColors[single.id])
      : null;

  // A spoofed frame waits for its rule, or its first requests would go out with the real
  // User-Agent. Frames already covered keep loading while the rules for others change.
  useEffect(() => {
    let current = true;
    void syncUserAgentRules(spoofed).then(() => {
      if (current) setAppliedUaIds(new Set(spoofed.map((d) => d.id)));
    });
    return () => {
      current = false;
    };
  }, [spoofed]);

  useEffect(() => {
    void readDismissedWarnings().then((keys) => {
      dismissed.current = keys;
    });
    void readOverlayImages().then(setOverlayImages);
  }, []);

  function setOverlayImage(deviceId: string, dataUrl: string | null) {
    setOverlayImages((images) => {
      const next = { ...images };
      if (dataUrl) next[deviceId] = dataUrl;
      else delete next[deviceId];
      return next;
    });
    void saveOverlayImage(deviceId, dataUrl).catch(() =>
      showWarning("The design could not be saved, so it will be gone next time.", "overlay-save"),
    );
  }

  function changeOverlay(deviceId: string, patch: Partial<Overlay>) {
    updateState((s) => ({
      ...s,
      overlays: {
        ...s.overlays,
        [deviceId]: { ...overlaySchema.parse(s.overlays[deviceId] ?? {}), ...patch },
      },
    }));
  }

  const showWarning = useCallback((text: string, key: string) => {
    if (dismissed.current.has(key)) return;
    setWarning({ text, key });
  }, []);

  async function closeWarning() {
    if (!warning) return;
    dismissed.current.add(warning.key);
    setWarning(null);
    await dismissWarning(warning.key);
  }

  const registerFrame = useCallback((id: string, iframe: HTMLIFrameElement | null) => {
    if (iframe) frames.current.set(id, iframe);
    else frames.current.delete(id);
  }, []);

  const reloadAll = useCallback(() => setReloadToken((n) => n + 1), []);

  function navigate(input: string) {
    const normalized = normalizeUrl(input);
    if (normalized === null) {
      showWarning("Invalid URL.", "invalid-url");
      return;
    }
    if (!normalized) return;
    updateState((s) => ({
      ...s,
      url: normalized,
      recentUrls: rememberUrl(s.recentUrls, normalized),
    }));
    reloadAll();
    setOpenPanel(null);
  }

  function rotate() {
    if (shown.length === 0) return;
    const turned = !state.rotations[shown[0]!.id];
    updateState((s) => ({
      ...s,
      rotations: { ...s.rotations, ...Object.fromEntries(shown.map((d) => [d.id, turned])) },
    }));
  }

  function setZoom(next: number) {
    setAnimateZoom(true);
    clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setAnimateZoom(false), ZOOM_ANIMATION_MS);
    updateSettings({ zoom: next });
  }

  function nextFrameColor() {
    if (!single || !currentColor) return;
    const index = colorChoices.indexOf(currentColor);
    setFrameColor(single.id, colorChoices[(index + 1) % colorChoices.length]!.color);
  }

  function setFrameColor(deviceId: string, color: string) {
    updateState((s) => ({ ...s, frameColors: { ...s.frameColors, [deviceId]: color } }));
  }

  async function takeScreenshot() {
    if (shown.length === 0 || capturing) return;
    const panelWasOpen = openPanel !== null;
    setOpenPanel(null);
    setCapturing(true);
    try {
      await settle(panelWasOpen || warning ? PANEL_FADE_MS : 0);
      const taken = await captureScreens(
        panes.map(({ key, device }) => ({ device, key, rotated: !!state.rotations[device.id] })),
      );
      if (taken.screens.length === 0) {
        showWarning("Scroll a device into view to take a screenshot of it.", "shot-off-screen");
      } else {
        setCapture(taken);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      showWarning(`The screenshot failed: ${message}`, "shot-failed");
    } finally {
      setCapturing(false);
    }
  }

  async function takeFullPage() {
    if (panes.length === 0 || capturing) return;
    const panelWasOpen = openPanel !== null;
    setOpenPanel(null);
    setCapturing(true);
    setFullPageProgress(0);
    const shots: FullPageShot[] = [];
    try {
      await settle(panelWasOpen || warning ? PANEL_FADE_MS : 0);
      for (const [i, pane] of panes.entries()) {
        shots.push(
          await captureFullPage(pane.key, paneName(pane), (done) =>
            setFullPageProgress((i + done) / panes.length),
          ),
        );
      }
      setFullPages(shots);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      showWarning(`The full-page screenshot failed: ${message}`, "shot-failed");
      if (shots.length > 0) setFullPages(shots);
    } finally {
      setCapturing(false);
      setFullPageProgress(null);
    }
  }

  // One device is cropped to its frame or its screen; several to the row they stand in.
  const singlePane = panes.length === 1 ? panes[0]! : null;
  const recording = settings.recording;
  // A studio video is cropped to a box around the devices, on the backdrop painted behind them.
  const studio = isStudio(recording);
  const studioBoxRef = useRef<HTMLDivElement>(null);
  const customBoxRef = useRef(recording.customBox);
  useEffect(() => {
    customBoxRef.current = recording.customBox;
  }, [recording.customBox]);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  // Whether Chrome lets this tab be recorded without its share prompt, asked as the studio opens.
  const [silentCapture, setSilentCapture] = useState<boolean | null>(null);
  const recordCrop = studio || singlePane ? recording.crop : null;
  const recordTarget = useCallback(() => {
    if (studio) {
      const box = studioBoxRef.current;
      if (box && stageRef.current) {
        placeStudioBox(
          box,
          {
            crop: recording.crop,
            ratio: recording.ratio,
            size: recording.size,
            custom: customBoxRef.current,
          },
          stageRef.current,
        );
      }
      return box;
    }
    if (!singlePane) return devicesRef.current;
    const device = document.querySelector(`[data-device-id="${CSS.escape(singlePane.key)}"]`);
    return (
      device?.querySelector(recordCrop === "screen" ? "[data-screen]" : "[data-device-body]") ??
      null
    );
  }, [studio, singlePane, recordCrop, recording.crop, recording.ratio, recording.size]);
  const recorder = useRecorder({
    options: recording,
    target: recordTarget,
    background: backdropColor(recording),
    onWarning: showWarning,
  });
  const recorderPhase = recorder.state.phase;
  const recordingLive = recorderPhase === "countdown" || recorderPhase === "recording";
  // From Chrome's share prompt until the video is finished.
  const recordingSetUp =
    recordingLive || recorderPhase === "asking" || recorderPhase === "finishing";
  const studioShown = studioOpen || recordingSetUp;
  const backdrop = studioShown ? backdropCss(recording) : null;

  useEffect(() => {
    const html = document.documentElement;
    if (recordingSetUp && recordCrop) {
      html.dataset.recording = studio ? `${recordCrop}-studio` : recordCrop;
    } else delete html.dataset.recording;
  }, [recordingSetUp, recordCrop, studio]);

  useEffect(() => {
    const html = document.documentElement;
    if (studioShown) {
      html.dataset.studio = "";
      html.style.setProperty("--studio-shadow", String(recording.shadow / 100));
    } else {
      delete html.dataset.studio;
      html.style.removeProperty("--studio-shadow");
      html.style.removeProperty("--studio-bar");
    }
  }, [studioShown, recording.shadow]);

  useEffect(() => {
    if (!studioOpen || MODE === "panel") return;
    let cancelled = false;
    void sendRequest({ type: "tab-capture" }).then((response) => {
      if (!cancelled) setSilentCapture(response.ok && !!response.streamId);
    });
    return () => {
      cancelled = true;
    };
  }, [studioOpen]);

  const updateRecording = (patch: Partial<RecordingSettings>) =>
    updateSettings({ recording: { ...recording, ...patch } });

  const studioMessage = studioError ? (
    <span className="text-red-400">{studioError}</span>
  ) : silentCapture === false ? (
    <span className="text-white/60">
      Chrome will ask to share this tab first.{" "}
      {MODE === "tab" && settings.openMode !== "over-page" ? (
        <>
          Open the simulator over the page to record without asking.{" "}
          <button
            type="button"
            className="text-primary-foreground font-semibold underline underline-offset-2"
            onClick={() => updateSettings({ openMode: "over-page" })}
          >
            Always open over the page
          </button>
        </>
      ) : MODE === "tab" ? (
        "Next time you open the simulator from a website, it opens over the page and records without asking."
      ) : (
        "Press Alt+Shift+R to record without asking."
      )}
    </span>
  ) : null;

  function openStudio() {
    setStudioError(null);
    setStudioOpen(true);
    setOpenPanel(null);
  }

  function closeStudio() {
    setStudioOpen(false);
    setOpenPanel((open) => (open === "record" ? null : open));
  }

  function toggleRecording() {
    if (recorderPhase === "idle") {
      if (shown.length === 0) return;
      setOpenPanel(null);
      setWarning(null);
      void recorder.start();
    } else if (recorderPhase !== "review" && recorderPhase !== "finishing") {
      void recorder.stop();
    }
  }

  const toggleRecordingRef = useRef(toggleRecording);
  useEffect(() => {
    toggleRecordingRef.current = toggleRecording;
  });
  useEffect(() => {
    if (MODE === "panel" || typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;
    const onMessage = (message: RecordTabMessage) => {
      if (message?.__msimRecord === "toggle") toggleRecordingRef.current();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  const syncScroll = settings.syncScroll && panes.length > 1;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const reported = readTopColor(event, frames.current);
      if (reported) setTopColors((c) => ({ ...c, [reported.id]: reported.color }));
      const sourceId = [...frames.current].find(([, f]) => f.contentWindow === event.source)?.[0];
      if (!sourceId) return;
      const report = readDevReport(event.data, sourceId);
      if (report) {
        setLogs((l) => appendCapped(l, report.logs));
        setRequests((r) => appendCapped(r, report.requests));
      }
      const missed = readMissed(event.data);
      if (missed) setLogs((l) => appendCapped(l, [syncMissEntry(sourceId, missed)]));
      const pwa = (event.data as Partial<PwaMessage> | null)?.__msimPwa;
      if (typeof pwa === "boolean") setPwaKeys((k) => ({ ...k, [sourceId]: pwa }));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A frame's name only reaches the page on its next load, so a page already open is told.
  const { spoofUA, touchMode, nativeScrollbars } = settings;
  useEffect(() => {
    for (const { key, device } of panes) {
      const message: TouchMessage = {
        __msimTouch: frameIdentity(device, { spoofUA, touchMode, nativeScrollbars }).touch,
      };
      frames.current.get(key)?.contentWindow?.postMessage(message, "*");
    }
  }, [panes, spoofUA, touchMode, nativeScrollbars]);

  useEffect(() => {
    const message: ScrollbarsMessage = { __msimScrollbars: nativeScrollbars };
    for (const { key } of panes) frames.current.get(key)?.contentWindow?.postMessage(message, "*");
  }, [panes, nativeScrollbars]);

  useEffect(() => {
    if (!syncScroll) return;
    const onMessage = (event: MessageEvent) => relayScroll(event, frames.current.values());
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [syncScroll]);

  // A page changing its own address leaves `url` alone, which would reload every device.
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const navRelay = useRef(createNavRelay());
  useEffect(() => {
    navRelay.current.reset();
    setLiveUrl(null);
  }, [url, reloadToken]);

  const syncing = panes.length > 1;
  const syncOptions: SyncOptions = {
    clicks: syncing && settings.syncClicks,
    input: syncing && settings.syncInput,
    navigation: syncing && settings.syncNavigation,
  };
  const syncContext = useRef({ panes, spoofUA, syncOptions });
  useEffect(() => {
    syncContext.current = { panes, spoofUA, syncOptions };
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const sourceId = [...frames.current].find(([, f]) => f.contentWindow === event.source)?.[0];
      if (!sourceId) return;
      const { panes, spoofUA, syncOptions } = syncContext.current;
      const others = [...frames.current].filter(([id]) => id !== sourceId);
      const source = panes.find((p) => p.key === sourceId);

      const nav = readNavReport(event.data);
      if (nav) {
        if (sourceId === panes[0]?.key) setLiveUrl(nav.url);
        if (!syncOptions.navigation) return;
        // Comparing sites, the same path on each counts as the same page.
        const verdict = navRelay.current.next(
          source?.origin ? onOrigin(nav.url, "https://compare.invalid") : nav.url,
        );
        if (verdict === "loop") {
          updateSettings({ syncNavigation: false });
          showWarning(
            "The pages kept sending each other to new addresses, so navigation sync is now off.",
            "nav-sync-loop",
          );
          return;
        }
        if (verdict === "skip") return;
        for (const [id, iframe] of others) {
          const pane = panes.find((p) => p.key === id);
          if (!pane) continue;
          const target = onOrigin(nav.url, pane.origin);
          iframe.contentWindow?.postMessage(
            {
              __msimNavApply: {
                url: target,
                full: frameUrl(target, pane.device, spoofUA),
                soft: nav.soft,
              },
            },
            "*",
          );
        }
        return;
      }

      const action = readSyncAction(event.data);
      if (action && shouldRelay(action, syncOptions)) {
        for (const [, iframe] of others) {
          iframe.contentWindow?.postMessage({ __msimActApply: action }, "*");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [updateSettings, showWarning]);

  function runShortcut(action: ShortcutAction) {
    switch (action) {
      case "close":
        if (recordingLive) void recorder.stop();
        else if (openPanel === "record") setOpenPanel(null);
        else if (studioOpen && recorderPhase === "idle") closeStudio();
        // Over a website, Esc with nothing open leaves full screen.
        else if (openPanel === null && MODE === "overlay") closeSimulator();
        else setOpenPanel(null);
        return;
      case "rotate":
        rotate();
        return;
      case "compare":
        updateSettings({ multiDevice: !settings.multiDevice });
        return;
      case "devices":
        setOpenPanel((open) => (open === "devices" ? null : "devices"));
        return;
      case "screenshot":
        if (canScreenshot) void takeScreenshot();
        return;
      case "record":
        if (canScreenshot) toggleRecording();
        return;
      case "frame-color":
        nextFrameColor();
        return;
      case "zoom-in":
        setZoom(stepZoom(zoom, 1));
        return;
      case "zoom-out":
        setZoom(stepZoom(zoom, -1));
        return;
      case "zoom-fit":
        setZoom(0);
        return;
    }
  }

  // The listeners below are added once, so they reach the current state through this.
  const shortcutRef = useRef(runShortcut);
  useEffect(() => {
    shortcutRef.current = runShortcut;
  });

  // A dialog or an open list owns the keyboard until it closes.
  const keyboardBusy = () =>
    !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"]');

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const key = (event.data as { __msimKey?: unknown } | null)?.__msimKey;
      if (typeof key !== "string") return;
      if (![...frames.current.values()].some((f) => f.contentWindow === event.source)) return;
      const action = shortcutFor({ key });
      if (action && !keyboardBusy()) shortcutRef.current(action);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcutFor(event);
      const typing = action !== "close" && isTyping(event.target);
      if (action && !event.defaultPrevented && !typing && !keyboardBusy()) {
        event.preventDefault();
        shortcutRef.current(action);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "l" && MODE !== "panel") {
        event.preventDefault();
        setOpenPanel("page");
      } else if (event.key === "r") {
        event.preventDefault();
        reloadAll();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reloadAll]);

  // Chrome captures tabs, not its side panel.
  const canScreenshot = MODE !== "panel";

  async function openFullScreen() {
    await sendRequest({ type: "open-full-screen" });
    window.close();
  }

  // Known ahead, because Chrome only opens the side panel straight from a click, with no waiting
  // in between.
  const windowId = useRef<number | undefined>(undefined);
  useEffect(() => {
    void chrome.windows.getCurrent().then((win) => {
      windowId.current = win.id;
    });
  }, []);

  function openSidePanel() {
    if (windowId.current === undefined) return;
    void chrome.sidePanel.open({ windowId: windowId.current }).then(() => {
      if (MODE === "overlay") closeSimulator();
    });
  }

  const paneName = (pane: Pane) =>
    pane.origin ? `${pane.device.name} · ${originLabel(pane.origin)}` : pane.device.name;

  function renderPane(pane: Pane) {
    const { key, device, origin } = pane;
    const ready = !settings.spoofUA || !device.ua || !!appliedUaIds?.has(device.id);
    const frame = (
      <DeviceFrame
        frameKey={key}
        environment={
          origin
            ? { label: originLabel(origin), color: originColor(state.environments, origin) }
            : undefined
        }
        device={device}
        src={url && ready ? frameUrl(onOrigin(url, origin), device, settings.spoofUA) : ""}
        pending={!!url && !ready}
        name={identityName(frameIdentity(device, settings))}
        rotated={!!state.rotations[device.id]}
        zoom={zoomFor(pane)}
        animateZoom={animateZoom}
        bezel={settings.bezelMode}
        frameColor={state.frameColors[device.id]}
        statusColor={topColors[key] || null}
        colorScheme={settings.forceColorScheme}
        reloadToken={reloadToken}
        keyboard={settings.keyboard}
        registerFrame={registerFrame}
        showStatusBar={settings.statusBar}
        statusDetails={{ battery: settings.batteryLevel, time: settings.forcedTime }}
        showHomeIndicator={settings.homeIndicator}
        tint={state.frameTints[device.id]}
        breakpoint={settings.breakpoints}
        guides={{ rulers: settings.rulers, grid: settings.gridSize }}
        browser={
          settings.browserChrome && !(settings.detectPwa && pwaKeys[key])
            ? {
                address:
                  normalizeUrl(settings.displayUrl) ||
                  (url ? onOrigin(liveUrl ?? url, origin) : ""),
                onReload: reloadAll,
                onAddress: () => {
                  if (MODE !== "panel") setOpenPanel("page");
                },
              }
            : undefined
        }
        overlay={
          overlayImages[device.id]
            ? {
                image: overlayImages[device.id]!,
                settings: overlaySchema.parse(state.overlays[device.id] ?? {}),
              }
            : undefined
        }
      />
    );
    if (!several) return <Fragment key={key}>{frame}</Fragment>;

    const vertical = layout === "column" || (layout === "focus" && pane !== focusPane);
    const drop = dropAt?.key === key && dragId !== device.id ? dropAt : null;
    return (
      <div
        key={key}
        draggable
        data-drag-slot={device.id}
        className={cn("relative", dragId === device.id && "opacity-40")}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", device.name);
          // Pages swallow drag events over their frames, so the frames sit the drag out.
          document.documentElement.dataset.dragging = "";
          setDragId(device.id);
        }}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const after = vertical
            ? e.clientY > rect.top + rect.height / 2
            : e.clientX > rect.left + rect.width / 2;
          if (dropAt?.key !== key || dropAt.after !== after) setDropAt({ key, after });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && drop) {
            updateState((s) => ({
              ...s,
              visibleDeviceIds: moveId(s.visibleDeviceIds, dragId, device.id, drop.after),
            }));
          }
          endDrag();
        }}
        onDragEnd={endDrag}
      >
        {frame}
        {drop && (
          <span
            aria-hidden
            className={cn(
              "bg-primary pointer-events-none absolute rounded-full",
              vertical ? "inset-x-0 h-1" : "inset-y-0 w-1",
              vertical
                ? drop.after
                  ? "-bottom-[22px]"
                  : "-top-[22px]"
                : drop.after
                  ? "-right-[22px]"
                  : "-left-[22px]",
            )}
          />
        )}
      </div>
    );
  }

  return (
    <div className="compact-radius bg-background text-foreground flex h-screen text-[13px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="relative flex min-h-0 flex-1"
          style={studioShown ? { paddingBottom: "var(--studio-bar, 0px)" } : undefined}
        >
          {backdrop && (
            <div
              aria-hidden
              data-studio-backdrop
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: backdrop,
                  filter: recording.blur ? `blur(${(recording.blur / 100) * 40}px)` : undefined,
                  transform: recording.blur ? "scale(1.12)" : undefined,
                }}
              />
            </div>
          )}
          <main
            ref={stageRef}
            className="relative min-h-0 min-w-0 flex-1 scrollbar-thin overflow-auto"
            style={
              !backdrop && settings.stageBackground
                ? { background: settings.stageBackground }
                : undefined
            }
            onClick={() => setOpenPanel(null)}
          >
            {warning && !capturing && recorderPhase !== "recording" && (
              <div className="sticky top-3 z-30 mx-auto h-0 w-[min(28rem,calc(100%-2rem))]">
                <InlineMessage tone="warning" onDismiss={closeWarning} className="shadow-sm">
                  {warning.text}
                </InlineMessage>
              </div>
            )}
            <div
              ref={devicesRef}
              data-layout={layout}
              className={cn(
                "flex min-h-full items-center justify-center",
                layout === "wrap" && "flex-wrap content-center gap-10",
                layout === "row" && "w-max min-w-full gap-10",
                layout === "column" && "flex-col gap-10",
                layout === "focus" && "gap-10",
              )}
              style={{ padding: STAGE_PADDING }}
            >
              {shown.length === 0 ? (
                <EmptyState onAddDevices={() => setOpenPanel("devices")} />
              ) : MODE === "panel" && !url ? (
                <p className="text-muted-foreground max-w-56 text-center text-xs leading-relaxed">
                  Open a website in this tab and it shows up here.
                </p>
              ) : focusPane ? (
                <>
                  <div className="flex shrink-0 flex-col items-center gap-6">
                    {panes
                      .filter((pane) => pane !== focusPane)
                      .map((pane) => (
                        <div key={pane.key} className="relative">
                          {renderPane(pane)}
                          <button
                            type="button"
                            aria-label={`Show ${paneName(pane)} big`}
                            data-tip={`Show ${paneName(pane)} big`}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateState((s) => ({ ...s, focusKey: pane.key }));
                            }}
                            className="hover:bg-primary/5 focus-visible:ring-ring absolute inset-0 cursor-zoom-in rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                          />
                        </div>
                      ))}
                  </div>
                  {renderPane(focusPane)}
                </>
              ) : (
                panes.map(renderPane)
              )}
            </div>
          </main>
        </div>
        {consoleOpen && (
          <DevConsole
            devices={paneDevices}
            logs={logs}
            requests={requests}
            onClear={() => {
              setLogs([]);
              setRequests([]);
            }}
            onClose={() => setConsoleOpen(false)}
          />
        )}
      </div>

      <PresentationEdge
        enabled={settings.presentation}
        pinned={openPanel !== null || consoleOpen || recorderPhase === "recording"}
      >
        <Rail
          mode={MODE}
          openPanel={openPanel}
          consoleOpen={consoleOpen}
          consoleErrors={logs.filter((l) => l.level === "error").length}
          onConsole={() => setConsoleOpen((open) => !open)}
          zoom={settings.zoom === 0 ? 0 : baseZoom}
          theme={settings.theme}
          studioOpen={studioOpen}
          onTogglePanel={(panel) => {
            if (panel === "record") {
              if (studioOpen) closeStudio();
              else openStudio();
            } else setOpenPanel((open) => (open === panel ? null : panel));
          }}
          onClose={closeSimulator}
          onRotate={rotate}
          onZoom={() => setZoom(nextInCycle<number>(ZOOM_LEVELS, settings.zoom))}
          onReload={reloadAll}
          onScreenshot={canScreenshot ? () => void takeScreenshot() : null}
          fullPageProgress={fullPageProgress}
          onRecord={canScreenshot ? toggleRecording : null}
          recordingTime={
            recorderPhase === "recording" || recorderPhase === "finishing"
              ? formatElapsed(recorder.elapsedMs)
              : null
          }
          onFullScreen={MODE === "panel" ? () => void openFullScreen() : null}
          onSidePanel={MODE === "panel" ? null : openSidePanel}
          onTheme={(theme) => updateSettings({ theme })}
        />
      </PresentationEdge>

      {capture && (
        <ScreenshotDialog
          capture={capture}
          url={url}
          options={settings.screenshot}
          frameColors={state.frameColors}
          frameTints={state.frameTints}
          onOptions={(patch) =>
            updateSettings({ screenshot: { ...settings.screenshot, ...patch } })
          }
          onFrameColor={setFrameColor}
          onFullPage={() => {
            setCapture(null);
            void takeFullPage();
          }}
          onClose={() => setCapture(null)}
        />
      )}

      {fullPages && (
        <FullPageDialog shots={fullPages} url={url} onClose={() => setFullPages(null)} />
      )}

      <RecordingStudio
        open={studioOpen}
        live={recordingSetUp}
        studio={studio}
        options={recording}
        boxRef={studioBoxRef}
        customRef={customBoxRef}
        target={recordTarget}
        onCustomBox={(customBox) => updateRecording({ customBox })}
        onCameraError={(text) => {
          setStudioError(text);
          if (!studioOpen) showWarning(text, "record-camera");
        }}
      />
      {studioOpen && recorderPhase === "idle" && (
        <StudioBar
          options={recording}
          onOptions={(patch) => {
            if ("camera" in patch || "cameraId" in patch) setStudioError(null);
            updateRecording(patch);
          }}
          message={studioMessage}
          settingsOpen={openPanel === "record"}
          onSettings={() => setOpenPanel((open) => (open === "record" ? null : "record"))}
          onStart={toggleRecording}
          onClose={closeStudio}
        />
      )}
      {recorder.state.phase === "countdown" && <RecordingCountdown left={recorder.state.left} />}
      {recorder.state.phase === "review" && (
        <RecordingDialog
          recording={recorder.state.recording}
          url={url}
          deviceNames={shown.map((d) => d.name)}
          onRecordAgain={() => {
            recorder.discard();
            void recorder.start();
          }}
          onClose={recorder.discard}
        />
      )}

      <SidePanel
        title="Devices"
        description={
          settings.multiDevice
            ? `${shown.length} on screen · pick, add or save a set`
            : "Pick the device to show"
        }
        open={openPanel === "devices"}
        onClose={() => setOpenPanel(null)}
      >
        <DevicesPanel
          state={state}
          multiDevice={settings.multiDevice}
          updateState={updateState}
          showWarning={showWarning}
        />
      </SidePanel>
      <SidePanel
        title="Frame colour"
        description={single ? single.name : `${shown.length} devices on screen`}
        open={openPanel === "frame"}
        onClose={() => setOpenPanel(null)}
      >
        <FrameColorPanel
          devices={shown}
          bezelMode={settings.bezelMode}
          state={state}
          updateState={updateState}
          onShowFrames={() => updateSettings({ bezelMode: true })}
        />
      </SidePanel>
      <SidePanel
        title="Page"
        description="What the devices are showing"
        open={openPanel === "page"}
        onClose={() => setOpenPanel(null)}
      >
        <PagePanel
          url={liveUrl ?? state.url}
          open={openPanel === "page"}
          recentUrls={state.recentUrls}
          onNavigate={navigate}
          onForget={(forget) =>
            updateState((s) => ({
              ...s,
              recentUrls: forget === null ? [] : s.recentUrls.filter((u) => u !== forget),
            }))
          }
          onBack={() => stepHistory(frames.current.values(), "back")}
          onForward={() => stepHistory(frames.current.values(), "forward")}
          onReload={reloadAll}
        />
      </SidePanel>
      <SidePanel
        title="Tools"
        description="Measure, compare and debug"
        open={openPanel === "tools"}
        onClose={() => setOpenPanel(null)}
      >
        <ToolsPanel
          settings={settings}
          updateSettings={updateSettings}
          overlay={{
            devices: shown,
            overlays: state.overlays,
            images: overlayImages,
            onImage: setOverlayImage,
            onChange: changeOverlay,
          }}
          environments={{
            environments: state.environments,
            compare: state.compareOrigins,
            onChange: (environments, compareOrigins) =>
              updateState((s) => ({ ...s, environments, compareOrigins })),
            onOpen: (origin) => navigate(onOrigin(liveUrl ?? state.url, origin) || origin),
          }}
          severalShown={several}
        />
      </SidePanel>
      <SidePanel
        title="Recording studio"
        description="The device, its backdrop and how it is recorded"
        open={openPanel === "record"}
        onClose={() => setOpenPanel(null)}
      >
        <StudioPanel
          options={recording}
          onOptions={updateRecording}
          shownId={state.visibleDeviceIds[0]}
          framed={settings.bezelMode}
          onDevice={(device) => {
            if (!settings.bezelMode) updateSettings({ bezelMode: true });
            updateState((s) => ({
              ...s,
              visibleDeviceIds: [device.id, ...s.visibleDeviceIds.filter((x) => x !== device.id)],
            }));
          }}
          onNoFrame={() => updateSettings({ bezelMode: false })}
        />
      </SidePanel>
      <SidePanel
        title="Settings"
        description="How devices and pages are shown"
        open={openPanel === "settings"}
        onClose={() => setOpenPanel(null)}
      >
        <SettingsPanel
          settings={settings}
          devices={[...PRESET_DEVICES, ...state.customDevices]}
          updateSettings={updateSettings}
          onChooseDevices={() => setOpenPanel("devices")}
        />
      </SidePanel>
    </div>
  );
}
