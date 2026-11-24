import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { Locations } from '../index'

// Google JS map -> Mapbox static map failover (implementation notes follow-up)

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/components/LocationsMap', () => ({
  LocationsMap: () => <div data-testid='locations-map' />
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

const businessList = [
  { id: 1, name: 'Demo Cafe', location: { lat: 30.26, lng: -97.74 }, address: '1 Main' },
  { id: 2, name: 'Second Cafe', location: { lat: 30.27, lng: -97.75 }, address: '2 Main' }
]

const render = () => renderWithProviders(
  <Locations businessList={businessList} userLocation={{ lat: 30.25, lng: -97.73 }} onBusinessClick={vi.fn()} />
)

afterEach(() => resetGoogleMapsFailed())

describe('Locations: Google -> Mapbox static map failover', () => {
  it('Google available renders the interactive map', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { getByTestId, container } = render()
    expect(getByTestId('locations-map')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('without a Google key, falls back to a Mapbox static image with the user and businesses', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { queryByTestId, container } = render()
    expect(queryByTestId('locations-map')).toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, nothing renders, not even the map container', () => {
    configState.configs = {}
    const { queryByTestId, container } = render()
    expect(queryByTestId('locations-map')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('when the Mapbox static image itself fails to load, the map container disappears too', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { container } = render()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })
})
