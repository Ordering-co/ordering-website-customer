import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderDetails } from '../index'

// The pieces of the order's page the theme can hide (visibility
// confirmation.*).

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

const hiding = (...keys) => themeWithValues((values) => ({
  ...values,
  visibility: { ...values.visibility, ...Object.fromEntries(keys.map((key) => [key, false])) }
}))

const renderPage = (theme) => renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme })

const renderReceipt = (theme) => {
  handlers.status = 11
  try {
    return renderPage(theme)
  } finally {
    handlers.status = 9
  }
}

describe('OrderDetails: visibility confirmation.*', () => {
  it('the schema defaults: help, the store\'s phone and messages, the directions and the receipt\'s logo', () => {
    const { getByRole, getAllByRole, container, unmount } = renderPage(themeWithValues())
    expect(getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Phone' })).toBeInTheDocument()
    expect(getAllByRole('button', { name: 'Messages' })).toHaveLength(2)
    expect(getByRole('button', { name: 'Get Directions' })).toBeInTheDocument()
    expect(container.querySelector('.map-container')).not.toBeNull()
    unmount()
    expect(renderReceipt(themeWithValues()).container.querySelector('.business-logo img')).not.toBeNull()
  })

  it('confirmation.order.help hides the help button', () => {
    const { queryByRole } = renderPage(hiding('confirmation.order.help'))
    expect(queryByRole('button', { name: 'Help' })).toBeNull()
  })

  it('confirmation.order.directions hides "Get directions"; the map stays', () => {
    const { queryByRole, container } = renderPage(hiding('confirmation.order.directions'))
    expect(queryByRole('button', { name: 'Get Directions' })).toBeNull()
    expect(container.querySelector('.map-container')).not.toBeNull()
  })

  it('a hidden map keeps its block for the directions; without them either, no block', () => {
    const noMap = (values) => {
      values.pages.order_details.sections = values.pages.order_details.sections.map((section) => section.key === 'map' ? { ...section, visible: false } : section)
      return values
    }
    const withDirections = renderPage(themeWithValues(noMap))
    expect(withDirections.container.querySelector('.map-container')).toBeNull()
    expect(withDirections.getByRole('button', { name: 'Get Directions' })).toBeInTheDocument()
    const blocks = withDirections.container.querySelector('[data-doc-section="order-details-active"]').children.length
    withDirections.unmount()
    const without = renderPage(themeWithValues((values) => {
      noMap(values)
      values.visibility['confirmation.order.directions'] = false
      return values
    }))
    expect(without.queryByRole('button', { name: 'Get Directions' })).toBeNull()
    expect(without.container.querySelector('[data-doc-section="order-details-active"]').children.length).toBe(blocks - 1)
  })

  it('confirmation.business.phone and confirmation.business.messages hide the store\'s actions, not the driver\'s', () => {
    const { queryByRole, getByRole, container } = renderPage(hiding('confirmation.business.phone', 'confirmation.business.messages'))
    expect(queryByRole('button', { name: 'Phone' })).toBeNull()
    expect(container.querySelector('[data-doc-control="order-message-business"]')).toBeNull()
    expect(container.querySelector('[data-doc-control="order-message-driver"]')).not.toBeNull()
    expect(getByRole('button', { name: 'Go to store' })).toBeInTheDocument()
  })

  it('confirmation.business.logo hides the receipt\'s logo, not its title', () => {
    const { container } = renderReceipt(hiding('confirmation.business.logo'))
    expect(container.querySelector('.business-logo')).toBeNull()
    expect(within(container.querySelector('.title-container')).getByText(/#43/)).toBeInTheDocument()
  })
})

describe('OrderDetails: visibility orders.reorder_button ("Order again")', () => {
  const again = (container) => container.querySelector('[data-doc-control="order-again"]')

  it('shown by default beside Review', () => {
    const { container, getByRole } = renderReceipt(themeWithValues())
    expect(again(container)).not.toBeNull()
    expect(getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })

  it('the theme hides it; Review stays', () => {
    const { container, getByRole } = renderReceipt(hiding('orders.reorder_button'))
    expect(again(container)).toBeNull()
    expect(getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })

  it('Order again alone (no review) follows it too, and without both no block', () => {
    const alone = renderReceipt(hiding('orders.review_order_button'))
    expect(again(alone.container)).not.toBeNull()
    expect(alone.queryByRole('button', { name: 'Review' })).toBeNull()
    alone.unmount()
    const none = renderReceipt(hiding('orders.review_order_button', 'orders.reorder_button'))
    expect(again(none.container)).toBeNull()
    expect(none.container.querySelector('.buttons-container')).toBeNull()
  })
})

describe('OrderDetails: the receipt\'s logo that fails to load', () => {
  it('the theme\'s placeholder (placeholder.business_logo) when visibility.business.dummy_logo is on, never the broken image with its alt', () => {
    const dummy = 'https://cdn.test/dummy-store.jpg'
    const { container } = renderReceipt(themeWithValues((values) => {
      values.images['placeholder.business_logo'] = dummy
      values.visibility = { ...values.visibility, 'business.dummy_logo': true }
    }))
    const logo = container.querySelector('.business-logo img')
    expect(logo.getAttribute('src')).not.toBe(dummy)
    fireEvent.error(logo)
    const placeholder = container.querySelector('.business-logo img')
    expect(placeholder).toHaveAttribute('src', dummy)
    expect(placeholder).toHaveAttribute('alt', '')
  })

  it('no placeholder (visibility.business.dummy_logo off by default): the logo disappears, no broken image', () => {
    const dummy = 'https://cdn.test/dummy-store.jpg'
    const { container } = renderReceipt(themeWithValues((values) => { values.images['placeholder.business_logo'] = dummy }))
    const logo = container.querySelector('.business-logo img')
    fireEvent.error(logo)
    expect(container.querySelector('.business-logo img')).toBeNull()
  })
})

describe('OrderDetails: no business logo element when there is none to show', () => {
  it('no real logo and visibility.business.dummy_logo off (default): no .business-logo element', () => {
    handlers.status = 11
    const noLogoBusiness = { ...orderFixture.business, logo: null }
    const order = { loading: false, error: null, order: { ...orderFixture, business: noLogoBusiness, status: 11 }, businessData: noLogoBusiness }
    try {
      const { container } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} order={order} />, { theme: themeWithValues() })
      expect(container.querySelector('.business-logo')).toBeNull()
    } finally {
      handlers.status = 9
    }
  })
})
