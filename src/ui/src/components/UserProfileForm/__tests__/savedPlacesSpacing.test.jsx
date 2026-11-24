import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { UserProfileForm } from '../index'

// /profile?view=savedPlaces: the spacing of its section (Saved addresses
// alone, over the single choice list of the addresses), the address list's controller stubbed with a
// default and two saved addresses
const ADDRESSES = [
  { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } },
  { id: 3, address: '7 Oak Ave', tag: 'favorite', location: { lat: 3, lng: 3 } },
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

const renderSavedPlaces = (theme) => {
  const view = renderWithProviders(<UserProfileForm view='savedPlaces' />, { theme })
  const sections = view.getAllByRole('heading', { level: 2 })
  const items = Array.from(document.querySelectorAll('[data-doc-control="address-item"]'))
  return {
    sections,
    explore: sections[0],
    saved: sections[sections.length - 1],
    items,
    nearbyItem: items.find((li) => li.getAttribute('data-doc-default') === 'true'),
    savedItems: items.filter((li) => li.getAttribute('data-doc-default') === 'false'),
    divider: document.querySelector('.divider'),
    searchButton: document.querySelector('.search-address-button')
  }
}

// Spaces apart from the schema's defaults, so the values can only come from
// the theme; the divider's section spacing is `{space.xl}`, resolved by the API
const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const spacedTheme = () => themeWithValues((values) => {
  values.components.divider.variants.section.spacing = SPACE.xl
  return { ...values, tokens: { ...values.tokens, space: SPACE } }
})

describe('saved places page spacing', () => {
  it('one section title, no space above, tokens.space md down to the first address', () => {
    const { sections, saved } = renderSavedPlaces(spacedTheme())
    expect(sections.map((h) => h.textContent)).toEqual(['Saved addresses'])
    expect(saved).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px` })
  })

  it('the addresses (the default one first) are 15px apart, whatever the theme\'s spaces; no divider; the search button xl over the section', () => {
    const { items, divider, searchButton } = renderSavedPlaces(spacedTheme())
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAttribute('data-doc-default', 'true')
    // one list: all of them in the same radiogroup
    const group = items[0].closest('[role="radiogroup"]')
    expect(group).not.toBeNull()
    items.forEach((li) => {
      expect(li.closest('[role="radiogroup"]')).toBe(group)
      expect(li).toHaveStyle({ marginBottom: '15px' })
    })
    expect(divider).toBeNull()
    expect(document.querySelector('.explore-nearby')).toBeNull()
    // over the section, the theme's xl (the button is in the flow on mobile)
    expect(searchButton).toHaveStyle({ marginBottom: `${SPACE.xl}px` })
  })

  it('md of the theme under the title, the addresses 15px apart', () => {
    const theme = themeWithValues()
    const { md } = theme.values.tokens.space
    const { saved, items } = renderSavedPlaces(theme)
    expect(saved).toHaveStyle({ marginTop: '0px', marginBottom: `${md}px` })
    items.forEach((li) => expect(li).toHaveStyle({ marginBottom: '15px' }))
  })

  // the address list's buttons are base pieces: a `button { width / align-self }` rule of
  // the page's container (unlayered, so it beats the piece's utilities) squeezed the search button
  // (50% of its box, truncated) and the edit / delete icon buttons (not square)
  it('no rule of the page\'s containers reaches the buttons of the address list', () => {
    const { searchButton } = renderSavedPlaces(themeWithValues())
    const containers = []
    for (let el = searchButton.parentElement; el && el !== document.body; el = el.parentElement) containers.push(el)
    expect(containers.length).toBeGreaterThan(3)
    containers.forEach((el) => expect(cssFor(el)).not.toMatch(/\s+button\s*[{,]/))
  })
})
