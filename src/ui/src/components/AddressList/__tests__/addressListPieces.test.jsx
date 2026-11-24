import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { AddressList } from '../index'

// implementation notesthe buttons of the list (search, continue, add) are the design system's Button.

const list = vi.hoisted(() => ({ addresses: [], actionLoading: false }))

vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: ({ children }) => <div data-testid='not-found'>{children}</div> }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, address: {} }, loading: false, carts: {} }, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => (
    <UIComponent
      actionStatus={{ loading: list.actionLoading, error: null }}
      addressList={{ loading: false, addresses: list.addresses }}
      handleDelete={vi.fn()}
      setAddressList={vi.fn()}
      handleSetDefault={vi.fn()}
      isModal
      {...rest}
    />
  )
}))

const theme = themeWithValues()
const HOME = { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } }
const OFFICE = { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }
const varOf = (el, name) => el.style.getPropertyValue(name)
const expectLook = (button, options) => {
  const vars = componentVars(theme, 'button', options)
  ;['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color'].forEach((name) => {
    expect(varOf(button, name)).toBe(vars[name] ?? '')
  })
}
const render = (props = {}, addresses = [HOME, OFFICE], activeTheme = theme) => {
  list.addresses = addresses
  list.actionLoading = false
  return renderWithProviders(<AddressList {...props} />, { theme: activeTheme })
}

describe('AddressList: its buttons are the base Button', () => {
  it('"Search for an address" (profile): primary solid md in a box that lays it out', () => {
    const { container, getByRole, getByTestId } = render({ isProfile: true })
    const search = getByRole('button', { name: 'Search for an address' })
    expect(search).toBe(container.querySelector('[data-doc-control="address-add"]'))
    expect(search).toHaveAttribute('data-slot', 'button')
    expect(search).toHaveAttribute('type', 'button')
    expect(search).not.toHaveAttribute('aria-busy')
    expectLook(search, { size: 'md', color: 'primary', appearance: 'solid' })
    // the layout is its box's, not a class on the piece nor a selector over it
    expect(search.className).not.toContain('search-address-button')
    expect(search.parentElement.className).toContain('search-address-button')
    // as wide as its label, where the legacy button sat in the saved places' column (centered; at the end from 768px)
    expect(search.parentElement).toHaveStyle({ width: 'fit-content', alignSelf: 'center' })
    fireEvent.click(search)
    expect(getByTestId('address-form')).toBeInTheDocument()
  })

  it('"Continue with" (default address): primary solid md at full width', () => {
    const { getByRole } = render({ isEnableContinueButton: true })
    const next = getByRole('button', { name: 'Continue with: 9 Elm Rd' })
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(next.className).toContain('ui:w-full')
    expectLook(next, { size: 'md', color: 'primary', appearance: 'solid' })
  })

  it('"Add New Address" (picker): outline lg, primary; secondary beside "Continue with"', () => {
    const plain = render()
    const add = plain.getByRole('button', { name: 'Add New Address' })
    expect(add).toHaveAttribute('data-slot', 'button')
    expectLook(add, { size: 'lg', color: 'primary', appearance: 'outline' })
    expect(cssFor(add.parentElement)).toContain('min-width:12ch')
    plain.unmount()

    const next = render({ isEnableContinueButton: true })
    expectLook(next.getByRole('button', { name: 'Add New Address' }), { size: 'lg', color: 'secondary', appearance: 'outline' })
  })

  it('"Add New Address" (empty list in a product form): primary solid lg', () => {
    const { getByRole } = render({ isProductForm: true }, [])
    const add = getByRole('button', { name: 'Add New Address' })
    expect(add).toHaveAttribute('data-slot', 'button')
    expectLook(add, { size: 'lg', color: 'primary', appearance: 'solid' })
  })

  it('offers a first address in the empty profile and opens the address form', () => {
    const { getByRole, getByTestId } = render({ isProfile: true }, [])
    const add = getByRole('button', { name: 'Add address' })
    expect(getByTestId('not-found')).toContainElement(add)
    expect(add).toHaveAttribute('data-slot', 'button')
    fireEvent.click(add)
    expect(getByTestId('address-form')).toBeInTheDocument()
  })

  it('honors the add-address visibility in the empty profile', () => {
    const hidden = themeWithValues(values => {
      values.visibility['address.add_button'] = false
    })
    const { queryByRole } = render({ isProfile: true }, [], hidden)
    expect(queryByRole('button', { name: 'Add address' })).not.toBeInTheDocument()
  })

  it('no button of the list is a legacy styled button', () => {
    const { container } = render({ isProfile: true, isEnableContinueButton: true })
    ;[...container.querySelectorAll('button')]
      .filter((button) => !button.closest('[role="radiogroup"]') && !button.closest('[data-doc-control="address-item-actions"]'))
      .forEach((button) => expect(button).toHaveAttribute('data-slot', 'button'))
  })
})
