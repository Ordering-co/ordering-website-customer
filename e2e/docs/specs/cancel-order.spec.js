import { expect, test } from '@playwright/test'
import { disableMotion } from '../lib/capture.js'
import { assertOrderIsolation, initializeOrderPage, orderFixture, settleOrderPage } from '../lib/order-actions.js'

const statuses = [0, 7, 13, 16]

test.describe('Cancel order authoritative absence', () => {
  for (const status of statuses) {
    test(`status ${status} exposes no customer cancellation surface @desktop-chromium`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium')
      const fixture = await orderFixture('cancel-order', ({ order }) => {
        order.response.result.status = status
        order.response.result.reporting_data = { at: { [`status:${status}`]: '2026-08-01 17:05:00' } }
      })
      const runtime = await initializeOrderPage({ page, fixture })
      await disableMotion(page)
      const settled = await settleOrderPage({ page, fixture, requestLog: runtime.requestLog })
      const root = page.locator("[data-doc-section='order-details']")
      await expect(root).toContainText('Synthetic Bowl')
      await expect(root.getByRole('button', { name: /^(cancel order|request cancellation)$/i })).toHaveCount(0)
      await expect(root.getByRole('link', { name: /^(cancel order|request cancellation)$/i })).toHaveCount(0)
      await expect(root.getByRole('textbox', { name: /cancellation reason/i })).toHaveCount(0)
      await expect(root.locator("[data-doc-control*='cancel-order'], [data-doc-section*='cancel-order']")).toHaveCount(0)
      await expect(root.getByText('Cancel order', { exact: true })).toHaveCount(0)
      await expect(root.getByText('Request cancellation', { exact: true })).toHaveCount(0)
      await expect(root.getByText('Cancellation reason', { exact: true })).toHaveCount(0)
      if (status === 16) await expect(root).toContainText('Order cancelled by customer')
      await assertOrderIsolation({ page, ...settled })
    })
  }

  test.skip('generic status 16 update is not a customer cancellation contract', async () => {})
  test.skip('refund, payment, logistics, and notification consequences remain forbidden', async () => {})
})
