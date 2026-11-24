import { expect, test } from '@playwright/test'
import { placeCashOrder } from '../lib/checkout.js'

// implementation notesthe guest e2e (e2e/account-invite) pressed the main button because it read "Continue to payment" when
// the cash choice was not on screen yet; with the payment open and the methods still loading the same button reads
// "Place Order" (PaymentOptions), so the order could be submitted with no method. The step is now a helper
// (e2e/lib/checkout.js). The account-invite spec writes for real, so it cannot run here: this spec drives the helper
// over a page that behaves like the checkout with a simulated transport (the methods arrive 400ms late) with the
// real selectors, in the two shapes of the checkout.
const checkout = ({ twoStep, loadMs = 400 }) => `
  <button id="cta" data-doc-control="checkout-place-order">Place Order</button>
  <div id="methods"></div>
  <script>
    window.log = { continues: 0, premature: 0, placed: 0 }
    const cta = document.getElementById('cta')
    const methods = document.getElementById('methods')
    let methodsLoaded = false
    let chosen = false
    const showMethods = () => setTimeout(() => {
      methodsLoaded = true
      methods.innerHTML = '<button data-doc-control="payment-method" data-doc-payment-gateway="cash" aria-pressed="false">Cash</button>'
      methods.firstChild.onclick = () => setTimeout(() => { chosen = true; methods.firstChild.setAttribute('aria-pressed', 'true'); cta.textContent = 'Place Order' }, 100)
      cta.textContent = 'Place Order'
    }, ${loadMs})
    if (${twoStep}) {
      // details first: the button reads Place Order while the page loads, then offers to continue
      setTimeout(() => { cta.textContent = 'Continue to payment' }, ${loadMs})
    } else {
      showMethods()
    }
    cta.onclick = () => {
      if (cta.textContent === 'Continue to payment') { window.log.continues++; cta.textContent = 'Place Order'; showMethods(); return }
      if (!methodsLoaded || !chosen) window.log.premature++
      else window.log.placed++
    }
  </script>`

for (const [name, options, continues] of [
  ['one step, the methods arrive 400ms late', { twoStep: false }, 0],
  ['two steps, "Continue to payment" shows up 400ms late and the methods 400ms after pressing it', { twoStep: true }, 1]
]) {
  test(name, async ({ page }) => {
    await page.setContent(checkout(options))
    await placeCashOrder(page, { timeout: 5000 })
    expect(await page.evaluate(() => window.log)).toEqual({ continues, premature: 0, placed: 1 })
  })
}

test('the helper never presses a button that reads Place Order while the methods have not come', async ({ page }) => {
  // the methods never arrive: the helper must time out waiting, without having pressed anything
  await page.setContent(checkout({ twoStep: false, loadMs: 60_000 }))
  await expect(placeCashOrder(page, { timeout: 1500 })).rejects.toThrow()
  expect(await page.evaluate(() => window.log)).toEqual({ continues: 0, premature: 0, placed: 0 })
})
