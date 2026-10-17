import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { findDevice } from "@/shared/devices";
import { hostAllowed, readInlineHash, withoutInlineHash, type InlineConfig } from "@/shared/inline";
import { sendRequest } from "@/shared/messages";
import { readSettings, readState } from "@/storage/simulator-store";
import { AllowPrompt } from "./AllowPrompt";
import { InlinePhone } from "./InlinePhone";
import { placeHost } from "./place";
import { lastInlineDevice } from "./session";
import { installTooltips } from "@/lib/tooltips";
import { documentStyles, shadowStyles } from "./styles";
import { setStatus } from "./status";

/** The fallback when neither the address nor the last session names a device. */
const DEFAULT_DEVICE = "iphone-17-pro";

type Mounted = { host: HTMLElement; root: Root; observer: MutationObserver };

let mounted: Mounted | null = null;
let opening = 0;

/** A custom element of our own, so no page style written for its tags can reach it. */
function mount(): Mounted {
  if (mounted) return mounted;
  const host = document.createElement("mobile-sim-host");
  placeHost(host, { top: 0, right: 0, width: 0, height: 0 });
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = shadowStyles();
  const container = document.createElement("div");
  container.style.height = "100%";
  shadow.append(style, container);
  installTooltips(container, container);

  if (!document.getElementById("__msim-inline-properties")) {
    const properties = document.createElement("style");
    properties.id = "__msim-inline-properties";
    properties.textContent = documentStyles();
    document.head?.append(properties);
  }

  document.documentElement.append(host);
  // Frameworks that render the whole document can drop elements they didn't make.
  const observer = new MutationObserver(() => {
    if (!host.isConnected) document.documentElement.append(host);
  });
  observer.observe(document.documentElement, { childList: true });

  mounted = { host, root: createRoot(container), observer };
  return mounted;
}

export function closeInline(status: "closed" | "blocked:framing" = "closed"): void {
  opening++;
  if (mounted) {
    mounted.observer.disconnect();
    mounted.root.unmount();
    mounted.host.remove();
    mounted = null;
  }
  setStatus(status);
}

/** Draws the phone, or asks first on a site that isn't allowed yet. */
export async function openInline(
  config: InlineConfig,
  how: "page" | "menu" | "restore",
): Promise<void> {
  const attempt = ++opening;
  // The site's router, and the phone's own copy of the page, see the address without it.
  if (readInlineHash(location.hash) !== undefined) {
    history.replaceState(history.state, "", withoutInlineHash(location.href));
  }

  const [settings, state] = await Promise.all([readSettings(), readState()]);
  if (attempt !== opening) return;
  if (!settings.inline.enabled && how !== "menu") {
    setStatus("disabled");
    return;
  }

  const allowed = hostAllowed(location.hostname, settings.inline.hosts);
  if (!allowed && how === "restore") {
    setStatus("not-allowed");
    return;
  }
  const { host, root } = mount();
  if (!allowed) {
    setStatus("not-allowed");
    root.render(
      <StrictMode>
        <AllowPrompt
          host={host}
          site={location.hostname}
          theme={settings.theme}
          onAllow={async () => {
            const response = await sendRequest({ type: "inline-allow" });
            if (response.ok) void openInline(config, how);
          }}
          onDismiss={() => closeInline()}
        />
      </StrictMode>,
    );
    return;
  }

  const custom = state.customDevices;
  const device =
    [config.deviceId, lastInlineDevice(), state.visibleDeviceIds[0], DEFAULT_DEVICE]
      .map((id) => (id ? findDevice(id, custom) : null))
      .find((found) => found !== null) ?? findDevice(DEFAULT_DEVICE)!;

  setStatus("loading");
  root.render(
    <StrictMode>
      <InlinePhone
        // A new request starts the phone over rather than half-keeping the old one.
        key={attempt}
        host={host}
        pageUrl={withoutInlineHash(location.href)}
        initial={{ ...config, deviceId: device.id }}
        settings={settings}
        customDevices={custom}
        frameColors={state.frameColors}
        frameTints={state.frameTints}
        onClose={(reason) => closeInline(reason)}
      />
    </StrictMode>,
  );
}
