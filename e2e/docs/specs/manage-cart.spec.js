import { expect, test } from '@playwright/test'
import { APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('manage-cart.manifest')
const orderOptionsPattern = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const updatePattern = '^/v400/en/docsmarket/carts/update_product$'
const removePattern = '^/v400/en/docsmarket/carts/remove_product$'
const clearPattern = '^/v400/en/docsmarket/carts/clear$'
const addPattern = '^/v400/en/docsmarket/carts/add_product$'
const upsellingPattern = '^/v400/en/docsmarket/carts/synthetic-cart-manage/upselling(?:\\?.*)?$'

const matchingRequests = (log, method, pattern) => log.matched.filter(
  request => request.method === method && request.pattern === pattern
)

const fixtureRoute = (fixture, method, pattern) => fixture.routes.find(
  route => route.method === method && route.pattern === pattern
)

const product = (overrides = {}) => ({
  id: 8421,
  code: 'DOCS-CART-LINE-8421',
  business_id: 8301,
  category_id: 8311,
  name: 'Synthetic Custom Bowl',
  price: 13,
  total: 13,
  quantity: 1,
  balance: 1,
  stock: 20,
  inventoried: false,
  images: '/e2e/docs/assets/synthetic-business-header.svg',
  comment: 'No synthetic utensils',
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {
    'id:8431': { id: 8431, name: 'Fixture greens', selected: true },
    'id:8432': { id: 8432, name: 'Synthetic seeds', selected: false }
  },
  options: {
    'id:8441': {
      id: 8441,
      name: 'Choose a sauce',
      suboptions: {
        'id:8451': { id: 8451, name: 'Synthetic herb sauce', quantity: 1, price: 0, selected: true, position: 'whole' }
      }
    }
  },
  ...overrides
})

const secondProduct = () => product({
  id: 8422,
  code: 'DOCS-CART-LINE-8422',
  name: 'Fixture Citrus Drink',
  price: 4,
  total: 8,
  quantity: 2,
  balance: 2,
  comment: null,
  ingredients: {},
  options: {}
})

const cart = (overrides = {}) => ({
  uuid: 'synthetic-cart-manage',
  business_id: 8301,
  user_id: 9201,
  status: 0,
  type: 2,
  valid: true,
  valid_products: true,
  valid_schedule: true,
  valid_address: true,
  valid_minimum: true,
  valid_maximum: true,
  minimum: 0,
  maximum: 100,
  subtotal: 21,
  subtotal_with_discount: 19,
  discount: 2,
  discount_type: 2,
  discount_rate: 0,
  delivery_price_with_discount: 0,
  driver_tip: 0,
  tax: 0,
  taxes: [],
  fees: [],
  offers: [],
  metafields: [],
  total: 19,
  balance: 19,
  products: [product(), secondProduct()],
  business: {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    vertical: 'food',
    tax_type: 2,
    delivery_time: '00:25',
    pickup_time: '00:15',
    configs: []
  },
  ...overrides
})

const scenarioCarts = id => {
  if (id === 'cart-empty-desktop') return []
  if (id === 'cart-pending-desktop') return [cart({ status: 2 })]
  return [cart()]
}

const setup = async (page, carts = [cart()], { layout, suggestion, configureFixture } = {}) => {
  const fixture = await loadFixture(manifest.fixture)
  if (layout) fixture.firstLoad.theme.values.components = { product_modal: { base: { layout } } }
  if (suggestion) {
    fixtureRoute(fixture, 'GET', upsellingPattern).response.result = [{ ...suggestion, ingredients: [], options: [] }]
    fixtureRoute(fixture, 'POST', addPattern).response.result = cart({ products: [product(), secondProduct(), suggestion] })
  }
  fixtureRoute(fixture, 'GET', orderOptionsPattern).response.result.carts = structuredClone(carts)
  const updated = cart({
    products: [product({ quantity: 2, balance: 2, total: 26 }), secondProduct()],
    subtotal: 34,
    subtotal_with_discount: 32,
    total: 32,
    balance: 32
  })
  fixtureRoute(fixture, 'POST', updatePattern).response.result = updated
  fixtureRoute(fixture, 'POST', removePattern).response.result = cart({ products: [secondProduct()], subtotal: 8, subtotal_with_discount: 6, total: 6, balance: 6 })
  fixtureRoute(fixture, 'POST', clearPattern).response.result = cart({ products: [], subtotal: 0, total: 0, balance: 0 })
  fixtureRoute(fixture, 'PUT', '^/v400/en/docsmarket/carts/synthetic-cart-manage$').response.result = cart({ comment: 'Synthetic cart note' })
  configureFixture?.(fixture)
  const requestLog = createRequestLog()
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)
  await expect.poll(() => matchingRequests(requestLog, 'GET', orderOptionsPattern).length).toBe(1)
  const open = page.locator("[data-doc-control='cart-open']")
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  const content = page.locator("[data-doc-section='cart-content']")
  await expect(content).toBeVisible({ timeout: 30_000 })
  return { fixture, requestLog, content }
}

