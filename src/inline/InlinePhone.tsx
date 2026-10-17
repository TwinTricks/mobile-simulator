import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize2, PanelRight, RefreshCw, RotateCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { frameUrl } from "@/lib/header-rules";
import { cn } from "@/lib/utils";
import { PRESET_DEVICES, deviceSize, findDevice } from "@/shared/devices";
import { frameIdentity, identityName } from "@/shared/identity";
import type { InlineConfig } from "@/shared/inline";
import { sendRequest } from "@/shared/messages";
import type { Device, FrameTint, Settings } from "@/shared/types";
import { DeviceFrame } from "@/simulator/components/DeviceFrame";
import { readTopColor } from "@/simulator/frame-bridge";
import { fitZoom, frameBox, placedFrame } from "@/simulator/frame-box";
import { DevicePicker } from "./DevicePicker";
import { placeHost } from "./place";
import { STABLE_MS, forgetInline, saveInline } from "./session";
import { setStatus } from "./status";
import { Themed } from "./Themed";

const TOOLBAR_HEIGHT = 44;
const PADDING = 16;
const MIN_DOCK_WIDTH = 320;
/** The most of the window the docked phone takes before it shrinks to fit. */
const MAX_DOCK_SHARE = 0.5;

type Config = InlineConfig & { deviceId: string };

/** The device's width on screen at a zoom: a frame image scales, a CSS bezel's padding doesn't. */
function shownWidth(
  device: Device,
  rotated: boolean,
  bezel: boolean,
  color: string | undefined,
  zoom: number,
) {
  const box = frameBox(device, rotated, bezel, color);
  if (placedFrame(device, rotated, bezel, color)) return box.width * zoom;
  const screen = deviceSize(device, rotated).width;
  return box.width - screen + screen * zoom;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || !!target.closest("input, textarea, select"))
  );
}

