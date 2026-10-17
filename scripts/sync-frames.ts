/**
 * Turns the device frames in ref/mockup-device-frames into bezels the simulator can draw.
 *
 * Run by `bun run frames:sync`, which pulls the frames repo first (`--no-pull` skips that). Each
 * frame's screen is found from its transparent cutout, the image is shrunk to WebP under
 * public/frames, and src/shared/frames.generated.ts records where every screen sits. Models are
 * matched to devices by scripts/frames/models.ts.
 */
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { $, Glob } from "bun";
import sharp from "sharp";

import { detectScreen, type ScreenRect } from "./frames/detect-screen";
import {
  APPLE_MODELS,
  APPLE_SKIP,
  MODELS,
  SKIP,
  type Category,
  type ModelSpec,
  type Platform,
} from "./frames/models";

const REPO_URL = "https://github.com/jamesjingyi/mockup-device-frames.git";
const root = path.join(import.meta.dirname, "..");
const repo = path.join(root, "ref/mockup-device-frames");
const exportsDir = path.join(repo, "Exports");
/** Apple's bezels, unpacked by scripts/extract-apple-bezels.ts. Optional. */
const appleDir = path.join(root, "ref/apple-bezels");
const outDir = path.join(root, "public/frames");
const catalogFile = path.join(root, "src/shared/frames.generated.ts");

/** Longest side an image is kept at. Frames are drawn far smaller than their source. */
const MAX_SIDE: Record<Category, number> = { phone: 1800, tablet: 2200, desktop: 2400 };

const CATEGORY_OF_FOLDER: Record<string, { category: Category; platform: Platform; dpr: number }> =
  {
    iOS: { category: "phone", platform: "ios", dpr: 3 },
    "Android Phone": { category: "phone", platform: "android", dpr: 3 },
    iPadOS: { category: "tablet", platform: "ipad", dpr: 2 },
    "Android Tablet": { category: "tablet", platform: "android-tablet", dpr: 2 },
    MacBook: { category: "desktop", platform: "desktop", dpr: 2 },
    "Mac Desktop": { category: "desktop", platform: "desktop", dpr: 2 },
    "Windows Laptop": { category: "desktop", platform: "desktop", dpr: 2 },
    "Windows Desktop": { category: "desktop", platform: "desktop", dpr: 2 },
  };

type Orientation = "portrait" | "landscape";

