// End-to-end tests: the real dashboard in a browser, in demo mode (tests/e2e/demo-server.js).
// Locally they use the installed Google Chrome; in CI, Playwright's own Chromium.
const { defineConfig, devices } = require('@playwright/test');

const CI = !!process.env.CI;
const PORT = 3999;

module.exports = defineConfig({
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
    serviceWorkers: 'block', // each test starts from the network, never from a cached copy
    trace: 'retain-on-failure',
    ...(CI ? {} : { channel: 'chrome' }),
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.js/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.js/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/e2e/demo-server.js',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    env: { PORT: String(PORT) },
  },
});
