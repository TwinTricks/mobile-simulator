/**
 * Unpacks the PNG bezels from Apple Design Resources disk images (Bezel-*.dmg) into
 * ref/apple-bezels, where `bun run frames:sync` picks them up.
 *
 * Run by `bun run frames:extract [folder]`; the folder defaults to download/. macOS only, as it
 * mounts each image with hdiutil. Each image carries Apple's licence agreement, which this accepts
 * on your behalf, so read it once in Apple Design Resources License.rtf inside any of them.
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { $, Glob } from "bun";

const root = path.join(import.meta.dirname, "..");
const source = path.resolve(root, process.argv[2] ?? "download");
const outDir = path.join(root, "ref/apple-bezels");

const images = [...new Glob("Bezel-*.dmg").scanSync(source)].sort();
if (images.length === 0) {
  console.error(`No Bezel-*.dmg files in ${source}.`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
for (const image of images) {
  const mount = await mkdtemp(path.join(os.tmpdir(), "bezel-"));
  try {
    // The image shows a licence agreement first; "Y" agrees to it.
    await $`yes Y | hdiutil attach -nobrowse -readonly -noautoopen -mountpoint ${mount} ${path.join(source, image)}`.quiet();
    const pngDir = path.join(mount, "PNG");
    if (!existsSync(pngDir)) {
      console.warn(`${image}: no PNG folder, skipped`);
      continue;
    }
    await $`ditto ${pngDir} ${outDir}`;
    const count = [...new Glob("**/*.png").scanSync(pngDir)].length;
    console.log(`${image}: ${count} images`);
  } finally {
    await $`hdiutil detach ${mount}`.quiet().nothrow();
    await rm(mount, { recursive: true, force: true });
  }
}
console.log(`\nUnpacked into ${path.relative(root, outDir)}. Run \`bun run frames:sync\` next.`);
