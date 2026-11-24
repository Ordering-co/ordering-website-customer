import { defineConfig, devices } from '@playwright/test'
import { APP_HOST, APP_ORIGIN, APP_PORT } from './e2e/docs/lib/server.cjs'

// The web's cross-cutting browser suite (e2e/web): hygiene checks and one spec per reopened bug, over the real app
// with the network mocked by the docs fixtures (e2e/docs/lib). One project per width QA uses, plus WebKit at the
// phone widths: Safari-only bugs (1484, 1496, 1536) never show in Chromium.
//
//   pnpm test:web:browser          fast set: 390 and 1440 in Chromium (what a PR should run)
//   pnpm test:web:browser:matrix   every width + WebKit (weekly / before closing a batch)
//
// Port: E2E_APP_PORT (default 3137, shared with the docs suite). With E2E_REUSE_SERVER=1 an already running
// `pnpm dev` on that port is reused instead of started.
const widths = [360, 382, 390, 412, 768, 1024, 1440]
const heightFor = (width) => (width >= 1440 ? 900 : width >= 1024 ? 768 : width >= 768 ? 1024 : 844)

const chromiumProject = (width) => ({
  name: `w${width}`,
  use: {
    ...devices['Desktop Chrome'],
    browserName: 'chromium',
    viewport: { width, height: heightFor(width) },
    isMobile: width <= 430,
    hasTouch: width <= 1024,
    deviceScaleFactor: width <= 430 ? 3 : 1
  }
})

const webkitProject = (width) => ({
  name: `webkit-${width}`,
  use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width, height: heightFor(width) } }
})

export default defineConfig({
  testDir: './e2e/web',
  testMatch: '**/*.spec.js',
  // under docs/test-results because that path is already git-ignored
  outputDir: './e2e/docs/test-results/web',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
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
  projects: [...widths.map(chromiumProject), webkitProject(390), webkitProject(412)],
  webServer: {
    command: `pnpm dev --host ${APP_HOST} --port ${APP_PORT} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    timeout: 120000
  }
})
