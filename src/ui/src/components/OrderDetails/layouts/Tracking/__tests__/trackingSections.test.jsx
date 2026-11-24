import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { defaultTheme, injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderTrackingLayout } from '../index'
import { schemaEntry } from '~/utils/themeSchema'

// pages.order_details (group tracking) and components.order_tracking on the
// tracking-only page: the theme orders and hides the blocks under the header.

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ project: 'demo' }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'maps-key' } } }]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: (value) => `parsed:${value}`, parsePrice: (value) => `$${value}`, timeFormat: 'HH:mm' }]
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-map' />
}))
vi.mock('~ui/utils', () => ({
  getGoogleMapImage: () => 'https://maps.test/static',
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => ({ value: `legacy-${status}`, percentage: 10 })
  })
}))
vi.mock('../TrackingProductItem', () => ({ TrackingProductItem: () => null }))
vi.mock('../../../../../hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('../OrderEtaRange', () => ({ OrderEtaRange: () => <span data-testid='eta-range'>10:00</span> }))
vi.mock('../SatisfactionSurvey', () => ({ SatisfactionSurvey: () => null }))
vi.mock('../DeliveryOrderTabs', () => ({ DeliveryOrderTabs: () => <div data-testid='tabs' /> }))

// a pickup on the way with its driver: the live map and both people's cards
const pickupOrder = {
  id: 501,
  status: 9,
  delivery_type: 2,
  business: { name: 'Demo Store', logo: '/logo.png', location: { lat: 10, lng: 20 } },
  customer: { name: 'Ana', lastname: 'Lopez', photo: '/ana.png', address: 'Calle 1', location: { lat: 11, lng: 21 } },
  driver: { name: 'Leo', lastname: 'Ruiz', photo: '/leo.png', location: { lat: 12, lng: 22 } },
  products: [],
  summary: { total: 10 },
  delivery_datetime_utc: '2026-09-09 15:00:00',
  reporting_data: { at: {} }
}

const themedWith = ({ sections, hidden = [], visibility = {}, tracking = {}, slots = {} } = {}) => themeWithValues((values) => {
  if (sections) values.pages.order_details.sections = sections.map((key) => ({ key, visible: !hidden.includes(key) }))
  Object.assign(values.visibility, visibility)
  Object.assign(values.components.order_tracking.base, tracking)
  Object.assign(values.components.order_tracking.slots, slots)
  return values
})

const render = (theme, order = pickupOrder, props = {}) => renderWithProviders(
  <OrderTrackingLayout
    order={{ order, loading: false, error: null }}
    googleMapsControls={{}}
    handleOrderRedirect={vi.fn()}
    {...props}
  />,
  { theme }
)

// The blocks after the header, by their doc section
const blocks = (container) => Array.from(container.querySelector('[data-doc-section="order-tracking"]').firstElementChild.children)
  .slice(1)
  .map((block) => block.getAttribute('data-doc-section'))

const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}`))).join('}')
}

describe('tracking page: pages.order_details (group tracking)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  it('the defaults: the live map, then the customer and the driver', () => {
    const { container } = render(defaultTheme, pickupOrder, { driverLocation: { lat: 12, lng: 22 } })
    expect(blocks(container)).toEqual(['order-tracking-map', 'order-tracking-customer', 'order-tracking-driver'])
  })

  it('the theme orders the blocks', () => {
    const { container } = render(themedWith({
      sections: ['driver_card', 'customer_card', 'live_map', 'tabs']
    }), pickupOrder, { driverLocation: { lat: 12, lng: 22 } })
    expect(blocks(container)).toEqual(['order-tracking-driver', 'order-tracking-customer', 'order-tracking-map'])
  })

  it('the people\'s cards hide; the live map does not', () => {
    const { container } = render(themedWith({
      sections: ['live_map', 'tabs', 'customer_card', 'driver_card'],
      hidden: ['live_map', 'customer_card', 'driver_card']
    }), pickupOrder, { driverLocation: { lat: 12, lng: 22 } })
    expect(blocks(container)).toEqual(['order-tracking-map'])
  })

  it('the static map follows pages.order_details map', () => {
    const preparing = { ...pickupOrder, status: 7, driver: null }
    const shown = render(defaultTheme, preparing)
    expect(shown.container.querySelector('[data-doc-section="order-tracking-static-map"]')).toBeInTheDocument()
    shown.unmount()
    const themeHidden = render(themedWith({ sections: ['title', 'map'], hidden: ['map'] }), preparing)
    expect(themeHidden.container.querySelector('[data-doc-section="order-tracking-static-map"]')).toBeNull()
  })

  it('visibility confirmation.order.eta hides the estimate, not the delivery time', () => {
    const delivery = { ...pickupOrder, delivery_type: 1, status: 7 }
    const theme = themedWith({ visibility: { 'confirmation.order.eta': false } })
    const estimate = render(theme, delivery)
    expect(estimate.container.querySelector('[data-doc-section="order-tracking-eta"]')).toBeNull()
    estimate.unmount()
    const delivered = render(theme, { ...delivery, status: 11 })
    expect(delivered.getByText(/Delivered at/)).toBeInTheDocument()
    delivered.unmount()
    const shown = render(defaultTheme, delivery)
    expect(shown.getByTestId('eta-range')).toBeInTheDocument()
  })
})

describe('components.order_tracking', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  it('the status and ETA texts and colors, the map height', () => {
    const { container } = render(themedWith({
      tracking: {
        status_text: { size: 29, line: 1.21, weight: 700 },
        status_color: '#0a0b0c',
        eta_text: { size: 17, line: 1.35, weight: 400 },
        eta_color: '#1a1b1c',
        map_height: 410
      }
    }), { ...pickupOrder, delivery_type: 1, status: 9 }, { driverLocation: { lat: 12, lng: 22 } })
    const header = container.querySelector('.order-status').parentElement
    const css = rulesOf(header)
    expect(css).toMatch(/\.order-status\{(font-family:[^;]+;)?font-size:29px;line-height:1\.21;font-weight:700;[^}]*color:#0a0b0c;/)
    expect(css).toMatch(/p\.eta-range\{(font-family:[^;]+;)?font-size:17px;line-height:1\.35;[^}]*color:#1a1b1c;/)
    const map = container.querySelector('[data-testid="google-map"]').parentElement
    expect(rulesOf(map)).toContain('height:410px;')
  })

  it('the status text on a phone is its platforms.mobile_web override (below 576px)', () => {
    expect(schemaEntry('components.order_tracking.platforms.mobile_web.status_text')).toMatchObject({ type: 'text', value: '{typography.body_lg}' })
    expect(schemaEntry('components.order_tracking.base.status_text_small')).toBeUndefined()
    const theme = themeWithValues((values) => {
      values.platforms.mobile_web.components.order_tracking.base.status_text = { size: 19, line: 1.32, weight: 600 }
      return values
    })
    const { container } = render(theme, { ...pickupOrder, delivery_type: 1, status: 9 }, { driverLocation: { lat: 12, lng: 22 } })
    const css = rulesOf(container.querySelector('.order-status').parentElement).replace(/\s+/g, '')
    expect(css).toMatch(/@media\(max-width:575px\)\{\.\w+\.order-status\{(font-family:[^;]+;)?font-size:19px;line-height:1\.32;font-weight:600;/)
  })

  it('the cards are components.card (background, border, radius, shadow, padding); the photos\' size', () => {
    const theme = themeWithValues((values) => {
      values.components.order_tracking.base.photo_size = 'md'
      Object.assign(values.components.card.base, { background: '#fafbfc', padding: 10, radius: 7, border: { width: 2, style: 'solid', color: '#abcdef' } })
      return values
    })
    const { container } = render(theme, pickupOrder, { driverLocation: { lat: 12, lng: 22 } })
    const card = container.querySelector('[data-doc-section="order-tracking-customer"]')
    const css = rulesOf(card)
    expect(css).toContain('background:#fafbfc;')
    expect(css).toContain('border-radius:7px;')
    expect(css).toMatch(/border:2px solid #abcdef;/)
    expect(css).toContain('padding:10px;')
    expect(css).not.toMatch(/@media \(min-width:\s?768px\)\{[^}]*padding:/)
    const photo = container.querySelector('img[src="/ana.png"]')
    expect(photo.parentElement.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.md.size)
  })

  it('the map toggle\'s slot', () => {
    const theme = themedWith({
      slots: { map_toggle: { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: null } }
    })
    const { getByText } = render(theme, pickupOrder, { driverLocation: { lat: 12, lng: 22 } })
    const toggle = getByText('Maximize map').closest('button')
    expect(toggle.style.getPropertyValue('--ui-button-height')).toBe(`${theme.values.components.button.sizes.lg.height}px`)
  })
})
