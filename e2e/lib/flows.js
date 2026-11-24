import { expect } from '@playwright/test'
import { loadFixture } from '../docs/lib/fixtures.js'

// Steps shared by several specs. They drive the real UI through the data-doc-* hooks the docs suite already uses.

export const ADDRESS_FIXTURE = 'addresses'
export const ADDRESS_ROUTE = '/profile/addresses'
export const SYNTHETIC_ADDRESS = '100 Synthetic Market Street, Test City, TX 78701'
export const ADDRESS_POST = /\/users\/\d+\/addresses$/

// The `addresses` fixture answers the geocoder with no suggestions; borrow the ones of choose-location-order-type.
export const withAddressSuggestions = async (fixture) => {
  const donor = await loadFixture('choose-location-order-type')
  fixture.routes.unshift(...donor.routes.filter(({ pattern }) => pattern.includes('/searchbox/v1/')))
}

// "My addresses" → Add address → type → pick the suggestion. Leaves the form open and ready to save.
export const openAddressFormWithSuggestion = async (page) => {
  await page.locator("[data-doc-section='address-list'] [data-doc-control='address-add']").click()
  const form = page.locator("[data-doc-section='address-form']")
  await expect(form).toHaveAttribute('data-doc-state', 'ready')
  await form.locator("[data-doc-control='address-search'] input").fill('100 Synthetic Market Street')
  await expect(form.getByText(SYNTHETIC_ADDRESS)).toBeVisible()
  await form.getByText(SYNTHETIC_ADDRESS).click()
  await expect(page.locator("[data-doc-control='address-save']")).toBeEnabled()
  return form
}

// ── Header pages ────────────────────────────────────────────────────────────────────────────────────────────────
// The entries QA measured the header on (the cart shows without a session since implementation notes). `withCart` puts one synthetic cart in the order options so the cart button
// shows its count.
const ORDER_OPTIONS = '^/v400/en/docsmarket/order_options(?:\\?.*)?$'
const orderOptionsRoute = (fixture) => fixture.routes.find(({ method, pattern }) => method === 'GET' && pattern === ORDER_OPTIONS)

const syntheticProduct = (id, name, price, quantity) => ({
  id,
  code: `E2E-CART-LINE-${id}`,
  business_id: 8301,
  category_id: 8311,
  name,
  price,
  total: price * quantity,
  quantity,
  balance: quantity,
  stock: 20,
  inventoried: false,
  images: '/e2e/docs/assets/synthetic-business-header.svg',
  comment: null,
  valid: true,
  valid_menu: true,
  valid_quantity: true,
  ingredients: {},
  options: {}
})

export const syntheticCart = () => ({
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
  products: [syntheticProduct(8421, 'Synthetic Custom Bowl', 13, 1), syntheticProduct(8422, 'Fixture Citrus Drink', 4, 2)],
  business: { id: 8301, slug: 'synthetic-market', name: 'Synthetic Market Kitchen', vertical: 'food', tax_type: 2, delivery_time: '00:25', pickup_time: '00:15', configs: [] }
})

export const withCart = (fixture) => {
  const route = orderOptionsRoute(fixture)
  if (route) route.response.result.carts = [syntheticCart()]
}

export const LONG_ADDRESS = '12345 Synthetic Odyssey Boulevard, Building 7, Suite 1200, Fixture Heights, Test City, TX 78701, United States'
export const withLongAddress = (fixture) => {
  const route = orderOptionsRoute(fixture)
  if (route) route.response.result.address.address = LONG_ADDRESS
  withCart(fixture)
}

export const BROWSE = '/search?lat=30.2672&lng=-97.7431&order_type=1'
export const HEADER_PAGES = [
  { name: 'home', fixture: 'browse-businesses', route: BROWSE, authenticated: false, noCount: true },
  { name: 'store', fixture: 'manage-cart', route: '/store/synthetic-market', authenticated: true },
  { name: 'favorites', fixture: 'favorites', route: '/favorite', authenticated: true },
  { name: 'profile', fixture: 'profile', route: '/profile?view=account', authenticated: true },
  { name: 'checkout', fixture: 'complete-checkout', route: '/checkout/synthetic-cart-checkout', authenticated: true }
]

// ── Guest checkout ──────────────────────────────────────────────────────────────────────────────────────────────
// The checkout of `complete-checkout` for a guest (no name, email or phone yet) whose store asks for name, last name,
// email and phone: "Your details" opens as the inline form. A mutation of the fixture, for the specs that need the form.
export const GUEST_CHECKOUT_ROUTE = '/checkout/synthetic-cart-checkout'
export const withGuestCheckout = (fixture) => {
  const route = (method, pattern) => fixture.routes.find((entry) => entry.method === method && entry.pattern === pattern)
  const cart = {
    ...syntheticCart(),
    uuid: 'synthetic-cart-checkout',
    valid_preorder: true,
    paymethod_id: null,
    paymethod_data: {},
    business: { id: 8301, slug: 'synthetic-market', name: 'Synthetic Market Kitchen', address: '200 Synthetic Checkout Avenue', location: { lat: 30.2672, lng: -97.7431 }, vertical: 'food', tax_type: 2, pickup_time: '00:15', configs: [] }
  }
  route('GET', ORDER_OPTIONS).response.result = {
    user_id: 9201,
    type: 2,
    moment: null,
    address: { id: 9211, address: '100 Synthetic Market Street', location: { lat: 30.2672, lng: -97.7431 } },
    carts: [cart]
  }
  route('POST', '^/v400/en/docsmarket/carts/change_paymethod$').response.result = structuredClone(cart)
  route('GET', '^/v400/en/docsmarket/business/8301(?:\\?.*)?$').response.result = {
    id: 8301,
    slug: 'synthetic-market',
    name: 'Synthetic Market Kitchen',
    address: '200 Synthetic Checkout Avenue',
    paymethods: [{ paymethod_id: 1, sandbox: true, data: {}, paymethod: { id: 1, name: 'Cash', gateway: 'cash', enabled: true } }],
    configs: [],
    schedule: [],
    today: null,
    vertical: 'food'
  }
  const field = (id, code, name, type) => ({ id, order_type_id: 2, enabled: true, required: false, required_with_guest: true, validation_field: { id, code, name, type, enabled: true, required: false } })
  route('GET', '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$').response.result = [
    field(1, 'name', 'Name', 'text'), field(2, 'lastname', 'Last name', 'text'), field(3, 'email', 'Email', 'email'), field(4, 'mobile_phone', 'Mobile phone', 'text')
  ]
  Object.assign(fixture.authSession.user, { guest_id: 4242, name: '', lastname: '', email: '', cellphone: '' })
}
