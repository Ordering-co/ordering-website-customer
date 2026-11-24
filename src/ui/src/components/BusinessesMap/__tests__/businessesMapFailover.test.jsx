import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { BusinessesMap } from '../index'

// Google JS map -> Mapbox static map failover (implementation notes follow-up)

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/components/BusinessesMap', () => ({
  BusinessesMap: ({ UIComponent, ...rest }) => (
    <UIComponent
      userLocation={{ lat: 30.26, lng: -97.74 }}
      businessLocations={[{ lat: 30.27, lng: -97.75, id: 1 }, { lat: 30.28, lng: -97.76, id: 2 }]}
      onBusinessClick={vi.fn()}
      setErrors={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps' />
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

afterEach(() => resetGoogleMapsFailed())

describe('BusinessesMap: Google -> Mapbox static map failover', () => {
  it('Google available renders the interactive map', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { getByTestId, container } = renderWithProviders(<BusinessesMap />)
    expect(getByTestId('google-maps')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('without a Google key, falls back to a Mapbox static image with the user and businesses', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { queryByTestId, container } = renderWithProviders(<BusinessesMap />)
    expect(queryByTestId('google-maps')).toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, nothing renders, not even the map container', () => {
    configState.configs = {}
    const { queryByTestId, container } = renderWithProviders(<BusinessesMap />)
    expect(queryByTestId('google-maps')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-doc-section="businesses-map"]')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('when the Mapbox static image itself fails to load, the map container disappears too', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const { container } = renderWithProviders(<BusinessesMap />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-doc-section="businesses-map"]')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })
})
