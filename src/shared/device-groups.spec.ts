import { describe, expect, it } from "vitest";

import type { Device } from "@/shared/types";
import { deviceGroups } from "./device-groups";

const d = (name: string, category: Device["category"] = "phone"): Device => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  width: 400,
  height: 800,
  dpr: 3,
  category,
  ua: null,
});

describe("deviceGroups", () => {
  it("puts each family together, phones before tablets", () => {
    const groups = deviceGroups([
      d("iPad Air", "tablet"),
      d("Pixel 9"),
      d("iPhone 17"),
      d("Galaxy Tab S9", "tablet"),
      d("Galaxy S24"),
      d("Mine", "custom"),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "iPhone",
      "Pixel",
      "Galaxy",
      "iPad",
      "Other tablets",
      "Custom",
    ]);
  });

  it("orders a family newest first, keeping unnumbered models beside their neighbour", () => {
    const [iphones] = deviceGroups([
      d("iPhone 18 Pro"),
      d("iPhone 17"),
      d("iPhone Air"),
      d("iPhone 13 mini"),
      d("iPhone 15 Pro"),
      d("iPhone 14"),
      d("iPhone SE"),
    ]);
    expect(iphones!.devices.map((x) => x.name)).toEqual([
      "iPhone 18 Pro",
      "iPhone 17",
      "iPhone Air",
      "iPhone 15 Pro",
      "iPhone 14",
      "iPhone SE",
      "iPhone 13 mini",
    ]);
  });

  it("keeps iPads in list order, as their numbers are sizes", () => {
    const [ipads] = deviceGroups([d('iPad Pro 11"', "tablet"), d('iPad Pro 13"', "tablet")]);
    expect(ipads!.devices.map((x) => x.name)).toEqual(['iPad Pro 11"', 'iPad Pro 13"']);
  });
});
