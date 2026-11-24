import { expect } from '@playwright/test'
import { captureSection, disableMotion, waitForDocumentationReady } from './capture.js'
import { installFixtureGlobals, loadFixture } from './fixtures.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from './network.js'

export const runCaptureScenario = async ({ page, manifest, capture, beforeCapture }) => {
  const fixture = await loadFixture(manifest.fixture)
  const requestLog = createRequestLog()
  await installFixtureGlobals(page, fixture)
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(capture.route || manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  const readinessOptions = {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'target'
  }
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, readinessOptions)

  if (beforeCapture) await beforeCapture({ page, fixture, capture, requestLog })

  await waitForRequestQuiescence(requestLog, manifest.readiness?.network)

  const section = page.locator(capture.selector)
  await expect(section).toBeVisible({ timeout: manifest.readiness?.timeout || 30000 })
  await waitForDocumentationReady(page, manifest.readiness, capture.selector, readinessOptions)
  await captureSection({
    page,
    locator: section,
    filename: capture.file,
    captureMode: capture.capture_mode
  })

  await waitForRequestQuiescence(requestLog, manifest.readiness?.network)
  assertNoUnknownRequests(requestLog)
  await assertWebSocketIsolation(page)
  assertFixtureRequests(fixture, requestLog)
  return requestLog
}
