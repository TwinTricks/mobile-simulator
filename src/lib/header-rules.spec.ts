import { describe, expect, it } from "vitest";

import { DYNAMIC_RULE_BASE, SIM_PARAM } from "@/shared/constants";
import { PRESET_DEVICES, findDevice } from "@/shared/devices";
import type { Device } from "@/shared/types";
import { frameUrl, ruleIdFor, rulesetChange, spoofedDevices, userAgentRules } from "./header-rules";

const iphone = findDevice("iphone-15-pro")!;
const pixel = findDevice("pixel-8")!;
const laptop = findDevice("laptop-13")!;

describe("frameUrl", () => {
  it("tags the URL with the device id while spoofing", () => {
    expect(frameUrl("https://example.com/a?b=1", iphone, true)).toBe(
      `https://example.com/a?b=1&${SIM_PARAM}=iphone-15-pro`,
    );
  });

  it("leaves the URL alone when not spoofing or the device has no User-Agent", () => {
    expect(frameUrl("https://example.com/", iphone, false)).toBe("https://example.com/");
    expect(frameUrl("https://example.com/", laptop, true)).toBe("https://example.com/");
    expect(frameUrl("", iphone, true)).toBe("");
  });
});

describe("spoofedDevices", () => {
  it("is empty when spoofing is off", () => {
    expect(spoofedDevices([iphone, pixel], false)).toEqual([]);
  });

  it("skips devices without a User-Agent, drops repeats and sorts by id", () => {
    expect(spoofedDevices([pixel, laptop, iphone, pixel], true).map((d) => d.id)).toEqual([
      "iphone-15-pro",
      "pixel-8",
    ]);
  });
});

describe("userAgentRules", () => {
  it("gives each device its own rule matched by its tag", () => {
    const rules = userAgentRules([iphone, pixel]);
    expect(rules.map((r) => r.id)).toEqual([ruleIdFor("iphone-15-pro"), ruleIdFor("pixel-8")]);
    expect(rules[1].condition.urlFilter).toBe(`${SIM_PARAM}=pixel-8`);
    expect(rules[1].action.requestHeaders?.[0]).toEqual({
      header: "user-agent",
      operation: "set",
      value: pixel.ua,
    });
  });

  it("gives a device the same id every time, clear of the static rules", () => {
    expect(ruleIdFor("pixel-8")).toBe(ruleIdFor("pixel-8"));
    expect(ruleIdFor("pixel-8")).not.toBe(ruleIdFor("pixel-8-pro"));
    const ids = PRESET_DEVICES.map((d) => ruleIdFor(d.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(DYNAMIC_RULE_BASE);
  });

  it("makes no rules for no devices", () => {
    expect(userAgentRules([] as Device[])).toEqual([]);
  });
});

describe("rulesetChange", () => {
  it("switches between the two static rulesets", () => {
    expect(rulesetChange("strip")).toEqual({
      disableRulesetIds: ["iframe_rules_xfo_only"],
      enableRulesetIds: ["iframe_rules"],
    });
    expect(rulesetChange("xfo-only")).toEqual({
      disableRulesetIds: ["iframe_rules"],
      enableRulesetIds: ["iframe_rules_xfo_only"],
    });
    expect(rulesetChange("off")).toEqual({
      disableRulesetIds: ["iframe_rules", "iframe_rules_xfo_only"],
    });
  });
});
