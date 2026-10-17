/**
 * Zips `dist/` into the file that gets uploaded to the Chrome Web Store.
 *
 * Run by `bun run package`, which builds first. The name carries the version so two uploads are
 * never confused for each other, and the manifest is checked before anything is written: the
 * store rejects a package that does not have one at its root.
 */
import { mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const outDir = path.join(root, "dist-crx");
const manifestPath = path.join(dist, "manifest.json");

if (!existsSync(manifestPath)) {
  console.error("No dist/manifest.json. Run `bun run build` first.");
  process.exit(1);
}

const built = (await Bun.file(manifestPath).json()) as {
  version: string;
  content_security_policy?: unknown;
};

// The production CSP is only added outside `bun run dev`, so its absence means this is a
// development build, which loads its code from a Vite server that will not be there.
if (!built.content_security_policy) {
  console.error("Refusing to package a development build. Run `bun run build` first.");
  process.exit(1);
}

const target = path.join(outDir, `mobile-simulator-${built.version}.zip`);

await mkdir(outDir, { recursive: true });
await rm(target, { force: true });

// `-X` leaves out the resource forks and Finder metadata macOS would otherwise bury in the
// archive, which the store reads as unexpected files.
const zip = Bun.spawnSync({
  cmd: ["zip", "-qr", "-X", target, ".", "-x", "*.DS_Store", "-x", "__MACOSX/*"],
  cwd: dist,
});

if (zip.exitCode !== 0) {
  console.error(new TextDecoder().decode(zip.stderr) || "zip failed");
  process.exit(1);
}

const size = (await stat(target)).size;
console.log(`wrote ${path.relative(root, target)} (${(size / 1024).toFixed(0)} KB)`);
