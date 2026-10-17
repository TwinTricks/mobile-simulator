import { useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ImagePlus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { InlineMessage } from "@/components/app/InlineMessage";
import { Panel } from "@/components/app/Section";
import { ToggleRow } from "@/components/app/ToggleRow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_OVERLAY_BYTES } from "@/shared/constants";
import { overlaySchema } from "@/shared/schemas";
import type { Device, Overlay } from "@/shared/types";
import { SelectField } from "./SelectField";

export type OverlayControlsProps = {
  devices: readonly Device[];
  overlays: Record<string, Overlay>;
  images: Record<string, string>;
  onImage: (deviceId: string, dataUrl: string | null) => void;
  onChange: (deviceId: string, patch: Partial<Overlay>) => void;
};

const DEFAULT_OVERLAY: Overlay = overlaySchema.parse({});

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function OverlayControls({
  devices,
  overlays,
  images,
  onImage,
  onChange,
}: OverlayControlsProps) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (devices.length === 0) {
    return <p className="text-muted-foreground text-xs">Show a device to lay a design over it.</p>;
  }
  const device = devices.find((d) => d.id === chosenId) ?? devices[0]!;
  const image = images[device.id];
  const overlay = overlays[device.id] ?? DEFAULT_OVERLAY;

  async function take(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That isn't an image. Export the design as PNG, JPEG or WebP.");
      return;
    }
    if (file.size > MAX_OVERLAY_BYTES) {
      setError("That image is over 3 MB. Export it smaller, at 1x or 2x.");
      return;
    }
    setError(null);
    onImage(device.id, await readImage(file));
    if (!overlays[device.id]) onChange(device.id, DEFAULT_OVERLAY);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void take(event.dataTransfer.files[0]);
  }

  function nudge(event: MouseEvent, dx: number, dy: number) {
    const step = event.shiftKey ? 10 : 1;
    onChange(device.id, { x: overlay.x + dx * step, y: overlay.y + dy * step });
  }

  return (
    <div className="space-y-3">
      {devices.length > 1 ? (
        <SelectField
          id="tool-overlay-device"
          label="Device"
          value={device.id}
          onValueChange={setChosenId}
          options={devices.map((d) => [d.id, images[d.id] ? `${d.name} · has a design` : d.name])}
        />
      ) : null}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "border-border bg-card/60 hover:border-primary/50 flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {image ? (
          <img src={image} alt="" className="max-h-24 rounded object-contain shadow-sm" />
        ) : (
          <ImagePlus className="text-muted-foreground size-5" aria-hidden />
        )}
        <span className="text-xs font-medium">
          {image ? "Replace the design" : `Drop a design for ${device.name}`}
        </span>
        <span className="text-muted-foreground text-[0.6875rem]">
          PNG, JPEG or WebP. It's stretched to the screen's width.
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Design image"
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      {image ? (
        <Panel className="space-y-3 rounded-lg border-dashed shadow-none">
          <ToggleRow
            id="tool-overlay-visible"
            label="Show the design"
            checked={overlay.visible}
            onChange={(visible) => onChange(device.id, { visible })}
          />
          <ToggleRow
            id="tool-overlay-difference"
            label="Difference"
            hint="Where the page matches the design it turns black; anything off shows up bright."
            checked={overlay.difference}
            onChange={(difference) => onChange(device.id, { difference })}
          />
          <label className="block space-y-1.5">
            <span className="flex justify-between text-xs font-medium">
              Opacity
              <span className="text-muted-foreground tabular-nums">
                {Math.round(overlay.opacity * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overlay.opacity}
              onChange={(event) => onChange(device.id, { opacity: Number(event.target.value) })}
              className="accent-primary w-full"
            />
          </label>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-1" data-tip="Shift moves 10 pixels">
              <span />
              <NudgeButton label="Move up" onClick={(e) => nudge(e, 0, -1)}>
                <ArrowUp />
              </NudgeButton>
              <span />
              <NudgeButton label="Move left" onClick={(e) => nudge(e, -1, 0)}>
                <ArrowLeft />
              </NudgeButton>
              <NudgeButton label="Move down" onClick={(e) => nudge(e, 0, 1)}>
                <ArrowDown />
              </NudgeButton>
              <NudgeButton label="Move right" onClick={(e) => nudge(e, 1, 0)}>
                <ArrowRight />
              </NudgeButton>
            </div>
            <div className="text-muted-foreground min-w-0 flex-1 space-y-1 text-[0.6875rem]">
              <p className="tabular-nums">
                Offset {overlay.x}, {overlay.y} px
              </p>
              <p>Hold Shift to move 10 px.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="plain"
              size="sm"
              onClick={() => onChange(device.id, { x: 0, y: 0 })}
              disabled={overlay.x === 0 && overlay.y === 0}
            >
              <RotateCcw />
              Reset position
            </Button>
            <Button
              variant="plain"
              size="sm"
              className="hover:text-destructive"
              onClick={() => onImage(device.id, null)}
            >
              <Trash2 />
              Remove
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (event: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="size-7 [&_svg]:size-3.5"
    >
      {children}
    </Button>
  );
}