const assertSafeNetwork = async (page, fixture, requestLog) => {
  await waitForRequestQuiescence(requestLog, manifest.readiness.network)
  assertNoUnknownRequests(requestLog)
  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  assertFixtureRequests(fixture, requestLog)
}

const expectZeroSiblingCartMutations = requestLog => {
  expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
  expect(matchingRequests(requestLog, 'POST', removePattern)).toHaveLength(0)
  expect(matchingRequests(requestLog, 'POST', clearPattern)).toHaveLength(0)
}

test.describe('Manage a cart documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const { fixture, requestLog, content } = await setup(page, scenarioCarts(capture.id))
      if (capture.id === 'cart-item-details-desktop') {
        const row = content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']")
        await row.getByText('Synthetic Custom Bowl', { exact: true }).click()
        await expect(row.getByText('No synthetic utensils', { exact: true })).toBeVisible()
        await expect(row.getByText(/Synthetic herb sauce/)).toBeVisible()
        await expect(row.getByText(/Synthetic seeds/)).toBeVisible()
      }
      if (capture.id === 'cart-empty-desktop') await expect(content).toHaveAttribute('data-doc-state', 'empty')
      if (capture.id === 'cart-pending-desktop') await expect(content.locator("[data-doc-section='cart']")).toHaveAttribute('data-doc-state', 'pending')
      if (capture.id === 'cart-valid-mobile') expect(await page.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
      const section = page.locator(capture.selector)
      await expect(section).toBeVisible()
      await waitForDocumentationReady(page, manifest.readiness, capture.selector, { imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'target' })
      await captureSection({ page, locator: section, filename: capture.file, captureMode: capture.capture_mode })
      expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'POST', removePattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
      expect(matchingRequests(requestLog, 'POST', clearPattern)).toHaveLength(0)
      await assertSafeNetwork(page, fixture, requestLog)
    })
  }

  test('increment sends one exact string-serialized update @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Mutation contract runs once on desktop.')
    const { fixture, requestLog, content } = await setup(page)
    await content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421'] [data-doc-control='cart-product-increment']").click()
    await expect.poll(() => matchingRequests(requestLog, 'POST', updatePattern).length).toBe(1)
    const body = matchingRequests(requestLog, 'POST', updatePattern)[0].body
    expect(Object.keys(body).sort()).toEqual(['business_id', 'product', 'user_id'])
    expect(body).toMatchObject({ business_id: 8301, user_id: 9201 })
    expect(typeof body.product).toBe('string')
    expect(JSON.parse(body.product)).toEqual({ id: 8421, business_id: 8301, code: 'DOCS-CART-LINE-8421', quantity: 2 })
    await expect(content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']").getByText('2', { exact: true })).toBeVisible()
    await expect(content.locator("[data-doc-control='cart-checkout']")).toHaveAccessibleName('Checkout · USD 32.00')
    expectZeroSiblingCartMutations(requestLog)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('delete confirmation takes focus above the drawer and sends one exact remove', async ({ page }) => {
    const { fixture, requestLog, content } = await setup(page)
    const cartDialog = page.getByRole('dialog', { name: 'Your cart', exact: true })
    const remove = content.locator("[data-doc-control='cart-product-delete']")
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Accept', exact: true }) })
    const accept = dialog.getByRole('button', { name: 'Accept', exact: true })
    await expect(cartDialog).toBeVisible()
    await remove.click()
    await accept.click({ trial: true, timeout: 5000 })
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(cartDialog).toBeVisible()
    await expect(remove).toBeFocused()
    expect(matchingRequests(requestLog, 'POST', removePattern)).toHaveLength(0)

    await remove.press('Enter')
    await accept.click()
    await expect(dialog).toBeHidden()
    await expect.poll(() => matchingRequests(requestLog, 'POST', removePattern).length).toBe(1)
    const body = matchingRequests(requestLog, 'POST', removePattern)[0].body
    expect(Object.keys(body).sort()).toEqual(['business_id', 'product', 'user_id'])
    expect(body).toMatchObject({ business_id: 8301, user_id: 9201 })
    expect(typeof body.product).toBe('string')
    expect(JSON.parse(body.product)).toEqual({ id: 8421, code: 'DOCS-CART-LINE-8421', business_id: 8301 })
    await expect(content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']")).toHaveCount(0)
    await expect(content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8422']")).toBeVisible()
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', clearPattern)).toHaveLength(0)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('steps editor takes focus above the cart and updates the line', async ({ page }) => {
    const { fixture, requestLog, content } = await setup(page, [cart()], { layout: 'steps' })
    const row = content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']")
    const edit = row.locator("[data-doc-control='cart-product-edit']").filter({ visible: true })
    const editor = page.locator("[data-doc-section='product-edit-dialog'][data-slot='sheet-content']")
    const update = editor.locator("[data-doc-control='add-product-to-cart']")
    await edit.click()
    await update.click({ trial: true })
    await expect.poll(() => editor.evaluate(panel => panel.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
    await expect.poll(() => editor.evaluate(panel => panel.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(editor).toBeHidden()
    await expect(edit).toBeFocused()
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)

    await edit.press('Enter')
    await update.click()
    await expect(editor).toBeHidden()
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(1)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('steps editor lets the cart add a suggested product', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The nested drawer is covered on desktop.')
    const suggestion = product({ id: 8423, code: 'DOCS-SUGGESTION-8423', name: 'Synthetic Dessert', price: 5, total: 5, ingredients: {}, options: {}, upselling: true })
    const { fixture, requestLog, content } = await setup(page, [cart()], { layout: 'steps', suggestion })
    await content.getByRole('button', { name: 'Add', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Synthetic Dessert', exact: true })
    await expect(editor).toHaveAttribute('data-slot', 'sheet-content')
    await editor.locator("[data-doc-control='add-product-to-cart']").click()
    await expect(editor).toBeHidden()
    await expect(content.getByText('Synthetic Dessert', { exact: true })).toBeVisible()
    expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(1)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('checkout hands off the valid cart without a cart mutation @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Handoff contract runs once on desktop.')
    const { fixture, requestLog, content } = await setup(page)
    fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').assert.maxCount = 3
    fixtureRoute(fixture, 'GET', '^/v400/en/docsmarket/business/8301(?:\\?.*)?$').assert.maxCount = 3
    await content.locator("[data-doc-control='cart-checkout']").click()
    await expect(page).toHaveURL(/\/checkout\/synthetic-cart-manage$/)
    await assertSafeNetwork(page, fixture, requestLog)
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', removePattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', clearPattern)).toHaveLength(0)
    expect([...requestLog.matched.map(({ method, url }) => `${method} ${url}`), ...requestLog.unknown].filter(entry => /\/(?:orders?|place|confirm)(?:\/|$)/.test(entry))).toHaveLength(0)
  })

  test('pending cart displays quantities without exposing quantity mutations @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Pending blocker is asserted once on desktop.')
    const { fixture, requestLog, content } = await setup(page, [cart({ status: 2 })])
    await expect(content.locator("[data-doc-section='cart']")).toHaveAttribute('data-doc-state', 'pending')
    const row = content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']")
    await expect(row.getByText('1', { exact: true })).toBeVisible()
    await expect(row.locator("[data-doc-control='cart-product-increment'], [data-doc-control='cart-product-decrement'], [data-doc-control='cart-product-delete']")).toHaveCount(0)
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
    expectZeroSiblingCartMutations(requestLog)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('invalid products remain visible for removal and block checkout @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Invalid-cart boundary is asserted once on desktop.')
    const { fixture, requestLog, content } = await setup(page, [cart({
      valid: false,
      valid_products: false,
      products: [product({ valid: false, valid_menu: false })]
    })])
    await expect(content).toHaveAttribute('data-doc-state', 'populated')
    await expect(content.locator("[data-doc-section='cart']")).toHaveAttribute('data-doc-state', 'invalid-products')
    const row = content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421']")
    await expect(row.getByText('Not available', { exact: true })).toBeVisible()
    await expect(row.getByRole('button', { name: 'Remove' })).toBeEnabled()
    await expect(content.locator("[data-doc-control='cart-checkout']")).toBeDisabled()
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
    expectZeroSiblingCartMutations(requestLog)
    await assertSafeNetwork(page, fixture, requestLog)
  })

  test('edit opens the current cart product and sends one exact update @desktop-chromium', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Edit contract runs once on desktop.')
    const { fixture, requestLog, content } = await setup(page)
    fixtureRoute(fixture, 'POST', updatePattern).response.result = cart()
    await content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421'] [data-doc-control='cart-product-edit-image']").click()
    const dialog = page.locator("[data-doc-section='product-edit-dialog']")
    await expect(dialog).toBeVisible()
    const form = dialog.locator("[data-doc-section='product-customization']")
    await expect(form).toHaveAttribute('data-doc-mode', 'edit')
    const update = form.locator("[data-doc-control='add-product-to-cart']")
    await expect(update).toContainText('Update')
    await expect(update).toBeEnabled()
    await update.click()
    await expect.poll(() => matchingRequests(requestLog, 'POST', updatePattern).length).toBe(1)
    const body = matchingRequests(requestLog, 'POST', updatePattern)[0].body
    expect(Object.keys(body).sort()).toEqual(['business_id', 'product', 'user_id'])
    expect(body).toMatchObject({ business_id: 8301, user_id: 9201 })
    expect(typeof body.product).toBe('string')
    expect(JSON.parse(body.product)).toEqual({
      id: 8421,
      code: 'DOCS-CART-LINE-8421',
      business_id: 8301,
      category_id: 8311,
      name: 'Synthetic Custom Bowl',
      price: 13,
      total: 13,
      quantity: 1,
      balance: 1,
      stock: 4,
      inventoried: false,
      images: '/e2e/docs/assets/synthetic-business-header.svg',
      comment: 'No synthetic utensils',
      valid: true,
      valid_menu: true,
      valid_quantity: true,
      ingredients: {
        'id:8431': { id: 8431, name: 'Fixture greens', selected: true },
        'id:8432': { id: 8432, name: 'Synthetic seeds', selected: false }
      },
      options: {
        'id:8441': {
          id: 8441,
          name: 'Choose a sauce',
          suboptions: {
            'id:8451': { id: 8451, name: 'Synthetic herb sauce', position: 'whole', price: 0, quantity: 1, selected: true, total: 0 }
          },
          balance: 1
        }
      },
      businessId: 8301,
      categoryId: 8311,
      unitTotal: 13
    })
    await expect(content.locator("[data-doc-section='cart-product']").getByText('1', { exact: true })).toBeVisible()
    expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', removePattern)).toHaveLength(0)
    expect(matchingRequests(requestLog, 'POST', clearPattern)).toHaveLength(0)
    await assertSafeNetwork(page, fixture, requestLog)
  })
})

const editLine = async (page, content) => {
  const opener = content.locator("[data-doc-section='cart-product-row'][data-doc-product-id='8421'] [data-doc-control='cart-product-edit-image']")
  await opener.click()
  const dialog = page.locator("[data-doc-section='product-edit-dialog']")
  await expect(dialog).toBeVisible()
  const form = dialog.locator("[data-doc-section='product-customization']")
  await expect(form).toHaveAttribute('data-doc-mode', 'edit')
  return { opener, dialog, form, update: form.locator("[data-doc-control='add-product-to-cart']") }
}

const setupExcess = async (page, { layout = 'card', missingSauce = false } = {}) => {
  const toppings = [8461, 8462, 8463, 8464].map((id, index) => ({
    id, name: `Synthetic topping ${index + 1}`, quantity: 1, price: 0, selected: true, position: 'whole'
  }))
  const savedOptions = missingSauce ? {} : product().options
  const line = product({
    options: {
      ...savedOptions,
      'id:8442': {
        id: 8442,
        name: 'Add toppings',
        balance: 4,
        suboptions: Object.fromEntries(toppings.map(item => [`id:${item.id}`, item]))
      }
    }
  })
  return setup(page, [cart({ products: [line] })], {
    layout,
    configureFixture: (fixture) => {
      const editProduct = fixture.routes.find(route => route.method === 'GET' && route.pattern.includes('synthetic-custom-bowl')).response.result
      const option = editProduct.extras[0].options.find(item => item.id === 8442)
      Object.assign(option, { min: 1, max: 2, suboptions: toppings.map((item, rank) => ({ ...item, rank, enabled: true, max: 1 })) })
    }
  })
}

test('R2-01: an edited cart line can remove two extras before sending one update @desktop-chromium', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  const { content, requestLog } = await setupExcess(page)
  const { form, update } = await editLine(page, content)
  const choice = id => form.locator(`[data-doc-suboption-id="${id}"]`)
  for (const id of [8464, 8463]) {
    await update.click()
    expect(matchingRequests(requestLog, 'POST', updatePattern)).toHaveLength(0)
    await expect(choice(id)).toHaveAttribute('data-doc-selected', 'true')
    await choice(id).click()
    await expect(choice(id)).toHaveAttribute('data-doc-selected', 'false', { timeout: 2500 })
  }
  await update.click()
  await expect.poll(() => matchingRequests(requestLog, 'POST', updatePattern).length).toBe(1)
  const [request] = matchingRequests(requestLog, 'POST', updatePattern)
  const edited = JSON.parse(request.body.product)
  expect(edited.code).toBe('DOCS-CART-LINE-8421')
  expect(Object.keys(edited.options['id:8442'].suboptions).sort()).toEqual(['id:8461', 'id:8462'])
  expect(matchingRequests(requestLog, 'POST', addPattern)).toHaveLength(0)
})

for (const layout of ['sheet', 'steps']) {
  test(`R2-02: ${layout} distinguishes missing choices and excess in an edited line @desktop-chromium`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium')
    const { content } = await setupExcess(page, { layout, missingSauce: true })
    const { form, update } = await editLine(page, content)
    await expect(form).toHaveAttribute('data-doc-layout', layout)
    await update.click()
    await expect(form.locator('[data-doc-section=product-missing-choices]')).toHaveText('Still to choose: Choose a sauce')
    if (layout === 'sheet') {
      await expect(form.getByRole('button', { name: /Choose a sauce.*Required/ })).toHaveAttribute('data-status', 'missing')
      const excess = form.getByRole('button', { name: /Add toppings.*Max\. 2/ })
      await expect(excess).toBeVisible({ timeout: 2000 })
      await expect(excess).not.toHaveAttribute('data-status', 'missing')
    } else {
      await expect(form.locator('#id_8441 [data-doc-step-state]')).toHaveAttribute('data-doc-step-state', 'pending')
      const excess = form.locator('#id_8442 [data-doc-step-state]')
      await expect(excess).toHaveAttribute('data-doc-step-state', 'excess', { timeout: 2000 })
      await expect(excess).toContainText('Max. 2')
      await expect(excess).not.toContainText('Required')
    }
  })
}
