import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ban, Check, Copy, Download, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { frameVariant, frameVariants } from "@/shared/frames";
import type { FrameTint, ScreenshotSettings, ShotFormat, ShotRatio } from "@/shared/types";
import { GRADIENTS, cssGradient } from "../screenshot/backgrounds";
import type { Capture } from "../screenshot/capture";
import { canvasBlob, composeShot, shotFileName } from "../screenshot/compose";

const RATIOS: [ShotRatio, string][] = [
  ["auto", "Auto"],
  ["1:1", "1:1"],
  ["9:16", "9:16"],
  ["4:5", "4:5"],
  ["16:9", "16:9"],
];
const FORMATS: [ShotFormat, string][] = [
  ["png", "PNG"],
  ["jpeg", "JPEG"],
  ["webp", "WebP"],
];
// A checkerboard behind the preview, so a transparent background reads as transparent.
const CHECKERBOARD =
  "repeating-conic-gradient(var(--muted) 0% 25%, transparent 0% 50%) 50% / 16px 16px";

type ScreenshotDialogProps = {
  capture: Capture;
  url: string;
  options: ScreenshotSettings;
  frameColors: Readonly<Record<string, string>>;
  frameTints: Readonly<Record<string, FrameTint>>;
  onOptions: (patch: Partial<ScreenshotSettings>) => void;
  onFrameColor: (deviceId: string, color: string) => void;
  /** Swaps this shot of what's on screen for one of each whole page. */
  onFullPage: () => void;
  onClose: () => void;
};

