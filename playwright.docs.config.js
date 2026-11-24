import { defineConfig, devices } from '@playwright/test'
import { APP_HOST, APP_ORIGIN, APP_PORT } from './e2e/docs/lib/server.cjs'

export default defineConfig({
  testDir: './e2e/docs/specs',
  outputDir: './e2e/docs/test-results',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: APP_ORIGIN,
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1440, height: 1100 },
        deviceScaleFactor: 2
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        deviceScaleFactor: 2
      }
    }
  ],
  webServer: {
    command: `pnpm dev --host ${APP_HOST} --port ${APP_PORT} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: false,
    timeout: 120000
  }
})
