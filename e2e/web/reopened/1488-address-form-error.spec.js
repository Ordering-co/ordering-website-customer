import { expect, test } from '../../lib/fixtures.js'
import { ADDRESS_FIXTURE, ADDRESS_POST, ADDRESS_ROUTE, openAddressFormWithSuggestion, withAddressSuggestions } from '../../lib/flows.js'
import { APP_ORIGIN } from '../../docs/lib/server.cjs'

// implementation notes (reopened on d7e7e4e1): AddressForm drew `formState.error` as the API sent it. Saving an address with a
// 422 whose body carries a diagnostic showed that diagnostic under "Address Notes". Fixed for login, sign-up and
// reviews, but this form was left out. Expected: a translated message the person can read, the form still open with its
// data, and, after the failure, a retry that works: the second Save sends the same data again and, answered, closes the form.
const WITNESS = 'RAW_QA_ADDRESS_BACKEND_DIAGNOSTIC_E143'
const NOTES = 'Gate code 4321'

test.describe('1488 · address form shows no raw API text', () => {
  test('a 422 on saving shows the translated notice, keeps the data, and the next Save goes through and closes the form', async ({ app, page }) => {
    await app.open(ADDRESS_FIXTURE, ADDRESS_ROUTE, { authenticated: true, mutate: withAddressSuggestions })
    await app.watchText(WITNESS)
    // the first write is refused (422, as api-core does); the next one reaches the fixture, which accepts it
    const sent = []
    const replies = []
    const isAddressPost = (url) => url.origin !== APP_ORIGIN && ADDRESS_POST.test(url.pathname)
    page.on('response', (response) => {
      if (response.request().method() === 'POST' && isAddressPost(new URL(response.url()))) replies.push(response.status())
    })
    await page.route(isAddressPost, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      sent.push(route.request().postDataJSON())
      if (sent.length > 1) return route.fallback()
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: true, result: [WITNESS] }) })
    })

    const form = await openAddressFormWithSuggestion(page)
    await form.getByPlaceholder('Address Notes').fill(NOTES)
    const save = form.locator("[data-doc-control='address-save']")
    await save.click()

    // what the person reads: a translated notice, not the diagnostic
    const notice = form.locator("[data-doc-control='address-save-error']")
    await expect(notice, 'the notice of the failed save is on screen').toBeVisible()
    await expect(notice).toHaveText(/please try again/i)
    await expect(notice).not.toContainText(WITNESS)
    await expect(page.locator('body')).not.toContainText(WITNESS)
    // and what they typed is still there
    await expect(form, 'the form stays open').toBeVisible()
    await expect(form.locator("[data-doc-control='address-search'] input")).toHaveValue('100 Synthetic Market Street')
    await expect(form.getByPlaceholder('Address Notes')).toHaveValue(NOTES)
    await expect(save, 'and the user can try again').toBeEnabled()

    // the retry: a second request with the same data, answered, and the form closes
    await save.click()
    await expect(form, 'the form closes once the retry is accepted').toBeHidden()
    expect(replies, 'the first write was refused, the second accepted').toEqual([422, 200])
    expect(sent).toHaveLength(2)
    expect(sent[1], 'the retry sends what the first one sent').toEqual(sent[0])
    expect(sent[0]).toMatchObject({ address_notes: NOTES })
    expect(await app.textSeen(), 'the diagnostic was never on screen, not even for a moment').toEqual([])
  })
})
