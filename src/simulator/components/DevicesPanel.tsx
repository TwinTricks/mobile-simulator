import { useState, type FormEvent, type ReactNode } from "react";
import { Bookmark, Plus, RotateCcw, Save, Smartphone, Trash2 } from "lucide-react";

import { InlineMessage } from "@/components/app/InlineMessage";
import { PANEL_INPUT_CLASS, Panel, PanelField, Section } from "@/components/app/Section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { parseCustomDevice, type CustomDeviceInput } from "@/lib/custom-device";
import { newId } from "@/lib/ids";
import { cn } from "@/lib/utils";
import { CUSTOM_DEVICE_LIMITS, MAX_PRESET_NAME_LENGTH } from "@/shared/constants";
import { PRESET_DEVICES, defaultPresets } from "@/shared/devices";
import type { Device, DeviceCategory, Preset, SimulatorState } from "@/shared/types";
import { ConfirmDialog } from "./ConfirmDialog";

type Tab = "devices" | "custom" | "presets";

type PendingDelete = { kind: "device" | "preset"; id: string; name: string };

const TABS = [
  { value: "devices", label: "Devices", icon: Smartphone },
  { value: "custom", label: "Custom", icon: Plus },
  { value: "presets", label: "Presets", icon: Bookmark },
] as const satisfies readonly { value: Tab; label: string; icon: typeof Smartphone }[];

const CATEGORIES: { category: DeviceCategory; label: string }[] = [
  { category: "phone", label: "Phones" },
  { category: "tablet", label: "Tablets" },
  { category: "watch", label: "Watches" },
  { category: "desktop", label: "Desktop" },
];

const EMPTY_CUSTOM: CustomDeviceInput = { name: "", width: "", height: "", dpr: "2" };

const LIST_PANEL = "divide-border/60 divide-y rounded-lg border-dashed p-0 shadow-none";

type DevicesPanelProps = {
  state: SimulatorState;
  /** Off, picking a device swaps the one on screen rather than adding to it. */
  multiDevice: boolean;
  updateState: (recipe: (current: SimulatorState) => SimulatorState) => void;
  showWarning: (text: string, key: string) => void;
};

