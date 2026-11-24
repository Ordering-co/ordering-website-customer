import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Step1 } from '../Step1'

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'maps-key' } } }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { photo: '/user-photo.png' }, token: 't' }]
}))
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => null }))
vi.mock('~components/components/GoogleAutocompleteInput', () => ({ AutocompleteInput: () => null }))

describe('CustomOrderModal Step1 pickup field', () => {
  it('names the base pickup details field and enables Continue when it is filled', () => {
    const onContinue = vi.fn()
    const initialData = {
      pickupAddress: 'Pickup 1',
      pickupLocation: { lat: 10, lng: 20 },
      pickupName: '',
      deliveryAddress: 'Home 2',
      deliveryLocation: { lat: 11, lng: 21 }
    }
    const { getByRole } = renderWithProviders(<Step1 pluginConfig={{}} initialData={initialData} onContinue={onContinue} />, { theme: themeWithValues() })
    const pickup = getByRole('textbox', { name: 'Pickup details.' })
    expect(pickup).toHaveAttribute('data-slot', 'input')
    expect(pickup).toHaveAttribute('data-doc-control', 'custom-order-pickup-name')
    const next = getByRole('button', { name: 'Continue' })
    expect(next).toBeDisabled()
    fireEvent.change(pickup, { target: { value: 'Ana' } })
    expect(pickup).toHaveValue('Ana')
    expect(next).not.toBeDisabled()
    expect(next).toHaveAttribute('data-slot', 'button')
  })
})
