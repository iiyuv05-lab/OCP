import { defineConfig, devices } from "@playwright/test";

const externalRuntimeUrl = process.env.OCP_RUNTIME_URL?.trim();
const baseURL = externalRuntimeUrl || "http://127.0.0.1:4173";
const evidenceRunDir = process.env.OCP_EVIDENCE_RUN_DIR?.trim();
const outputRoot = evidenceRunDir || "outputs/runtime";

export default defineConfig({
  testDir: "./tests/runtime",
  outputDir: `${outputRoot}/playwright-test-results`,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["json", { outputFile: `${outputRoot}/playwright-report.json` }],
    ["html", { outputFolder: `${outputRoot}/playwright-report`, open: "never" }],
  ],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalRuntimeUrl
    ? undefined
    : {
        command: "npm run start:runtime",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