type Scanned = {
  /** The folder `file` is under. */
  dir: string;
  file: string;
  spec: ModelSpec;
  auto: boolean;
  /** The part of the source image the device fills. Width, height and screen are within it. */
  crop: ScreenRect;
  width: number;
  height: number;
  screen: ScreenRect;
  orientation: Orientation;
  color: string;
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A folder no entry in models.ts covers becomes a device of its own. */
function autoSpec(file: string): ModelSpec | null {
  const [top, ...rest] = path.dirname(file).split("/");
  const kind = CATEGORY_OF_FOLDER[top];
  if (!kind || rest.length === 0) return null;
  let name = rest.join(" ");
  if (top === "iOS" && !name.startsWith("iPhone")) name = `iPhone ${name}`;
  return {
    match: new RegExp(`^${path.dirname(file).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`),
    category: kind.category,
    id: slug(name),
    device: { name, ...kind, ...(kind.platform.startsWith("android") && { uaModel: name }) },
  };
}

/** The words of a file name that can say what colour it is. */
function colorWords(file: string, strip?: RegExp): string[] {
  let base = path.basename(file, path.extname(file));
  if (strip) base = base.replace(strip, " ");
  const words = base.split(/\s+/).filter((w) => w !== "-" && w !== "Portrait" && w !== "Landscape");
  // A trailing " 2" marks the other orientation of the same colour.
  if (words.at(-1) === "2") words.pop();
  return words;
}

/** Colours are whatever is left once the words every file of a model shares are taken off. */
function nameColors(files: string[], spec: ModelSpec): Map<string, string> {
  const suffix = spec.colorSuffix ?? "";
  const lists = files.map((file) => colorWords(file, spec.colorStrip));
  const unique = new Set(lists.map((w) => w.join(" ")));
  const names = new Map<string, string>();
  if (unique.size === 1) {
    for (const file of files) names.set(file, `Default${suffix}`);
    return names;
  }
  let shared = 0;
  while (lists.every((w) => w[shared] !== undefined && w[shared] === lists[0][shared])) shared++;
  files.forEach((file, i) => names.set(file, lists[i].slice(shared).join(" ").trim() + suffix));
  return names;
}

if (!process.argv.includes("--no-pull")) {
  if (existsSync(repo)) await $`git -C ${repo} pull --ff-only`;
  else await $`git clone ${REPO_URL} ${repo}`;
}
if (!existsSync(exportsDir)) {
  console.error(`No frames at ${exportsDir}.`);
  process.exit(1);
}

const pngs = (dir: string, skip: RegExp) =>
  existsSync(dir)
    ? [...new Glob("**/*.png").scanSync(dir)].filter((f) => !skip.test(f)).sort()
    : [];

type Group = { dir: string; files: string[] };
const ignored: string[] = [];

// Apple's own frames are read first, so theirs is the image kept where both have a colour.
const appleGroups = new Map<ModelSpec, Group>();
for (const file of pngs(appleDir, APPLE_SKIP)) {
  const spec = APPLE_MODELS.find((m) => m.match.test(file));
  if (!spec) {
    ignored.push(`apple-bezels/${file}`);
    continue;
  }
  const group = appleGroups.get(spec) ?? { dir: appleDir, files: [] };
  group.files.push(file);
  appleGroups.set(spec, group);
}

const exportGroups = new Map<ModelSpec, Group>();
const autoSpecs = new Map<string, ModelSpec>();
for (const file of pngs(exportsDir, SKIP)) {
  let spec = MODELS.find((m) => m.match.test(file));
  if (!spec) {
    const guess = autoSpec(file);
    if (!guess) {
      ignored.push(file);
      continue;
    }
    spec = autoSpecs.get(guess.id) ?? guess;
    autoSpecs.set(guess.id, spec);
  }
  const group = exportGroups.get(spec) ?? { dir: exportsDir, files: [] };
  group.files.push(file);
  exportGroups.set(spec, group);
}

// Devices and colours come out in the order models.ts lists them, with new folders last.
const rankIn = (list: ModelSpec[]) => (spec: ModelSpec) =>
  list.includes(spec) ? list.indexOf(spec) : list.length;
const byRank = (groups: Map<ModelSpec, Group>, list: ModelSpec[]) => {
  const rank = rankIn(list);
  return [...groups].sort(([a], [b]) => rank(a) - rank(b));
};
const ordered = [...byRank(appleGroups, APPLE_MODELS), ...byRank(exportGroups, MODELS)];

const scanned: Scanned[] = [];
for (const [spec, { dir, files: specFiles }] of ordered) {
  const colors = nameColors(specFiles, spec);
  for (const file of specFiles) {
    const scan = await detectScreen(path.join(dir, file));
    if (!scan || scan.coverage < 0.2) {
      ignored.push(file);
      continue;
    }
    const { content, screen } = scan;
    scanned.push({
      dir,
      file,
      spec,
      auto: [...autoSpecs.values()].includes(spec),
      crop: content,
      width: content.width,
      height: content.height,
      screen: { ...screen, x: screen.x - content.x, y: screen.y - content.y },
      orientation: scan.screen.height >= scan.screen.width ? "portrait" : "landscape",
      color: colors.get(file)!,
    });
  }
}

type DeviceOut = {
  id: string;
  name: string;
  width: number;
  height: number;
  dpr: number;
  category: Category;
  platform: Platform;
  uaModel?: string;
};
type ImageOut = { src: string; width: number; height: number; screen: ScreenRect };
type VariantOut = { color: string; portrait?: ImageOut; landscape?: ImageOut };

const devices: DeviceOut[] = [];
const frames: Record<string, VariantOut[]> = {};

for (const item of scanned) {
  const { spec } = item;
  if (spec.device && !devices.some((d) => d.id === spec.id)) {
    const { name, category, platform, dpr, uaModel } = spec.device;
    let { width, height } = spec.device;
    if (width === undefined || height === undefined) {
      const a = Math.round(item.screen.width / dpr);
      const b = Math.round(item.screen.height / dpr);
      // Phones and tablets are described upright, desktops on their side.
      [width, height] =
        category === "desktop"
          ? [Math.max(a, b), Math.min(a, b)]
          : [Math.min(a, b), Math.max(a, b)];
    }
    devices.push({
      id: spec.id,
      name,
      width,
      height,
      dpr,
      category,
      platform,
      ...(uaModel && { uaModel }),
    });
  }
}

// An unnamed frame from the other repo is one of Apple's colours under no name, so it goes.
const appleIds = new Set(scanned.filter((s) => s.dir === appleDir).map((s) => s.spec.id));

await rm(outDir, { recursive: true, force: true });
let bytes = 0;
for (const item of scanned) {
  const id = item.spec.id;
  if (item.dir !== appleDir && item.color.startsWith("Default") && appleIds.has(id)) continue;
  const variants = (frames[id] ??= []);
  let variant = variants.find((v) => v.color === item.color);
  if (!variant) variants.push((variant = { color: item.color }));
  if (variant[item.orientation]) continue;

  const category = item.spec.device?.category ?? item.spec.category ?? "phone";
  const scale = Math.min(1, MAX_SIDE[category] / Math.max(item.width, item.height));
  const name = `${slug(item.color)}-${item.orientation}.webp`;
  await mkdir(path.join(outDir, id), { recursive: true });
  const { crop } = item;
  const info = await sharp(path.join(item.dir, item.file))
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .resize(Math.round(item.width * scale))
    .webp({ quality: 82, alphaQuality: 90, effort: 5 })
    .toFile(path.join(outDir, id, name));
  bytes += info.size;
  variant[item.orientation] = {
    src: `frames/${id}/${name}`,
    width: item.width,
    height: item.height,
    screen: item.screen,
  };
}

const catalog = `// Generated by scripts/sync-frames.ts from ref/apple-bezels and ref/mockup-device-frames. Do not edit by hand;
// run \`bun run frames:sync\` instead.
import type { FrameDeviceSpec, FrameVariant } from "./frames";

export const FRAME_DEVICES: readonly FrameDeviceSpec[] = ${JSON.stringify(devices, null, 2)};

export const DEVICE_FRAMES: Readonly<Record<string, readonly FrameVariant[]>> = ${JSON.stringify(frames, null, 2)};
`;
await writeFile(catalogFile, catalog);

const imageCount = Object.values(frames)
  .flat()
  .reduce((n, v) => n + (v.portrait ? 1 : 0) + (v.landscape ? 1 : 0), 0);
console.log(
  `${Object.keys(frames).length} devices with frames, ${devices.length} of them new, ` +
    `${imageCount} images (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
);
const autos = devices.filter((d) => scanned.some((s) => s.auto && s.spec.id === d.id));
if (autos.length > 0) {
  console.log("\nNot in scripts/frames/models.ts, so the viewport was guessed. Check these:");
  for (const d of autos) console.log(`  ${d.id}: ${d.name} ${d.width}×${d.height} @${d.dpr}x`);
}
if (ignored.length > 0) {
  console.log("\nSkipped, as no screen or category could be found:");
  for (const f of ignored) console.log(`  ${f}`);
}
