import { config } from '@config';
import { defineConfig } from '@playwright/test';

const production = config.E2E_TARGET === 'production';
const baseURL = `http://127.0.0.1:${production ? config.API_PORT : config.WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: config.E2E_BROWSER_PATH ? { executablePath: config.E2E_BROWSER_PATH } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      testIgnore: '**/nasa-live.spec.ts',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: production ? 'bun start' : 'bun dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
