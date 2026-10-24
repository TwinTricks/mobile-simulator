import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { assetUrl } from "@/lib/chrome";
import { cn } from "@/lib/utils";
import { breakpointFor } from "@/shared/breakpoints";
import { SLOW_LOAD_MS } from "@/shared/constants";
import { deviceSize } from "@/shared/devices";
import type { ColorScheme, Device, FrameTint, Overlay, Settings } from "@/shared/types";
import { applyColorScheme, stepHistory } from "../frame-bridge";
import { tintMaskUrl } from "../frame-tint";
import {
  WATCH_BEZEL,
  browserChrome,
  frameLayout,
  type BrowserChromeSpec,
  homeIndicator,
  placedFrame,
  safeAreaInsets,
  screenRadius,
  statusBar,
} from "../frame-box";
import { keyboardHeight, keyboardLayout, keyboardOs } from "../keyboard/layout";
import { useDeviceKeyboard } from "../keyboard/use-device-keyboard";
import { BrowserChrome, type BrowserAction } from "./BrowserChrome";
import { DeviceKeyboard } from "./DeviceKeyboard";
import { DeviceStatusBar } from "./DeviceStatusBar";
import { ScreenGuides } from "./ScreenGuides";
import { SafeAreaGuides, usePageCover, useSafeAreaInsets } from "./SafeArea";
import { TapTargetBadge, useTapTargets } from "./TapTargets";

const DEVICE_TURN_MS = 450;
const DEVICE_ZOOM_MS = 280;

type DeviceFrameProps = {
  device: Device;
  /** What the frame loads. Empty while there is no URL or its User-Agent rule is not in place. */
  src: string;
  /** True while there is a URL but `src` is held back. */
  pending: boolean;
  /** The frame's `name`, which carries the device identity to the page's identity script. */
  name: string;
  rotated: boolean;
  zoom: number;
  /** True while the zoom is changing because someone asked for it, rather than the window. */
  animateZoom: boolean;
  bezel: boolean;
  /** The frame colour picked for this device, if any. */
  frameColor: string | undefined;
  /** The colour the page shows at its top, which the status bar takes on. */
  statusColor: string | null;
  colorScheme: ColorScheme;
  /** Changing this reloads the frame. */
  reloadToken: number;
  /** Phones and tablets bring up their keyboard when a text field in the page takes focus. */
  keyboard: boolean;
  registerFrame: (id: string, iframe: HTMLIFrameElement | null) => void;
  /** Called each time the frame finishes loading an address. */
  onFrameLoad?: (iframe: HTMLIFrameElement) => void;
  /** The device's name and size under it. */
  caption?: boolean;
  /** The clock, signal and battery across the top. */
  showStatusBar?: boolean;
  /** The battery charge and a pinned clock time ("HH:MM", or empty) the status bar shows. */
  statusDetails?: { battery: number; time: string };
  showHomeIndicator?: boolean;
  /** A gradient laid over the frame image's colour. */
  tint?: FrameTint;
  /** The Tailwind breakpoint the width falls in, beside the name. */
  breakpoint?: boolean;
  /** Rulers and a grid over the screen. */
  guides?: { rulers: boolean; grid: number };
  /** A design laid over the screen to compare the page against. */
  overlay?: { image: string; settings: Overlay };
  /** Tells this copy apart when the device is shown more than once; the device id otherwise. */
  frameKey?: string;
  /** The site this copy shows, when comparing sites. */
  environment?: { label: string; color: string };
  /** Set to draw Safari's or Chrome's bars around the page, showing this address. */
  browser?: BrowserProps;
  /** Checks the page for tap targets under this many CSS pixels; 0 doesn't. */
  tapTargets?: number;
  /** When the page draws under the status bar and gets the device's safe-area insets. */
  safeArea?: Settings["safeArea"];
  /** Shades the device's safe areas. */
  safeAreaGuides?: boolean;
};

type BrowserProps = { address: string; onReload: () => void; onAddress: () => void };

