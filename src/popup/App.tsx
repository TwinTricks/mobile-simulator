import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Eye,
  Maximize,
  Monitor,
  PanelRight,
  PictureInPicture2,
  Smartphone,
  Tablet,
} from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { InlineMessage } from "@/components/app/InlineMessage";
import { PANEL_INPUT_CLASS, Panel, PanelField, Section } from "@/components/app/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoUrl } from "@/lib/chrome";
import { applyTheme, cacheTheme, cachedTheme } from "@/lib/theme";
import { PRESET_DEVICES } from "@/shared/devices";
import { sendRequest } from "@/shared/messages";
import type { DeviceCategory, ThemeChoice } from "@/shared/types";
import { isSimulatableUrl, normalizeUrl } from "@/shared/url";
import { readSettings, saveSettings } from "@/storage/simulator-store";

const UNSUPPORTED_NOTICE_MS = 2500;

export function App() {
  const [theme, setTheme] = useState<ThemeChoice>(cachedTheme);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [currentUnsupported, setCurrentUnsupported] = useState(false);

  useEffect(() => {
    void readSettings().then((settings) => setTheme(settings.theme));
  }, []);

  // Known ahead, because Chrome only opens the side panel straight from a click.
  const windowId = useRef<number | undefined>(undefined);
  useEffect(() => {
    void globalThis.chrome?.windows?.getCurrent().then((win) => {
      windowId.current = win.id;
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    cacheTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!currentUnsupported) return;
    const timer = setTimeout(() => setCurrentUnsupported(false), UNSUPPORTED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [currentUnsupported]);

  async function changeTheme(next: ThemeChoice) {
    setTheme(next);
    await saveSettings({ ...(await readSettings()), theme: next });
  }

  async function open(target: string) {
    await sendRequest({ type: "open-simulator", url: target });
    window.close();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeUrl(url);
    if (normalized === null) {
      setInvalid(true);
      return;
    }
    await open(normalized);
  }

  function openSidePanel() {
    // Straight from the click, which is what lets Chrome open the panel.
    if (windowId.current === undefined) return;
    void chrome.sidePanel.open({ windowId: windowId.current }).then(() => window.close());
  }

  async function fullScreen() {
    await sendRequest({ type: "open-full-screen" });
    window.close();
  }

  async function inlinePhone() {
    await sendRequest({ type: "open-inline" });
    window.close();
  }

  async function simulateCurrentTab() {
    const response = await sendRequest({ type: "get-active-url" });
    if (response.ok && isSimulatableUrl(response.url)) {
      await open(response.url);
    } else {
      setCurrentUnsupported(true);
    }
  }

  return (
    <div className="compact-radius bg-background flex min-h-0 flex-1 flex-col">
      <AppHeader logoUrl={logoUrl()} theme={theme} onTheme={(next) => void changeTheme(next)} />

      <main className="space-y-5 px-3 py-3">
        <Section
          title="Preview a website"
          description="Phones, tablets and desktops side by side in one tab."
        >
          <Panel>
            <form className="space-y-3" onSubmit={onSubmit}>
              <PanelField
                label="URL to simulate"
                htmlFor="url"
                error={invalid ? "That doesn't look like a URL." : undefined}
              >
                <Input
                  id="url"
                  type="text"
                  inputMode="url"
                  placeholder="https://example.com"
                  autoComplete="off"
                  autoFocus
                  value={url}
                  aria-invalid={invalid || undefined}
                  className={PANEL_INPUT_CLASS}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setInvalid(false);
                  }}
                />
              </PanelField>
              <Button type="submit" className="w-full">
                Open simulator
                <ArrowRight />
              </Button>
            </form>
          </Panel>
        </Section>

        <Section title="Or use this tab">
          <Button variant="twoTone" className="w-full" onClick={simulateCurrentTab}>
            <Eye />
            Simulate current tab
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={openSidePanel}>
              <PanelRight />
              Side panel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void fullScreen()}>
              <Maximize />
              Full screen
            </Button>
            <Button variant="outline" size="sm" onClick={() => void inlinePhone()}>
              <PictureInPicture2 />
              In the page
            </Button>
          </div>
          {currentUnsupported ? (
            <InlineMessage tone="warning">
              This tab can't be simulated. Open a website (http or https) first.
            </InlineMessage>
          ) : null}
        </Section>

        <Panel className="divide-border/60 grid grid-cols-3 divide-x rounded-lg border-dashed p-0 shadow-none">
          <Stat icon={<Smartphone />} label="Phones" value={countOf("phone")} />
          <Stat icon={<Tablet />} label="Tablets" value={countOf("tablet")} />
          <Stat icon={<Monitor />} label="Desktops" value={countOf("desktop")} />
        </Panel>
      </main>
    </div>
  );
}

const countOf = (category: DeviceCategory) =>
  PRESET_DEVICES.filter((device) => device.category === category).length;

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2.5">
      <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-full [&_svg]:size-3.5">
        {icon}
      </span>
      <p className="text-xs">
        <span className="font-semibold">{value}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </p>
    </div>
  );
}
