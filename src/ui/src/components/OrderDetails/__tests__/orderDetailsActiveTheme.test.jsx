import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { useEvent } from '~components/contexts/EventContext'
import { OrderDetails } from '../index'

// The active order's page (the default layout): the theme's buttons, cards,
// page box and heading outline.

const handlers = vi.hoisted(() => ({ businessRedirect: null, status: 9 }))

const orderFixture = {
  ...activeOrder,
  // pickup: the "Get directions" action is shown
  delivery_type: 2,
  products: [],
  taxes: [],
  subtotal: 15.5,
  business: {
    ...activeOrder.business,
    address: '1 Pizza St',
    phone: '555-0100',
    location: { lat: 40.71, lng: -74.0 }
  },
  driver: { name: 'Alex', lastname: 'Driver', photo: 'driver.png', cellphone: '555-0101' },
  customer: { address: '123 Main St', location: { lat: 40.72, lng: -74.01 } }
}

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'test-key' } } }]
}))

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => {
    handlers.businessRedirect = handlers.businessRedirect || vi.fn()
    return (
      <UIComponent
        order={{ loading: false, error: null, order: { ...orderFixture, status: handlers.status }, businessData: orderFixture.business }}
        messages={{ messages: [] }}
        reorderState={{ loading: false, error: null, result: null }}
        loyaltyPlansState={{ result: [] }}
        setMessages={vi.fn()}
        readMessages={vi.fn()}
        driverLocation={null}
        getOrder={vi.fn()}
        handleReorder={vi.fn()}
        handleBusinessRedirect={handlers.businessRedirect}
        handleOrderRedirect={vi.fn()}
        onGoBack={vi.fn()}
        orderTypes={[{ value: 1, text: 'Delivery' }, { value: 2, text: 'Pickup' }]}
        googleMapsControls={{}}
        {...rest}
      />
    )
  }
}))

vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: ({ locations }) => <div data-testid='google-maps-stub' data-icons={locations?.map((location) => location.icon).join('|')} />
}))
vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({ OrderEta: () => <span>ETA</span> }))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({ ProductItemAccordion: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))
vi.mock('~ui/src/components/ReviewProfessional', () => ({ ReviewProfessional: () => null }))
vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({ SendGiftCard: () => null }))
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: () => ({ value: 'On the way', percentage: 70 }),
    getOrderStatus: () => null
  })
}))

const completeTheme = themeWithValues()
const card = completeTheme.values.components.card.base
const space = completeTheme.values.tokens.space

// CSS rules of every class of the element (its own and the ones it extends)
const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}{`))).join('}')
}
// The rules of a selector nested in the element's classes (`.map-container`)
const nestedRules = (el, selector) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls} ${selector}{`))).join('}')
}

const outlineBorder = () => componentVars(completeTheme, 'button', { color: 'neutral', appearance: 'outline', size: 'md', shape: 'icon' })['--ui-button-border']

const renderPage = (theme) => {
  const utils = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme })
  const page = utils.container.querySelector('[data-doc-section="order-details-active"]')
  return { ...utils, page }
}

describe('Active order page — the theme', () => {
  it('the order number is the page title (h1) above the header card; the driver is an h2', () => {
    const { getAllByRole, getByRole, page } = renderPage(completeTheme)
    const titles = getAllByRole('heading', { level: 1 })
    expect(titles).toHaveLength(1)
    expect(titles[0]).toHaveTextContent('Order: #43')
    // first block of the page, outside the header card
    expect(page.firstElementChild).toBe(titles[0])
    expect(titles[0].nextElementSibling).toHaveTextContent('On the way')
    expect(getByRole('heading', { level: 2 })).toHaveTextContent('Alex Driver')
  })

  it('the driver\'s photo is decorative: the name and "Your driver" are beside it', () => {
    const { container } = renderPage(completeTheme)
    expect(container.querySelector('img[src="driver.png"]')).toHaveAttribute('alt', '')
  })

  it('help, store, messages and phone are icon buttons of the theme (neutral outline), labelled', () => {
    const { getByRole, getAllByRole, container } = renderPage(completeTheme)
    const buttons = [
      getByRole('button', { name: 'Help' }),
      getByRole('button', { name: 'Go to store' }),
      ...getAllByRole('button', { name: 'Messages' }),
      getByRole('button', { name: 'Phone' }),
      getByRole('button', { name: 'Call driver' })
    ]
    expect(buttons).toHaveLength(6)
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.style.getPropertyValue('--ui-button-border')).toBe(outlineBorder())
    })
    // its data-doc hooks stay on the messages actions
    expect(container.querySelector('[data-doc-control="order-message-business"]').tagName).toBe('BUTTON')
    expect(container.querySelector('[data-doc-control="order-message-driver"]').tagName).toBe('BUTTON')
    expect(container.querySelector('.life-saver-icon')).toBeNull()
  })

  it('keeps every action handler', () => {
    const { getByRole } = renderPage(completeTheme)
    const [events] = useEvent()
    events.emit.mockClear()
    fireEvent.click(getByRole('button', { name: 'Help' }))
    expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'help' })
    fireEvent.click(getByRole('button', { name: 'Go to store' }))
    expect(handlers.businessRedirect).toHaveBeenCalledWith(orderFixture.business.slug)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    fireEvent.click(getByRole('button', { name: 'Call driver' }))
    expect(open).toHaveBeenCalledWith('tel:555-0101')
    open.mockRestore()
  })

  it('the header, the map and the summary are cards, a space apart in the account pages\' box', () => {
    const { page, getByTestId, getByRole } = renderPage(completeTheme)
    const [, header, left, right] = page.children
    const summary = right.firstElementChild

    expect(rulesOf(page)).toContain(`gap:${space.xl}px`)
    expect(rulesOf(page)).toContain('width:75%')

    for (const block of [header, summary]) {
      const rules = rulesOf(block)
      expect(rules).toContain(`background:${card.background}`)
      expect(rules).toContain(`padding:${space.lg}px`)
    }
    // the map's card clips the map to its corners
    expect(left.querySelector('.map-container')).toContainElement(getByRole('img', { name: 'Location map' }))
    const map = nestedRules(left, '.map-container')
    expect(map).toContain(`background:${card.background}`)
    expect(map).toContain('overflow:hidden')
    expect(() => getByTestId('google-maps-stub')).toThrow()

    // the bill is part of the summary's card, no box of its own
    const bill = summary.querySelector('table').parentElement
    expect(rulesOf(bill)).not.toMatch(/background|border-radius|box-shadow/)

    // the directions: the primary outline button of the theme, its own width
    const directions = getByRole('button', { name: 'Get Directions' })
    expect(within(left).getByRole('button', { name: 'Get Directions' })).toBe(directions)
  })
})

