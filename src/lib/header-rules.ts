import {
  DYNAMIC_RULE_BASE,
  RULESET_STRIP_CSP_AND_XFO,
  RULESET_STRIP_XFO_ONLY,
  SIM_PARAM,
} from "@/shared/constants";
import type { CspMode, Device } from "@/shared/types";

type Rule = chrome.declarativeNetRequest.Rule;
type ResourceType = chrome.declarativeNetRequest.ResourceType;

// The `chrome.declarativeNetRequest` enums only exist inside the browser, so the values are
// spelled out and cast.
const UA_RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "script",
  "xmlhttprequest",
  "stylesheet",
  "image",
  "font",
  "media",
  "other",
] as ResourceType[];

/** The URL a device's frame loads: tagged with the device id when its User-Agent is spoofed. */
export function frameUrl(url: string, device: Device, spoofUA: boolean): string {
  if (!url || !spoofUA || !device.ua) return url;
  try {
    const tagged = new URL(url);
    tagged.searchParams.set(SIM_PARAM, device.id);
    return tagged.toString();
  } catch {
    return url;
  }
}

/** The devices whose User-Agent gets rewritten, once each and in a stable order. */
export function spoofedDevices(devices: readonly Device[], spoofUA: boolean): Device[] {
  if (!spoofUA) return [];
  const unique = new Map(devices.filter((d) => d.ua).map((d) => [d.id, d]));
  return [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// Room for rule ids above the base. Large enough that two device ids seldom share one.
const RULE_ID_SPAN = 1 << 24;

/**
 * The same rule id for a device every time, so a simulator in a tab, the side panel and full
 * screen can each update their own devices' rules without removing anyone else's.
 */
export function ruleIdFor(deviceId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < deviceId.length; i++) {
    hash = Math.imul(hash ^ deviceId.charCodeAt(i), 16777619);
  }
  return DYNAMIC_RULE_BASE + ((hash >>> 0) % RULE_ID_SPAN);
}

/** One dynamic rule per spoofed device, matched by the tag `frameUrl` adds. */
export function userAgentRules(devices: readonly Device[]): Rule[] {
  return devices.map((device) => ({
    id: ruleIdFor(device.id),
    priority: 1,
    action: {
      type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
      requestHeaders: [
        {
          header: "user-agent",
          operation: "set" as chrome.declarativeNetRequest.HeaderOperation,
          value: device.ua ?? "",
        },
      ],
    },
    condition: {
      urlFilter: `${SIM_PARAM}=${device.id}`,
      resourceTypes: UA_RESOURCE_TYPES,
    },
  }));
}

/** Which of the two static rulesets to switch on and off for a header handling mode. */
export function rulesetChange(mode: CspMode): chrome.declarativeNetRequest.UpdateRulesetOptions {
  switch (mode) {
    case "off":
      return { disableRulesetIds: [RULESET_STRIP_CSP_AND_XFO, RULESET_STRIP_XFO_ONLY] };
    case "xfo-only":
      return {
        disableRulesetIds: [RULESET_STRIP_CSP_AND_XFO],
        enableRulesetIds: [RULESET_STRIP_XFO_ONLY],
      };
    case "strip":
      return {
        disableRulesetIds: [RULESET_STRIP_XFO_ONLY],
        enableRulesetIds: [RULESET_STRIP_CSP_AND_XFO],
      };
  }
}
