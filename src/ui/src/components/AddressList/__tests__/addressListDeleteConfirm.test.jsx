import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { AddressList } from '../index'

// the real dialog (the global setup stubs Confirm; its loadable wrapper does not resolve in jsdom)
vi.mock('~ui/src/components/Confirm', async () => ({ Confirm: (await import('~ui/src/components/Confirm/ConfirmDialog')).ConfirmDialog }))
vi.unmock('~ui/utils')

const handleDelete = vi.hoisted(() => vi.fn())
const HOME = { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } }

vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => <div data-testid='not-found' /> }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, address: {} }, loading: false, carts: {} }, { refreshOrderOptions: vi.fn() }]
}))
// stable props: a new object per render would loop the list's effects
const props = vi.hoisted(() => ({ actionStatus: { loading: false, error: null }, addressList: { loading: false, addresses: [] }, setAddressList: () => {}, handleSetDefault: () => {} }))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => <UIComponent {...props} handleDelete={handleDelete} isModal {...rest} />
}))

// implementation notesthe delete confirmation is titled for the action, not "Search"
describe('AddressList delete confirmation', () => {
  it('is titled "Delete address", asks the question, and only Accept deletes', async () => {
    props.addressList.addresses = [HOME]
    handleDelete.mockClear()
    const { container, findByRole } = renderWithProviders(<AddressList />)
    fireEvent.click(container.querySelector('[data-doc-control="address-delete"]'))
    // the accessible name of the dialog is its title
    const dialog = await findByRole('dialog', { name: 'Delete address' }, { timeout: 5000 })
    const view = within(dialog)
    expect(view.getByText('Delete address')).toBeInTheDocument()
    expect(view.queryByText('Search')).toBeNull()
    expect(view.getByText('Are you sure that you want to delete the address?')).toBeInTheDocument()
    expect(handleDelete).not.toHaveBeenCalled()
    fireEvent.click(view.getByText('Accept'))
    expect(handleDelete).toHaveBeenCalledWith(HOME)
  })
})
