import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { addressFixture } from '../../__tests__/helpers/cartTestMocks'
import { AddressDetails } from '../index'

vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))

vi.mock('~components/components/AddressDetails', () => ({
  AddressDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      addressToShow={addressFixture.address}
      googleMapsUrl='https://maps.example.com/static.png'
      apiKey='test-key'
      isCartPending={false}
      {...rest}
    />
  )
}))

describe('AddressDetails', () => {
  it('renders address and map toggle', () => {
    const { getByText } = renderWithProviders(<AddressDetails />)
    expect(getByText('Delivery Address')).toBeInTheDocument()
    expect(getByText('123 Main St')).toBeInTheDocument()
    fireEvent.click(getByText('Show map'))
    expect(document.getElementById('google-maps-image')).toBeInTheDocument()
  })

  // implementation notesthe address list in the base Dialog
  it('Change address opens the address list in a base Dialog; its close closes it', async () => {
    renderWithProviders(<AddressDetails />)
    fireEvent.click(screen.getByRole('button', { name: 'Change address' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(dialog).toContainElement(screen.getByTestId('address-list'))
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('address-list')).toBeNull())
  })
})
