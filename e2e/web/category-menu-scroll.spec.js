import { expect, test } from '../lib/fixtures.js'

// implementation noteschoosing a category in the bar's "Categories" menu (the ☰) did not do what its tab does. The tab
// scrolls to the section under the fixed bars; the menu filtered the store down to that one category with a
// "Go to all categories" button. Both must go to the section and leave the whole menu in place.
const STORE = '/store/synthetic-market?lat=30.2672&lng=-97.7431&order_type=2'
// The fixture's menu is two short sections, a page that cannot scroll the second one under the bar: four sections of
// six products each, so every category but the first starts out of view and the page can bring it under the bar.
const withLongMenu = (fixture) => {
  const route = fixture.routes.find(({ method, pattern }) => method === 'GET' && pattern.includes('/business/synthetic-market'))
  const product = (id, category) => ({ id, slug: `synthetic-item-${id}`, name: `Synthetic Item ${id}`, description: 'Synthetic fixture item.', price: 5, category_id: category, category: { id: category }, extras: [], inventoried: false, quantity: 100, featured: false, rank: 1, enabled: true })
  route.response.result.categories = ['Bowls', 'Soups', 'Salads', 'Drinks'].map((name, i) => ({
    id: 8311 + i * 10,
    slug: name.toLowerCase(),
    name,
    description: `Synthetic ${name}`,
    rank: i + 1,
    subcategories: [],
    products: Array.from({ length: 6 }, (_, n) => product(9000 + i * 10 + n, 8311 + i * 10))
  }))
}
const sections = (page) => page.locator("[id^='category']:not([id^='category-'])")

test('a category chosen in the Categories menu scrolls to its section, as its tab does', async ({ app, page }) => {
  await app.open('business-menu', STORE, { mutate: withLongMenu })
  const open = page.locator("[data-doc-control='business-category-popover-open']")
  await expect(open).toBeVisible({ timeout: 30_000 })
  await expect(sections(page).first()).toBeAttached()
  const before = { url: page.url(), sections: await sections(page).count() }
  // a category out of view that the page can bring under the bar (the first is in view, the last is too short)
  const tab = page.locator("[data-doc-control='business-category-tab']").nth(1)
  const id = await tab.getAttribute('data-doc-category-id')
  const name = (await tab.innerText()).trim()
  // what the tab brings under the bar: the section's title
  const titleTop = (sectionId) => page.evaluate((key) => {
    const section = document.getElementById(`category${key}`)
    return (section?.querySelector('.category-title') || section)?.getBoundingClientRect().top ?? Infinity
  }, sectionId)
  expect(await titleTop(id), 'the section starts out of view').toBeGreaterThan(page.viewportSize().height)

  await open.click()
  await page.locator("[data-doc-section='business-category-popover']").getByRole('button', { name }).click()
  // the menu is out of the way and the page is where its section is: under the fixed bars
  await expect(page.locator("[data-doc-section='business-category-popover']")).toBeHidden()
  const barBottom = () => page.evaluate(() => document.getElementById('category-lists')?.getBoundingClientRect().bottom)
  const gap = async () => Math.round((await titleTop(id)) - (await barBottom()))
  // just under the fixed bars: not further down (the scroll has not come), not above them (it went too far)
  await expect.poll(gap, 'the section did not come under the categories bar').toBeLessThanOrEqual(48)
  expect(await gap(), 'the section went under the fixed bars').toBeGreaterThanOrEqual(-2)
  await expect(tab).toHaveAttribute('data-doc-active', 'true')
  await expect(page.getByText('Go to all categories'), 'the menu was filtered to one category').toHaveCount(0)
  expect(page.url()).toBe(before.url)
  expect(await sections(page).count(), 'the list is no longer the whole menu').toBe(before.sections)
  // and where the tab takes it from the top of the page, give or take the header's reveal
  const landed = await titleTop(id)
  await page.evaluate(() => window.scrollTo(0, 0))
  await tab.click()
  await expect.poll(() => titleTop(id), 'the menu and the tab land in different places').toBeCloseTo(landed, -1)
})
