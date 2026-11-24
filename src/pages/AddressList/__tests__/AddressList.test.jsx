import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { AddressList } from '../index'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'

vi.mock('../../../components/HelmetTags', () => ({
  HelmetTags: ({ page }) => <div data-testid='helmet-tags' data-page={page} />
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { addresses: [{ id: 1 }] } }]
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: (props) => (
    <div
      data-testid='address-list-ui'
      data-is-profile={String(props.isProfile)}
      data-title-as={props.titleAs || ''}
      data-title={props.title || ''}
    />
  )
}))
vi.mock('~ui/src/components/UserProfileForm/ProfileOptions', () => ({
  ProfileOptions: ({ value }) => <div data-testid='profile-options' data-value={value} />
}))

// the saved places as a page of their own (components.address_list layout
// new_page)
const themeWithProfileOptions = themeWithValues((values) => {
  values.components.address_list.base.layout = 'new_page'
  return values
})

describe('AddressList page', () => {
  it('renders addresses helmet tags, profile options, and address list', () => {
    const { getByTestId } = renderWithProviders(<AddressList />, {
      theme: themeWithProfileOptions
    })

    expect(getByTestId('helmet-tags')).toHaveAttribute('data-page', 'addresses')
    expect(getByTestId('profile-options')).toHaveAttribute('data-value', 'addresses')
    expect(getByTestId('address-list-ui')).toHaveAttribute('data-title', 'Saved places')
    expect(getByTestId('address-list-ui')).toHaveAttribute('data-is-profile', 'true')
  })

  it("the list's title is the page's h1, no title of its own", () => {
    const { getByTestId, queryByRole } = renderWithProviders(<AddressList />, { theme: themeWithValues() })

    expect(queryByRole('heading', { level: 1 })).toBeNull()
    expect(getByTestId('address-list-ui')).toHaveAttribute('data-title-as', 'h1')
    expect(getByTestId('address-list-ui')).toHaveAttribute('data-title', 'Saved places')
  })
})
