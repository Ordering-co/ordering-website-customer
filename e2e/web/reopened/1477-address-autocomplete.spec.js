import { test } from '../../lib/fixtures.js'
import { ADDRESS_FIXTURE, ADDRESS_ROUTE, openAddressFormWithSuggestion, withAddressSuggestions } from '../../lib/flows.js'

// implementation notes (reopened on afde8b5e): "What's your address?" at 390 px answered `Address → autocomplete="new-field"`,
// a value with no address meaning, so the phone offers nothing. QA read it from the DOM, and so does this spec:
// every personal and address field of the form declares a standard `autocomplete` token. Whether the system then
// offers the saved contact cannot be measured in Playwright; the attribute is what the browser keys on.
// Constraint from the issue: the Places / Mapbox suggestions must keep working (the helper picks one).
test.describe('1477 · address form autocomplete', () => {
  test('the address search and its sibling fields have standard autocomplete tokens', async ({ app, page }) => {
    await app.open(ADDRESS_FIXTURE, ADDRESS_ROUTE, { authenticated: true, mutate: withAddressSuggestions })
    await openAddressFormWithSuggestion(page)
    // with a mouse the street search stays `off` on purpose (AddressForm: the browser's popup would cover the suggestions);
    // with a touch screen, where the phone's keyboard offers the saved address, it must be a standard address token
    await app.check('address form', { header: false, streetOffWithMouse: true })
  })
})
