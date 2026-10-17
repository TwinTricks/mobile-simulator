import { useState, type ReactNode } from "react";

import { InlineMessage } from "@/components/app/InlineMessage";
import { Panel, Section } from "@/components/app/Section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { swatchColor } from "@/shared/frame-swatches";
import { frameVariant, frameVariants } from "@/shared/frames";
import type { Device, FrameTint, SimulatorState } from "@/shared/types";
import { ColorField, RAINBOW, Swatch } from "./Swatches";

const GRADIENTS: { name: string; tint: FrameTint }[] = [
  { name: "Sunset", tint: { from: "#ff5f6d", to: "#ffc371" } },
  { name: "Ocean", tint: { from: "#2193b0", to: "#6dd5ed" } },
  { name: "Aurora", tint: { from: "#7f00ff", to: "#e100ff" } },
  { name: "Lime", tint: { from: "#56ab2f", to: "#d4fc79" } },
  { name: "Candy", tint: { from: "#f78ca0", to: "#fe9a8b" } },
  { name: "Steel", tint: { from: "#485563", to: "#9aa8b5" } },
];

const DEFAULT_SOLID = "#6366f1";
const DEFAULT_GRADIENT: FrameTint = { from: "#6366f1", to: "#ec4899" };
const DASHED_PANEL = "rounded-lg border-dashed shadow-none";

type FrameColorPanelProps = {
  devices: readonly Device[];
  bezelMode: boolean;
  state: SimulatorState;
  updateState: (recipe: (current: SimulatorState) => SimulatorState) => void;
  onShowFrames: () => void;
};

export function FrameColorPanel({
  devices,
  bezelMode,
  state,
  updateState,
  onShowFrames,
}: FrameColorPanelProps) {
  if (!bezelMode) {
    return (
      <div className="space-y-3 px-3 py-3">
        <InlineMessage>Device frames are turned off.</InlineMessage>
        <Button variant="twoTone" size="sm" className="w-full" onClick={onShowFrames}>
          Show device frames
        </Button>
      </div>
    );
  }

  const framed = devices.filter((d) => frameVariants(d.id).length > 0);
  if (framed.length === 0) {
    return (
      <div className="px-3 py-3">
        <InlineMessage>
          {devices.length === 1 ? "This device has" : "These devices have"} no frame to colour.
        </InlineMessage>
      </div>
    );
  }

  function pickColor(id: string, color: string) {
    updateState((s) => {
      const { [id]: _old, ...tints } = s.frameTints;
      return { ...s, frameColors: { ...s.frameColors, [id]: color }, frameTints: tints };
    });
  }

  // The tint keeps the lightness of the frame under it, so the lightest frame shows it truest.
  function pickTint(id: string, tint: FrameTint) {
    updateState((s) => ({
      ...s,
      frameColors: { ...s.frameColors, [id]: lightestColor(id) },
      frameTints: { ...s.frameTints, [id]: tint },
    }));
  }

  return (
    <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3">
      {framed.map((device) => (
        <DeviceColors
          key={device.id}
          device={device}
          titled={framed.length > 1}
          color={frameVariant(device.id, state.frameColors[device.id])?.color}
          tint={state.frameTints[device.id]}
          onColor={(color) => pickColor(device.id, color)}
          onTint={(tint) => pickTint(device.id, tint)}
        />
      ))}
    </div>
  );
}

function lightestColor(deviceId: string): string {
  const colors = frameVariants(deviceId).map((v) => v.color);
  return colors.reduce((best, c) =>
    luminance(swatchColor(c)) > luminance(swatchColor(best)) ? c : best,
  );
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return 0;
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

const sameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function DeviceColors({
  device,
  titled,
  color,
  tint,
  onColor,
  onTint,
}: {
  device: Device;
  /** Several devices each get their name over their colours. */
  titled: boolean;
  color: string | undefined;
  tint: FrameTint | undefined;
  onColor: (color: string) => void;
  onTint: (tint: FrameTint) => void;
}): ReactNode {
  const colors = frameVariants(device.id).map((v) => v.color);
  const solid = !!tint && sameHex(tint.from, tint.to);
  const preset = tint && !solid ? GRADIENTS.find((g) => sameTint(g.tint, tint)) : undefined;
  const customGradient = !!tint && !solid && !preset;

  // Remembered while another choice is picked, so going back finds them as they were.
  const [lastSolid, setLastSolid] = useState(solid ? tint.from : DEFAULT_SOLID);
  const [lastGradient, setLastGradient] = useState(customGradient ? tint : DEFAULT_GRADIENT);

  function setSolid(hex: string) {
    setLastSolid(hex);
    onTint({ from: hex, to: hex });
  }

  function setGradient(next: FrameTint) {
    setLastGradient(next);
    onTint(next);
  }

  return (
    <div className="space-y-5">
      {titled && <p className="text-[0.8125rem] font-semibold">{device.name}</p>}

      <Section title="Colour">
        <Panel className={cn(DASHED_PANEL, "space-y-3")}>
          <div
            role="group"
            aria-label={`${device.name} colours`}
            className="grid grid-cols-4 gap-x-2 gap-y-3"
          >
            {colors.map((name) => (
              <Swatch
                key={name}
                label={name}
                ariaLabel={`${device.name} in ${name}`}
                style={{ backgroundColor: swatchColor(name) }}
                picked={!tint && name === color}
                onClick={() => onColor(name)}
              />
            ))}
            <Swatch
              label="Custom"
              ariaLabel={`${device.name} in a custom colour`}
              style={{ background: solid ? tint.from : RAINBOW }}
              picked={solid}
              onClick={() => setSolid(lastSolid)}
            />
          </div>
          {solid && (
            <ColorField
              id={`${device.id}-solid`}
              label="Custom colour"
              value={tint.from}
              onChange={setSolid}
            />
          )}
        </Panel>
      </Section>

      <Section title="Gradient">
        <Panel className={cn(DASHED_PANEL, "space-y-3")}>
          <div
            role="group"
            aria-label={`${device.name} gradients`}
            className="grid grid-cols-4 gap-x-2 gap-y-3"
          >
            {GRADIENTS.map((g) => (
              <Swatch
                key={g.name}
                label={g.name}
                ariaLabel={g.name}
                style={{ background: gradientCss(g.tint) }}
                picked={preset === g}
                onClick={() => onTint(g.tint)}
              />
            ))}
            <Swatch
              label="Custom"
              ariaLabel={`${device.name} with a custom gradient`}
              style={{ background: customGradient ? gradientCss(tint) : RAINBOW }}
              picked={customGradient}
              onClick={() => setGradient(lastGradient)}
            />
          </div>
          {customGradient && (
            <div className="grid grid-cols-2 gap-2">
              <ColorField
                id={`${device.id}-from`}
                label="Start"
                value={tint.from}
                onChange={(from) => setGradient({ ...tint, from })}
              />
              <ColorField
                id={`${device.id}-to`}
                label="End"
                value={tint.to}
                onChange={(to) => setGradient({ ...tint, to })}
              />
            </div>
          )}
        </Panel>
      </Section>
    </div>
  );
}

function sameTint(a: FrameTint, b: FrameTint): boolean {
  return sameHex(a.from, b.from) && sameHex(a.to, b.to);
}

function gradientCss(tint: FrameTint): string {
  return `linear-gradient(135deg, ${tint.from}, ${tint.to})`;
}
