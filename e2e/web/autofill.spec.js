import { expect, test } from '../lib/fixtures.js'
import { ADDRESS_FIXTURE, ADDRESS_ROUTE, GUEST_CHECKOUT_ROUTE, openAddressFormWithSuggestion, withAddressSuggestions, withGuestCheckout } from '../lib/flows.js'

// implementation notesiOS Safari, iOS Chrome, Android Chrome and desktop Chrome offer the saved contact (name, email, phone,
// address) only when each field declares its `autocomplete` token and the fields sit in a real <form> that no ancestor
// turns off. Whether the system then offers the contact cannot be measured in Playwright; these attributes are what
// the browsers key on, so this spec reads them from the DOM of the three forms: Your details (guest checkout),
// Profile and the address form.
const audit = (page, formSelector) => page.evaluate((selector) => {
  const scope = document.querySelector(selector)
  const fields = {}
  for (const el of scope.querySelectorAll('input,textarea,select')) {
    if (el.type === 'hidden') continue
    const offAncestors = []
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (node.getAttribute('autocomplete') === 'off') offAncestors.push(node.tagName.toLowerCase())
    }
    fields[el.name || el.id] = {
      token: el.getAttribute('autocomplete'),
      type: el.type,
      inputmode: el.getAttribute('inputmode'),
      inForm: !!el.form,
      offAncestors,
      hasId: !!el.id
    }
  }
  return { isForm: scope.tagName === 'FORM', fields, coarse: window.matchMedia('(pointer: coarse)').matches }
}, formSelector)

const expectPersonalFields = ({ isForm, fields }, { phone = true } = {}) => {
  expect(isForm, 'the fields sit in a real <form>').toBe(true)
  const tokens = { name: 'given-name', lastname: 'family-name', email: 'email', ...(phone ? { telefono: 'tel' } : {}) }
  for (const [name, token] of Object.entries(tokens)) {
    expect(fields[name], `field "${name}" is in the form`).toBeDefined()
    expect(fields[name].token, `field "${name}" autocomplete`).toBe(token)
  }
  expect(fields.email.type, 'the email is an email field').toBe('email')
  expect(fields.email.inputmode).toBe('email')
  if (phone) {
    expect(fields.telefono.type).toBe('tel')
    expect(fields.telefono.inputmode).toBe('tel')
  }
  for (const [name, field] of Object.entries(fields)) {
    expect(field.inForm, `field "${name}" belongs to a form`).toBe(true)
    expect(field.offAncestors, `an ancestor of "${name}" turns autocomplete off`).toEqual([])
    // the country select is the library's: it has a name and no id
    if (field.token) expect(field.hasId, `field "${name}" has an id`).toBe(true)
  }
}

// The number is typed in `tel` complete: a full international number (what the contact saves) switches the country
// select, so the split tokens (tel-country-code, tel-national) are not needed and the select has no token to fill.
const expectInternationalPhoneSwitchesCountry = async (page) => {
  const number = page.locator('input[name=telefono]')
  const country = page.locator('select[name=telefonoCountry]')
  await number.fill('+34612345678')
  await expect(country).toHaveValue('ES')
}

test.describe('1562 · autofill of the personal and address forms', () => {
  test('Your details (guest checkout)', async ({ app, page }) => {
    await app.open('complete-checkout', GUEST_CHECKOUT_ROUTE, { authenticated: true, mutate: withGuestCheckout, clock: false })
    await expect(page.locator('[data-doc-control=profile-form]')).toBeVisible({ timeout: 30_000 })
    expectPersonalFields(await audit(page, '[data-doc-control=profile-form]'))
    await expectInternationalPhoneSwitchesCountry(page)
  })

  test('Profile', async ({ app, page }) => {
    await app.open('profile', '/profile?view=account', { authenticated: true })
    await expect(page.locator('[data-doc-control=profile-form] input[name=telefono]')).toBeVisible({ timeout: 30_000 })
    expectPersonalFields(await audit(page, '[data-doc-control=profile-form]'))
    await expectInternationalPhoneSwitchesCountry(page)
  })

  test('Address form', async ({ app, page }) => {
    await app.open(ADDRESS_FIXTURE, ADDRESS_ROUTE, { authenticated: true, mutate: withAddressSuggestions })
    await openAddressFormWithSuggestion(page)
    const form = await audit(page, "[data-doc-section='address-form'] form")
    expect(form.isForm, 'the fields sit in a real <form>').toBe(true)
    // the street search is an address on a touch screen (the keyboard bar offers the saved address) and `off` with a
    // mouse, where the browser's list would cover the suggestions
    expect(form.fields.address.token).toBe(form.coarse ? 'address-line1' : 'off')
    expect(form.fields.internal_number.token).toBe('address-line2')
    expect(form.fields.zipcode.token).toBe('postal-code')
    for (const [name, field] of Object.entries(form.fields)) {
      expect(field.inForm, `field "${name}" belongs to a form`).toBe(true)
      expect(field.offAncestors, `an ancestor of "${name}" turns autocomplete off`).toEqual([])
    }
  })
})
