import { expect, test } from '../lib/fixtures.js'
import { ADDRESS_FIXTURE, ADDRESS_POST, ADDRESS_ROUTE, SYNTHETIC_ADDRESS, withAddressSuggestions } from '../lib/flows.js'
import { APP_ORIGIN } from '../docs/lib/server.cjs'

// implementation notes"Use my current location" with Mapbox. Before choosing, a permission already given shows the address the
// row will use (the permission is never asked just to show it); otherwise pressing asks and the address found waits for
// "Use this address" / "It's not correct". After choosing, the address is separate editable fields (street, APT / Suite,
// city, state, postal code; the country is a datum). The GPS decides: correcting any part keeps its point; only choosing
// another address in the search changes it. The device (geolocation and permission) and Mapbox are simulated; every write
// to the API is intercepted.
const GPS = { lat: 30.5, lng: -97.5 }
const DEVICE_ADDRESS = '7 Device Lane, Gps City, Gps State 12345, United States'
const PICKED_POINT = { lat: 30.2672, lng: -97.7431 }

const withReverseGeocoding = async (fixture) => {
  await withAddressSuggestions(fixture)
  fixture.routes.unshift({
    method: 'GET',
    pattern: '^/search/geocode/v6/reverse(?:\\?.*)?$',
    response: {
      features: [{
        properties: {
          mapbox_id: 'synthetic-device-7',
          full_address: DEVICE_ADDRESS,
          context: {
            country: { name: 'United States', country_code: 'US' },
            region: { name: 'Gps State', region_code: 'GS' },
            place: { name: 'Gps City' },
            postcode: { name: '12345' },
            street: { name: 'Device Lane' },
            address: { address_number: '7' }
          }
        }
      }]
    }
  })
}

// The browser's geolocation and permission, simulated. `permission`: 'granted' | 'prompt' | 'denied'. A device that is
// not granted answers only when pressed, as a prompt that was accepted; a denied one fails with code 1.
const simulateDevice = (page, permission) => page.addInitScript(({ permission, coords }) => {
  window.__GEO_CALLS__ = 0
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok, fail) => {
        window.__GEO_CALLS__++
        setTimeout(() => permission === 'denied' ? fail({ code: 1 }) : ok({ coords: { latitude: coords.lat, longitude: coords.lng, accuracy: 5 } }), 30)
      },
      watchPosition: () => 0,
      clearWatch: () => {}
    }
  })
  const status = { state: permission, onchange: null }
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => status } })
}, { permission, coords: GPS })

// Every write to the address endpoint is caught here (and answered by the fixture); nothing reaches the real API.
const captureAddressWrites = async (page) => {
  const sent = []
  await page.route((url) => url.origin !== APP_ORIGIN && ADDRESS_POST.test(url.pathname), async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    // the SDK sends objects (location, map_data) as JSON text
    const body = route.request().postDataJSON()
    sent.push(Object.fromEntries(Object.entries(body).map(([key, value]) => [key, ['location', 'map_data'].includes(key) && typeof value === 'string' ? JSON.parse(value) : value])))
    return route.fallback()
  })
  return sent
}

const openForm = async (app, page, permission) => {
  await simulateDevice(page, permission)
  await app.open(ADDRESS_FIXTURE, ADDRESS_ROUTE, { authenticated: true, mutate: withReverseGeocoding })
  // registered after the app's network guard: the last route registered answers first
  const sent = await captureAddressWrites(page)
  await page.locator("[data-doc-section='address-list'] [data-doc-control='address-add']").click()
  const form = page.locator("[data-doc-section='address-form']")
  await expect(form).toHaveAttribute('data-doc-state', 'ready')
  const search = form.locator("[data-doc-control='address-search'] input")
  await search.click()
  return { form, search, sent, row: form.locator("[data-doc-control='address-use-location']") }
}

const geoCalls = (page) => page.evaluate(() => window.__GEO_CALLS__)
const insideViewport = async (page, locator, what) => {
  const box = await locator.boundingBox()
  const width = await page.evaluate(() => document.documentElement.clientWidth)
  expect(box, `${what} is on screen`).not.toBeNull()
  expect(box.x, `${what} starts inside the screen`).toBeGreaterThanOrEqual(-0.5)
  expect(box.x + box.width, `${what} ends inside the screen`).toBeLessThanOrEqual(width + 0.5)
}

