import { defineConfig, devices } from '@playwright/test'

// The design system's browser spec (e2e/design): the pieces and the app's global
// CSS in Chromium. Some specs start Vite on fixed ports. Run
// `pnpm test:design:browser` exclusively across checkouts on the same machine.
export default defineConfig({
  testDir: './e2e/design',
  testMatch: '**/*.spec.js',
  outputDir: './e2e/design/test-results',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [['list']],
  use: {
    locale: 'en-US',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium', viewport: { width: 1280, height: 900 } } }
  ]
})
