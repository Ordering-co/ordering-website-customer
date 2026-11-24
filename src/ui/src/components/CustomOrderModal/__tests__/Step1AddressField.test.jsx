import React from 'react'
import { describe, expect, it, vi } from 'vitest'
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
// the SDK's input takes the props it is given (its className and style too)
vi.mock('~components/components/GoogleAutocompleteInput', () => ({
  AutocompleteInput: ({ apiKey, onChangeAddress, defaultValue, ...props }) => <input {...props} defaultValue={defaultValue} />
}))

// implementation notesthe address inputs are the SdkField's (the box of components.input), not a wrapper of the screen
describe('CustomOrderModal Step1 address fields', () => {
  it('each one is named and takes the field classes; the label shows once it has an address', () => {
    const { getByRole, queryByText, getByText } = renderWithProviders(
      <Step1 pluginConfig={{}} initialData={{ deliveryAddress: 'Home 2' }} onContinue={vi.fn()} />,
      { theme: themeWithValues() }
    )
    const pickup = getByRole('textbox', { name: 'Where do we pickup or buy the product?' })
    const delivery = getByRole('textbox', { name: 'Where do we deliver?' })
    for (const input of [pickup, delivery]) {
      expect(input.closest('[data-slot="sdk-field"]')).not.toBeNull()
      expect(input.getAttribute('class')).toContain('ui:h-(--ui-input-height)')
    }
    expect(queryByText('Where do we pickup or buy the product?', { selector: 'label' })).toBeNull()
    expect(getByText('Where do we deliver?', { selector: 'label' })).toHaveAttribute('for', delivery.id)
  })
})
