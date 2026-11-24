import { expect, test } from '../lib/fixtures.js'
import { GUEST_CHECKOUT_ROUTE, withGuestCheckout } from '../lib/flows.js'

// implementation notesa guest who saves "Your details" with the email or phone of a registered account is told so under
// that field, with a way to sign in, instead of a «Profile» alert saying "Please try again". api-core still rejects
// the save (it answers 422 here); this spec is about what the guest reads. The write is always intercepted.
const MASKED = 'j***@example.com'

const rejectSave = async (page, errorCode, sentence) => {
  await page.route(/\/users\/\d+(?:\?.*)?$/, async (route) => {
    const method = route.request().method()
    if (!['PUT', 'PATCH', 'POST'].includes(method)) return route.fallback()
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: true, result: [sentence], error_codes: [errorCode] })
    })
  })
}

const fillAndSave = async (page, { email, phone }) => {
  const form = page.locator('[data-doc-control=profile-form]')
  await expect(form).toBeVisible({ timeout: 30_000 })
  await form.locator('input[name=name]').fill('Ana')
  await form.locator('input[name=lastname]').fill('Gomez')
  await form.locator('input[name=email]').fill(email)
  await form.locator('input[name=telefono]').fill(phone)
  await form.locator('input[name=email]').press('Enter')
  return form
}

test.describe('1564 · a guest with the email or phone of an account', () => {
  test('email: a notice under the field with Sign in, no alert, nothing of the other account', async ({ app, page }) => {
    await app.open('complete-checkout', GUEST_CHECKOUT_ROUTE, { authenticated: true, mutate: withGuestCheckout, clock: false })
    await app.watchText(MASKED)
    await rejectSave(page, 'email.unique', `The email has already been taken by ${MASKED}`)
    const form = await fillAndSave(page, { email: 'ana@example.com', phone: '+12025550199' })

    const notice = form.locator('[data-doc-control=account-notice-email]')
    await expect(notice).toContainText('This email already has an account')
    await expect(page.getByRole('dialog', { name: 'Profile' })).toHaveCount(0)
    await expect(page.getByText('Please try again')).toHaveCount(0)

    await notice.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('textbox').first()).toBeVisible()
  })

  test('phone: a notice under the phone', async ({ app, page }) => {
    await app.open('complete-checkout', GUEST_CHECKOUT_ROUTE, { authenticated: true, mutate: withGuestCheckout, clock: false })
    await app.watchText(MASKED)
    await rejectSave(page, 'cellphone.unique', `The cellphone has already been taken by ${MASKED}`)
    const form = await fillAndSave(page, { email: 'ana@example.com', phone: '+12025550199' })

    await expect(form.locator('[data-doc-control=account-notice-cellphone]')).toContainText('This phone number already has an account')
    await expect(page.getByRole('dialog', { name: 'Profile' })).toHaveCount(0)
  })
})
