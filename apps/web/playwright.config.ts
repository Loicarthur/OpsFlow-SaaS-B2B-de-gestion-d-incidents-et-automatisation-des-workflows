import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // All specs share one `next dev` instance (webServer below); running them in parallel
  // workers overloads that single dev-compile process and makes requests flaky/slow.
  // Serializing is a non-issue at this suite's size and is far more deterministic.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    // `next start` is incompatible with `output: "standalone"` (used for the Docker image) —
    // run against `next dev` instead, which is also faster to iterate against locally.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
