import { Fragment, useState, type ReactNode } from "react";
import {
  AppWindow,
  ArrowLeftRight,
  BatteryMedium,
  Clock,
  Fingerprint,
  GripVertical,
  Keyboard,
  Layers,
  Link,
  Minus,
  PaintBucket,
  PanelTop,
  Plus,
  Pointer,
  Presentation,
  Ruler,
  Shrink,
  Signal,
  Smartphone,
  X,
  type LucideIcon,
} from "lucide-react";

import { PANEL_INPUT_CLASS, Panel, PanelField, Section } from "@/components/app/Section";
import { ToggleRow } from "@/components/app/ToggleRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SIM_PARAM } from "@/shared/constants";
import { deviceGroups } from "@/shared/device-groups";
import { parseHostList } from "@/shared/inline";
import type { ColorScheme, CspMode, Device, Settings } from "@/shared/types";
import { SHORTCUT_HELP } from "../shortcuts";
import { SelectField } from "./SelectField";
import { COLOR_INPUT_CLASS } from "./Swatches";
import { TimePicker } from "./TimePicker";

const DASHED = "rounded-lg border-dashed shadow-none";
const DEFAULT_STAGE = "#f4f4f5";
const LAST_USED = "__last";
const IDLE_CHOICES: [Settings["recording"]["stopAfterIdle"], string][] = [
  [0, "Never"],
  [1, "1 min"],
  [2, "2 mins"],
  [5, "5 mins"],
  [10, "10 mins"],
];

type SettingsPanelProps = {
  settings: Settings;
  /** Every device there is, for the default device. */
  devices: readonly Device[];
  updateSettings: (patch: Partial<Settings>) => void;
  onChooseDevices: () => void;
};

