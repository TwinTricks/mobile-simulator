import { Panel, Section } from "@/components/app/Section";
import { ToggleRow } from "@/components/app/ToggleRow";
import type { Settings } from "@/shared/types";
import { LAYOUT_OPTIONS, type Layout } from "../layout";
import { EnvironmentControls, type EnvironmentControlsProps } from "./EnvironmentControls";
import { OverlayControls, type OverlayControlsProps } from "./OverlayControls";
import { SelectField } from "./SelectField";

type ToolsPanelProps = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  overlay: OverlayControlsProps;
  environments: EnvironmentControlsProps;
  /** True when more than one device is on screen, so there is something to arrange. */
  severalShown: boolean;
};

export function ToolsPanel({
  settings,
  updateSettings,
  overlay,
  environments,
  severalShown,
}: ToolsPanelProps) {
  const comparingSites =
    environments.compare.filter((o) => environments.environments.includes(o)).length >= 2;
  const single = !settings.multiDevice && !comparingSites;
  return (
    <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3">
      <Section
        title="Sync across devices"
        description={
          single
            ? "Turn on “Show more than one device” in Settings, or compare sites below, to use these."
            : "What you do in one device happens in the others."
        }
      >
        <Panel className="divide-border/60 divide-y rounded-lg border-dashed shadow-none">
          <ToggleRow
            id="setting-sync"
            label="Scrolling"
            hint="Scrolling one device scrolls the others to the same point."
            disabled={single}
            checked={settings.syncScroll}
            onChange={(syncScroll) => updateSettings({ syncScroll })}
          />
          <ToggleRow
            id="tool-sync-clicks"
            label="Clicks"
            hint="Buttons, tabs, menus and checkboxes are clicked in every device."
            disabled={single}
            checked={settings.syncClicks}
            onChange={(syncClicks) => updateSettings({ syncClicks })}
          />
          <ToggleRow
            id="tool-sync-input"
            label="Typing"
            hint="What you type into a field, or pick from a list, fills the same field everywhere."
            disabled={single}
            checked={settings.syncInput}
            onChange={(syncInput) => updateSettings({ syncInput })}
          />
          <ToggleRow
            id="tool-sync-navigation"
            label="Pages"
            hint="Following a link or going back in one device takes the others to the same page."
            disabled={single}
            checked={settings.syncNavigation}
            onChange={(syncNavigation) => updateSettings({ syncNavigation })}
          />
        </Panel>
      </Section>

      <Section
        title="Layout"
        description={
          severalShown
            ? "Drag a device by its frame or name to change the order."
            : "For when more than one device is on screen."
        }
      >
        <Panel className="rounded-lg border-dashed shadow-none">
          <SelectField
            id="tool-layout"
            label="Arrange devices"
            value={settings.layout}
            disabled={!severalShown}
            onValueChange={(layout) => updateSettings({ layout: layout as Layout })}
            options={LAYOUT_OPTIONS}
          />
        </Panel>
      </Section>

      <Section title="Measure" description="Drawn in each device's own CSS pixels.">
        <Panel className="space-y-4 rounded-lg border-dashed shadow-none">
          <ToggleRow
            id="tool-rulers"
            label="Pixel rulers"
            hint="Along the top and left of every screen, marked every 10 pixels."
            checked={settings.rulers}
            onChange={(rulers) => updateSettings({ rulers })}
          />
          <SelectField
            id="tool-grid"
            label="Grid"
            value={String(settings.gridSize)}
            onValueChange={(value) =>
              updateSettings({ gridSize: Number(value) as Settings["gridSize"] })
            }
            options={[
              ["0", "Off"],
              ["4", "4 px"],
              ["8", "8 px"],
              ["16", "16 px"],
            ]}
          />
        </Panel>
      </Section>

      <Section
        title="Compare sites"
        description="The same page on localhost, staging and production, side by side."
      >
        <EnvironmentControls {...environments} />
      </Section>

      <Section
        title="Design overlay"
        description="Lay a Figma or Sketch export over the page to check it matches."
      >
        <OverlayControls {...overlay} />
      </Section>
    </div>
  );
}
