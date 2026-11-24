import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { OrderDetails } from '../index'

// The live map (the driver's GoogleMaps) -> Mapbox static failover, for the
// statuses useLiveMap tracks (implementation notes follow-up)

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))

// a tracking status (validTrackingStatus) with a driver location so
// useLiveMap is true
const orderFixture = {
  ...activeOrder,
  status: 9,
  products: [],
  driver: { name: 'Alex', lastname: 'Driver', photo: 'driver.png', location: { lat: 12, lng: 34 } },
  business: { ...activeOrder.business, location: { lat: 40.71, lng: -74.0 } },
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

// the real getGoogleMapImage builds the Mapbox failover too: keep the rest
// of setupTests' stub
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({ getStatusPrefix: () => '' })
}))

vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({
  useDriverLocationInterpolation: vi.fn()
}))

vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({ OrderEta: () => <span>ETA</span> }))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({ ProductItemAccordion: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))
vi.mock('~ui/src/components/ReviewProfessional', () => ({ ReviewProfessional: () => null }))
vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({ SendGiftCard: () => null }))

beforeEach(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  resetGoogleMapsFailed()
})

const render = () => renderWithProviders(<OrderDetails orderId={orderFixture.uuid} />)

describe('OrderDetails: live map -> Mapbox static failover', () => {
  it('Google available renders the live GoogleMaps', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { getByTestId } = render()
    expect(getByTestId('google-maps-stub')).toBeInTheDocument()
  })

  it('without a Google key, the live map falls back to a Mapbox static image', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { container, queryByTestId } = render()
    expect(queryByTestId('google-maps-stub')).toBeNull()
    const img = container.querySelector('#google-maps-image')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, the map block renders nothing', () => {
    configState.configs = {}
    const { container, queryByTestId } = render()
    expect(queryByTestId('google-maps-stub')).toBeNull()
    expect(container.querySelector('#google-maps-image')).toBeNull()
  })
})
