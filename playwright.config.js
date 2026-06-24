import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    // 1. Run auth setup first (logs in once, saves browser state)
    {
      name: "setup",
      testMatch: /global\.setup\.js/,
    },
    // 2. Full authenticated tests (Desktop)
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/session.json",
      },
      dependencies: ["setup"],
      testIgnore: /global\.setup\.js/,
    },
    // 3. Mobile viewport tests
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "tests/.auth/session.json",
      },
      dependencies: ["setup"],
      testIgnore: /global\.setup\.js/,
    },
  ],

  // Automatically start the preview server before tests
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
