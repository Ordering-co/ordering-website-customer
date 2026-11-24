import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues, renderWith, cssFor } from '~ui/src/styles/__tests__/themeTestUtils'
import { Container, WrapperLeftContainer, MobileWrapperPlaceOrderButton, PendingCartNoticeContent, SummaryAccordionContent } from '../styles'
import { fireEvent } from '@testing-library/react'
import { getThemeCss } from '~/utils/themeCss'
import { TipChips } from '../../DriverTips/styles'
import { Checkout } from '../index'
import {
  checkoutButtonProps,
  checkoutColumnCss,
  checkoutGridColumns,
  checkoutRequiredVariant,
  checkoutSectionTitleCss,
  driverTipsGap,
  driverTipsSubtitleCss,
  sectionItems
} from '../checkoutTheme'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

// /checkout with the sections of pages.checkout: the theme orders and hides
// them, and the order's needs win over the theme.
const mocks = vi.hoisted(() => {
  const noop = () => {}
  return {
    businessDetails: null,
    orderState: { loading: false, options: { type: 2 }, carts: {} },
    orderActions: { confirmCart: noop },
    sessionState: { user: { id: 1, name: 'Customer' }, loading: false, auth: true, token: 'tok' },
    sessionActions: { login: noop },
    configState: { configs: {} },
    customerState: { user: null },
    events: { on: noop, off: noop, emit: noop },
    validationFields: { fields: {} },
    controllerProps: {}
  }
})

const baseControllerProps = {
  paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 },
  handlePaymethodChange: () => {},
  handlerClickPlaceOrder: () => {},
  handleOrderRedirect: () => {},
  placing: false,
  checkoutFieldsState: { loading: false, fields: [] },
  loyaltyPlansState: { result: [] },
  instructionsOptions: { result: [] },
  deliveryOptionSelected: undefined,
  cardList: { cards: [] }
}

const baseCart = {
  uuid: 'cart-1',
  status: 0,
  valid: true,
  valid_products: true,
  valid_address: true,
  valid_maximum: true,
  valid_minimum: true,
  business_id: 1,
  business: { id: 1, name: 'Demo Store', slug: 'demo-store', logo: 'https://example.test/logo.png' },
  products: [{ id: 10, name: 'Burger', code: 'BRG-1', price: 9.5 }],
  total: 9.5,
  subtotal: 9.5,
  balance: 9.5
}

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => null }))
vi.mock('~ui/src/components/CartContent', () => ({ CartContent: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null, Confirm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressDetails', () => ({ AddressDetails: () => <div data-doc-section='address' /> }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => <div data-testid='user-details' /> }))
vi.mock('~ui/src/components/PaymentOptions', () => ({ PaymentOptions: () => null }))
vi.mock('~ui/src/components/PaymentOptionWallet', () => ({ PaymentOptionWallet: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => <div data-testid='driver-tips' /> }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/PlaceSpot', () => ({ PlaceSpot: () => null }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: () => null }))
vi.mock('../OrderDetail', () => ({ OrderDetail: () => null }))
vi.mock('../../RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../../CheckoutStudentDetails', () => ({ CheckoutStudentDetails: () => <div data-testid='student' /> }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [mocks.orderState, mocks.orderActions]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.sessionState, mocks.sessionActions]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [mocks.configState]
}))
vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [mocks.customerState]
}))
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [mocks.events]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [mocks.validationFields]
}))
vi.mock('~components/components/Checkout', () => ({
  Checkout: ({ UIComponent, cartState, uuid, ...rest }) => (
    <UIComponent
      cart={cartState?.cart}
      cartState={cartState}
      businessDetails={mocks.businessDetails}
      {...mocks.controllerProps}
      {...rest}
    />
  )
}))

const noop = () => {}

