import os from 'node:os'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// The guest-to-account end-to-end check (guest-signup.e2e.spec.js). It writes for real (an order and an
// account), so it has no web server of its own and runs only against a web served for a TEST project:
// see the spec's header.
export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.spec.js',
  // outside the repo: nothing of a run lands in the working tree
  outputDir: path.join(os.tmpdir(), 'account-invite-e2e-results'),
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 180000,
  reporter: [['list']],
  use: {
    baseURL: process.env.ACCOUNT_INVITE_E2E_BASE_URL,
    locale: 'en-US',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium', viewport: { width: 1280, height: 900 } } }
  ]
})
