import { expect, test } from '@playwright/test'
import { loadManifest } from '../lib/manifest.js'
import { runCaptureScenario } from '../lib/scenario.js'

const manifest = await loadManifest('choose-location-order-type.manifest')

const matchingRequests = (requestLog, method, pattern) => requestLog.matched.filter(
  (request) => request.method === method && request.pattern === pattern
)

const countRequests = (requestLog, method, pattern) => matchingRequests(requestLog, method, pattern).length

const openAddressSuggestions = async (page) => {
  await page.locator("[data-doc-control='website-location-open']").click()
  const addressForm = page.locator("[data-doc-section='address-form']")
  await expect(addressForm).toHaveAttribute('data-doc-state', 'ready')

  const addressSearch = addressForm.locator("[data-doc-control='address-search'] input")
  await addressSearch.fill('100 Synthetic Market Street')
  await expect(addressForm.getByText('100 Synthetic Market Street, Test City, TX 78701')).toBeVisible()
}

const chooseSyntheticAddress = async (page) => {
  await openAddressSuggestions(page)
  await page.getByText('100 Synthetic Market Street, Test City, TX 78701').click()
  await expect(page.locator("[data-doc-control='address-save']")).toBeEnabled()
  await page.locator("[data-doc-control='address-save']").click()
  await expect(page.locator("[data-doc-section='address-form']")).toBeHidden()
}

const prepareOrderTypeCapture = async (page) => {
  await chooseSyntheticAddress(page)
  await page.waitForURL(/\/search/)
  const businesses = page.locator("[data-doc-section='businesses-list']")
  await expect(businesses).toHaveAttribute('data-doc-state', /empty|results/)

  // the order type is the same inline switcher everywhere now:
  // the header's row on desktop, the order context capsule docked under it
  // on mobile — both marked data-doc-section='header-order-types'
  const orderTypes = page.locator("[data-doc-section='header-order-types']")
  const delivery = orderTypes.getByRole('tab', { name: 'Delivery' })
  const pickup = orderTypes.getByRole('tab', { name: 'Pickup' })
  await expect(delivery).toBeVisible()
  await expect(pickup).toBeVisible()
  await pickup.click()
}

test.describe('Choose location and order type documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)

      const isOrderTypeCapture = capture.id.includes('order-type')
      const requestLog = await runCaptureScenario({
        page,
        manifest,
        capture,
        beforeCapture: async () => {
          if (isOrderTypeCapture) await prepareOrderTypeCapture(page)
          else {
            await openAddressSuggestions(page)
            if (capture.project === 'mobile-chromium') {
              await page.getByText('100 Synthetic Market Street, Test City, TX 78701').click()
              await expect(page.locator("[data-doc-control='address-save']")).toBeEnabled()
            }
          }
        }
      })

      const guestPattern = '^/v400/en/docsmarket/users$'
      const addressPattern = '^/v400/en/docsmarket/users/9101/addresses$'
      const optionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'

      if (isOrderTypeCapture) {
        expect(countRequests(requestLog, 'POST', guestPattern)).toBe(1)
        expect(countRequests(requestLog, 'POST', addressPattern)).toBeGreaterThanOrEqual(1)
        expect(countRequests(requestLog, 'PUT', optionsPattern)).toBeGreaterThanOrEqual(1)

        const guestBody = matchingRequests(requestLog, 'POST', guestPattern)[0].body
        const addressBody = matchingRequests(requestLog, 'POST', addressPattern)[0].body
        expect(guestBody.guest_token).toMatch(/^[0-9a-f-]{36}$/i)
        expect(addressBody).toMatchObject({
          address: '100 Synthetic Market Street, Test City, TX 78701',
          location: JSON.stringify({ lat: 30.2672, lng: -97.7431 })
        })
        expect(matchingRequests(requestLog, 'PUT', optionsPattern).some(
          (request) => request.body?.type === 2 && request.body?.user_id === 9101
        )).toBe(true)
      } else {
        expect(countRequests(requestLog, 'POST', guestPattern)).toBe(0)
        expect(countRequests(requestLog, 'POST', addressPattern)).toBe(0)
        expect(countRequests(requestLog, 'PUT', optionsPattern)).toBe(0)
      }
    })
  }
})
