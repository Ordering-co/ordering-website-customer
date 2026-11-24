import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { Step1 } from '../Step1'

// The markers of the custom order map: map.store and map.customer (§2.M).

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'maps-key' } } }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { photo: '/user-photo.png' }, token: 't' }]
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: ({ locations }) => <div data-testid='google-map' data-icons={locations?.map((location) => location.icon).join('|')} />
}))
vi.mock('~components/components/GoogleAutocompleteInput', () => ({ AutocompleteInput: () => null }))

const initialData = {
  pickupAddress: 'Pickup 1',
  pickupLocation: { lat: 10, lng: 20 },
  pickupName: 'Ana',
  deliveryAddress: 'Home 2',
  deliveryLocation: { lat: 11, lng: 21 }
}
const renderStep = (theme) => renderWithProviders(<Step1 pluginConfig={{}} initialData={initialData} onContinue={vi.fn()} />, { theme })

describe('CustomOrderModal Step1 map markers', () => {
  it('map.store and map.customer (bundle defaults), never the user photo', () => {
    expect(renderStep(themeWithValues()).getByTestId('google-map').dataset.icons).toBe(`${BUNDLED_IMAGES.map.store}|${BUNDLED_IMAGES.map.customer}`)
  })

  it('the map.* images of the theme win', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'map.store': 'https://cdn.test/theme-store.png', 'map.customer': 'https://cdn.test/theme-home.png' } }))
    expect(renderStep(theme).getByTestId('google-map').dataset.icons).toBe('https://cdn.test/theme-store.png|https://cdn.test/theme-home.png')
  })
})
