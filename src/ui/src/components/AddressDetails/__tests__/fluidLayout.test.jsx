import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { addressFixture } from '../../__tests__/helpers/cartTestMocks'
import { AddressDetails } from '../index'
import { Map } from '../styles'

vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: {} }] }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => <div /> }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null) }))
vi.mock('~components/components/AddressDetails', () => ({
  AddressDetails: ({ UIComponent, ...rest }) => (
    <UIComponent addressToShow={addressFixture.address} googleMapsUrl='https://maps.googleapis.com/maps/api/staticmap?center=1,2&key=k' apiKey='k' isCartPending={false} {...rest} />
  )
}))

// implementation notesthe static map is a fluid 16:9 box, its shape from CSS and not
// from 288x162 attributes.
describe('AddressDetails fluid layout', () => {
  it('the map image carries no pixel attributes', () => {
    const utils = renderWithProviders(<AddressDetails />)
    fireEvent.click(utils.getByText('Show map'))
    const img = document.getElementById('google-maps-image')
    expect(img).not.toHaveAttribute('width')
    expect(img).not.toHaveAttribute('height')
  })

  it('the image fills its column in a 16:9 shape', () => {
    const { container } = renderWith(themeWithValues(), <Map><img alt='' /></Map>)
    expect(cssFor(container.firstChild).replace(/\s+/g, '')).toContain('aspect-ratio:16/9')
  })
})
