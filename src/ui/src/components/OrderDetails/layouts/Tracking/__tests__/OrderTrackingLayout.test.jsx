import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { cssFor, defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { OrderTrackingLayout } from '../index'
import { Icon } from '~ui/src/design-system/components/Icon'

// the glyph of a base Icon key, read from its own render (lucide names its class)
const glyphOf = (name) => renderToStaticMarkup(<Icon name={name} />).match(/class="([^"]*)"/)[1]

const configState = vi.hoisted(() => ({ configs: { google_maps_api_key: { value: 'maps-key' }, dates_general_format: { value: 'YYYY-MM-DD HH:mm' } } }))
const interpolation = vi.hoisted(() => vi.fn())
const apiState = vi.hoisted(() => ({ project: 'luisv4plus' }))

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [apiState]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: (value) => `parsed:${value}`, parsePrice: (value) => `$${value}`, timeFormat: 'HH:mm' }]
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: (props) => (
    <div data-testid='google-map' data-locations={props.locations?.length} data-icons={props.locations?.map((location) => location.icon).join('|')} />
  )
}))
vi.mock('~ui/utils', () => ({
  getGoogleMapImage: (location, key, mapConfigs) => `https://maps.test/static?key=${key}&lat=${location?.lat}&marker=${mapConfigs?.marker ?? 'default'}`,
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => ({ value: `legacy-${status}`, percentage: status === 4 ? 50 : 10 })
  })
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, btnTitle, onClickButton }) => (
    <div data-testid='not-found'>
      <span>{content}</span>
      {btnTitle && <button type='button' onClick={onClickButton}>{btnTitle}</button>}
    </div>
  )
}))
vi.mock('../TrackingProductItem', () => ({
  TrackingProductItem: ({ product, hidePrice }) => <div data-testid='product-item' data-hide-price={String(!!hidePrice)}>{product.name}</div>
}))
vi.mock('../../../../../hooks/useDriverLocationInterpolation', () => ({
  useDriverLocationInterpolation: (...args) => interpolation(...args)
}))
vi.mock('../OrderEtaRange', () => ({
  OrderEtaRange: () => <span data-testid='eta-range'>10:00 – 10:10</span>
}))
vi.mock('../SatisfactionSurvey', () => ({
  SatisfactionSurvey: ({ hashKey, image }) => <div data-testid='survey' data-hash={hashKey} data-image={image} />
}))
vi.mock('../DeliveryOrderTabs', () => ({
  DeliveryOrderTabs: ({ productsCount, productList, isCourierTracking }) => (
    <div data-testid='tabs' data-products={productsCount} data-courier={String(!!isCourierTracking)}>{productList}</div>
  )
}))

const theme = defaultTheme
const { map: bundledMap } = BUNDLED_IMAGES

const baseOrder = {
  id: 501,
  status: 7,
  delivery_type: 1,
  business: { name: 'Demo Store', logo: '/logo.png', location: { lat: 10, lng: 20 } },
  customer: { name: 'Ana', lastname: 'Lopez', address: 'Calle 1 #23', location: { lat: 11, lng: 21 } },
  products: [{ id: 1, name: 'Burger', price: 10 }, { id: 2, name: 'Combo child', price: 0 }],
  summary: { total: 10 },
  delivery_datetime_utc: '2026-09-09 11:30:00',
  reporting_data: { at: { 'status:11': '2026-09-09 12:00:00' } }
}

const renderLayout = (overrides = {}, extraProps = {}) => renderWithProviders(
  <OrderTrackingLayout
    order={{ order: { ...baseOrder, ...overrides }, loading: false, error: null }}
    googleMapsControls={{}}
    handleOrderRedirect={vi.fn()}
    {...extraProps}
  />,
  { theme }
)