export function ScreenshotDialog({
  capture,
  url,
  options,
  frameColors,
  frameTints,
  onOptions,
  onFrameColor,
  onFullPage,
  onClose,
}: ScreenshotDialogProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { screens, skipped } = capture;
  const single = screens.length === 1 ? screens[0]!.device : null;
  const colors = single ? frameVariants(single.id) : [];

  useEffect(() => {
    let current = true;
    void composeShot(screens, options, frameColors, frameTints)
      .then((drawn) => {
        if (!current) return;
        setCanvas(drawn);
        setError(null);
        // A data URL rather than the canvas itself, so the preview scales like any image.
        setPreview(drawn.toDataURL("image/png"));
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      current = false;
    };
  }, [screens, options, frameColors, frameTints]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const names = screens.map((s) => s.device.name);

  async function save() {
    if (!canvas) return;
    const blob = await canvasBlob(canvas, options.format);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = shotFileName(url, names, options.format);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    onClose();
  }

  async function copy() {
    if (!canvas) return;
    try {
      // The clipboard only takes PNG, whatever format is picked for saving.
      const blob = await canvasBlob(canvas, "png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("The clipboard refused the image. Save it instead.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="border-border/70 bg-background flex h-[min(46rem,100%)] w-[min(68rem,100%)] overflow-hidden rounded-xl border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex min-w-0 flex-1 items-center justify-center p-6"
          style={{ background: CHECKERBOARD }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Screenshot preview"
              className="max-h-full max-w-full rounded-md object-contain shadow-sm"
            />
          ) : (
            <span className="text-muted-foreground text-xs">Drawing…</span>
          )}
        </div>

        <div className="border-border/60 flex w-80 shrink-0 flex-col border-l">
          <div className="border-border/60 flex items-center gap-2 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm leading-tight font-semibold">Screenshot</h2>
              <p className="text-muted-foreground truncate text-[0.6875rem]">
                {canvas ? `${canvas.width} × ${canvas.height}` : " "} · {names.join(", ")}
              </p>
            </div>
            <Button
              ref={closeRef}
              variant="plain"
              size="icon-sm"
              className="rounded-full"
              aria-label="Close screenshot"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>

          <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-4 py-4">
            <Field label="Capture">
              <Segmented
                value="screen"
                options={[
                  ["screen", "Visible screen"],
                  ["full", "Full page"],
                ]}
                onChange={(value) => {
                  if (value === "full") onFullPage();
                }}
              />
            </Field>

            <Field label="Background">
              <div className="grid grid-cols-6 gap-1.5">
                {GRADIENTS.map((gradient) => (
                  <Swatch
                    key={gradient.id}
                    label={gradient.label}
                    selected={options.background === gradient.id}
                    style={{ background: cssGradient(gradient) }}
                    onClick={() => onOptions({ background: gradient.id })}
                  />
                ))}
                <Swatch
                  label="Solid colour"
                  selected={options.background === "solid"}
                  style={{ background: options.solidColor }}
                  onClick={() => onOptions({ background: "solid" })}
                />
                <Swatch
                  label="None (transparent)"
                  selected={options.background === "none"}
                  style={{ background: CHECKERBOARD }}
                  onClick={() => onOptions({ background: "none" })}
                >
                  <Ban className="text-muted-foreground size-3.5" />
                </Swatch>
              </div>
              {options.background === "solid" && (
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="color"
                    aria-label="Background colour"
                    value={options.solidColor}
                    onChange={(e) => onOptions({ solidColor: e.target.value })}
                    className="h-7 w-10 cursor-pointer rounded border bg-transparent"
                  />
                  <span className="text-muted-foreground font-mono">{options.solidColor}</span>
                </label>
              )}
              {options.background === "none" && options.format === "jpeg" && (
                <p className="text-muted-foreground mt-1.5 text-[0.6875rem]">
                  JPEG has no transparency, so it is saved on white.
                </p>
              )}
            </Field>

            <Slider
              id="shot-padding"
              label="Padding"
              value={options.padding}
              max={40}
              onChange={(padding) => onOptions({ padding })}
            />
            <Slider
              id="shot-shadow"
              label="Shadow"
              value={options.shadow}
              max={100}
              onChange={(shadow) => onOptions({ shadow })}
            />

            <Field label="Size">
              <Segmented
                value={options.ratio}
                options={RATIOS}
                onChange={(ratio) => onOptions({ ratio })}
              />
            </Field>

            <Field label="Device">
              <SwitchRow
                id="shot-frame"
                label="Show the frame"
                checked={options.frame}
                onChange={(frame) => onOptions({ frame })}
              />
              {single && options.frame && colors.length > 1 && (
                <Select
                  value={frameVariant(single.id, frameColors[single.id])?.color}
                  onValueChange={(color) => onFrameColor(single.id, color)}
                >
                  <SelectTrigger
                    aria-label="Frame colour"
                    className="bg-card mt-2 h-8 w-full rounded-[8px] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-lg">
                    {colors.map((variant) => (
                      <SelectItem key={variant.color} value={variant.color} className="text-xs">
                        {variant.color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Caption">
              <SwitchRow
                id="shot-caption"
                label="Add a caption"
                checked={options.caption}
                onChange={(caption) => onOptions({ caption })}
              />
              {options.caption && (
                <Input
                  aria-label="Caption text"
                  placeholder="Write a caption"
                  maxLength={120}
                  value={options.captionText}
                  onChange={(e) => onOptions({ captionText: e.target.value })}
                  className="mt-2 h-8 text-xs md:text-xs"
                />
              )}
            </Field>

            <Field label="Format">
              <Segmented
                value={options.format}
                options={FORMATS}
                onChange={(format) => onOptions({ format })}
              />
            </Field>
          </div>

          <div className="border-border/60 space-y-2 border-t px-4 py-3">
            {skipped.length > 0 && (
              <p className="text-muted-foreground text-[0.6875rem] leading-relaxed">
                Left out, as they were scrolled out of view: {skipped.join(", ")}.
              </p>
            )}
            {error && <p className="text-destructive text-[0.6875rem]">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="twoTone"
                size="sm"
                className="flex-1"
                disabled={!canvas}
                onClick={() => void copy()}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" className="flex-1" disabled={!canvas} onClick={() => void save()}>
                <Download />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[0.6875rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function Swatch({
  label,
  selected,
  style,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  style: React.CSSProperties;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-tip={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      style={style}
      className={cn(
        "border-border/70 flex aspect-square items-center justify-center rounded-md border transition-shadow",
        selected && "ring-primary ring-offset-background ring-2 ring-offset-2",
      )}
    >
      {children}
    </button>
  );
}

function Slider({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label
          htmlFor={id}
          className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase"
        >
          {label}
        </Label>
        <span className="text-muted-foreground text-[0.6875rem] tabular-nums">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary w-full"
      />
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="bg-muted/60 flex rounded-lg p-0.5">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "text-muted-foreground flex-1 rounded-md py-1 text-xs font-medium transition-colors",
            value === option && "bg-background text-foreground shadow-sm",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-[0.8125rem]">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
