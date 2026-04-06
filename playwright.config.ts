import { defineConfig, devices } from "@playwright/test";

/**
 * E2E Playwright — n’interfère pas avec Vitest (`npm test`).
 * Local : `npm run dev` puis `npm run test:e2e` (serveur réutilisé si déjà sur :3000).
 * CI : voir `.github/workflows/ci.yml` et `e2e/README.md`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1"
      ? undefined
      : {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
