import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Locations } from '../index'

// a working Google key: these tests are about fallbackIcon/icons, not the
// Mapbox failover (see locationsMapFailover.test.jsx)
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'test-google-key' } } }]
}))

vi.mock('~components/components/LocationsMap', () => ({
  LocationsMap: ({ fallbackIcon, locations }) => (
    <div data-testid='locations-map' data-fallback={fallbackIcon ?? 'none'} data-icons={locations?.map((location) => location.icon).join('|')} />
  )
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

describe('Locations', () => {
  it('renders locations map for businesses with coordinates', () => {
    const { getByTestId } = renderWithProviders(
      <Locations
        businessList={[
          { id: 1, name: 'Demo Cafe', location: { lat: 30.26, lng: -97.74 }, address: '1 Main' }
        ]}
        userLocation={{ lat: 30.25, lng: -97.73 }}
        onBusinessClick={vi.fn()}
      />
    )
    expect(getByTestId('locations-map')).toBeInTheDocument()
  })

  it('the business logo wins and map.store is the fallback', () => {
    const themed = themeWithValues((values) => ({ ...values, images: { ...values.images, 'map.store': 'https://cdn.test/theme-store.png' } }))
    const { getByTestId } = renderWithProviders(
      <Locations
        businessList={[
          { id: 1, name: 'With logo', logo: '/logo.png', location: { lat: 30.26, lng: -97.74 } },
          { id: 2, name: 'Without logo', location: { lat: 30.27, lng: -97.75 } }
        ]}
        userLocation={{ lat: 30.25, lng: -97.73 }}
      />,
      { theme: themed }
    )
    expect(getByTestId('locations-map').dataset.fallback).toBe('https://cdn.test/theme-store.png')
    expect(getByTestId('locations-map').dataset.icons).toBe('/logo.png|https://cdn.test/theme-store.png')
  })
})