describe('Finished order — the theme', () => {
  it('its receipt is left to its own screen: the summary is not the active order\'s card', () => {
    handlers.status = 11
    try {
      const { container } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme: completeTheme })
      const terminal = container.querySelector('[data-doc-section="order-details-terminal"]')
      expect(terminal).not.toBeNull()
      // its summary (products, bill…) holds the bill's table
      const products = terminal.lastElementChild.firstElementChild
      expect(products).toContainElement(terminal.querySelector('table'))
      expect(rulesOf(products)).not.toContain(`background:${card.background}`)
    } finally {
      handlers.status = 9
    }
  })
})

describe('confirmation.* keys on the order page', () => {
  const hiding = (key) => themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, [key]: false } }))

  it('confirmation.driver.phone hides the driver\'s call button, not the store\'s', () => {
    const { getByRole, queryByRole } = renderPage(hiding('confirmation.driver.phone'))
    expect(queryByRole('button', { name: 'Call driver' })).toBeNull()
    expect(getByRole('button', { name: 'Phone' })).toBeInTheDocument()
  })

  it('confirmation.order.delivery_type leaves the receipt\'s title (store, number, status)', () => {
    handlers.status = 11
    try {
      const { container } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme: hiding('confirmation.order.delivery_type') })
      const title = container.querySelector('.title-container')
      expect(title).not.toBeNull()
      expect(title).toHaveTextContent('#43')
      expect(title.querySelector('.order-status')).toHaveTextContent('On the way')
    } finally {
      handlers.status = 9
    }
  })
})

describe('Order map markers (map.*)', () => {
  const STORE = 'https://res.cloudinary.com/acme/image/upload/f_auto,q_auto,h_2000,c_limit/v1/store.png'
  // the bundle's markers of driver and customer (THEME_IMAGE_DEFAULTS)
  const bundled = (theme) => ({ ...theme, values: { ...theme.values, images: { ...theme.values.images, 'map.driver': '/map-driver.png', 'map.customer': '/map-pin.svg' } } })
  const staticSrc = (container) => container.querySelector('#google-maps-image').getAttribute('src')

  it('the live map uses map.* (bundle defaults), never the driver photo', () => {
    const { getByTestId } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} driverLocation={{ lat: 1, lng: 2 }} />, { theme: bundled(completeTheme) })
    expect(getByTestId('google-maps-stub').dataset.icons).toBe('/map-driver.png|logo.png|/map-pin.svg')
  })

  it('map.store of the theme wins over the logo, also in the static map (64px PNG)', () => {
    const themed = bundled(themeWithValues((values) => ({ ...values, images: { ...values.images, 'map.store': STORE } })))
    const live = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} driverLocation={{ lat: 1, lng: 2 }} />, { theme: themed })
    expect(live.getByTestId('google-maps-stub').dataset.icons.split('|')[1]).toBe(STORE)
    live.unmount()
    const { container } = renderPage(themed)
    expect(staticSrc(container)).toContain('markers=anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v1/store.png%7C40.71,-74')
    expect(staticSrc(container)).not.toContain('ditpjbrmz')
  })

  it('a store image Google cannot use falls back to its marker in the primary color', () => {
    const { container } = renderPage(bundled(completeTheme))
    const primary = completeTheme.values.tokens.color.primary.replace('#', '').toUpperCase()
    expect(staticSrc(container)).toContain(`markers=color:0x${primary}%7C40.71,-74`)
  })
})
