import { expect, test } from '../../lib/fixtures.js'

// implementation notes (reopened on afde8b5e, Safari on the iPhone Duo): the fix covered the Preorder dialog opened from the
// store and from the product sheet, but the time dialog opened from the header's ASAP button still applied the choice
// at the first tap: closing it with the X left "11-22 12:30AM" in the header, and it survived a reload. Same
// steps here, on the entry that failed: header → Schedule for later → pick a day and an hour → close with the X.
const STORE = '/store/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2'
// the time button: marked in the stacked layout, plain in the one-row header of 1024px and up
const chip = (page) => page.locator('[data-doc-control=order-moment-open], [data-app-header] button').filter({ hasText: /^(ASAP|\d\d-\d\d .*)$/ }).first()

const openHeaderMoment = async (page) => {
  await expect(chip(page)).toBeVisible({ timeout: 30_000 })
  await expect(chip(page)).toContainText('ASAP')
  await chip(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: /Schedule for later/ }).click()
  return dialog
}

const pickSlot = async (dialog) => {
  // tomorrow: with the clock frozen at noon, the slots of today are all in the past
  await dialog.locator("[data-doc-control='business-preorder-date-day']:not([disabled])").nth(1).click()
  const slot = dialog.locator("[data-doc-control='business-preorder-time-slot']:not([disabled])").first()
  await expect(slot).toBeVisible()
  await slot.click()
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled()
}

test.describe('1484 · header time dialog', () => {
  test('closing with the X keeps ASAP in the header, before and after a reload', async ({ app, page }) => {
    await app.open('business-menu', STORE)
    const dialog = await openHeaderMoment(page)
    await pickSlot(dialog)
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await expect(chip(page), 'the header changed the time although Save was never pressed').toContainText('ASAP')
    await app.reload()
    await expect(chip(page), 'and the choice survives a reload').toContainText('ASAP')
  })

  test('Save applies the time to the header and keeps it after a reload', async ({ app, page }) => {
    await app.open('business-menu', STORE)
    const dialog = await openHeaderMoment(page)
    await pickSlot(dialog)
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(chip(page)).not.toContainText('ASAP')
    const applied = await chip(page).innerText()
    await app.reload()
    await expect(chip(page)).toHaveText(applied)
  })
})