export function DeviceFrame({
  device,
  src,
  pending,
  name,
  rotated,
  zoom,
  animateZoom,
  bezel,
  frameColor,
  statusColor,
  colorScheme,
  reloadToken,
  keyboard,
  registerFrame,
  onFrameLoad,
  caption = true,
  showStatusBar = true,
  statusDetails,
  showHomeIndicator = true,
  tint,
  breakpoint = false,
  guides,
  overlay,
  frameKey = device.id,
  environment,
  browser,
  tapTargets = 0,
  safeArea = "off",
  safeAreaGuides = false,
}: DeviceFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const shownAs = useRef({ zoom, rotated });
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [laidOut, setLaidOut] = useState(false);

  // A frame given its address as it is created can start the page before Chrome has sized it,
  // and a page that measures itself on load then reads a width of 0.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLaidOut(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const { width, height } = deviceSize(device, rotated);
  const frameSrc = !laidOut ? "" : stopped ? "about:blank" : src;
  const keyboardKind = keyboard ? keyboardOs(device) : null;
  const keys = useDeviceKeyboard(iframeRef, keyboardKind, `${src}|${reloadToken}`);
  const keyboardHeightPx = keyboardKind ? keyboardHeight(keyboardKind, rotated) : 0;
  const loadKey = `${frameSrc}|${reloadToken}`;
  const targets = useTapTargets(iframeRef, frameSrc ? tapTargets : 0, loadKey);
  const cover = usePageCover(iframeRef, loadKey);

  useEffect(() => {
    setStopped(false);
    setSlow(false);
    setLoading(!!src);
    if (!src) return;
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [src, reloadToken]);

  useEffect(() => {
    applyColorScheme(iframeRef.current, colorScheme);
  }, [colorScheme]);

  // Starts the device from how it looked a moment ago, then lets it settle into its new size or
  // way round. A turn starts a quarter back, which fills the footprint the device just left.
  useLayoutEffect(() => {
    const before = shownAs.current;
    shownAs.current = { zoom, rotated };
    const body = bodyRef.current;
    const turned = before.rotated !== rotated;
    if (!body || (!turned && (!animateZoom || before.zoom === zoom))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scale = before.zoom / zoom;
    const angle = turned ? (rotated ? 90 : -90) : 0;
    body.animate([{ transform: `rotate(${angle}deg) scale(${scale})` }, { transform: "none" }], {
      duration: turned ? DEVICE_TURN_MS : DEVICE_ZOOM_MS,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
  }, [zoom, rotated, animateZoom]);

  const placed = placedFrame(device, rotated, bezel, frameColor);
  const screenWidth = width * zoom;
  const screenHeight = height * zoom;
  const layout = placed ? frameLayout(placed, screenWidth, screenHeight) : null;
  const tintMask = useTintMask(tint && placed ? assetUrl(placed.image.src) : null);

  const isPhone = device.category === "phone";
  const isTablet = device.category === "tablet";
  const isWatch = device.category === "watch";
  const bezelOn = !placed && bezel && (isPhone || isTablet || isWatch);
  const watchRadius = screenRadius(device, screenWidth, screenHeight);

  const status = showStatusBar ? statusBar(device, rotated) : null;
  const indicator = showHomeIndicator ? homeIndicator(device, rotated) : null;
  const statusHeight = status?.height ?? 0;
  const bars = browser ? browserChrome(device, rotated) : null;
  // Safari's bottom bars go behind the keyboard while it is up.
  const barsHeight = (bars?.top ?? 0) + (keys.raised ? 0 : (bars?.bottom ?? 0));
  // Inside the browser's bars a page never reaches the screen's edges.
  const insets = safeAreaInsets(device, rotated);
  const edgeToEdge = !!insets && !bars && (safeArea === "always" || (safeArea === "auto" && cover));
  useSafeAreaInsets(iframeRef, edgeToEdge ? insets : null, loadKey);
  // Pages left on auto follow the system, so the bar does too.
  const darkStatus =
    colorScheme === "dark" ||
    (colorScheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const barProps = (spec: BrowserChromeSpec, { address, onReload, onAddress }: BrowserProps) => ({
    spec,
    address,
    loading: loading || pending,
    color: statusColor,
    dark: darkStatus,
    onAction: (action: BrowserAction) => {
      if (action === "reload") onReload();
      else if (action === "address") onAddress();
      else if (iframeRef.current) stepHistory([iframeRef.current], action);
    },
  });

  const screen = (
    <>
      <div
        className="relative flex origin-top-left flex-col overflow-hidden"
        style={{ width, height, transform: `scale(${zoom})` }}
      >
        {status && (
          <DeviceStatusBar
            spec={status}
            color={statusColor}
            dark={darkStatus}
            battery={statusDetails?.battery}
            forcedTime={statusDetails?.time}
            overlay={edgeToEdge}
          />
        )}
        {bars && browser && <BrowserChrome side="top" {...barProps(bars, browser)} />}
        <iframe
          key={reloadToken}
          ref={(element) => {
            iframeRef.current = element;
            registerFrame(frameKey, element);
          }}
          title={device.name}
          name={name}
          src={frameSrc || undefined}
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
          className="block border-none bg-white"
          style={{
            width,
            height:
              height -
              (edgeToEdge ? 0 : statusHeight) -
              barsHeight -
              (keys.raised ? keyboardHeightPx : 0),
          }}
          onLoad={(event) => {
            // A frame with no address still fires a load for its empty document.
            if (!event.currentTarget.getAttribute("src")) return;
            setLoading(false);
            setSlow(false);
            applyColorScheme(iframeRef.current, colorScheme);
            if (iframeRef.current) onFrameLoad?.(iframeRef.current);
          }}
        />
        {bars && browser && !keys.raised && (
          <BrowserChrome side="bottom" {...barProps(bars, browser)} />
        )}
        {device.hinge && (
          <div
            aria-hidden
            data-hinge
            className={cn(
              "pointer-events-none absolute z-10 from-transparent via-black/10 to-transparent",
              rotated
                ? "inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-gradient-to-b"
                : "inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-gradient-to-r",
            )}
          />
        )}
        {indicator && (
          <div
            aria-hidden
            data-home-indicator
            className={cn(
              "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full",
              darkStatus ? "bg-white/90" : "bg-black/85",
            )}
            style={{ bottom: indicator.bottom, width: indicator.width, height: indicator.height }}
          />
        )}
        {overlay?.settings.visible && (
          <img
            data-design-overlay
            src={overlay.image}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 z-[15] max-w-none select-none"
            style={{
              width,
              opacity: overlay.settings.opacity,
              transform: `translate(${overlay.settings.x}px, ${overlay.settings.y}px)`,
              mixBlendMode: overlay.settings.difference ? "difference" : "normal",
            }}
          />
        )}
        {safeAreaGuides && insets && <SafeAreaGuides insets={insets} />}
        {guides && (guides.rulers || guides.grid > 0) && (
          <ScreenGuides width={width} height={height} rulers={guides.rulers} grid={guides.grid} />
        )}
        {keyboardKind ? (
          <DeviceKeyboard
            os={keyboardKind}
            layout={keyboardLayout(keyboardKind, keys.info, keys.layer, keys.shift)}
            height={keyboardHeightPx}
            landscape={rotated}
            dark={darkStatus}
            open={keys.open}
            pressed={keys.pressed}
            onKey={keys.pressKey}
          />
        ) : null}
      </div>
      {(loading || pending) && (
        <div className="bg-background/85 text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-xs backdrop-blur-[2px]">
          <Spinner className="size-6" />
          <span>{slow ? "Still loading…" : "Loading…"}</span>
          {slow && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setStopped(true);
                setLoading(false);
                setSlow(false);
              }}
            >
              <Square className="size-3" />
              Stop
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <figure data-device-id={frameKey} className="flex flex-col items-center gap-3">
      {placed && layout ? (
        <div
          ref={bodyRef}
          data-device-body
          className="relative"
          style={{ width: layout.width, height: layout.height }}
        >
          <div
            data-screen
            className="absolute overflow-hidden bg-white"
            style={{
              left: layout.screenX,
              top: layout.screenY,
              width: screenWidth,
              height: screenHeight,
              borderRadius: screenRadius(device, screenWidth, screenHeight),
            }}
          >
            {screen}
          </div>
          <img
            src={assetUrl(placed.image.src)}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none drop-shadow-[0_18px_32px_rgba(0,0,0,0.18)] select-none"
            style={layout.image}
          />
          {tint && tintMask && (
            <div
              aria-hidden
              data-frame-tint
              className="pointer-events-none absolute"
              style={{
                ...layout.image,
                background: `linear-gradient(135deg, ${tint.from}, ${tint.to})`,
                mixBlendMode: "color",
                maskImage: `url("${tintMask}")`,
                maskSize: "100% 100%",
                WebkitMaskImage: `url("${tintMask}")`,
                WebkitMaskSize: "100% 100%",
              }}
            />
          )}
        </div>
      ) : (
        <div
          ref={bodyRef}
          data-device-body
          className={cn(
            "relative flex flex-col items-center",
            bezelOn && "shadow-[0_18px_32px_rgba(0,0,0,0.18)]",
            bezelOn && isPhone && "bg-bezel-phone rounded-[36px]",
            bezelOn && isPhone && (rotated ? "px-7 py-3.5" : "px-3.5 py-7"),
            bezelOn && isTablet && "bg-bezel-tablet rounded-[20px] p-[22px]",
            bezelOn && isWatch && "bg-bezel-phone",
          )}
          style={
            bezelOn && isWatch
              ? { padding: WATCH_BEZEL, borderRadius: watchRadius + WATCH_BEZEL }
              : undefined
          }
        >
          {bezelOn && isPhone && (
            <>
              <div
                className={cn(
                  "absolute rounded-xl bg-black",
                  rotated
                    ? "top-1/2 left-2 h-20 w-[18px] -translate-y-1/2"
                    : "top-2 left-1/2 h-[18px] w-20 -translate-x-1/2",
                )}
              />
              <div
                className={cn(
                  "absolute rounded-sm bg-[#555]",
                  rotated
                    ? "top-1/2 right-2.5 h-[100px] w-1 -translate-y-1/2"
                    : "bottom-2.5 left-1/2 h-1 w-[100px] -translate-x-1/2",
                )}
              />
            </>
          )}
          {bezelOn && isTablet && (
            <div
              className={cn(
                "absolute size-1.5 rounded-full bg-[#1a1a1a]",
                rotated ? "top-1/2 left-2.5 -translate-y-1/2" : "top-2.5 left-1/2 -translate-x-1/2",
              )}
            />
          )}

          <div
            data-screen
            className={cn(
              "relative overflow-hidden bg-white",
              isWatch
                ? "bg-black"
                : bezelOn
                  ? "rounded-[6px]"
                  : "border-border/70 rounded-lg border shadow-sm",
            )}
            style={{
              width: screenWidth,
              height: screenHeight,
              ...(isWatch && { borderRadius: watchRadius }),
            }}
          >
            {screen}
          </div>
        </div>
      )}
      {caption && (
        <figcaption
          data-device-caption
          className="text-muted-foreground flex items-baseline gap-2 text-[0.8125rem] select-none"
        >
          {environment && (
            <span
              data-environment
              className="self-center rounded-full px-2 py-px text-[0.6875rem] font-semibold text-white"
              style={{ backgroundColor: environment.color }}
            >
              {environment.label}
            </span>
          )}
          <span className="text-foreground font-medium">{device.name}</span>
          <span className="tabular-nums">
            {width}×{height} @{device.dpr}x
          </span>
          {breakpoint && (
            <span
              data-breakpoint
              data-tip="Tailwind breakpoint for this width"
              className="bg-primary/10 text-primary rounded-full px-1.5 py-px font-mono text-[0.625rem] font-semibold"
            >
              {breakpointFor(width)}
            </span>
          )}
          {targets.report && <TapTargetBadge report={targets.report} onShow={targets.show} />}
        </figcaption>
      )}
    </figure>
  );
}

/** The mask that keeps a custom colour on the frame's body, once it is made. */
function useTintMask(imageUrl: string | null): string | null {
  const [mask, setMask] = useState<{ for: string; url: string } | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    let current = true;
    void tintMaskUrl(imageUrl).then((url) => {
      // A frame that can't be read is coloured all over, as before.
      if (current) setMask({ for: imageUrl, url: url ?? imageUrl });
    });
    return () => {
      current = false;
    };
  }, [imageUrl]);
  return imageUrl && mask?.for === imageUrl ? mask.url : null;
}