describe('OrderTrackingLayout', () => {
  beforeEach(() => {
    apiState.project = 'luisv4plus'
    interpolation.mockClear()
    window.scrollTo = vi.fn()
  })

  it('shows a skeleton while loading', () => {
    const { container } = renderWithProviders(
      <OrderTrackingLayout order={{ order: null, loading: true, error: null }} />,
      { theme }
    )
    expect(container.querySelector('[data-doc-section="order-tracking-loading"]')).toBeTruthy()
  })

  it('the skeleton\'s status, delivery time and map as tall as the theme makes them', () => {
    const themed = themeWithValues((values) => {
      Object.assign(values.components.order_tracking.base, {
        status_text: { size: 20, line: 1.5, weight: 600 },
        eta_text: { size: 10, line: 2, weight: 400 },
        map_height: 333
      })
      return values
    })
    const { container } = renderWithProviders(
      <OrderTrackingLayout order={{ order: null, loading: true, error: null }} />,
      { theme: themed }
    )
    const heights = Array.from(container.querySelectorAll('[data-testid="skeleton"]')).map((bone) => bone.dataset.height)
    expect(heights.slice(0, 4)).toEqual(['30', String(themed.values.components.progress.sizes.md.height), '20', '333'])
  })

  it('the map toggle is a button of its slot only (no v1 color props on the DOM)', () => {
    const driver = { name: 'Luis', location: { lat: 1, lng: 2 } }
    const { getByText } = renderLayout({ status: 23, driver }, { driverLocation: { lat: 1, lng: 2 } })
    const toggle = getByText('Maximize map').closest('button')
    expect(toggle).not.toHaveAttribute('color')
    expect(toggle).not.toHaveAttribute('bgtransparent')
  })

  it('shows the expired message and the not found action', () => {
    const expired = renderWithProviders(
      <OrderTrackingLayout order={{ order: null, loading: false, error: ['ERROR_ACCESS_EXPIRED'] }} />,
      { theme }
    )
    expect(expired.getByText('Sorry, the order has expired.')).toBeInTheDocument()
    expired.unmount()
    const handleOrderRedirect = vi.fn()
    const { getByText } = renderWithProviders(
      <OrderTrackingLayout order={{ order: null, loading: false, error: ['NOT_FOUND'] }} handleOrderRedirect={handleOrderRedirect} />,
      { theme }
    )
    fireEvent.click(getByText('Go to home'))
    expect(handleOrderRedirect).toHaveBeenCalled()
  })

  it('renders the preparing stage, the estimated window, the static map and the tabs for an active delivery', () => {
    const { getByText, getByTestId, container } = renderLayout()
    expect(getByText('We are preparing your order')).toBeInTheDocument()
    expect(getByText('Estimated delivery:')).toBeInTheDocument()
    expect(getByTestId('eta-range')).toBeInTheDocument()
    expect(container.querySelector('[data-doc-section="order-tracking-stages"]')).toBeTruthy()
    expect(container.querySelector('[data-doc-section="order-tracking-static-map"] img').getAttribute('src')).toContain('key=maps-key')
    expect(getByTestId('tabs').dataset.products).toBe('1')
    expect(getByTestId('tabs').dataset.courier).toBe('false')
    expect(getByText('Burger')).toBeInTheDocument()
    expect(getByTestId('product-item').dataset.hidePrice).toBe('false')
    expect(container.querySelector('[data-doc-section="order-tracking-customer"]')).toBeNull()
    expect(container.querySelector('[data-doc-section="order-tracking-survey"]')).toBeNull()
  })

  it('lists zero-price products without prices and flags the tabs for courier projects', () => {
    apiState.project = 'quickiedelivery'
    const { getByTestId, getAllByTestId, getByText } = renderLayout()
    expect(getByTestId('tabs').dataset.products).toBe('2')
    expect(getByTestId('tabs').dataset.courier).toBe('true')
    expect(getByText('Combo child')).toBeInTheDocument()
    expect(getAllByTestId('product-item').map(item => item.dataset.hidePrice)).toEqual(['true', 'true'])
  })

  it('shows the live map with the theme markers while the driver is on the way', () => {
    const driver = { name: 'Luis', lastname: 'Perez', location: { lat: 1, lng: 2 } }
    const { getByText, getByTestId, container } = renderLayout({ status: 23, driver }, { driverLocation: { lat: 1.5, lng: 2.5 } })
    expect(getByText('On the way to your address')).toBeInTheDocument()
    expect(getByTestId('google-map').dataset.locations).toBe('3')
    expect(getByTestId('google-map').dataset.icons).toBe(`${bundledMap.driver}|/logo.png|${bundledMap.customer}`)
    expect(container.querySelector('[data-doc-section="order-tracking-static-map"]')).toBeNull()
    expect(interpolation).toHaveBeenCalledWith({ lat: 1.5, lng: 2.5 }, expect.objectContaining({ onPositionUpdate: expect.any(Function) }))
  })

  it('expands and minimizes the live map', () => {
    const driver = { name: 'Luis', lastname: 'Perez', location: { lat: 1, lng: 2 } }
    const { getByText, queryByText } = renderLayout({ status: 23, driver }, { driverLocation: { lat: 1, lng: 2 } })
    fireEvent.click(getByText('Maximize map'))
    expect(getByText('Minimize map')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(getByText('Minimize map'))
    expect(queryByText('Minimize map')).toBeNull()
  })

  it('does not fire the map resize of a toggle after the layout unmounts (a timer after the teardown has no window)', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    window.addEventListener('resize', onResize)
    try {
      const driver = { name: 'Luis', lastname: 'Perez', location: { lat: 1, lng: 2 } }
      const { getByText, unmount } = renderLayout({ status: 23, driver }, { driverLocation: { lat: 1, lng: 2 } })
      fireEvent.click(getByText('Maximize map'))
      unmount()
      vi.advanceTimersByTime(150)
      expect(onResize).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('resize', onResize)
      vi.useRealTimers()
    }
  })

  it('still resizes the map 150ms after a toggle while the layout is mounted', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    window.addEventListener('resize', onResize)
    try {
      const driver = { name: 'Luis', lastname: 'Perez', location: { lat: 1, lng: 2 } }
      const { getByText } = renderLayout({ status: 23, driver }, { driverLocation: { lat: 1, lng: 2 } })
      fireEvent.click(getByText('Maximize map'))
      expect(onResize).not.toHaveBeenCalled()
      vi.advanceTimersByTime(150)
      expect(onResize).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('resize', onResize)
      vi.useRealTimers()
    }
  })

  it('shows the arrived stage and hides tabs, showing the survey once delivered', () => {
    const arrived = renderLayout({ status: 26, driver: { name: 'Luis' } })
    expect(arrived.getByText('Your order has arrived')).toBeInTheDocument()
    expect(arrived.getByTestId('tabs')).toBeInTheDocument()
    arrived.unmount()
    const delivered = renderLayout({ status: 11, driver: { name: 'Luis' } }, { hashKey: 'abc' })
    expect(delivered.getByText('We have delivered your order')).toBeInTheDocument()
    expect(delivered.getByText('Delivered at:')).toBeInTheDocument()
    expect(delivered.getByText('parsed:2026-09-09 12:00:00')).toBeInTheDocument()
    expect(delivered.queryByTestId('tabs')).toBeNull()
    expect(delivered.getByTestId('survey').dataset.hash).toBe('abc')
    expect(delivered.getByTestId('survey').dataset.image).toBe('/logo.png')
  })

  it('shows the canceled state without stages, tabs or survey', () => {
    const { getByText, container, queryByTestId } = renderLayout({ status: 2, driver: { name: 'Luis' } })
    expect(getByText('Order canceled')).toBeInTheDocument()
    expect(getByText('This order has been canceled')).toBeInTheDocument()
    expect(container.querySelector('[data-doc-section="order-tracking-stages"]')).toBeNull()
    expect(queryByTestId('tabs')).toBeNull()
    expect(queryByTestId('survey')).toBeNull()
  })

  it('respects theme hidden flags for progress, map and reviews', () => {
    const hiddenTheme = themeWithValues((values) => {
      Object.assign(values.visibility, { 'confirmation.order.progress': false, 'orders.review_order_button': false })
      values.pages.order_details.sections = values.pages.order_details.sections
        .map((section) => section.key === 'map' ? { ...section, visible: false } : section)
      return values
    })
    const { container, queryByTestId } = renderWithProviders(
      <OrderTrackingLayout order={{ order: { ...baseOrder, status: 11 }, loading: false, error: null }} googleMapsControls={{}} />,
      { theme: hiddenTheme }
    )
    expect(container.querySelector('[data-doc-section="order-tracking-stages"]')).toBeNull()
    expect(container.querySelector('[data-doc-section="order-tracking-static-map"]')).toBeNull()
    expect(queryByTestId('survey')).toBeNull()
  })

  it('shows the delivery PIN with its leading zero while it is requested', () => {
    const { getByTestId } = renderLayout({ delivery_pin: '0427', delivery_pin_status: 'requested' })
    const pin = getByTestId('delivery-pin')
    expect(pin).toHaveTextContent('Delivery PIN')
    expect(pin).toHaveTextContent('0427')
    expect(pin).toHaveTextContent('Give this code to the driver when you receive your order')
  })

  it('shows the delivery PIN right after the delivery time, lg under it', () => {
    const { container, getByTestId } = renderLayout({ delivery_pin: '0427', delivery_pin_status: 'requested' })
    const eta = container.querySelector('[data-doc-section="order-tracking-eta"]')
    expect(eta.nextElementSibling).toBe(getByTestId('delivery-pin'))
    expect(cssFor(eta.parentElement)).toContain(`.delivery-pin{margin-top:${theme.values.tokens.space.lg}px`)
  })

  it('hides the delivery PIN while it is not requested', () => {
    const { container, queryByTestId } = renderLayout({ delivery_pin: '0427', delivery_pin_status: null })
    expect(container.querySelector('[data-doc-section="order-tracking-eta"]')).toBeTruthy()
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN once it is validated', () => {
    const { queryByTestId } = renderLayout({ delivery_pin: '0427', delivery_pin_status: 'validated' })
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN when the order has no PIN', () => {
    const { queryByTestId } = renderLayout({ delivery_pin: null, delivery_pin_status: 'requested' })
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN once the order is completed', () => {
    const { getByText, queryByTestId } = renderLayout({ status: 11, delivery_pin: '0427', delivery_pin_status: 'requested' })
    expect(getByText('Delivered at:')).toBeInTheDocument()
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN of a canceled order', () => {
    const { getByText, queryByTestId } = renderLayout({ status: 2, delivery_pin: '0427', delivery_pin_status: 'requested' })
    expect(getByText('Order canceled')).toBeInTheDocument()
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('falls back to the classic status and the customer and driver cards for pickup orders', () => {
    const { getByText, container, queryByTestId, queryByText } = renderLayout({
      status: 4,
      delivery_type: 2,
      driver: { name: 'Luis', lastname: 'Perez', cellphone: '+51999', plate: 'ABC-123' }
    })
    expect(getByText('legacy-4')).toBeInTheDocument()
    expect(queryByText('Estimated delivery:')).toBeNull()
    expect(queryByTestId('tabs')).toBeNull()
    expect(container.querySelector('[data-doc-section="order-tracking-customer"]')).toBeTruthy()
    expect(getByText('Ana Lopez')).toBeInTheDocument()
    expect(getByText('Luis Perez')).toBeInTheDocument()
    expect(getByText('Plate: ABC-123')).toBeInTheDocument()
  })

  describe('the bar under the stage icons', () => {
    const completeTheme = themeWithValues()
    const progress = completeTheme.values.components.progress
    const stages = (container) => container.querySelector('[data-doc-section="order-tracking-stages"]')

    it('components.progress md under the stage icons, active', () => {
      const { container, getByRole } = renderWithProviders(
        <OrderTrackingLayout order={{ order: { ...baseOrder, status: 9 }, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
        { theme: completeTheme }
      )
      const bar = getByRole('progressbar', { name: 'On the way to your address' })
      expect(stages(container).contains(bar)).toBe(true)
      expect(Number(bar.getAttribute('aria-valuenow'))).toBeCloseTo(33.33, 1)
      expect(cssFor(bar)).toContain(`height:${progress.sizes.md.height}px`)
      expect(cssFor(bar.firstChild)).toContain(`background:${progress.base.fill}`)
      expect(cssFor(stages(container))).not.toContain('linear-gradient')
      // the stage icons stay, as icons of the theme
      expect(stages(container).querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(4)
    })

    it('complete once delivered', () => {
      const { getByRole } = renderWithProviders(
        <OrderTrackingLayout order={{ order: { ...baseOrder, status: 11 }, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
        { theme: completeTheme }
      )
      const bar = getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
      expect(cssFor(bar.firstChild)).toContain(`background:${progress.variants.default.states.complete.fill}`)
    })
  })

  describe('stages as icons and the map.* markers', () => {
    const cloudinary = 'https://res.cloudinary.com/acme/image/upload/f_auto,q_auto,h_2000,c_limit/v1/markers/store.png'
    const completeTheme = (images = {}) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
    const stages = (container) => container.querySelector('[data-doc-section="order-tracking-stages"]')

    it('each stage is an icon of the theme size, no image', () => {
      const themed = completeTheme()
      const { container } = renderWithProviders(
        <OrderTrackingLayout order={{ order: { ...baseOrder, status: 9 }, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
        { theme: themed }
      )
      const icons = Array.from(stages(container).querySelectorAll('svg')).map((icon) => icon.getAttribute('class'))
      expect(icons).toEqual(['store', 'truckDelivery', 'home', 'checkCircleFill'].map(glyphOf))
      expect(stages(container).querySelector('img')).toBeNull()
      const stage = stages(container).querySelector('svg').parentElement
      expect(cssFor(stage)).toContain(`font-size:${themed.values.tokens.icon.lg}px`)
    })

    it('the live map uses map.* (theme first, then the bundle), never the driver photo', () => {
      const driver = { name: 'Luis', photo: '/driver-photo.png', location: { lat: 1, lng: 2 } }
      const { getByTestId } = renderWithProviders(
        <OrderTrackingLayout order={{ order: { ...baseOrder, status: 23, driver }, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} driverLocation={{ lat: 1, lng: 2 }} />,
        { theme: completeTheme({ 'map.driver': 'https://cdn.test/theme-moto.png' }) }
      )
      expect(getByTestId('google-map').dataset.icons).toBe(`https://cdn.test/theme-moto.png|/logo.png|${bundledMap.customer}`)
    })

    it('map.store wins over the business logo', () => {
      const driver = { name: 'Luis', location: { lat: 1, lng: 2 } }
      const { getByTestId } = renderWithProviders(
        <OrderTrackingLayout order={{ order: { ...baseOrder, status: 23, driver }, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} driverLocation={{ lat: 1, lng: 2 }} />,
        { theme: completeTheme({ 'map.store': 'https://cdn.test/theme-store.png', 'map.customer': 'https://cdn.test/theme-home.png' }) }
      )
      expect(getByTestId('google-map').dataset.icons).toBe(`${bundledMap.driver}|https://cdn.test/theme-store.png|https://cdn.test/theme-home.png`)
    })

    it('the static map marks the business with map.store as a 64px PNG', () => {
      const { container } = renderWithProviders(
        <OrderTrackingLayout order={{ order: baseOrder, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
        { theme: completeTheme({ 'map.store': cloudinary }) }
      )
      expect(container.querySelector('[data-doc-section="order-tracking-static-map"] img').getAttribute('src'))
        .toContain('marker=anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v1/markers/store.png')
    })

    it('without a usable image the static map uses the primary color', () => {
      const themed = completeTheme()
      const { container } = renderWithProviders(
        <OrderTrackingLayout order={{ order: baseOrder, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
        { theme: themed }
      )
      const hex = themed.values.tokens.color.primary.replace('#', '').toUpperCase()
      expect(container.querySelector('[data-doc-section="order-tracking-static-map"] img').getAttribute('src')).toContain(`marker=color:0x${hex}`)
    })
  })
})

describe('OrderTrackingLayout: confirmation.driver.plate', () => {
  const renderPickup = (shown) => renderWithProviders(
    <OrderTrackingLayout
      order={{ order: { ...baseOrder, status: 4, delivery_type: 2, driver: { name: 'Luis', lastname: 'Perez', cellphone: '+51999', plate: 'ABC-123' } }, loading: false, error: null }}
      googleMapsControls={{}}
      handleOrderRedirect={vi.fn()}
    />,
    {
      theme: themeWithValues((values) => {
        values.visibility['confirmation.driver.plate'] = shown
        return values
      })
    }
  )

  it('shows the plate by default and hides it, not the driver', () => {
    const shown = renderPickup(true)
    expect(shown.getByText('Plate: ABC-123')).toBeInTheDocument()
    shown.unmount()
    const { getByText, queryByText } = renderPickup(false)
    expect(getByText('Luis Perez')).toBeInTheDocument()
    expect(queryByText(/ABC-123/)).toBeNull()
  })
})