export function DevicesPanel({ state, multiDevice, updateState, showWarning }: DevicesPanelProps) {
  const [chosenTab, setTab] = useState<Tab>("devices");
  const [custom, setCustom] = useState<CustomDeviceInput>(EMPTY_CUSTOM);
  const [customError, setCustomError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const tabs = multiDevice ? TABS : TABS.filter((t) => t.value !== "presets");
  const tab = tabs.some((t) => t.value === chosenTab) ? chosenTab : "devices";
  const shownId = state.visibleDeviceIds[0];

  // The rest of the list is kept, so turning on more devices brings the old set back.
  function show(id: string) {
    updateState((s) => ({
      ...s,
      visibleDeviceIds: [id, ...s.visibleDeviceIds.filter((x) => x !== id)],
    }));
  }

  function rowProps(device: Device) {
    return multiDevice
      ? {
          checked: state.visibleDeviceIds.includes(device.id),
          onCheckedChange: (checked: boolean) => setVisible(device.id, checked),
        }
      : { checked: device.id === shownId, onCheckedChange: () => show(device.id) };
  }

  function setVisible(id: string, visible: boolean) {
    updateState((s) => ({
      ...s,
      visibleDeviceIds: visible
        ? s.visibleDeviceIds.includes(id)
          ? s.visibleDeviceIds
          : [...s.visibleDeviceIds, id]
        : s.visibleDeviceIds.filter((x) => x !== id),
    }));
  }

  function addCustomDevice(event: FormEvent) {
    event.preventDefault();
    const result = parseCustomDevice(custom, newId());
    if ("error" in result) {
      setCustomError(result.error);
      return;
    }
    const { device } = result;
    updateState((s) => ({
      ...s,
      customDevices: [...s.customDevices, device],
      visibleDeviceIds: multiDevice
        ? [...s.visibleDeviceIds, device.id]
        : [device.id, ...s.visibleDeviceIds],
    }));
    setCustom((c) => ({ ...EMPTY_CUSTOM, dpr: c.dpr }));
    setCustomError(null);
  }

  function savePreset(event: FormEvent) {
    event.preventDefault();
    const name = presetName.trim().slice(0, MAX_PRESET_NAME_LENGTH);
    if (!name) return;
    updateState((s) => ({
      ...s,
      presets: [...s.presets, { id: newId(), name, deviceIds: [...s.visibleDeviceIds] }],
    }));
    setPresetName("");
  }

  function loadPreset(preset: Preset) {
    updateState((s) => ({ ...s, visibleDeviceIds: [...preset.deviceIds] }));
  }

  // Merges any missing starters back in without touching the user's own presets.
  function restoreDefaultPresets() {
    const existing = new Set(state.presets.map((p) => p.id));
    const missing = defaultPresets().filter((p) => !existing.has(p.id));
    if (missing.length === 0) {
      showWarning("All default presets are already present.", "presets-already-present");
      return;
    }
    updateState((s) => ({ ...s, presets: [...s.presets, ...missing] }));
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    updateState((s) =>
      kind === "device"
        ? {
            ...s,
            customDevices: s.customDevices.filter((d) => d.id !== id),
            visibleDeviceIds: s.visibleDeviceIds.filter((x) => x !== id),
          }
        : { ...s, presets: s.presets.filter((p) => p.id !== id) },
    );
    setPendingDelete(null);
  }

  const activeIndex = tabs.findIndex((t) => t.value === tab);

  return (
    <>
      <div role="tablist" className="border-border/60 bg-card/85 relative shrink-0 border-b">
        {/* One shared bar slides between the tabs. */}
        <span
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 px-6 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          aria-hidden
        >
          <span className="bg-primary block h-full rounded-full" />
        </span>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(value)}
                className={cn(
                  "group focus-visible:ring-ring/50 flex flex-col items-center gap-0.5 pt-1.5 pb-1.5 text-[0.625rem] outline-none focus-visible:ring-2",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full transition-[background-color,transform] duration-200 motion-reduce:transition-none",
                    active ? "bg-primary/10 scale-105" : "group-hover:bg-accent/60",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3"
      >
        {tab === "devices" &&
          CATEGORIES.map(({ category, label }) => (
            <Section key={category} title={label}>
              <Panel className={LIST_PANEL}>
                {PRESET_DEVICES.filter((d) => d.category === category).map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    single={!multiDevice}
                    {...rowProps(device)}
                  />
                ))}
              </Panel>
            </Section>
          ))}

        {tab === "custom" && (
          <>
            <Section
              title="Add custom device"
              description={`Any size from ${CUSTOM_DEVICE_LIMITS.minSize} to ${CUSTOM_DEVICE_LIMITS.maxSize} pixels.`}
            >
              <Panel>
                <form className="space-y-3" onSubmit={addCustomDevice}>
                  <PanelField label="Device name" htmlFor="cd-name">
                    <Input
                      id="cd-name"
                      placeholder="e.g. Kiosk display"
                      maxLength={CUSTOM_DEVICE_LIMITS.maxNameLength}
                      value={custom.name}
                      onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                      className={PANEL_INPUT_CLASS}
                    />
                  </PanelField>
                  <div className="grid grid-cols-3 gap-2">
                    <PanelField label="Width" htmlFor="cd-width">
                      <Input
                        id="cd-width"
                        type="number"
                        placeholder="390"
                        min={CUSTOM_DEVICE_LIMITS.minSize}
                        max={CUSTOM_DEVICE_LIMITS.maxSize}
                        value={custom.width}
                        onChange={(e) => setCustom({ ...custom, width: e.target.value })}
                        className={PANEL_INPUT_CLASS}
                      />
                    </PanelField>
                    <PanelField label="Height" htmlFor="cd-height">
                      <Input
                        id="cd-height"
                        type="number"
                        placeholder="844"
                        min={CUSTOM_DEVICE_LIMITS.minSize}
                        max={CUSTOM_DEVICE_LIMITS.maxSize}
                        value={custom.height}
                        onChange={(e) => setCustom({ ...custom, height: e.target.value })}
                        className={PANEL_INPUT_CLASS}
                      />
                    </PanelField>
                    <PanelField label="Pixel ratio" htmlFor="cd-dpr">
                      <Input
                        id="cd-dpr"
                        type="number"
                        placeholder="2"
                        min={1}
                        max={5}
                        step={0.5}
                        value={custom.dpr}
                        onChange={(e) => setCustom({ ...custom, dpr: e.target.value })}
                        className={PANEL_INPUT_CLASS}
                      />
                    </PanelField>
                  </div>
                  {customError ? <InlineMessage tone="error">{customError}</InlineMessage> : null}
                  <Button type="submit" className="w-full">
                    <Plus />
                    Add device
                  </Button>
                </form>
              </Panel>
            </Section>

            <Section title="Your devices">
              {state.customDevices.length === 0 ? (
                <InlineMessage>No custom devices yet.</InlineMessage>
              ) : (
                <Panel className={LIST_PANEL}>
                  {state.customDevices.map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      single={!multiDevice}
                      {...rowProps(device)}
                      onDelete={() =>
                        setPendingDelete({ kind: "device", id: device.id, name: device.name })
                      }
                    />
                  ))}
                </Panel>
              )}
            </Section>
          </>
        )}

        {tab === "presets" && (
          <>
            <Section
              title="Save current selection"
              description={`The ${state.visibleDeviceIds.length} devices on screen now, under one name.`}
            >
              <Panel className="space-y-2.5">
                <form className="flex gap-2" onSubmit={savePreset}>
                  <Input
                    aria-label="Preset name"
                    placeholder="Preset name"
                    maxLength={MAX_PRESET_NAME_LENGTH}
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className={PANEL_INPUT_CLASS}
                  />
                  <Button type="submit" disabled={!presetName.trim()}>
                    <Save />
                    Save
                  </Button>
                </form>
                <Button
                  variant="plain"
                  size="sm"
                  className="w-full"
                  onClick={restoreDefaultPresets}
                >
                  <RotateCcw />
                  Restore default presets
                </Button>
              </Panel>
            </Section>

            <Section title="Presets">
              {state.presets.length === 0 ? (
                <InlineMessage>
                  No presets yet. Save your current device selection to get started.
                </InlineMessage>
              ) : (
                <Panel className={LIST_PANEL}>
                  {state.presets.map((preset) => (
                    <div key={preset.id} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.8125rem] font-medium">{preset.name}</p>
                        <p className="text-muted-foreground text-[0.6875rem]">
                          {preset.deviceIds.length} devices
                        </p>
                      </div>
                      <Button
                        variant="twoTone"
                        size="sm"
                        className="h-7 text-xs"
                        data-tip="Show these devices"
                        onClick={() => loadPreset(preset)}
                      >
                        Show
                      </Button>
                      <DeleteButton
                        label="Delete preset"
                        onClick={() =>
                          setPendingDelete({ kind: "preset", id: preset.id, name: preset.name })
                        }
                      />
                    </div>
                  ))}
                </Panel>
              )}
            </Section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === "device" ? "Delete this custom device?" : "Delete this preset?"
        }
        description={`"${pendingDelete?.name ?? ""}" will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

function DeviceRow({
  device,
  single,
  checked,
  onCheckedChange,
  onDelete,
}: {
  device: Device;
  /** Drawn as a choice of one rather than a checkbox. */
  single: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onDelete?: () => void;
}): ReactNode {
  return (
    <div
      className={cn(
        "hover:bg-accent/40 first:rounded-t-lg last:rounded-b-lg",
        single && checked && "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <div className={cn("flex items-center", onDelete && "pr-2")}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5">
          {single ? (
            <input
              type="radio"
              name="shown-device"
              checked={checked}
              onChange={() => onCheckedChange(true)}
              className="accent-primary size-4"
            />
          ) : (
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => onCheckedChange(value === true)}
            />
          )}
          <span
            className={cn(
              "min-w-0 truncate text-[0.8125rem]",
              single && checked && "text-primary font-medium",
            )}
          >
            {device.name}
          </span>
          <span className="text-muted-foreground ml-auto shrink-0 pl-1 text-[0.6875rem] tabular-nums">
            {device.width}×{device.height}
          </span>
        </label>
        {onDelete && <DeleteButton label="Delete custom device" onClick={onDelete} />}
      </div>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      data-tip={label}
      aria-label={label}
      onClick={onClick}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-7 rounded-full"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
