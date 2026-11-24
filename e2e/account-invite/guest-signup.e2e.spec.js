/**
 * implementation notes end to end: a guest's cash order goes to the account the guest creates from the
 * confirmation's invitation (flow `signup_form`, the default).
 *
 * It WRITES FOR REAL: it places an order and creates an account. Run it only against a web served
 * for a TEST project, never against production. Without every variable below it is skipped.
 *
 *   ACCOUNT_INVITE_E2E_BASE_URL=https://<the web served against the test project>
 *   ACCOUNT_INVITE_E2E_CONFIRM=test-project        # you confirm the project is a test one
 *   ACCOUNT_INVITE_E2E_PROJECT=<test project slug> # the API project the web must use; any write to
 *                                                  # another project is aborted and fails the test
 *   ACCOUNT_INVITE_E2E_STORE_SLUG=<store slug>     # a store open now, guest checkout and cash enabled
 *   ACCOUNT_INVITE_E2E_PRODUCT="<product name>"    # a product of that store with no required options
 *   ACCOUNT_INVITE_E2E_EMAIL_DOMAIN=<a real domain you own> # domain of the unique email; the API rejects example.com
 *                                                  # and other disposable domains (email.disposable) and saves nothing
 *   ACCOUNT_INVITE_E2E_PHONE=+12015550123          # optional: the guest's phone, international
 *   pnpm exec playwright test -c e2e/account-invite/playwright.config.js
 *
 * Assumes the store opens with an order type that needs no address step (or the address is already
 * set) and that the store's theme keeps `components.account_invite.base.flow` at `signup_form`.
 * Selectors are the app's own (data-doc-control, roles, field names); none was added for this test.
 */
import { expect, test } from '@playwright/test'
import { placeCashOrder } from '../lib/checkout.js'

const env = process.env
const BASE_URL = env.ACCOUNT_INVITE_E2E_BASE_URL
const CONFIRMED = env.ACCOUNT_INVITE_E2E_CONFIRM === 'test-project'
const STORE = env.ACCOUNT_INVITE_E2E_STORE_SLUG
const PRODUCT = env.ACCOUNT_INVITE_E2E_PRODUCT
const PROJECT = env.ACCOUNT_INVITE_E2E_PROJECT
const EMAIL_DOMAIN = env.ACCOUNT_INVITE_E2E_EMAIL_DOMAIN

test.skip(!BASE_URL || !CONFIRMED || !STORE || !PRODUCT || !PROJECT || !EMAIL_DOMAIN,
  'Needs ACCOUNT_INVITE_E2E_BASE_URL, ACCOUNT_INVITE_E2E_CONFIRM=test-project, ACCOUNT_INVITE_E2E_PROJECT, ACCOUNT_INVITE_E2E_STORE_SLUG, ACCOUNT_INVITE_E2E_PRODUCT and ACCOUNT_INVITE_E2E_EMAIL_DOMAIN (a test project only: it writes)')

// The API project of a request (`/v400/en/<project>/…`), or null when it is not the API
const projectOf = (url) => { try { return new URL(url).pathname.match(/^\/v\d+\/[^/]+\/([^/]+)/)?.[1] ?? null } catch { return null } }

const stamp = Date.now()
const guest = {
  name: 'Invite',
  // letters and spaces only (the API rejects digits); the unique part is the email's
  lastname: 'Autotest',
  email: `account-invite-e2e+${stamp}@${EMAIL_DOMAIN}`,
  // international, so the site's default country does not reread it
  phone: env.ACCOUNT_INVITE_E2E_PHONE || '+12015550123'
}
const PASSWORD = `Invite-${stamp}`

const storedUser = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })
const isApi = (url, pathRe) => { try { return pathRe.test(new URL(url).pathname.replace(/^\/v\d+\/[^/]+\/[^/]+/, '')) } catch { return false } }

