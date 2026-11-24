import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { defaultTheme } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderTrackingLayout } from '../index'

// The live map (the driver's GoogleMaps) -> Mapbox static map failover

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ project: 'demo' }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: (value) => `parsed:${value}`, parsePrice: (value) => `$${value}`, timeFormat: 'HH:mm' }]
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-map' />
}))
// the real getGoogleMapImage builds a URL mapboxStaticUrl can parse; only
// generalUtilities needs a deterministic stub
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: () => ({ value: 'on the way', percentage: 50 })
  })
}))
vi.mock('../TrackingProductItem', () => ({ TrackingProductItem: () => null }))
vi.mock('../../../../../hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('../OrderEtaRange', () => ({ OrderEtaRange: () => null }))
vi.mock('../SatisfactionSurvey', () => ({ SatisfactionSurvey: () => null }))
vi.mock('../DeliveryOrderTabs', () => ({ DeliveryOrderTabs: () => <div data-testid='tabs' /> }))

// status 9 (TRACKING_MAP_STATUSES) with a driver location: canShowLiveMap is true
const order = {
  id: 502,
  status: 9,
  delivery_type: 1,
  driver: { name: 'Alex', location: { lat: 12, lng: 34 } },
  business: { name: 'Demo Store', logo: '/logo.png', location: { lat: 10, lng: 20 } },
  customer: { name: 'Ana', location: { lat: 11, lng: 21 } },
  products: [],
  reporting_data: { at: {} }
}

const render = () => renderWithProviders(
  <OrderTrackingLayout order={{ order, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
  { theme: defaultTheme }
)

const liveMapImg = (container) => container.querySelector('[data-doc-section="order-tracking-map"] img')

afterEach(() => {
  resetGoogleMapsFailed()
})

describe('Tracking: live map -> Mapbox static map failover', () => {
  it('Google available renders the live GoogleMaps', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { container, getByTestId } = render()
    expect(getByTestId('google-map')).toBeInTheDocument()
    expect(liveMapImg(container)).toBeNull()
  })

  it('without a Google key, the live map falls back to a Mapbox static image', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { container, queryByTestId } = render()
    expect(queryByTestId('google-map')).toBeNull()
    const img = liveMapImg(container)
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
    // a still image cannot track or expand: no toggle in the fallback
    expect(container.querySelector('[data-doc-control="order-tracking-map-toggle"]')).toBeNull()
  })

  it('without a Google key or a Mapbox token, the live map block renders nothing', () => {
    configState.configs = {}
    const { container, queryByTestId } = render()
    expect(queryByTestId('google-map')).toBeNull()
    expect(liveMapImg(container)).toBeNull()
    expect(container.querySelector('[data-doc-section="order-tracking-map"]')).toBeNull()
  })
})
