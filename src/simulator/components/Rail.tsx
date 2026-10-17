import type { ReactNode } from "react";
import {
  Camera,
  Globe,
  Maximize,
  Palette,
  PanelRight,
  RefreshCw,
  RotateCw,
  Settings as SettingsIcon,
  Smartphone,
  Square,
  SquareTerminal,
  Video,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";

import { ThemeButton } from "@/components/app/ThemeButton";
import { cn } from "@/lib/utils";
import type { ThemeChoice } from "@/shared/types";
import type { SimulatorMode } from "../mode";
import { ToolbarButton } from "./ToolbarButton";

export type RailPanel = "devices" | "frame" | "page" | "tools" | "record" | "settings";

const CLOSE_LABEL: Record<SimulatorMode, string> = {
  tab: "Close simulator",
  panel: "Close side panel",
  overlay: "Exit full screen",
};

type RailProps = {
  mode: SimulatorMode;
  openPanel: RailPanel | null;
  consoleOpen: boolean;
  /** Errors the pages have logged, shown on the console button. */
  consoleErrors: number;
  onConsole: () => void;
  zoom: number;
  theme: ThemeChoice;
  onTogglePanel: (panel: RailPanel) => void;
  onClose: () => void;
  onRotate: () => void;
  onZoom: () => void;
  onReload: () => void;
  /** Null where screenshots can't be taken. */
  onScreenshot: (() => void) | null;
  /** How far the full-page screenshot has got, or null when none is being taken. */
  fullPageProgress: number | null;
  /** Stops a recording; null where recordings can't be made, as for screenshots. */
  onRecord: (() => void) | null;
  /** The recording studio is on screen. */
  studioOpen: boolean;
  /** How long the recording has run, or null when nothing is recording. */
  recordingTime: string | null;
  onFullScreen: (() => void) | null;
  onSidePanel: (() => void) | null;
  onTheme: (theme: ThemeChoice) => void;
};

function zoomLabel(zoom: number): string {
  return zoom === 0 ? "Fit" : `${Math.round(zoom * 100)}%`;
}

export function Rail({
  mode,
  openPanel,
  consoleOpen,
  consoleErrors,
  onConsole,
  zoom,
  theme,
  onTogglePanel,
  onClose,
  onRotate,
  onZoom,
  onReload,
  onScreenshot,
  fullPageProgress,
  onRecord,
  studioOpen,
  recordingTime,
  onFullScreen,
  onSidePanel,
  onTheme,
}: RailProps) {
  return (
    <nav
      aria-label="Simulator"
      className="border-border/60 bg-card/80 z-50 flex w-14 shrink-0 flex-col items-center gap-1.5 border-l py-3 backdrop-blur"
    >
      <ToolbarButton
        label={CLOSE_LABEL[mode]}
        title={mode === "overlay" ? "Exit full screen (Esc)" : undefined}
        onClick={onClose}
      >
        <X />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Manage devices"
        title="Devices (D)"
        active={openPanel === "devices"}
        onClick={() => onTogglePanel("devices")}
      >
        <Smartphone />
      </ToolbarButton>
      <ToolbarButton
        label="Frame colour"
        title="Frame colour (F to step)"
        active={openPanel === "frame"}
        onClick={() => onTogglePanel("frame")}
      >
        <Palette />
      </ToolbarButton>
      {mode !== "panel" ? (
        <ToolbarButton
          label="Page address"
          title="Page address (Ctrl+L)"
          active={openPanel === "page"}
          onClick={() => onTogglePanel("page")}
        >
          <Globe />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        label="Tools"
        title="Tools: rulers, sync, overlay, layout"
        active={openPanel === "tools"}
        onClick={() => onTogglePanel("tools")}
      >
        <Wrench />
      </ToolbarButton>
      <div className="relative">
        <ToolbarButton
          label="Console"
          title="Console and network"
          active={consoleOpen}
          onClick={onConsole}
        >
          <SquareTerminal />
        </ToolbarButton>
        {consoleErrors > 0 && (
          <span className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[0.5625rem] leading-4 font-semibold text-white tabular-nums">
            {consoleErrors > 99 ? "99+" : consoleErrors}
          </span>
        )}
      </div>
      <ToolbarButton label="Rotate" title="Rotate (R)" onClick={onRotate}>
        <RotateCw />
      </ToolbarButton>
      <Labelled caption={zoomLabel(zoom)}>
        <ToolbarButton
          label={`Zoom: ${zoomLabel(zoom)}`}
          title={`Zoom: ${zoomLabel(zoom)} (+ and − to step, 0 to fit)`}
          onClick={onZoom}
        >
          <ZoomIn />
        </ToolbarButton>
      </Labelled>
      <ToolbarButton label="Reload" title="Reload (Ctrl+R)" onClick={onReload}>
        <RefreshCw />
      </ToolbarButton>
      <Divider />
      {onScreenshot && fullPageProgress !== null ? (
        <Labelled caption={`${Math.round(fullPageProgress * 100)}%`}>
          <ToolbarButton label="Taking full-page screenshot" disabled>
            <Camera className="animate-pulse" />
          </ToolbarButton>
        </Labelled>
      ) : onScreenshot ? (
        <ToolbarButton label="Screenshot" title="Screenshot (S)" onClick={onScreenshot}>
          <Camera />
        </ToolbarButton>
      ) : null}
      {onRecord && recordingTime !== null ? (
        <Labelled caption={recordingTime} tone="text-red-600 dark:text-red-400">
          <ToolbarButton
            label="Stop recording"
            title="Stop recording (V)"
            onClick={onRecord}
            className="text-red-600 dark:text-red-400 [&_svg]:fill-current"
          >
            <Square className="animate-pulse" />
          </ToolbarButton>
        </Labelled>
      ) : onRecord ? (
        <ToolbarButton
          label="Record video"
          title="Recording studio (V records straight away)"
          active={studioOpen}
          onClick={() => onTogglePanel("record")}
        >
          <Video />
        </ToolbarButton>
      ) : null}
      {onFullScreen ? (
        <ToolbarButton
          label="Full screen"
          title="Full screen over this page (Alt+Shift+F)"
          onClick={onFullScreen}
        >
          <Maximize />
        </ToolbarButton>
      ) : null}
      {onSidePanel ? (
        <ToolbarButton label="Open in side panel" onClick={onSidePanel}>
          <PanelRight />
        </ToolbarButton>
      ) : null}

      <div className="flex-1" />

      <ThemeButton theme={theme} onTheme={onTheme} />
      <ToolbarButton
        label="Settings"
        active={openPanel === "settings"}
        onClick={() => onTogglePanel("settings")}
      >
        <SettingsIcon />
      </ToolbarButton>
    </nav>
  );
}

function Divider() {
  return <span className="bg-border/80 my-1 h-px w-6" aria-hidden />;
}

function Labelled({
  caption,
  tone = "text-muted-foreground",
  children,
}: {
  caption: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      {children}
      <span className={cn("-mt-0.5 text-[0.5625rem] font-medium tabular-nums", tone)}>
        {caption}
      </span>
    </div>
  );
}
