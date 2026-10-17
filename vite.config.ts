import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, transformWithEsbuild, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import { manifest } from "./src/manifest";

const root = path.dirname(fileURLToPath(import.meta.url));

// A dev build talks to the Vite server and breaks the moment that server stops, so it is kept
// out of dist. dist always holds a build that works on its own.
const DEV_OUT_DIR = "dist-dev";
const OUT_DIR = "dist";

/**
 * Builds the identity script as one plain file. The service worker registers it to run in the
 * page's own world at document_start, where the plugin's usual content-script loader, which
 * imports the code asynchronously, would run too late.
 */
function identityScript(outDir: string): Plugin {
  const source = path.resolve(root, "src/content/mobile-identity.ts");
  const fileName = "content/mobile-identity.js";
  const compile = async () => {
    const result = await transformWithEsbuild(await fs.readFile(source, "utf8"), source, {
      format: "iife",
      target: "chrome120",
      minify: true,
    });
    return result.code;
  };

  return {
    name: "identity-script",
    async generateBundle() {
      this.addWatchFile(source);
      this.emitFile({ type: "asset", fileName, source: await compile() });
    },
    configureServer(server) {
      server.httpServer?.once("listening", async () => {
        const target = path.resolve(root, outDir, fileName);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, await compile());
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const outDir = command === "serve" ? DEV_OUT_DIR : OUT_DIR;

  return {
    plugins: [react(), tailwindcss(), crx({ manifest }), identityScript(outDir)],
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        // The simulator is opened by the service worker rather than named in the manifest, so
        // the plugin cannot find it on its own.
        input: {
          simulator: path.resolve(root, "src/simulator/index.html"),
          panel: path.resolve(root, "src/simulator/panel.html"),
        },
      },
    },
  };
});
