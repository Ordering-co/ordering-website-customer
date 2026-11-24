import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { DialogOverlay } from '../../Overlay/overlays'
import { AddressList } from '../index'

// The headings of the address list where it is not the saved places page
// (see UserProfileForm's savedPlacesHeadings test for that page)
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [
    { options: { type: 1, address: {} }, loading: false, carts: {} },
    { refreshOrderOptions: vi.fn() }
  ]
}))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => (
    <UIComponent
      actionStatus={{ loading: false, error: null }}
      addressList={{
        loading: false,
        addresses: [
          { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } },
          { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }
        ]
      }}
      handleDelete={vi.fn()}
      setAddressList={vi.fn()}
      handleSetDefault={vi.fn()}
      {...rest}
    />
  )
}))

const headings = (getAllByRole) => getAllByRole('heading').map((h) => `${h.tagName}:${h.textContent}`)

describe('address list headings', () => {
  it('by default its title is an h2 (a picker)', () => {
    const { getAllByRole } = renderWithProviders(<AddressList isModal />, { theme: themeWithValues() })
    expect(headings(getAllByRole)).toEqual(['H2:Saved addresses'])
  })

  it('in a page that has its own h1 (/profile/addresses): the title h2, its sections h3, no h1', () => {
    // one section, over its single choice list
    const { getAllByRole, queryAllByRole } = renderWithProviders(<AddressList isModal isProfile />, { theme: themeWithValues() })
    expect(queryAllByRole('heading', { level: 1 })).toHaveLength(0)
    expect(headings(getAllByRole)).toEqual(['H2:Saved addresses', 'H3:Saved addresses'])
  })

  it('the h2 title has the theme\'s h2 typography', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<AddressList isModal isProfile />, { theme })
    expect(getByRole('heading', { level: 2 })).toHaveStyle({ fontSize: `${theme.values.tokens.typography.h2.size}px` })
  })

  describe('in the address modal (the header\'s, no title of its own)', () => {
    const renderInModal = (theme) => renderWithProviders(
      <DialogOverlay open onClose={vi.fn()}><AddressList isModal /></DialogOverlay>,
      { theme }
    )

    it('the title moves to the dialog\'s title row, a single heading', async () => {
      const { findByRole, getAllByRole } = renderInModal(themeWithValues())
      expect(await findByRole('dialog', { name: 'Saved addresses' })).toHaveAttribute('data-slot', 'dialog-content')
      const all = getAllByRole('heading')
      expect(all).toHaveLength(1)
      expect(all[0]).toHaveTextContent('Saved addresses')
      expect(all[0].closest('ul')).toBeNull()
    })
  })
})