export function SettingsPanel({
  settings,
  devices,
  updateSettings,
  onChooseDevices,
}: SettingsPanelProps) {
  const allSynced =
    settings.syncScroll && settings.syncClicks && settings.syncInput && settings.syncNavigation;
  return (
    <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3">
      <Section title="Opening">
        <Panel className={cn(DASHED, "space-y-4")}>
          <SelectField
            id="setting-open-in"
            label="Open simulator in"
            value={settings.openMode}
            onValueChange={(value) => updateSettings({ openMode: value as Settings["openMode"] })}
            options={[
              ["over-page", "Over the page, full screen"],
              ["new-tab", "A new tab"],
              ["same-tab", "The same tab"],
            ]}
            hint={
              settings.openMode === "same-tab"
                ? "The simulator takes the place of the page you opened it from. Closing it goes back to that page."
                : settings.openMode === "over-page"
                  ? "The simulator lies over the page you opened it from, and records without Chrome asking to share the tab."
                  : "The simulator gets a tab of its own, and the page you opened it from stays as it is. Chrome asks before each recording."
            }
          />
          <DefaultDeviceField
            devices={devices}
            value={settings.defaultDeviceId}
            onChange={(defaultDeviceId) => updateSettings({ defaultDeviceId })}
          />
        </Panel>
      </Section>

      <Section title="Device">
        <Panel className={cn(DASHED, "divide-border/60 divide-y")}>
          <ToggleRow
            id="setting-bezel"
            icon={Smartphone}
            label="Show device frame"
            hint="Draws each device in its real frame, or a plain outline where there is none."
            checked={settings.bezelMode}
            onChange={(bezelMode) => updateSettings({ bezelMode })}
          />
          <ToggleRow
            id="setting-keyboard"
            icon={Keyboard}
            label="Simulate keyboard while typing"
            hint="Tapping a text field slides up the device's keyboard and shrinks the page above it, as on a phone."
            checked={settings.keyboard}
            onChange={(keyboard) => updateSettings({ keyboard })}
          />
          <ToggleRow
            id="setting-scrollbars"
            icon={GripVertical}
            label="Show native scrollbar in the device"
            hint="Phones hide the scrollbar. On, pages keep the one your computer draws, and lose its width."
            checked={settings.nativeScrollbars}
            onChange={(nativeScrollbars) => updateSettings({ nativeScrollbars })}
          />
          <ToggleRow
            id="setting-touch"
            icon={Pointer}
            label="Touch scroll and finger cursor"
            hint="Phones and tablets show a fingertip cursor and scroll when you drag, with momentum."
            checked={settings.touchMode}
            onChange={(touchMode) => updateSettings({ touchMode })}
          />
          <ToggleRow
            id="setting-spoof-ua"
            icon={Fingerprint}
            label="Spoof User-Agent per device"
            hint={
              <>
                Sites receive each device's own browser header. Adds{" "}
                <code className="bg-muted rounded px-1 text-[0.625rem]">
                  ?{SIM_PARAM}=&lt;id&gt;
                </code>{" "}
                to frame URLs so the rule can find them.
              </>
            }
            checked={settings.spoofUA}
            onChange={(spoofUA) => updateSettings({ spoofUA })}
          />
          <ToggleRow
            id="setting-browser-chrome"
            icon={PanelTop}
            label="Browser bars"
            hint="Safari's address bar and toolbar on Apple devices, Chrome's on Android. The page gets the smaller viewport it has in a real browser."
            checked={settings.browserChrome}
            onChange={(browserChrome) => updateSettings({ browserChrome })}
          />
          <ToggleRow
            id="setting-breakpoints"
            icon={Ruler}
            label="Breakpoint badge"
            hint="Shows which Tailwind breakpoint (xs, sm, md, lg, xl, 2xl) each device's width falls in."
            checked={settings.breakpoints}
            onChange={(breakpoints) => updateSettings({ breakpoints })}
          />
        </Panel>
      </Section>

      <Section title="Device header">
        <Panel className={cn(DASHED, "divide-border/60 divide-y")}>
          <ToggleRow
            id="setting-status-bar"
            icon={Signal}
            label="Status bar"
            hint="The clock, signal and battery across the top. Off, the page starts at the very top of the screen."
            checked={settings.statusBar}
            onChange={(statusBar) => updateSettings({ statusBar })}
          />
          <InputRow
            id="setting-battery"
            icon={BatteryMedium}
            label="Battery level (%)"
            disabled={!settings.statusBar}
          >
            <BatteryInput
              disabled={!settings.statusBar}
              value={settings.batteryLevel}
              onChange={(batteryLevel) => updateSettings({ batteryLevel })}
            />
          </InputRow>
          <InputRow
            id="setting-time"
            icon={Clock}
            label="Force the time shown"
            disabled={!settings.statusBar}
          >
            <TimePicker
              id="setting-time"
              disabled={!settings.statusBar}
              value={settings.forcedTime}
              battery={settings.batteryLevel}
              onChange={(forcedTime) => updateSettings({ forcedTime })}
            />
          </InputRow>
          <InputRow
            id="setting-display-url"
            icon={Link}
            label="Address shown in the browser bars"
            hint={
              settings.browserChrome
                ? "Only what the bar shows changes. The page still loads from its real address."
                : "Turn on browser bars above to see it."
            }
            stacked
          >
            <div className="flex items-center gap-1">
              <Input
                id="setting-display-url"
                placeholder="The real address"
                maxLength={500}
                value={settings.displayUrl}
                onChange={(event) => updateSettings({ displayUrl: event.target.value })}
                className={PANEL_INPUT_CLASS}
              />
              {settings.displayUrl && (
                <ClearButton
                  label="Show the real address"
                  onClick={() => updateSettings({ displayUrl: "" })}
                />
              )}
            </div>
          </InputRow>
          <ToggleRow
            id="setting-home-indicator"
            icon={Minus}
            label="Home indicator"
            hint="The bar along the bottom of phones and tablets without a home button."
            checked={settings.homeIndicator}
            onChange={(homeIndicator) => updateSettings({ homeIndicator })}
          />
        </Panel>
      </Section>

      <Section title="Multi-device mode">
        <Panel className={cn(DASHED, "divide-border/60 divide-y")}>
          <ToggleRow
            id="setting-multi"
            icon={Layers}
            label="Show more than one device"
            hint="Compare several devices side by side instead of one at a time."
            checked={settings.multiDevice}
            onChange={(multiDevice) => updateSettings({ multiDevice })}
          />
          <ToggleRow
            id="setting-sync-all"
            icon={ArrowLeftRight}
            label="Sync events between devices"
            hint="Clicks, scrolling, typing and page changes in one device happen in the others. Tools has a switch for each."
            disabled={!settings.multiDevice}
            checked={allSynced}
            onChange={(on) =>
              updateSettings({
                syncScroll: on,
                syncClicks: on,
                syncInput: on,
                syncNavigation: on,
              })
            }
          />
          <ToggleRow
            id="setting-compact"
            icon={Shrink}
            label="Compact view"
            hint="With several devices on screen, shrinks each to 60% of the zoom level."
            disabled={!settings.multiDevice}
            checked={settings.compactView}
            onChange={(compactView) => updateSettings({ compactView })}
          />
          {settings.multiDevice ? (
            <div className="pt-3">
              <Button variant="twoTone" size="sm" className="w-full" onClick={onChooseDevices}>
                <Plus />
                Add more devices
              </Button>
            </div>
          ) : null}
        </Panel>
      </Section>

      <Section title="PWA">
        <Panel className={DASHED}>
          <ToggleRow
            id="setting-pwa"
            icon={AppWindow}
            label="Show web apps as installed apps"
            hint="Pages whose web app manifest opens standalone or full screen show without the browser bars, as they do once added to the home screen."
            checked={settings.detectPwa}
            onChange={(detectPwa) => updateSettings({ detectPwa })}
          />
        </Panel>
      </Section>

      <Section title="Recording">
        <Panel className={DASHED}>
          <InputRow
            id="setting-stop-after-idle"
            icon={Clock}
            label="Stop after inactivity"
            hint="Ends a recording after this long with no click, typing, scrolling or pointer movement."
          >
            <Select
              value={String(settings.recording.stopAfterIdle)}
              onValueChange={(value) =>
                updateSettings({
                  recording: {
                    ...settings.recording,
                    stopAfterIdle: Number(value) as Settings["recording"]["stopAfterIdle"],
                  },
                })
              }
            >
              <SelectTrigger
                id="setting-stop-after-idle"
                size="sm"
                className="bg-card h-8 w-auto min-w-20 gap-1.5 rounded-[8px] px-2.5 text-xs tabular-nums"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {IDLE_CHOICES.map(([minutes, label]) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputRow>
        </Panel>
      </Section>

      <Section title="Appearance">
        <Panel className={cn(DASHED, "divide-border/60 divide-y")}>
          <ToggleRow
            id="setting-stage-background"
            icon={PaintBucket}
            label="Change background colour"
            hint="The colour behind the devices. Off, it follows the theme."
            checked={!!settings.stageBackground}
            onChange={(on) => updateSettings({ stageBackground: on ? DEFAULT_STAGE : "" })}
          />
          {settings.stageBackground && (
            <div className="py-3 pl-7 last:pb-0">
              <label className="border-input bg-card focus-within:ring-ring/50 relative flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border px-2 focus-within:ring-2">
                <span
                  className="size-5 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                  style={{ backgroundColor: settings.stageBackground }}
                />
                <span className="font-mono text-xs uppercase">{settings.stageBackground}</span>
                <input
                  type="color"
                  aria-label="Background colour"
                  value={settings.stageBackground}
                  onChange={(event) => updateSettings({ stageBackground: event.target.value })}
                  className={COLOR_INPUT_CLASS}
                />
              </label>
            </div>
          )}
          <ToggleRow
            id="setting-presentation"
            icon={Presentation}
            label="Presentation mode"
            hint="The menu on the right hides until you move the pointer to the right edge."
            checked={settings.presentation}
            onChange={(presentation) => updateSettings({ presentation })}
          />
        </Panel>
      </Section>

      <Section title="Pages">
        <Panel className="space-y-4 rounded-lg border-dashed shadow-none">
          <SelectField
            id="setting-scheme"
            label="Force color scheme"
            value={settings.forceColorScheme}
            onValueChange={(value) => updateSettings({ forceColorScheme: value as ColorScheme })}
            options={[
              ["auto", "Auto"],
              ["light", "Light"],
              ["dark", "Dark"],
            ]}
            hint="Same-origin frames only. Cross-origin pages can't be modified."
          />
          <SelectField
            id="setting-csp"
            label="Response header handling"
            value={settings.cspMode}
            onValueChange={(value) => updateSettings({ cspMode: value as CspMode })}
            options={[
              ["strip", "Strip CSP + XFO (default)"],
              ["xfo-only", "Strip XFO only (keep CSP)"],
              ["off", "Off (no header changes)"],
            ]}
            hint='Some sites break when CSP is removed. Try "XFO only" if assets fail to load.'
          />
        </Panel>
      </Section>

      <Section title="Phone inside the page">
        <Panel className="space-y-4 rounded-lg border-dashed shadow-none">
          <ToggleRow
            id="setting-inline"
            label="Open with #mobile-sim"
            hint={
              <>
                Add <code className="bg-muted rounded px-1 text-[0.625rem]">#mobile-sim</code> to a
                page's address and a phone showing that page appears beside it, logged in as you
                are.
              </>
            }
            checked={settings.inline.enabled}
            onChange={(enabled) => updateSettings({ inline: { ...settings.inline, enabled } })}
          />
          <InlineHosts
            hosts={settings.inline.hosts}
            onChange={(hosts) => updateSettings({ inline: { ...settings.inline, hosts } })}
          />
        </Panel>
      </Section>

      <Section title="Keyboard shortcuts">
        <Panel className="rounded-lg border-dashed shadow-none">
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs">
            {SHORTCUT_HELP.map(([keys, what]) => (
              <Fragment key={what}>
                <dt className="flex gap-1">
                  {keys.map((key) => (
                    <kbd
                      key={key}
                      className="bg-muted border-border/70 min-w-5 rounded border px-1.5 py-0.5 text-center font-sans text-[0.6875rem] font-medium"
                    >
                      {key}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-muted-foreground">{what}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            These work inside the pages too, unless the site uses the same key.
          </p>
        </Panel>
      </Section>
    </div>
  );
}

/** Saved when the field loses focus, so a half-typed host never counts. */
function InlineHosts({
  hosts,
  onChange,
}: {
  hosts: string[];
  onChange: (hosts: string[]) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <PanelField label="Sites it opens on" htmlFor="setting-inline-hosts">
      <Textarea
        id="setting-inline-hosts"
        rows={3}
        spellCheck={false}
        className="bg-card rounded-[8px] font-mono text-xs"
        value={draft ?? hosts.join("\n")}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) onChange(parseHostList(draft));
          setDraft(null);
        }}
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        One host per line. <code className="bg-muted rounded px-1">*.test</code> covers every host
        under <code className="bg-muted rounded px-1">test</code>. Other sites ask first.
      </p>
    </PanelField>
  );
}

/** A label on the left and a control on the right, or under it when `stacked`. */
function InputRow({
  id,
  icon: Icon,
  label,
  hint,
  disabled,
  stacked,
  children,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  disabled?: boolean;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 py-3 first:pt-0 last:pb-0", disabled && "opacity-55")}>
      <Icon aria-hidden className="text-muted-foreground mt-px size-4 shrink-0" />
      <div className={cn("min-w-0 flex-1", stacked ? "space-y-2" : "flex items-center gap-3")}>
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-[0.8125rem]">
            {label}
          </Label>
          {hint ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{hint}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Saved as soon as it holds a whole number from 1 to 100; anything else is put back on blur. */
function BatteryInput({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      id="setting-battery"
      type="number"
      min={1}
      max={100}
      disabled={disabled}
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (Number.isInteger(next) && next >= 1 && next <= 100) onChange(next);
      }}
      onBlur={() => setDraft(null)}
      className={cn(PANEL_INPUT_CLASS, "w-20 text-right tabular-nums")}
    />
  );
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      data-tip={label}
      onClick={onClick}
      className="text-muted-foreground size-7 shrink-0 rounded-full"
    >
      <X className="size-3.5" />
    </Button>
  );
}

function DefaultDeviceField({
  devices,
  value,
  onChange,
}: {
  devices: readonly Device[];
  value: string;
  onChange: (deviceId: string) => void;
}) {
  const known = devices.some((d) => d.id === value);
  return (
    <PanelField label="Default device each time it opens" htmlFor="setting-default-device">
      <Select
        value={known ? value : LAST_USED}
        onValueChange={(next) => onChange(next === LAST_USED ? "" : next)}
      >
        <SelectTrigger
          id="setting-default-device"
          className="bg-card h-9 w-full rounded-[8px] text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72 rounded-lg">
          <SelectItem value={LAST_USED} className="text-xs">
            The last devices used
          </SelectItem>
          {deviceGroups(devices).map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="text-[0.6875rem]">{group.label}</SelectLabel>
              {group.devices.map((device) => (
                <SelectItem key={device.id} value={device.id} className="text-xs">
                  {device.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </PanelField>
  );
}
