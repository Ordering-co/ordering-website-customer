import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { DialogOverlay } from '../../Overlay/overlays'
import { AddressList } from '../index'

// implementation noteswith no saved address the picker is not a dead end: it shows the form to add the first
// one in the opener's own modal (never a second one); the profile and customer mode keep their own way.

const list = vi.hoisted(() => ({ addresses: [] }))
const form = vi.hoisted(() => ({ onSaveAddress: null }))

vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: ({ onSaveAddress, onCancel }) => {
    form.onSaveAddress = onSaveAddress
    return <button type='button' data-testid='address-form' onClick={onCancel}>form</button>
  }
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => <div data-testid='not-found' /> }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, address: {} }, loading: false, carts: {} }, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => (
    <UIComponent
      actionStatus={{ loading: false, error: null }}
      addressList={{ loading: false, addresses: list.addresses }}
      handleDelete={vi.fn()}
      setAddressList={vi.fn()}
      handleSetDefault={vi.fn()}
      isModal
      {...rest}
    />
  )
}))

const render = (props = {}, addresses = []) => {
  list.addresses = addresses
  return renderWithProviders(
    <DialogOverlay open onClose={props.onCancel}>
      <AddressList {...props} />
    </DialogOverlay>
  )
}

describe('AddressList without saved addresses', () => {
  it('shows the form to add one in the opener modal, not the notice nor a second modal', () => {
    render({ onCancel: vi.fn() })
    expect(screen.getByTestId('address-form')).toBeInTheDocument()
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
    expect(document.querySelector('[data-doc-section="address-list"]')).toHaveAttribute('data-doc-state', 'empty')
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
  })

  it('names the opener modal and goes back to where it was on cancel and on save', () => {
    const onCancel = vi.fn()
    render({ onCancel })
    expect(screen.getByRole('dialog', { name: "What's your address?" })).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('address-form'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    form.onSaveAddress({ id: 7, address: '1 Main St' })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('keeps the notice with its own button in the profile and nothing in customer mode', () => {
    const profile = render({ isProfile: true })
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
    expect(screen.queryByTestId('address-form')).not.toBeInTheDocument()
    profile.unmount()

    render({ isCustomerMode: true })
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
    // customer mode opens the form of its own (a modal over the list)
    expect(screen.getByTestId('address-form')).toBeInTheDocument()
  })

  it('keeps the list with saved addresses', () => {
    render({}, [{ id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } }])
    expect(screen.queryByTestId('address-form')).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })
})
