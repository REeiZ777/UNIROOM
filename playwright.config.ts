import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const port = isCI ? 3000 : 3001;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  expect: {
    timeout: 5_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI
      ? "pnpm build && pnpm start"
      : `pnpm dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    env: {
      NEXTAUTH_URL: baseURL,
    },
    timeout: 120_000,
  },
});
