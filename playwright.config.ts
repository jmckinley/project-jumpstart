/**
 * @module playwright.config
 * @description Playwright E2E test configuration for Project Jumpstart
 *
 * PURPOSE:
 * - Configure Playwright for testing Tauri app's web UI
 * - Set up dev server for testing
 * - Define test timeouts and retries
 *
 * PATTERNS:
 * - Tests run against Vite dev server on localhost:1420
 * - Tauri APIs are mocked for frontend-only tests
 * - Use webServer config to auto-start dev server
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
