import { expect, test } from '../../lib/fixtures.js'

// implementation notes (reopened on afde8b5e): Favorites asked /businesses without `location` whenever the order had no
// address and the project's default coordinates were missing or invalid. api-core answers 400/422 ("The location.lat
// field is required"); the earlier fix had only been tried with fallback coordinates in the fixture, so the request
// without a location never came up. Pickup, no address, invalid default coordinates, saved favorites.
const invalidDefaultLocation = (fixture) => {
  fixture.firstLoad.configs.location_default_latitude = { key: 'location_default_latitude', value: 'not-a-number' }
  fixture.firstLoad.configs.location_default_longitude = { key: 'location_default_longitude', value: '' }
}
// Every GET to the businesses endpoint, judged by its path (the guard's log only has what a fixture route answered, and
// a request with no query is the one that matters): the `location` it carried, as the page sent it.
const watchBusinessReads = (page) => {
  const reads = []
  page.on('request', (request) => {
    const { pathname, searchParams } = new URL(request.url())
    if (request.method() === 'GET' && /\/businesses$/.test(pathname)) reads.push({ path: pathname, location: searchParams.get('location') })
  })
  return reads
}
const hasLocation = ({ location }) => {
  try {
    const { lat, lng } = JSON.parse(location)
    return Number.isFinite(lat) && Number.isFinite(lng)
  } catch { return false }
}

test.describe('1483 · favorites without a usable location', () => {
  test('never asks /businesses without a valid location', async ({ app, page }) => {
    const reads = watchBusinessReads(page)
    await app.open('favorites', '/favorite', { authenticated: true, mutate: invalidDefaultLocation })
    await expect(page.locator('[data-doc-section=favorites]')).toBeVisible({ timeout: 30_000 })
    await app.settle()
    expect(reads.length, 'Favorites asked /businesses at least once').toBeGreaterThan(0)
    expect(reads.filter((read) => !hasLocation(read)).map(({ path, location }) => `${path} location=${location}`), 'GET /businesses went out without a valid `location`').toEqual([])
  })

  // The part the earlier fix did cover (a 422 on the read shows the translated state, not api-core's text). It passes
  // today, so it stays a plain test: the day the request is not made at all, it still guards the error path.
  test('a rejected /businesses read shows a translated state with Retry, never the API text', async ({ app, page }) => {
    const witness = 'The location.lat field is required'
    await app.open('favorites', '/favorite', { authenticated: true, mutate: invalidDefaultLocation })
    await app.inject422({ witness, match: /\/businesses(\?|$)/, methods: ['GET'] })
    await app.reload()
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('body')).not.toContainText(witness)
    expect(await app.textSeen(), 'the API text was never on screen').toEqual([])
  })
})
