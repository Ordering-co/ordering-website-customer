import { test } from '@playwright/test'
import { loadManifest } from '../lib/manifest.js'
import { runCaptureScenario } from '../lib/scenario.js'

const manifest = await loadManifest('website-overview')

test.describe('Website overview documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)

      await runCaptureScenario({ page, manifest, capture })
    })
  }
})
