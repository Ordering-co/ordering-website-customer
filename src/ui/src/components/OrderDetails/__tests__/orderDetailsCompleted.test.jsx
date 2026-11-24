import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { injectedCss, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { pagePadding } from '~ui/src/styles/Page'
import { pageGutter } from '~/utils/themeTokens'
import { COMPLETED_ORDER_WIDTH, OrderBill, OrderPageTitle } from '../styles'
import { OrderDetails } from '../index'
import { Icon } from '~ui/src/design-system/components/Icon'

// the glyph of a base Icon key, read from its own render (lucide names its class)
const glyphOf = (name) => renderToStaticMarkup(<Icon name={name} />).match(/class="([^"]*)"/)[1]

// the page's side space with the default theme (tokens.layout.page_gutter)
const HEADER_SIDE = pageGutter(themeWithValues())

const orderState = vi.hoisted(() => ({ status: 11 }))

const orderFixture = {
  ...pastOrder,
  products: [{ id: 10, name: 'Cheese Slice', price: 5, code: 'p10' }],
  taxes: [],
  subtotal: 15.5,
  business: { ...pastOrder.business, location: { lat: 40.71, lng: -74.0 } },
  customer: { location: { lat: 40.72, lng: -74.01 } },
  reporting_data: { at: {} }
}

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ loading: false, error: null, order: { ...orderFixture, status: orderState.status }, businessData: orderFixture.business }}
      messages={{ messages: [] }}
      reorderState={{ loading: false, error: null, result: null }}
      loyaltyPlansState={{ result: [] }}
      setMessages={vi.fn()}
      readMessages={vi.fn()}
      driverLocation={null}
      getOrder={vi.fn()}
      handleReorder={vi.fn()}
      handleBusinessRedirect={vi.fn()}
      handleOrderRedirect={vi.fn()}
      onGoBack={vi.fn()}
      orderTypes={[{ value: 1, text: 'Delivery' }]}
      googleMapsControls={{}}
      {...rest}
    />
  )
}))

// the icon by its name, to tell the check from the cross
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => null }))
vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({ OrderEta: () => <span>ETA</span> }))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({ ProductItemAccordion: ({ product }) => <div data-testid='product-row'>{product.name}</div> }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))
vi.mock('~ui/src/components/ReviewProfessional', () => ({ ReviewProfessional: () => null }))
vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({ SendGiftCard: () => null }))
vi.mock('~ui/src/components/OrderDetails/OrderBillSection', () => ({ OrderBillSection: () => null }))
vi.mock('~ui/src/components/OrderDetails/OrderRewardsBanner', () => ({ OrderRewardsBanner: () => null }))

vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => ({
      11: { value: 'Delivered', percentage: 100 },
      2: { value: 'Rejected', percentage: 0 },
      16: { value: 'Cancelled by customer', percentage: 0 }
    })[status],
    getOrderStatus: () => null
  })
}))

const completeTheme = themeWithValues()
const { tokens, components } = completeTheme.values

const render = (status, theme) => {
  orderState.status = status
  return renderWithProviders(<OrderDetails orderId={pastOrder.uuid} />, theme ? { theme } : undefined)
}

// The rule of `selector` (its last part) in the injected CSS
const ruleOf = (selector) => injectedCss().split('}').filter((rule) => rule.includes(selector)).join('}')

