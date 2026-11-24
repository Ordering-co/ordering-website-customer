import { expect } from '@playwright/test'

// The payment step of the checkout, whichever of its two shapes the store has: one step (the cash choice is on the
// page) or two (details first; "Continue to payment" opens the methods). While the methods are still loading,
// PaymentOptions leaves the main button reading "Place Order", so that text proves nothing: pressing it then
// submits with no method. The helper waits for what can be trusted (the cash choice, or the button reading
// "Continue to payment"), presses Continue only when it is there, and returns once the cash choice is on screen.
export const openCashPayment = async (page, { timeout = 30000 } = {}) => {
  const payWithCash = page.locator('[data-doc-control=payment-method][data-doc-payment-gateway=cash]:visible').first()
  const placeOrder = page.locator('[data-doc-control=checkout-place-order]:visible').first()
  const toPayment = placeOrder.filter({ hasText: /Continue to payment/i })
  await expect(payWithCash.or(toPayment).first()).toBeVisible({ timeout })
  if (!(await payWithCash.isVisible())) await toPayment.click()
  await expect(payWithCash).toBeVisible({ timeout })
  return { payWithCash, placeOrder }
}

// Chooses cash and waits for the choice to take (the method is pressed and the button offers to place the order)
// before the order is placed.
export const placeCashOrder = async (page, options) => {
  const { payWithCash, placeOrder } = await openCashPayment(page, options)
  await payWithCash.click()
  await expect(payWithCash).toHaveAttribute('aria-pressed', 'true')
  await expect(placeOrder).toHaveText(/Place Order/i)
  await placeOrder.click()
}
