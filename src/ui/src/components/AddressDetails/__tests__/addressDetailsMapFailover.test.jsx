import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { addressFixture } from '../../__tests__/helpers/cartTestMocks'
import { AddressDetails } from '../index'

// Google -> Mapbox failover (map_box_token, use_alternative_to_google_maps)

const configState = vi.hoisted(() => ({ configs: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~components/components/AddressDetails', () => ({
  AddressDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      addressToShow={addressFixture.address}
      googleMapsUrl='https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=40.7,-74&zoom=15&markers=color:red%7C40.7,-74&key=k'
      apiKey='test-google-key'
      isCartPending={false}
      {...rest}
    />
  )
}))

const openMap = (utils) => {
  fireEvent.click(utils.getByText('Show map'))
  return document.getElementById('google-maps-image').getAttribute('src')
}

describe('AddressDetails: Google -> Mapbox static map failover', () => {
  it('use_alternative_to_google_maps=1 goes straight to Mapbox', () => {
    configState.configs = { use_alternative_to_google_maps: { value: '1' }, map_box_token: { value: 'pk.test-token' } }
    const utils = renderWithProviders(<AddressDetails />)
    const src = openMap(utils)
    expect(src).toContain('https://api.mapbox.com/styles/v1/mapbox/')
    expect(src).toContain('access_token=pk.test-token')
  })

  it('Google failing falls back to Mapbox', () => {
    configState.configs = { map_box_token: { value: 'pk.test-token' } }
    const utils = renderWithProviders(<AddressDetails />)
    fireEvent.click(utils.getByText('Show map'))
    const img = document.getElementById('google-maps-image')
    expect(img.getAttribute('src')).toContain('maps.googleapis.com')
    fireEvent.error(img)
    expect(document.getElementById('google-maps-image').getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, the map (and "Show map") stays hidden', () => {
    configState.configs = {}
    const { queryByText } = renderWithProviders(<AddressDetails apiKey={null} />)
    expect(queryByText('Show map')).toBeNull()
  })
})
