import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set E2E_BASE_URL (e.g. http://localhost:8000) to test a running container instead of `next dev`.
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * End-to-end tests against the real Next.js app in a real browser.
 * Uses the locally installed Google Chrome (`channel: "chrome"`), so no
 * Playwright browser download is needed. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
