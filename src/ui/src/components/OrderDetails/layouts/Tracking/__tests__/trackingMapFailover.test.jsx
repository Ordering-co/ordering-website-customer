import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { defaultTheme } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderTrackingLayout } from '../index'

// Google -> Mapbox static map failover (map_box_token, use_alternative_to_google_maps)

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
    getStatusPrefix: () => ({ value: 'preparing', percentage: 10 })
  })
}))
vi.mock('../TrackingProductItem', () => ({ TrackingProductItem: () => null }))
vi.mock('../../../../../hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('../OrderEtaRange', () => ({ OrderEtaRange: () => null }))
vi.mock('../SatisfactionSurvey', () => ({ SatisfactionSurvey: () => null }))
vi.mock('../DeliveryOrderTabs', () => ({ DeliveryOrderTabs: () => <div data-testid='tabs' /> }))

const order = {
  id: 501,
  status: 7,
  delivery_type: 1,
  business: { name: 'Demo Store', logo: '/logo.png', location: { lat: 10, lng: 20 } },
  customer: { name: 'Ana', location: { lat: 11, lng: 21 } },
  products: [],
  reporting_data: { at: {} }
}

const render = () => renderWithProviders(
  <OrderTrackingLayout order={{ order, loading: false, error: null }} googleMapsControls={{}} handleOrderRedirect={vi.fn()} />,
  { theme: defaultTheme }
)

const staticMapImg = (container) => container.querySelector('[data-doc-section="order-tracking-static-map"] img')

describe('Tracking: Google -> Mapbox static map failover', () => {
  it('use_alternative_to_google_maps=1 goes straight to Mapbox', () => {
    configState.configs = { use_alternative_to_google_maps: { value: '1' }, map_box_token: { value: 'pk.test-token' } }
    const { container } = render()
    const src = staticMapImg(container).getAttribute('src')
    expect(src).toContain('https://api.mapbox.com/styles/v1/mapbox/')
    expect(src).toContain('access_token=pk.test-token')
  })

  it('Google failing falls back to Mapbox', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { container } = render()
    const img = staticMapImg(container)
    expect(img.getAttribute('src')).toContain('maps.googleapis.com')
    fireEvent.error(img)
    expect(staticMapImg(container).getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, the static map block does not render', () => {
    configState.configs = {}
    const { container } = render()
    expect(staticMapImg(container)).toBeNull()
    expect(container.querySelector('[data-doc-section="order-tracking-static-map"]')).toBeNull()
  })
})