test.describe('1567 · use my current location (Mapbox)', () => {
  test('permission not given: pressing asks, the address waits for a yes, then it is separate fields and the GPS decides', async ({ app, page }) => {
    const { form, search, row, sent } = await openForm(app, page, 'prompt')
    // before choosing, nothing is asked: no position read, no address shown in the row
    await expect(row).toBeVisible()
    await expect(row).not.toContainText(DEVICE_ADDRESS)
    expect(await geoCalls(page), 'the permission is not asked to show the row').toBe(0)

    await row.click()
    const confirm = form.locator("[data-doc-control='address-location-confirm']")
    await expect(confirm).toContainText(DEVICE_ADDRESS)
    await insideViewport(page, confirm, 'the confirmation')
    await app.check('address form, confirm', { header: false, streetOffWithMouse: true })
    // "It's not correct": nothing is applied, the field stays to type in
    await form.locator("[data-doc-control='address-location-reject']").click()
    await expect(confirm).toBeHidden()
    await expect(search).toHaveValue('')
    await expect(form.getByPlaceholder('City')).toHaveCount(0)

    await search.click()
    await row.click()
    await form.locator("[data-doc-control='address-location-accept']").click()
    // the address in separate, editable fields; the street is not one cut line
    await expect(search).toHaveValue('7 Device Lane')
    await expect(form.getByPlaceholder('City')).toHaveValue('Gps City')
    await expect(form.getByPlaceholder('State / Province')).toHaveValue('Gps State')
    await expect(form.getByPlaceholder('Postal Code')).toHaveValue('12345')
    await expect(form.locator("[data-doc-control='address-country']")).toContainText('United States')
    for (const placeholder of ['Address', 'APT / Suite', 'City', 'State / Province', 'Postal Code']) {
      await insideViewport(page, form.getByPlaceholder(placeholder, { exact: true }), `the ${placeholder} field`)
    }
    await app.check('address form, chosen', { header: false, streetOffWithMouse: true })

    // correcting the street and the postal code keeps the GPS point and the metadata
    await search.fill('9 Device Lane')
    await form.getByPlaceholder('Postal Code').fill('54321')
    await form.locator("[data-doc-control='address-save']").click()
    await expect(form).toBeHidden()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      address: '9 Device Lane, Gps City, Gps State 54321, United States',
      location: GPS,
      zipcode: '54321',
      city: 'Gps City',
      state: 'Gps State',
      map_data: { library: 'mapbox', place_id: 'synthetic-device-7' }
    })
  })

  test('permission already given: the row shows the address it will use, and pressing it applies that address', async ({ app, page }) => {
    const { form, search, row, sent } = await openForm(app, page, 'granted')
    await expect(row).toContainText(DEVICE_ADDRESS)
    await insideViewport(page, row, 'the row')
    await app.check('address form, row with address', { header: false, streetOffWithMouse: true })
    await row.click()
    // no confirmation: the person already saw the address
    await expect(form.locator("[data-doc-control='address-location-confirm']")).toHaveCount(0)
    await expect(search).toHaveValue('7 Device Lane')
    await form.locator("[data-doc-control='address-save']").click()
    await expect(form).toBeHidden()
    expect(sent[0]).toMatchObject({ address: DEVICE_ADDRESS, location: GPS })
  })

  test('choosing another address in the search changes the point', async ({ app, page }) => {
    const { form, search, row, sent } = await openForm(app, page, 'granted')
    await row.click()
    await expect(search).toHaveValue('7 Device Lane')
    await search.fill('100 Synthetic Market Street')
    await form.getByText(SYNTHETIC_ADDRESS).click()
    await expect(form.getByPlaceholder('City')).toHaveValue('Test City')
    await form.locator("[data-doc-control='address-save']").click()
    await expect(form).toBeHidden()
    expect(sent[0]).toMatchObject({ address: SYNTHETIC_ADDRESS, location: PICKED_POINT, zipcode: '78701' })
  })

  test('permission denied: says so and the search keeps working', async ({ app, page }) => {
    const { form, search, row, sent } = await openForm(app, page, 'denied')
    await row.click()
    const message = form.locator("[data-doc-control='address-location-error']")
    await expect(message).toContainText('Location access is blocked')
    await insideViewport(page, message, 'the message')
    await search.fill('100 Synthetic Market Street')
    await form.getByText(SYNTHETIC_ADDRESS).click()
    await form.locator("[data-doc-control='address-save']").click()
    await expect(form).toBeHidden()
    expect(sent[0]).toMatchObject({ location: PICKED_POINT })
  })
})
