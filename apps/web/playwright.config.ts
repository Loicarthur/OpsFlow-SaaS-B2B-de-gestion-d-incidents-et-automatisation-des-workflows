import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // `next dev` compiles routes on demand and is shared across parallel workers, so
  // assertions can be slower than production — give them headroom past the 5s default.
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
