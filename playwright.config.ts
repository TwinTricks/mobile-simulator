import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Every test drives a real Chromium with the extension loaded, so they take a window each.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: process.env.CI ? "line" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
