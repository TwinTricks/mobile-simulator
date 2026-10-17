import type { ReactNode } from "react";
import {
  Ban,
  Check,
  Image as ImageIcon,
  Laptop,
  Monitor,
  Plus,
  Scan,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";

import { Section } from "@/components/app/Section";
import { cn } from "@/lib/utils";
import { findDevice } from "@/shared/devices";
import type { Device, RecordQuality, RecordingSettings } from "@/shared/types";
import { WALLPAPER_COUNT, WALLPAPER_GROUPS } from "../recording/wallpapers";
import { ColorField } from "./Swatches";

/** Devices to put the page in with one click, as in the studio's mockup list. */
const MOCKUPS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "macbook-pro-14", label: "MacBook", icon: Laptop },
  { id: "dell-xps-14", label: "Dell XPS", icon: Laptop },
  { id: "studio-display", label: "Studio Display", icon: Monitor },
  { id: "ipad-pro-11-m4", label: "iPad", icon: Tablet },
  { id: "iphone-17-pro-max", label: "17 Pro Max", icon: Smartphone },
];

const QUALITIES: [RecordQuality, string][] = [
  ["good", "Good"],
  ["high", "High"],
  ["best", "Best"],
];

const COUNTDOWNS: [string, string][] = [
  ["0", "None"],
  ["3", "3 s"],
  ["5", "5 s"],
];

/** The studio's side panel: the device the page is in, its backdrop, and how it is recorded. */
export function StudioPanel({
  options,
  onOptions,
  shownId,
  framed,
  onDevice,
  onNoFrame,
}: {
  options: RecordingSettings;
  onOptions: (patch: Partial<RecordingSettings>) => void;
  /** The device on screen, the first one when there are several. */
  shownId: string | undefined;
  framed: boolean;
  onDevice: (device: Device) => void;
  onNoFrame: () => void;
}) {
  const mockups = MOCKUPS.flatMap((m) => {
    const device = findDevice(m.id);
    return device ? [{ ...m, device }] : [];
  });
  const solid = options.backdrop === "solid";

  return (
    <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3">
      <Section title="Device">
        <div role="group" aria-label="Device mockup" className="grid grid-cols-3 gap-1.5">
          <Mockup icon={ImageIcon} label="No frame" picked={!framed} onClick={onNoFrame} />
          {mockups.map((m) => (
            <Mockup
              key={m.id}
              icon={m.icon}
              label={m.label}
              picked={framed && shownId === m.id}
              onClick={() => onDevice(m.device)}
            />
          ))}
        </div>
      </Section>

      <Section title={`Backdrop · ${WALLPAPER_COUNT} wallpapers`}>
        <div className="space-y-3">
          <div className="border-border/70 bg-card space-y-2.5 rounded-lg border px-3 py-2.5">
            <Slider
              id="studio-shadow"
              label="Shadow"
              value={options.shadow}
              min={0}
              onChange={(shadow) => onOptions({ shadow })}
            />
            <Slider
              id="studio-blur"
              label="Blur"
              value={options.blur}
              min={0}
              onChange={(blur) => onOptions({ blur })}
            />
            <Slider
              id="studio-size"
              label="Size"
              value={options.size}
              min={40}
              onChange={(size) => onOptions({ size })}
            />
          </div>

          <WallGroup title="Basic">
            <Tile
              label="No backdrop"
              style={{ background: "var(--muted)" }}
              picked={options.backdrop === "none"}
              onClick={() => onOptions({ backdrop: "none" })}
            >
              <Ban className="text-muted-foreground size-4" />
            </Tile>
            {WALLPAPER_GROUPS[0]!.wallpapers.map((w) => (
              <Tile
                key={w.id}
                label={`${w.label} backdrop`}
                style={{ background: w.css }}
                picked={options.backdrop === w.id}
                onClick={() => onOptions({ backdrop: w.id })}
              />
            ))}
            <Tile
              label="Backdrop in your own colour"
              style={solid ? { background: options.backdropColor } : undefined}
              dashed={!solid}
              picked={solid}
              onClick={() => onOptions({ backdrop: "solid" })}
            >
              {!solid && <Plus className="text-muted-foreground size-4" />}
            </Tile>
          </WallGroup>
          {solid && (
            <ColorField
              id="studio-backdrop-color"
              label="Backdrop colour"
              value={options.backdropColor}
              onChange={(backdropColor) => onOptions({ backdropColor })}
            />
          )}

          {WALLPAPER_GROUPS.slice(1).map((group) => (
            <WallGroup key={group.title} title={group.title}>
              {group.wallpapers.map((w) => (
                <Tile
                  key={w.id}
                  label={`${w.label} backdrop`}
                  style={{ background: w.css }}
                  picked={options.backdrop === w.id}
                  onClick={() => onOptions({ backdrop: w.id })}
                />
              ))}
            </WallGroup>
          ))}
        </div>
      </Section>

      <Section title="Recording">
        <div className="space-y-3">
          <div role="group" aria-label="What to record" className="grid grid-cols-2 gap-1.5">
            <Mockup
              icon={Smartphone}
              label="Device in its frame"
              picked={options.crop === "frame"}
              onClick={() => onOptions({ crop: "frame" })}
            />
            <Mockup
              icon={Scan}
              label="Screen only"
              picked={options.crop === "screen"}
              onClick={() => onOptions({ crop: "screen" })}
            />
          </div>
          <LabelledSegmented
            label="Quality"
            value={options.quality}
            options={QUALITIES}
            onChange={(quality) => onOptions({ quality })}
          />
          <LabelledSegmented
            label="Countdown"
            value={String(options.countdown)}
            options={COUNTDOWNS}
            onChange={(value) => onOptions({ countdown: Number(value) as 0 | 3 | 5 })}
          />
        </div>
      </Section>
    </div>
  );
}

function Mockup({
  icon: Icon,
  label,
  picked,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  picked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2.5 text-center transition-colors outline-none focus-visible:ring-2",
        picked
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span className="text-[0.6875rem] leading-tight font-medium">{label}</span>
    </button>
  );
}

function WallGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[0.625rem] font-semibold tracking-wider uppercase">
        {title}
      </p>
      <div role="group" aria-label={`${title} backdrops`} className="grid grid-cols-4 gap-1.5">
        {children}
      </div>
    </div>
  );
}

function Tile({
  label,
  style,
  picked,
  dashed,
  onClick,
  children,
}: {
  label: string;
  style?: React.CSSProperties;
  picked: boolean;
  dashed?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={picked}
      data-tip={label.replace(/ backdrop$/, "")}
      onClick={onClick}
      style={style}
      className={cn(
        "relative flex aspect-[16/10] items-center justify-center rounded-md border transition-shadow",
        dashed ? "border-border border-dashed" : "border-black/10 dark:border-white/10",
        picked
          ? "ring-primary ring-offset-background ring-2 ring-offset-1"
          : "hover:ring-border hover:ring-offset-background hover:ring-2 hover:ring-offset-1",
      )}
    >
      {children}
      {picked && !children && (
        <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid size-4 place-items-center rounded-full shadow">
          <Check className="size-2.5" />
        </span>
      )}
    </button>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase"
        >
          {label}
        </label>
        <span className="text-muted-foreground text-[0.6875rem] tabular-nums">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary w-full"
      />
    </div>
  );
}

function LabelledSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[0.625rem] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div role="group" aria-label={label} className="bg-muted/60 flex rounded-lg p-0.5">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "text-muted-foreground flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
              value === option && "bg-background text-foreground shadow-sm",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