describe('completed order: the theme', () => {
  it('delivered: the status is a badge (success, the primary without one) and the icon in success', () => {
    const { container } = render(11, completeTheme)
    expect(container.querySelector('.order-status')).not.toHaveClass('rejected')
    const badge = ruleOf('.order-status.completed{')
    const success = components.badge.variants.success || components.badge.variants.primary
    expect(badge).toContain(`background:${success.background}`)
    expect(badge).toContain(`color:${success.color}`)
    expect(badge).toContain(`padding:${tokens.space.xxs}px ${tokens.space.sm}px`)
    const icon = ruleOf('.completed-icon svg{')
    expect(icon).toContain(`color:${tokens.color.success}`)
    expect(icon).toContain(`font-size:${tokens.icon.lg}px`)
    const svg = container.querySelector('.completed-icon svg')
    expect(svg).toHaveAttribute('class', glyphOf('checkCircleFill'))
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('rejected or canceled: a danger badge and a cross in danger', () => {
    for (const status of [2, 16]) {
      const { container, unmount } = render(status, completeTheme)
      expect(container.querySelector('.order-status')).toHaveClass('rejected')
      expect(container.querySelector('.completed-icon')).toHaveClass('rejected')
      const svg = container.querySelector('.completed-icon svg')
      expect(svg).toHaveAttribute('class', glyphOf('closeCircle'))
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(ruleOf('.order-status.rejected{')).toContain(`background:${components.badge.variants.danger.background}`)
      expect(ruleOf('.completed-icon.rejected svg{')).toContain(`color:${tokens.color.danger}`)
      unmount()
    }
  })

  it('order again is the primary button, review a neutral outline', () => {
    const { container } = render(11, completeTheme)
    const again = container.querySelector('[data-doc-control="order-again"]')
    const review = container.querySelector('[data-doc-control="order-review-open"]')
    expect(again.style.getPropertyValue('--ui-button-background')).toBe(components.button.variants.primary.solid.background)
    expect(review.style.getPropertyValue('--ui-button-background')).toBe('transparent')
    expect(review.style.getPropertyValue('--ui-button-color')).toBe(components.button.variants.neutral.outline.color)
  })

  it('the rate prompt: a card spaced by tokens.space, stars in the rating color', () => {
    const { container } = render(11, completeTheme)
    const card = ruleOf('.review-container{')
    expect(card).toContain(`background:${components.card.base.background}`)
    expect(card).toContain(`padding:${tokens.space.lg}px`)
    expect(ruleOf('.buttons-container{')).toContain(`gap:${tokens.space.sm}px`)
    const stars = container.querySelector('.review-container').firstChild
    const starRules = injectedCss().split('}').filter((rule) => rule.includes(`.${stars.className.split(' ').pop()} svg`)).join('}')
    expect(starRules).toContain(`color:${tokens.color.rating}`)
    expect(starRules).toContain(`font-size:${tokens.icon.lg}px`)
  })
})

// The page of a finished order: the account pages'
// box and title, its blocks and sections xl apart on one left edge, the
// header card padded by the card, the outline h1 → h2. Spaces apart from the
// schema's defaults, so the values can only come from the theme.
const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const spacedTheme = themeWithValues((values) => ({ ...values, tokens: { ...values.tokens, space: SPACE } }))

// CSS rules of every class of the element (its own and the ones it extends)
const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}{`))).join('}')
}
// The rules of a selector nested in the element's classes
const nestedRules = (el, selector) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls} ${selector}{`) || rule.includes(`.${cls}.${cls} ${selector}{`))).join('}')
}

const renderPage = (theme) => {
  const view = render(11, theme)
  const page = view.container.querySelector('[data-doc-section="order-details-terminal"]')
  const [, header, right] = page.children
  return { ...view, page, header, summary: right.firstElementChild }
}

const levels = (view) => view.getAllByRole('heading').map((h) => Number(h.tagName[1]))