test('a guest cash order is in My orders of the account created from its confirmation', async ({ page }) => {
  // 0. never write outside the declared test project: such a write is aborted and fails the test, and the
  // first API read must already be of that project, before anything is written
  const foreignWrites = []
  await page.route('**/*', (route) => {
    const request = route.request()
    const project = projectOf(request.url())
    if (project && project !== PROJECT && request.method() !== 'GET') {
      foreignWrites.push(`${request.method()} ${request.url()}`)
      return route.abort()
    }
    return route.continue()
  })
  const firstApi = page.waitForRequest((request) => !!projectOf(request.url()), { timeout: 30000 })
  // 1. a cash order as a guest
  await page.goto(`/store/${STORE}`)
  expect(projectOf((await firstApi).url()), 'the web is not served against ACCOUNT_INVITE_E2E_PROJECT').toBe(PROJECT)
  await page.getByText(PRODUCT, { exact: true }).first().click()
  const asGuest = page.getByText('As guest user', { exact: true })
  const add = page.locator('[data-doc-control=add-product-to-cart]:visible').first()
  // a guest store adds straight to the cart and creates the guest itself; any other asks "As guest user"
  await expect(asGuest.or(add).first()).toBeVisible({ timeout: 20000 })
  if (await asGuest.isVisible()) await asGuest.click()
  await add.click()
  await expect.poll(async () => (await storedUser(page))?.guest_id, { timeout: 20000 }).toBeTruthy()
  const guestId = (await storedUser(page)).guest_id

  await page.locator('[data-doc-control=cart-open]:visible').first().click()
  await page.locator('[data-doc-control=cart-checkout]:visible').first().click()
  await page.waitForURL(/\/checkout/)

  // the checkout is a skeleton until it loads: probing the fields before that skips them silently, and
  // the order is placed with no details for the invitation to prefill
  const details = (selector) => page.locator(`[data-doc-section=checkout-customer-details] ${selector}`).first()
  await expect(details('input[name=email]')).toBeVisible({ timeout: 30000 })
  const fillIfEmpty = async (selector, value) => {
    const field = details(selector)
    if (await field.isVisible().catch(() => false) && !(await field.inputValue())) await field.fill(value)
  }
  await fillIfEmpty('input[name=name]', guest.name)
  await fillIfEmpty('input[name=lastname]', guest.lastname)
  await fillIfEmpty('input[name=email]', guest.email)
  await fillIfEmpty('input[type=tel]', guest.phone)
  // before the order is placed: without the guest's email the test has nothing to prove and must not write
  await expect(details('input[name=email]'), 'the checkout did not ask the guest for an email').toHaveValue(guest.email)

  // one- or two-step checkout: waits for the cash choice or "Continue to payment", never presses a "Place Order" that
  // only reads so while the methods load, and waits for the choice before placing the order
  await placeCashOrder(page)
  await page.waitForURL(/\/orders\/\d+/, { timeout: 90000 })
  const orderId = page.url().match(/\/orders\/(\d+)/)[1]

  // 2. the confirmation shows the invitation
  const invite = page.getByRole('dialog').filter({ hasText: 'Save this order to an account' })
  await expect(invite).toBeVisible({ timeout: 20000 })

  // 3. the account, from the sign-up form prefilled with the guest's details
  await invite.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('input[name=email]')).toHaveValue(guest.email)
  await page.locator('input[name=password]').fill(PASSWORD)
  const signup = page.waitForResponse((response) => response.request().method() === 'POST' && isApi(response.url(), /^\/users$/))
  await page.locator('[data-doc-control=authentication-signup-submit]').click()
  const response = await signup
  const sent = JSON.parse(response.request().postData() || '{}')
  expect(sent.guest_token).toBe(guestId)
  expect(sent.email).toBe(guest.email)
  const { error, result: account } = await response.json()
  expect(error).toBe(false)
  expect(account.guest_id ?? null).toBeNull()
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}(\\?|$)`))
  await expect.poll(async () => (await storedUser(page))?.id).toBe(account.id)

  // 4. the account has no guest left, and the order is its own
  // the API root (https://host/vX/lang/project) as the web itself called it, never hardcoded
  const apiRoot = response.url().replace(/\/users(\?.*)?$/, '')
  const auth = { headers: { Authorization: `bearer ${account.session.access_token}` } }
  const me = await (await page.request.get(`${apiRoot}/users/${account.id}`, auth)).json()
  expect(me.error).toBe(false)
  expect(me.result.guest_id ?? null).toBeNull()

  const placed = await (await page.request.get(`${apiRoot}/orders/${orderId}`, auth)).json()
  expect(placed.error).toBe(false)
  expect(placed.result.customer_id).toBe(account.id)

  await page.goto('/profile/orders')
  // the card reads "Order No. <id>"
  await expect(page.locator('[data-doc-section=order-history-card]').filter({ hasText: orderId })).toBeVisible()
  expect(foreignWrites, 'writes to another project were aborted').toEqual([])
})
