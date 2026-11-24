import { expect, test } from '../lib/fixtures.js'

// The fixture's own contract (implementation notes, criterion 3) plus the by-class sweep: the same page checks on every
// entry, at every width the project runs. A failure names the page, the width and the measure.

test.describe('the fixture refuses what it must refuse', () => {
  test('a write that no fixture route mocks is reported as reaching the real API', async ({ app, page }) => {
    await app.open('browse-businesses', '/search?lat=30.2672&lng=-97.7431&order_type=1')
    await page.evaluate(() => fetch('https://api.docs.invalid/v400/en/docsmarket/orders', { method: 'POST', body: '{}' }).catch(() => {}))
    await expect.poll(() => app.requestLog.unknown.length).toBeGreaterThan(0)
    expect(() => app.assertNoUnknownWrites()).toThrow(/POST .*\/orders/)
    app.requestLog.unknown.length = 0
  })

  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    test(`${method} is judged like POST`, async ({ app, page }) => {
      await app.open('browse-businesses', '/search?lat=30.2672&lng=-97.7431&order_type=1')
      await page.evaluate((verb) => fetch('https://api.docs.invalid/v400/en/docsmarket/users/1', { method: verb }).catch(() => {}), method)
      await expect.poll(() => app.requestLog.unknown.length).toBeGreaterThan(0)
      expect(() => app.assertNoUnknownWrites()).toThrow(new RegExp(`${method} `))
      app.requestLog.unknown.length = 0
    })
  }

  test('a console.error and a text the user must never read are caught', async ({ app, page }) => {
    await app.open('browse-businesses', '/search?lat=30.2672&lng=-97.7431&order_type=1')
    await app.watchText('WITNESS_SELF_TEST')
    await page.evaluate(() => {
      console.error('self-test')
      const note = document.createElement('p')
      note.textContent = 'Failed to fetch · WITNESS_SELF_TEST'
      document.body.append(note)
      setTimeout(() => note.remove(), 50)
    })
    await expect.poll(() => app.consoleErrors).toContain('self-test')
    // gone from the screen after 50ms, still on record
    await expect.poll(async () => (await app.textSeen()).map((seen) => seen.what)).toEqual(expect.arrayContaining(['Failed to fetch', 'WITNESS_SELF_TEST']))
    // the record is cleared once the note is gone: the scan at the end of the test would see it still on screen
    await expect.poll(() => page.evaluate(() => document.body.textContent.includes('WITNESS_SELF_TEST'))).toBe(false)
    app.consoleErrors.length = 0
    await page.evaluate(() => { window.__TEXT_WATCH__.seen.length = 0 })
  })

  // implementation notesa failure that was in the page hidden and is shown by taking an attribute off it was invisible to the watcher,
  // which only looked at what was added
  test('a text shown by an attribute is caught even if it is hidden again, and so is one inserted visible', async ({ app, page }) => {
    await app.open('browse-businesses', '/search?lat=30.2672&lng=-97.7431&order_type=1')
    await page.evaluate(() => {
      const note = document.createElement('p')
      note.id = 'self-test-hidden'
      note.hidden = true
      note.textContent = 'Failed to fetch'
      document.body.append(note)
    })
    // another task: the page shows it, and one more task later hides it again
    await page.evaluate(() => { document.getElementById('self-test-hidden').hidden = false })
    await page.evaluate(() => { document.getElementById('self-test-hidden').hidden = true })
    await page.evaluate(() => {
      const note = document.createElement('p')
      note.id = 'self-test-visible'
      note.textContent = 'Load failed'
      document.body.append(note)
    })
    await expect.poll(async () => (await app.textSeen()).map((seen) => seen.what)).toEqual(expect.arrayContaining(['Failed to fetch', 'Load failed']))
    // the teardown scans again: leave nothing readable behind
    await page.evaluate(() => { document.querySelectorAll('[id^=self-test-]').forEach((note) => note.remove()); window.__TEXT_WATCH__.seen.length = 0 })
  })

  // what no mutation of the document announces (a stylesheet rule that stops hiding it) is found by the scan the teardown makes
  test('a text shown without any change to the document is found when the test ends', async ({ app, page }) => {
    await app.open('browse-businesses', '/search?lat=30.2672&lng=-97.7431&order_type=1')
    await page.evaluate(() => {
      const note = document.createElement('p')
      note.textContent = 'Network request failed'
      const sheet = new CSSStyleSheet()
      sheet.replaceSync('p#self-test-sheet { display: none }')
      note.id = 'self-test-sheet'
      document.adoptedStyleSheets = [sheet]
      document.body.append(note)
      window.__selfTestSheet = sheet
    })
    await page.evaluate(() => window.__selfTestSheet.replaceSync(''))
    expect((await app.textSeen()).map((seen) => seen.what)).toContain('Network request failed')
    await page.evaluate(() => { document.querySelectorAll('[id^=self-test-]').forEach((note) => note.remove()); window.__TEXT_WATCH__.seen.length = 0 })
  })
})

const sweep = [
  { name: 'businesses list', fixture: 'browse-businesses', route: '/search?lat=30.2672&lng=-97.7431&order_type=1' },
  { name: 'store', fixture: 'business-menu', route: '/store/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2' },
  { name: 'favorites', fixture: 'favorites', route: '/favorite', authenticated: true },
  { name: 'addresses', fixture: 'addresses', route: '/profile/addresses', authenticated: true },
  { name: 'profile', fixture: 'profile', route: '/profile?view=account', authenticated: true }
]

test.describe('hygiene by class on every entry', () => {
  for (const entry of sweep) {
    test(`${entry.name}`, async ({ app, page }) => {
      await app.open(entry.fixture, entry.route, { authenticated: entry.authenticated })
      await expect(page.locator('[data-app-header]').first()).toBeVisible({ timeout: 30_000 })
      await app.settle()
      await app.check(entry.name)
    })
  }
})
