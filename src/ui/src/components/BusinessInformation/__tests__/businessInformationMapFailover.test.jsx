import React from 'react'
import { act, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { BusinessInformation } from '../index'

// Google JS map -> Mapbox static map failover (implementation notes follow-up)

const businessFixture = vi.hoisted(() => ({
  id: 1,
  name: 'Demo Store',
  slug: 'demo-store',
  logo: 'logo.png',
  enabled: true
}))

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps' />
}))
vi.mock('~ui/src/components/ScheduleAccordion', () => ({
  ScheduleAccordion: () => <div data-testid='schedule-accordion' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

vi.mock('~components/components/BusinessInformation', () => ({
  BusinessInformation: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      businessLocation={{ location: { lat: 53.47, lng: -2.21 } }}
      businessSchedule={[]}
      businessPhotos={[]}
      businessVideos={[]}
      onClose={vi.fn()}
      {...rest}
    />
  )
}))

afterEach(() => resetGoogleMapsFailed())

describe('BusinessInformation: Google -> Mapbox static map failover', () => {
  it('Google available renders the interactive map', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { getByTestId, container } = renderWithProviders(<BusinessInformation />)
    expect(getByTestId('google-maps')).toBeInTheDocument()
    expect(container.querySelector('.business-location-container')).not.toBeNull()
  })

  it('without a Google key, falls back to a Mapbox static image', () => {
    configState.configs = { google_maps_api_key: { value: '' }, map_box_token: { value: 'pk.test-token' } }
    const { queryByTestId, container } = renderWithProviders(<BusinessInformation />)
    expect(queryByTestId('google-maps')).toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
    // requested in the box's own 13:5
    expect(decodeURIComponent(img.getAttribute('src'))).toMatch(/640x246/)
  })

  it('when Google fails after mounting (gm_authFailure), falls back to a Mapbox static image', () => {
    configState.configs = { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } }
    const { queryByTestId, container } = renderWithProviders(<BusinessInformation />)
    expect(queryByTestId('google-maps')).toBeInTheDocument()
    act(() => { window.gm_authFailure() })
    expect(queryByTestId('google-maps')).toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, no map and no map container', () => {
    configState.configs = { google_maps_api_key: { value: '' } }
    const { queryByTestId, container } = renderWithProviders(<BusinessInformation />)
    expect(queryByTestId('google-maps')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.business-location-container')).toBeNull()
  })

  it('when the Mapbox static image itself fails to load, the map container disappears too', () => {
    configState.configs = { google_maps_api_key: { value: '' }, map_box_token: { value: 'pk.test-token' } }
    const { container } = renderWithProviders(<BusinessInformation />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.business-location-container')).toBeNull()
  })

  it('use_alternative_to_google_maps skips the whole map section, as before', () => {
    configState.configs = {
      google_maps_api_key: { value: 'test-google-key' },
      map_box_token: { value: 'pk.test-token' },
      use_alternative_to_google_maps: { value: '1' }
    }
    const { queryByTestId, container } = renderWithProviders(<BusinessInformation />)
    expect(queryByTestId('google-maps')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.business-location-container')).toBeNull()
  })
})