describe('completed order page: layout', () => {
  it('the account pages\' box: top and bottom space, side padding; a narrower centered column; its blocks xl apart', () => {
    const { page } = renderPage(spacedTheme)
    const rules = rulesOf(page).replace(/\s+/g, '')
    expect(rules).toContain(`padding:${pagePadding(spacedTheme).replace(/\s+/g, '')}`)
    expect(rules).toContain(`max-width:${COMPLETED_ORDER_WIDTH + 2 * HEADER_SIDE}px`)
    expect(rules).toContain('margin-left:auto')
    expect(rules).toContain(`gap:${SPACE.xl}px`)
    // the header card is padded by the card, not the page's 0 20px
    expect(injectedCss()).not.toContain(`.${page.className.split(' ').pop()} > div:nth-child(2){`)
  })

  it('the title: the account pages\' h1 (the active order\'s title), first block, out of the header card', () => {
    const view = renderPage(spacedTheme)
    const titles = view.getAllByRole('heading', { level: 1 })
    expect(titles).toHaveLength(1)
    expect(titles[0]).toHaveTextContent('Order Details')
    expect(view.page.firstElementChild).toBe(titles[0])
    expect(titles[0]).toHaveClass(OrderPageTitle.styledComponentId)
    expect(view.header).not.toContainElement(titles[0])
    expect(view.container.querySelector('.order-details')).toBeNull()
  })

  it('the outline: h1, then its sections h2 (review your order, the driver), no level skipped, no h4', () => {
    const view = renderPage(spacedTheme)
    expect(view.getAllByRole('heading', { level: 2 }).map((h) => h.textContent.trim())).toEqual(['Review your order', 'Alex'])
    expect(view.queryAllByRole('heading', { level: 4 })).toHaveLength(0)
    const order = levels(view)
    expect(order[0]).toBe(1)
    order.forEach((level, i) => {
      if (i) expect(level - order[i - 1]).toBeLessThanOrEqual(1)
    })
  })

  it('the summary: products, rating, address and driver sections xl apart, no margins or padding of their own', () => {
    const { summary, getByTestId } = renderPage(spacedTheme)
    const rules = rulesOf(summary)
    expect(rules).toContain(`gap:${SPACE.xl}px`)
    expect(rules).toContain('padding:0')
    expect(rules).toContain('margin-top:0')
    // its children's margins reset at a stronger specificity
    const cls = summary.className.split(' ').pop()
    expect(injectedCss()).toContain(`.${cls}.${cls} > *{margin-top:0;margin-bottom:0;}`)
    // the products are one section (their rows inside it)
    const products = getByTestId('product-row').parentElement
    expect(products.parentElement).toBe(summary)
    // rating, address and driver: no padding or lines of their own
    const rating = summary.querySelector('.review-container').parentElement
    expect(rulesOf(rating)).toMatch(/padding:0;/)
    const address = summary.querySelector('.order-type-address').parentElement
    expect(rulesOf(address)).not.toMatch(/border-(top|bottom):/)
    const driver = summary.querySelector('.driver-info').closest('div').parentElement.parentElement
    expect(rulesOf(driver)).toMatch(/padding:0;/)
  })

  it('the rating section: its h2 md over the rating card, no line above it; "order again" alone at the start', () => {
    const { summary, getByRole } = renderPage(spacedTheme)
    const rating = summary.querySelector('.review-container').parentElement
    expect(getByRole('heading', { name: 'Review your order' }).parentElement).toBe(rating)
    const title = nestedRules(rating, '> h2')
    expect(title).toContain(`margin:0 0 ${SPACE.md}px`)
    expect(title).toContain('border:none')
    expect(injectedCss()).toContain(`.${rating.className.split(' ').pop()} .one-button{-webkit-box-pack:start;-webkit-justify-content:flex-start;-ms-flex-pack:start;justify-content:flex-start;}`)
  })

  it('the header card: padded by the card (lg), the business and the icon on one row md apart, no padding of their own', () => {
    const { header } = renderPage(spacedTheme)
    expect(rulesOf(header)).toContain(`padding:${SPACE.lg}px`)
    const css = injectedCss()
    const row = css.split('}').filter((rule) => /\.delivery-container\{/.test(rule) && rule.includes(`gap:${SPACE.md}px`)).join('}')
    expect(row).toContain('flex-direction:row')
    expect(css.split('}').filter((rule) => rule.includes('.delivery-container .business-info{') && rule.includes(`gap:${SPACE.md}px`)).join('}')).toContain('padding:0')
    expect(css.split('}').filter((rule) => rule.includes('.delivery-container .completed-icon{') && rule.includes('flex-shrink:0')).join('}')).toContain('margin-bottom:0')
  })

  it('the bill: a plain section like the active order\'s (no box), spaced by the page', () => {
    const { container } = renderWith(spacedTheme, <OrderBill orderCompleted />)
    const rules = rulesOf(container.firstChild)
    expect(rules).not.toMatch(/background|border-radius|box-shadow/)
    expect(rules).toContain('padding:0')
    expect(rules).toContain('margin:0')
  })

  it('the active order\'s bill: no box and no spacing of its own (the summary\'s card spaces it), rows sm apart', () => {
    const { container } = renderWith(spacedTheme, <OrderBill />)
    const rules = rulesOf(container.firstChild)
    expect(rules).not.toMatch(/background|border-radius|box-shadow/)
    expect(rules).toMatch(/(^|[;{])padding:0;/)

    expect(rules).toMatch(/(^|[;{])margin:0;/)
    expect(nestedRules(container.firstChild, 'table')).toContain('border-collapse:collapse')
  })
})

describe('completed order: the business logo', () => {
  it('its box is order_details business_logo_size / business_logo_radius, the logo covering it', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.components.order_details.base, { business_logo_size: 52, business_logo_radius: 7 })
      return values
    })
    const { container } = render(11, theme)
    expect(container.querySelector('.business-logo img')).not.toBeNull()
    const css = injectedCss().replace(/\s+/g, '')
    expect(css).toMatch(/\.business-info\.business-logo,[^{]*\.business-infoimg,[^{]*\{width:52px;height:52px;\}/)
    expect(css).toMatch(/\.business-infoimg,[^{]*\{border-radius:7px;\}/)
    // the whole logo, centered in its box: a wide or tall one is never cropped
    expect(css).toMatch(/\.business-infoimg\{object-fit:contain;object-position:center;\}/)
    // no size of its own on the logo's rule
    expect(css.split('}').filter((rule) => rule.includes('.business-logoimg{')).join('}')).not.toContain('width:')
  })
})

describe('completed order page: the review', () => {
  it('Review opens a base dialog named by its title, on the order-review-business section; its close closes it', async () => {
    const view = renderPage(spacedTheme)
    fireEvent.click(view.container.querySelector('[data-doc-control="order-review-open"]'))
    const dialog = await screen.findByRole('dialog', { name: 'Review your order' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog.getAttribute('data-doc-section')).toBe('order-review-business')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
