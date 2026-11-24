import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { AddressList } from '../index'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'

// /profile/addresses: the profile's tabs (the saved places as a page of
// their own), a section of the page the theme may hide (pages.addresses)
vi.mock('../../../components/HelmetTags', () => ({ HelmetTags: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { addresses: [{ id: 1 }] } }]
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list-ui' />
}))
vi.mock('~ui/src/components/UserProfileForm/ProfileOptions', () => ({
  ProfileOptions: () => <div data-testid='profile-options' />
}))

// the saved places as a page of their own (components.address_list layout
// new_page)
const withSections = (sections) => themeWithValues((values) => {
  values.components.address_list.base.layout = 'new_page'
  if (sections) values.pages.addresses = { ...values.pages.addresses, sections }
  return values
})

describe('/profile/addresses: sections of the theme', () => {
  it('the profile tabs by default, hidden by the theme; the list always', () => {
    const shown = renderWithProviders(<AddressList />, { theme: withSections() })
    expect(shown.queryByTestId('profile-options')).not.toBeNull()
    shown.unmount()
    const view = renderWithProviders(<AddressList />, { theme: withSections([{ key: 'profile_tabs', visible: false }, { key: 'address_list', visible: false }]) })
    expect(view.queryByTestId('profile-options')).toBeNull()
    expect(view.getByTestId('address-list-ui')).toBeInTheDocument()
  })

  it('the profile tabs inside the page\'s box, before the list (not over the box)', () => {
    const { getByTestId } = renderWithProviders(<AddressList />, { theme: withSections() })
    const tabs = getByTestId('profile-options')
    const list = getByTestId('address-list-ui')
    const box = tabs.parentElement
    expect(box.contains(list)).toBe(true)
    expect(box.firstElementChild).toBe(tabs)
  })
})