function useWindowSize() {
  const [size, setSize] = useState(() => ({ width: innerWidth, height: innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/**
 * The phone itself, docked beside the page or filling the window. Its frame loads the page it
 * sits on, so it shares the site's cookies and storage.
 */
export function InlinePhone({
  host,
  pageUrl,
  initial,
  settings,
  customDevices,
  frameColors,
  frameTints,
  onClose,
}: {
  host: HTMLElement;
  pageUrl: string;
  initial: Config;
  settings: Settings;
  customDevices: readonly Device[];
  frameColors: Record<string, string>;
  frameTints: Record<string, FrameTint>;
  onClose: (reason?: "closed" | "blocked:framing") => void;
}) {
  const [config, setConfig] = useState(initial);
  const [rulesFor, setRulesFor] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [statusColor, setStatusColor] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const configRef = useRef(config);
  const stable = useRef(false);
  const view = useWindowSize();

  const devices = useMemo(
    () => [...PRESET_DEVICES, ...customDevices].filter((d) => d.category !== "desktop"),
    [customDevices],
  );
  const device = findDevice(config.deviceId, customDevices) ?? devices[0]!;
  const { rotated, layout } = config;
  const frameColor = frameColors[device.id];
  const bezel = settings.bezelMode;

  const roomHeight = view.height - TOOLBAR_HEIGHT - 2 * PADDING;
  const roomWidth =
    layout === "dock"
      ? Math.max(MIN_DOCK_WIDTH, view.width * MAX_DOCK_SHARE) - 2 * PADDING
      : view.width - 2 * PADDING;
  const zoom = fitZoom(device, rotated, bezel, frameColor, {
    width: roomWidth,
    height: roomHeight,
  });
  const dockWidth = Math.max(
    MIN_DOCK_WIDTH,
    Math.ceil(shownWidth(device, rotated, bezel, frameColor, zoom) + 2 * PADDING),
  );

  // The frame waits for its User-Agent rule, or its first requests would go out without it.
  useEffect(() => {
    let current = true;
    void sendRequest({ type: "inline-rules", deviceId: device.id }).then(() => {
      if (current) setRulesFor(device.id);
    });
    return () => {
      current = false;
    };
  }, [device.id]);
  const ready = rulesFor === device.id;
  const src = ready ? frameUrl(pageUrl, device, settings.spoofUA) : "";

  useEffect(() => {
    setStatus("loading");
  }, [src, reloadToken]);

  // Docked, the page makes room beside it; filling the window, the page stops scrolling.
  useLayoutEffect(() => {
    const style = document.documentElement.style;
    const name = layout === "dock" ? "margin-right" : "overflow";
    const before = {
      value: style.getPropertyValue(name),
      priority: style.getPropertyPriority(name),
    };
    if (layout === "dock") {
      // Beside the page's scrollbar rather than over it.
      const scrollbar = Math.max(0, innerWidth - document.documentElement.clientWidth);
      placeHost(host, { top: 0, right: scrollbar, bottom: 0, width: dockWidth });
      style.setProperty(name, `${dockWidth}px`, "important");
    } else {
      placeHost(host, { top: 0, right: 0, bottom: 0, left: 0 });
      style.setProperty(name, "hidden", "important");
    }
    return () => style.setProperty(name, before.value, before.priority);
  }, [host, layout, dockWidth, view]);

  useEffect(() => {
    configRef.current = config;
    saveInline(config, stable.current);
  }, [config]);
  useEffect(() => () => forgetInline(), []);

  const update = useCallback((change: Partial<Config>) => {
    setConfig((current) => ({ ...current, ...change }));
  }, []);
  const rotate = useCallback(() => {
    setConfig((current) => ({ ...current, rotated: !current.rotated }));
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = iframe.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const color = readTopColor(event, new Map([[device.id, frame]]));
      if (color) setStatusColor(color.color);
      const key = (event.data as { __msimKey?: unknown } | null)?.__msimKey;
      if (typeof key !== "string") return;
      if (key === "Escape") onClose();
      else if (key.toLowerCase() === "r") rotate();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isTyping(event.target)) return;
      onClose();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [device.id, onClose, rotate]);

  const onFrameLoad = useCallback((frame: HTMLIFrameElement) => {
    // A page that refuses to be framed is replaced by the browser's error page, which belongs
    // to another origin.
    let refused: boolean;
    try {
      const doc = frame.contentDocument;
      refused = !doc || doc.URL === "about:blank";
    } catch {
      refused = true;
    }
    setBlocked(refused);
    setStatus(refused ? "blocked:framing" : "ready");
    if (refused) return;
    setTimeout(() => {
      if (!frame.isConnected) return;
      stable.current = true;
      saveInline(configRef.current, true);
    }, STABLE_MS);
  }, []);

  const registerFrame = useCallback((_id: string, element: HTMLIFrameElement | null) => {
    iframe.current = element;
  }, []);

  return (
    <Themed
      theme={settings.theme}
      className={cn(
        "flex h-full flex-col",
        layout === "dock" ? "border-l shadow-2xl" : "bg-background/95 backdrop-blur-sm",
      )}
    >
      <div
        role="toolbar"
        aria-label="Mobile Simulator"
        className="relative z-20 flex shrink-0 items-center gap-1 border-b px-2"
        style={{ height: TOOLBAR_HEIGHT }}
      >
        <DevicePicker
          devices={devices}
          value={device}
          onChange={(deviceId) => update({ deviceId })}
        />
        <span className="flex-1" />
        <ToolButton label="Rotate" onClick={rotate}>
          <RotateCw />
        </ToolButton>
        <ToolButton
          label={layout === "dock" ? "Fill the window" : "Dock to the side"}
          onClick={() => update({ layout: layout === "dock" ? "full" : "dock" })}
        >
          {layout === "dock" ? <Maximize2 /> : <PanelRight />}
        </ToolButton>
        <ToolButton label="Reload" onClick={() => setReloadToken((n) => n + 1)}>
          <RefreshCw />
        </ToolButton>
        <ToolButton label="Close" onClick={() => onClose()}>
          <X />
        </ToolButton>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden"
        style={{ padding: PADDING }}
      >
        {blocked && (
          <p role="alert" className="text-muted-foreground max-w-64 text-center text-xs">
            This page refused to load inside the phone. Check “Response header handling” in the
            simulator's Settings.
          </p>
        )}
        <DeviceFrame
          device={device}
          src={src}
          pending={!ready}
          name={identityName(frameIdentity(device, settings))}
          rotated={rotated}
          zoom={zoom}
          animateZoom={false}
          bezel={bezel}
          frameColor={frameColor}
          statusColor={statusColor}
          colorScheme={settings.forceColorScheme}
          reloadToken={reloadToken}
          keyboard={settings.keyboard}
          registerFrame={registerFrame}
          onFrameLoad={onFrameLoad}
          caption={false}
          showStatusBar={settings.statusBar}
          statusDetails={{ battery: settings.batteryLevel, time: settings.forcedTime }}
          showHomeIndicator={settings.homeIndicator}
          tint={frameTints[device.id]}
        />
      </div>
    </Themed>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} data-tip={label} onClick={onClick}>
      {children}
    </Button>
  );
}
