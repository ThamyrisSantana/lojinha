// End-to-end tests: the real app (production build) in a browser, in demo mode.
// Locally they use the installed Google Chrome; in CI, Playwright's own Chromium.
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const PORT = 3999;
const vite = 'node node_modules/vite/bin/vite.js';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    ...(CI ? {} : { channel: 'chrome' }),
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `${vite} build --logLevel error && ${vite} preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    // Empty Supabase settings: the app runs in demo mode (sample data in the browser, no login),
    // even if a local .env file has real keys.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
});
