import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { UserProfileForm } from '../index'

// /profile?view=savedPlaces: the profile form with the real address list (its
// controller stubbed with a default and a saved address)
const ADDRESSES = [
  { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } },
  { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }
]

vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={false}
      formState={formStateFixture}
      userData={{ ...userFixture, addresses: ADDRESSES }}
      user={userFixture}
      toggleIsEdit={vi.fn()}
      handleButtonUpdateClick={vi.fn()}
      handlechangeImage={vi.fn()}
      handleSendOtp={vi.fn()}
      verifyPhoneState={{ result: null }}
      setFormState={vi.fn()}
      cleanFormState={vi.fn()}
      isHiddenAddress={false}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => <div data-testid='user-form-details-stub' />
}))
vi.mock('~ui/src/components/StudentsList', () => ({
  StudentsList: () => null
}))
vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))
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
      {...rest}
      actionStatus={{ loading: false, error: null }}
      addressList={{ loading: false, addresses: ADDRESSES }}
      handleDelete={vi.fn()}
      setAddressList={vi.fn()}
      handleSetDefault={vi.fn()}
    />
  )
}))

const renderSavedPlaces = (theme) => renderWithProviders(<UserProfileForm view='savedPlaces' />, { theme })

// The outline of the page: one h1 (the page's title), its one section h2
// (Saved addresses), nothing deeper
const PAGE_SECTIONS = ['Saved addresses']
const expectOutline = ({ getAllByRole, queryAllByRole }, sections) => {
  const h1 = getAllByRole('heading', { level: 1 })
  expect(h1).toHaveLength(1)
  expect(h1[0]).toHaveTextContent('Addresses')
  expect(getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(sections)
  expect(queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  return h1[0]
}

describe('saved places page headings', () => {
  it('the title is the h1 with the theme\'s h1 typography, its one section (no "Explore nearby") h2 with the h2 one', () => {
    const theme = themeWithValues()
    const view = renderSavedPlaces(theme)
    const h1 = expectOutline(view, PAGE_SECTIONS)
    expect(view.queryByText('Explore nearby')).toBeNull()
    const { h1: h1Type, h2: h2Type } = theme.values.tokens.typography
    expect(h1).toHaveStyle({ fontSize: `${h1Type.size}px` })
    view.getAllByRole('heading', { level: 2 }).forEach((h2) => {
      expect(h2).toHaveStyle({ fontSize: `${h2Type.size}px` })
    })
  })
})
