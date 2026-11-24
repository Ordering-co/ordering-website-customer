import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { BusinessesMap } from '../index'

// a working Google key: these tests are about fallbackIcon, not the Mapbox
// failover (see businessesMapFailover.test.jsx)
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'test-google-key' } } }]
}))

vi.mock('~components/components/BusinessesMap', () => ({
  BusinessesMap: ({ UIComponent, ...rest }) => (
    <UIComponent
      userLocation={{ lat: 30.26, lng: -97.74 }}
      businessLocations={[{ lat: 30.27, lng: -97.75, id: 1 }]}
      onBusinessClick={vi.fn()}
      setErrors={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: ({ fallbackIcon }) => <div data-testid='google-maps' data-fallback={fallbackIcon ?? 'none'} />
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

describe('BusinessesMap', () => {
  it('renders map wrapper with google maps', () => {
    const { getByTestId } = renderWithProviders(<BusinessesMap />)
    expect(getByTestId('google-maps')).toBeInTheDocument()
  })

  it('a business without logo falls back to map.store, then the bundle', () => {
    const first = renderWithProviders(<BusinessesMap />, { theme: themeWithValues() })
    expect(first.getByTestId('google-maps').dataset.fallback).toBe(BUNDLED_IMAGES.map.store)
    first.unmount()
    const themed = themeWithValues((values) => ({ ...values, images: { ...values.images, 'map.store': 'https://cdn.test/theme-store.png' } }))
    const { getByTestId } = renderWithProviders(<BusinessesMap />, { theme: themed })
    expect(getByTestId('google-maps').dataset.fallback).toBe('https://cdn.test/theme-store.png')
  })
})
