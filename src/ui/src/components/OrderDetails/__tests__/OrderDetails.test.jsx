import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderDetails } from '../index'

const orderFixture = {
  ...activeOrder,
  products: [],
  taxes: [],
  subtotal: 15.5,
  business: {
    ...activeOrder.business,
    location: { lat: 40.71, lng: -74.0 }
  },
  customer: { location: { lat: 40.72, lng: -74.01 } }
}

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ loading: false, error: null, order: orderFixture, businessData: orderFixture.business }}
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

vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps-stub' />
}))

// the real getGoogleMapImage (now called to build the Mapbox failover too,
// SERGIO maps failover): keep the rest of the setup's stub
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({ getStatusPrefix: () => '' })
}))

vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({
  useDriverLocationInterpolation: vi.fn()
}))

vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({
  OrderEta: () => <span>ETA</span>
}))

vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: () => null
}))

vi.mock('~ui/src/components/TaxInformation', () => ({
  TaxInformation: () => null
}))

vi.mock('~ui/src/components/Messages', () => ({
  Messages: () => null
}))

vi.mock('~ui/src/components/ReviewOrder', () => ({
  ReviewOrder: () => null
}))

vi.mock('~ui/src/components/ReviewProduct', () => ({
  ReviewProduct: () => null
}))

vi.mock('~ui/src/components/ReviewDriver', () => ({
  ReviewDriver: () => null
}))

vi.mock('~ui/src/components/ReviewProfessional', () => ({
  ReviewProfessional: () => null
}))

vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({
  SendGiftCard: () => null
}))

const REQUESTED_PIN = { delivery_pin: '0427', delivery_pin_status: 'requested' }

const renderOrderDetails = (overrides = {}, options) => {
  const order = { ...orderFixture, ...overrides }
  return renderWithProviders(
    <OrderDetails
      orderId={activeOrder.uuid}
      order={{ loading: false, error: null, order, businessData: order.business }}
    />,
    options
  )
}

const activePage = (container) => container.querySelector('[data-doc-section="order-details-active"]')

describe('OrderDetails', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  it('renders in-progress order header', () => {
    const { getByText } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />)
    expect(getByText(/Order:/)).toBeInTheDocument()
    expect(getByText('Your order is in progress')).toBeInTheDocument()
  })

  it('shows the delivery PIN with its leading zero while it is requested', () => {
    const { getByTestId } = renderOrderDetails(REQUESTED_PIN)
    const pin = getByTestId('delivery-pin')
    expect(pin).toHaveTextContent('Delivery PIN')
    expect(pin).toHaveTextContent('0427')
    expect(pin).toHaveTextContent('Give this code to the driver when you receive your order')
  })

  it('shows the delivery PIN right under the order number, before the sections of the page', () => {
    const { container, getByTestId } = renderOrderDetails(REQUESTED_PIN)
    const title = activePage(container).querySelector('h1.order-id')
    expect(title.nextElementSibling).toBe(getByTestId('delivery-pin'))
    expect(getByTestId('delivery-pin').nextElementSibling.querySelector('.order-progress')).not.toBeNull()
  })

  it('keeps the delivery PIN under the order number when the theme moves the status section', () => {
    const theme = themeWithValues((values) => {
      const sections = values.pages.order_details.sections
      values.pages.order_details.sections = [...sections.filter((section) => section.key !== 'status'), sections.find((section) => section.key === 'status')]
      return values
    })
    const { container, getByTestId } = renderOrderDetails(REQUESTED_PIN, { theme })
    const page = activePage(container)
    expect(page.querySelector('h1.order-id').nextElementSibling).toBe(getByTestId('delivery-pin'))
    expect(page.lastElementChild.querySelector('.order-progress')).not.toBeNull()
  })

  it('paints the delivery PIN from the theme: the theme\'s card, the display figure and the muted help', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.tokens.color, { text_muted: '#445566' })
      Object.assign(values.components.card.base, { background: '#fafafa', padding: 18 })
      values.tokens.typography.display.weight = 500
      values.tokens.typography.display.letter_spacing = 2
      return values
    })
    const { getByTestId, getByText } = renderOrderDetails(REQUESTED_PIN, { theme })
    const box = cssFor(getByTestId('delivery-pin'))
    expect(box).toContain('background:#fafafa')
    expect(box).toContain('padding:18px')
    expect(box).not.toContain('dashed')
    const figure = cssFor(getByText('0427'))
    expect(figure).toContain(`font-size:${theme.values.tokens.typography.display.size}px`)
    expect(figure).toContain('font-weight:500')
    expect(figure).toMatch(/letter-spacing:2px/)
    expect(figure).not.toContain('tabular-nums')
    expect(cssFor(getByText('Give this code to the driver when you receive your order'))).toContain('color:#445566')
  })

  it('hides the delivery PIN while it is not requested', () => {
    const { container, queryByTestId } = renderOrderDetails({ delivery_pin: '0427', delivery_pin_status: null })
    expect(activePage(container)).not.toBeNull()
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN once it is validated', () => {
    const { queryByTestId } = renderOrderDetails({ delivery_pin: '0427', delivery_pin_status: 'validated' })
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN when the order has no PIN', () => {
    const { queryByTestId } = renderOrderDetails({ delivery_pin: null, delivery_pin_status: 'requested' })
    expect(queryByTestId('delivery-pin')).toBeNull()
  })

  it('hides the delivery PIN once the order is completed', () => {
    const { container, queryByTestId } = renderOrderDetails({ ...REQUESTED_PIN, status: 1 })
    expect(container.querySelector('[data-doc-section="order-details-terminal"]')).not.toBeNull()
    expect(queryByTestId('delivery-pin')).toBeNull()
  })
})