const renderCheckout = (theme, { cart = baseCart, business = baseCart.business, type = 2, controllerProps = {}, configs = {} } = {}) => {
  mocks.orderState = { loading: false, options: { type }, carts: { 'businessId:1': cart } }
  mocks.businessDetails = { business, loading: false, error: null }
  mocks.controllerProps = { ...baseControllerProps, ...controllerProps }
  mocks.configState = { configs }
  return renderWithProviders(
    <Checkout cartUuid={cart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />,
    { theme }
  )
}

// A complete theme whose /checkout has these sections (key → visible)
const themedWithSections = (sections, mutate = (values) => values) => themeWithValues((values) => mutate({
  ...values,
  pages: { ...values.pages, checkout: { ...values.pages.checkout, sections } }
}))

describe('sectionItems', () => {
  const sections = [
    { key: 'a', group: 'main', visible: true },
    { key: 'b', group: 'main', visible: false },
    { key: 'c', group: 'main', visible: true },
    { key: 'd', group: 'side', visible: true }
  ]
  const renderers = { a: () => 'A', b: () => 'B', c: () => null, d: () => 'D' }

  it('paints the visible sections of the group in order, a forced one too', () => {
    expect(sectionItems(sections, 'main', renderers).map((item) => item.key)).toEqual(['a'])
    expect(sectionItems(sections, 'main', renderers, { forced: { b: true } }).map((item) => item.key)).toEqual(['a', 'b'])
    expect(sectionItems(sections, 'side', renderers).map((item) => item.key)).toEqual(['d'])
  })

  it('passes each renderer its visibility (a forced section knows the theme hides it)', () => {
    const seen = []
    sectionItems(sections, 'main', { b: (visible) => seen.push(visible) && 'B' }, { forced: { b: true } })
    expect(seen).toEqual([false])
  })

  it('keeps the dividers where the sections put them; tidy puts one between every two painted sections', () => {
    const dividers = { a: true, c: true }
    // c paints nothing: its divider stays (as today) without tidy
    expect(sectionItems(sections, 'main', renderers, { dividers }).map((item) => item.key)).toEqual(['a', 'a-divider', 'c-divider'])
    expect(sectionItems(sections, 'main', renderers, { dividers, tidy: true }).map((item) => item.key)).toEqual(['a'])
    const all = [
      { key: 'x', group: 'g', visible: true },
      { key: 'y', group: 'g', visible: true },
      { key: 'z', group: 'g', visible: true }
    ]
    const nodes = { x: () => null, y: () => 'Y', z: () => 'Z' }
    expect(sectionItems(all, 'g', nodes, { dividers: { x: true, y: true }, tidy: true }).map((item) => item.key)).toEqual(['y', 'z-divider', 'z'])
    // tidy ignores where the sections put them: one between each pair
    expect(sectionItems(all, 'g', { x: () => 'X', y: () => 'Y', z: () => 'Z' }, { tidy: true }).map((item) => item.key)).toEqual(['x', 'y-divider', 'y', 'z-divider', 'z'])
  })
})

describe('Checkout sections (pages.checkout)', () => {
  beforeEach(() => {
    window.scrollTo = noop
    window.localStorage.removeItem('user-customer')
  })

  // implementation notes round 4 (proposal B): the theme's own `group`/`order` for
  // pages.checkout.sections stopped deciding column/placement — the layout
  // is fixed (see the comment on Container in styles.js for the exact list
  // of what else stopped applying). `visible` is still read exactly the
  // same way (sectionVisible, Checkout/index.js) — rewritten to assert that
  // instead of the old order.
  it('round 4: visibility still applies (business/customer/payment_methods); the theme\'s order/group no longer decide placement', async () => {
    const theme = themedWithSections([
      { key: 'business', visible: false },
      { key: 'customer', visible: true },
      { key: 'order_summary', visible: true },
      { key: 'totals', visible: true },
      { key: 'payment_methods', visible: false }
    ])
    const { findByRole, container } = renderCheckout(theme)
    await findByRole('heading', { level: 1, name: 'Checkout' })
    // payment_methods: hideable: false (product.schema.json) — still shows
    expect(container.querySelector('[data-doc-section="checkout-payment-section"]')).not.toBeNull()
    // business: visible: false — the context card paints nothing for it
    // (this is a pickup order: the context card shows business, not address)
    expect(container.querySelector('[data-doc-section="checkout-business-details"]')).toBeNull()
    expect(container.querySelector('[data-doc-section="checkout-customer-details"]')).not.toBeNull()
    expect(container.querySelector('[data-doc-section="checkout-order-summary"]')).not.toBeNull()
    expect(container.querySelector('[data-doc-section="checkout-totals"]')).not.toBeNull()
  })

  it('round 4: a fixed zone order on the left (progress, context, step 1, step 2) and the summary card on the right, whatever the theme\'s own order says', async () => {
    const theme = themedWithSections([
      { key: 'delivery_instructions', visible: true },
      { key: 'business', visible: true },
      { key: 'customer', visible: true },
      { key: 'address', visible: true },
      { key: 'order_summary', visible: true },
      { key: 'totals', visible: true },
      { key: 'payment_methods', visible: true }
    ])
    const { findByRole, container } = renderCheckout(theme)
    await findByRole('heading', { level: 1, name: 'Checkout' })
    const left = container.querySelector('[data-doc-section="checkout-details"]')
    const right = container.querySelector('[data-doc-section="checkout-review-and-submit"]')
    const progress = left.querySelector('[data-doc-section="checkout-progress"]')
    const context = left.querySelector('[data-doc-section="checkout-context"]')
    const step1 = left.querySelector('[data-doc-section="checkout-step-details"]')
    const step2 = left.querySelector('[data-doc-section="checkout-step-payment"]')
    const zones = [progress, context, step1, step2]
    zones.forEach((node) => expect(node).not.toBeNull())
    for (let i = 1; i < zones.length; i++) {
      // eslint-disable-next-line no-bitwise
      expect(zones[i - 1].compareDocumentPosition(zones[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    // each piece lives inside its fixed zone, not wherever the theme put it
    expect(context.querySelector('[data-doc-section="checkout-business-details"]')).not.toBeNull()
    expect(step1.querySelector('[data-doc-section="checkout-customer-details"]')).not.toBeNull()
    expect(step2.querySelector('[data-doc-section="checkout-payment-section"]')).not.toBeNull()
    expect(right.querySelector('[data-doc-section="checkout-order-summary"]')).not.toBeNull()
    expect(right.querySelector('[data-doc-section="checkout-totals"]')).not.toBeNull()
  })

  // implementation notesB fixes each zone, but inside a zone the theme's order
  // still applies (inThemeOrder, Checkout/index.js)
  // (the theme reorders within a group: business and order_summary are both
  // "main", so the store row can follow the products)
  it("inside the summary the theme's order applies: the products moved above the business paint above the store row", async () => {
    const storeRowFirst = async (sections) => {
      const { findByRole, container, unmount } = renderCheckout(themedWithSections(sections))
      await findByRole('heading', { level: 1, name: 'Checkout' })
      const right = container.querySelector('[data-doc-section="checkout-review-and-submit"]')
      const products = right.querySelector('[data-doc-section="checkout-order-summary"]')
      const store = right.querySelector('.store-strip-text')
      // eslint-disable-next-line no-bitwise
      const first = !!(store.compareDocumentPosition(products) & Node.DOCUMENT_POSITION_FOLLOWING)
      unmount()
      return first
    }
    expect(await storeRowFirst([{ key: 'business', visible: true }, { key: 'order_summary', visible: true }])).toBe(true)
    expect(await storeRowFirst([{ key: 'order_summary', visible: true }, { key: 'business', visible: true }])).toBe(false)
  })

  it('a school order shows its student with the customer hidden by the theme', async () => {
    const theme = themedWithSections([{ key: 'customer', visible: false }])
    const school = { ...baseCart.business, vertical: 'school' }
    const { findByTestId, queryByTestId } = renderCheckout(theme, { business: school })
    expect(await findByTestId('student')).toBeTruthy()
    expect(queryByTestId('user-details')).toBeNull()
  })

  it('a required driver tip shows its section with driver_tips hidden by the theme; the subtitle follows visibility', async () => {
    const tipField = { order_type_id: 1, enabled: true, required: true, validation_field: { code: 'driver_tip' } }
    const options = {
      type: 1,
      controllerProps: { checkoutFieldsState: { loading: false, fields: [tipField] } },
      configs: { driver_tip_options: { value: [5, 10] } }
    }
    const hidden = themedWithSections([{ key: 'driver_tips', visible: false }])
    const first = renderCheckout(hidden, options)
    expect(await first.findByTestId('driver-tips')).toBeTruthy()
    expect(first.getByText('100% of the tip goes to your driver')).toBeTruthy()
    first.unmount()

    const optional = renderCheckout(hidden, { ...options, controllerProps: { checkoutFieldsState: { loading: false, fields: [{ ...tipField, required: false }] } } })
    await optional.findByRole('heading', { level: 1, name: 'Checkout' })
    expect(optional.queryByTestId('driver-tips')).toBeNull()
    optional.unmount()

    const noSubtitle = themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'checkout.driver_tips.subtitle': false } }))
    const third = renderCheckout(noSubtitle, options)
    expect(await third.findByTestId('driver-tips')).toBeTruthy()
    expect(third.queryByText('100% of the tip goes to your driver')).toBeNull()
  })
})

describe('components.checkout and components.driver_tips', () => {
  const themed = themeWithValues()

  it("proposal B's grid: main_width splits the columns and the summary never goes under 340px", () => {
    expect(checkoutGridColumns(themed)).toBe('minmax(0, 52fr) minmax(340px, 48fr)')
    const wide = themeWithValues((values) => ({ ...values, components: { ...values.components, checkout: { ...values.components.checkout, base: { ...values.components.checkout.base, main_width: 70 } } } }))
    expect(checkoutGridColumns(wide)).toBe('minmax(0, 70fr) minmax(340px, 30fr)')
  })

  it('the columns: main_width and the padding, the multi variant its own share', () => {
    expect(checkoutColumnCss(themed, 'main')).toContain('width: 52%;')
    expect(checkoutColumnCss(themed, 'side')).toContain('width: 48%;')
    expect(checkoutColumnCss(themed, 'main')).toContain('padding: 32px 48px;')
    expect(checkoutColumnCss(themed, 'main', { multi: true })).toContain('width: 55%;')
    const wide = themeWithValues((values) => ({ ...values, components: { ...values.components, checkout: { ...values.components.checkout, base: { ...values.components.checkout.base, main_width: 60 } } } }))
    expect(checkoutColumnCss(wide, 'side')).toContain('width: 40%;')
  })

  it('the titles: the page title from section_header.variants.page (h1, no space of its own), h4 for a section (h3 on the multi-checkout)', () => {
    expect(sectionTitleCss(themed, { level: 'h1', spaced: false })).toContain('font-size: 32px;')
    expect(sectionTitleCss(themed, { level: 'h1', spaced: false })).not.toContain('margin-bottom')
    expect(checkoutSectionTitleCss(themed)).toContain('font-size: 18px;')
    expect(checkoutSectionTitleCss(themed, { multi: true })).toContain('font-size: 20px;')
  })

  it('the slots: place order lg (md on the bar), "Change" secondary, "Required" its flag', () => {
    expect(checkoutButtonProps(themed, 'place_order')).toEqual({ $size: 'lg', $color: 'primary', $appearance: 'solid' })
    expect(checkoutButtonProps(themed, 'place_order_mobile')).toMatchObject({ $size: 'md' })
    expect(checkoutButtonProps(themed, 'payment_change')).toMatchObject({ $color: 'secondary' })
    expect(checkoutRequiredVariant(themed)).toBeNull()
    const badge = themeWithValues((values) => ({ ...values, components: { ...values.components, checkout: { ...values.components.checkout, slots: { ...values.components.checkout.slots, required: { component: 'badge', variant: 'danger' } } } } }))
    expect(checkoutRequiredVariant(badge)).toBe('danger')
  })

  it('driver tips: the gap between the amounts and the subtitle (body_lg on the multi-checkout)', () => {
    expect(driverTipsGap(themed)).toBe('8px')
    expect(driverTipsSubtitleCss(themed)).toContain('font-size: 14px;')
    expect(driverTipsSubtitleCss(themed, { multi: true })).toContain('font-size: 16px;')
  })
})

describe('the checkout styles read components.checkout / driver_tips only in a complete theme', () => {
  it('the main column, the mobile bar and the gap of the amounts', () => {
    const themed = themeWithValues()
    const { container } = renderWith(themed, (
      <>
        <WrapperLeftContainer data-testid='left' />
        <MobileWrapperPlaceOrderButton data-testid='bar' />
        <TipChips data-testid='chips' />
      </>
    ))
    expect(cssFor(container.querySelector('[data-testid="left"]'))).toContain('padding:32px 48px')
    expect(cssFor(container.querySelector('[data-testid="bar"]'))).toContain('padding:16px 24px')
    expect(cssFor(container.querySelector('[data-testid="chips"]'))).toContain('gap:8px')
  })
})

describe('Checkout spacing between sections (complete theme)', () => {
  beforeEach(() => {
    window.scrollTo = noop
    window.localStorage.removeItem('user-customer')
  })

  // round 4: there is no divider between sections any more (they are
  // distinct cards now) — rewritten to check the title's and the step
  // cards' own margin-top still read section_gap, instead of a divider's.
  it('the title and the step cards take section_gap for their own vertical rhythm', async () => {
    const theme = themedWithSections([
      { key: 'customer', visible: true },
      { key: 'business', visible: true }
    ], (values) => {
      values.components.checkout.base.section_gap = 32
      return values
    })
    const { findByRole, container } = renderCheckout(theme)
    const title = await findByRole('heading', { level: 1, name: 'Checkout' })
    expect(cssFor(title.parentElement)).toContain('margin-bottom:32px')
    const step1 = container.querySelector('[data-doc-section="checkout-step-details"]')
    expect(cssFor(step1)).toContain('margin-top:32px')
    // round 5: the product lines are rows of the summary card, not an
    // accordion box of their own (no "Summary" toggle)
    const summary = container.querySelector('[data-doc-section="checkout-order-summary"]')
    expect(summary.closest('[data-doc-section="checkout-summary"]')).not.toBeNull()
    expect(summary.querySelector('[aria-expanded]')).toBeNull()
  })

  it('the detail sections take checkout.section_title, an h2 of the page', async () => {
    const theme = themedWithSections([], (values) => {
      values.components.checkout.base.section_title = { size: 22, line: 1.36, weight: 700 }
      return values
    })
    const { findByRole } = renderCheckout(theme)
    const title = await findByRole('heading', { level: 1, name: 'Checkout' })
    expect(cssFor(title.parentElement)).toMatch(/h2[^{]*\{[^}]*font-size:22px/)
  })
})

// implementation notesthe special instructions are the base Choice as actions (a group, not radios)
describe('Checkout: the delivery instructions', () => {
  const instructions = { result: [{ id: 1, name: 'Leave at door', enabled: true }, { id: 2, name: 'Call me', enabled: true }, { id: 3, name: 'Off', enabled: false }] }
  const renderInstructions = (handleChangeDeliveryOption, extra = {}) => renderCheckout(
    themedWithSections([{ key: 'delivery_instructions', visible: true }]),
    { type: 1, controllerProps: { instructionsOptions: instructions, deliveryOptionSelected: 1, handleChangeDeliveryOption, ...extra } }
  )

  it('each enabled option is a pressed-state button of a named group; pressing the current one sends it again', async () => {
    const onChange = vi.fn()
    const { findByRole, getByRole } = renderInstructions(onChange)
    const group = await findByRole('group', { name: 'Special Instructions' })
    const current = getByRole('button', { name: 'Leave at door' })
    const other = getByRole('button', { name: 'Call me' })
    expect(group).toContainElement(current)
    expect(group.querySelectorAll('[data-slot="choice"]')).toHaveLength(2)
    expect(current).toHaveAttribute('aria-pressed', 'true')
    expect(other).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(current)
    fireEvent.click(other)
    expect(onChange.mock.calls).toEqual([[1], [2]])
  })
})

// implementation notesmeasures as fluid units (no fixed px), the screen less the header
describe('Checkout: fluid measures', () => {
  it('the page keeps the screen less the header as its minimum height on wide screens', () => {
    const theme = themeWithValues()
    const el = renderWith(theme, <Container data-testid='page' />).getByTestId('page')
    // the fallback is the header's own height in the store's theme
    expect(cssFor(el)).toContain(`min-height:calc(100dvh - 5 * var(--header-height,${getThemeCss(theme, 'header').base.height}))`)
    expect(cssFor(el)).not.toContain('337px')
  })

  it('the pending notice paragraphs keep their side room in ch, the accordion its animation cap in em', () => {
    const theme = themeWithValues()
    const notice = renderWith(theme, <PendingCartNoticeContent data-testid='notice' />).getByTestId('notice')
    expect(cssFor(notice).replace(/\s+/g, '')).toContain('margin:07.5ch')
    const content = renderWith(theme, <SummaryAccordionContent active data-testid='acc' />).getByTestId('acc')
    expect(cssFor(content)).toContain('max-height:80em')
  })
})
