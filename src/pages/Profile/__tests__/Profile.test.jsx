import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { Profile } from '../index'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

vi.mock('../../../components/HelmetTags', () => ({
  HelmetTags: ({ page }) => <div data-testid='helmet-tags' data-page={page} />
}))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 320, height: 640 })
}))
vi.mock('~ui/src/components/UserProfileForm', () => ({
  UserProfileForm: (props) => (
    <div
      data-testid='profile-ui'
      data-view={props.view}
      data-hide-options={String(props.hideOptions)}
    />
  )
}))

describe('Profile page', () => {
  it('renders profile helmet tags and passes view from query', () => {
    const { getByTestId } = renderWithProviders(<Profile />, {
      initialEntries: ['/profile?view=savedPlaces'],
      routePath: '/profile'
    })

    expect(getByTestId('helmet-tags')).toHaveAttribute('data-page', 'profile')
    expect(getByTestId('profile-ui')).toHaveAttribute('data-view', 'savedPlaces')
    expect(getByTestId('profile-ui')).toHaveAttribute('data-hide-options', 'true')
  })

  // /profile without a view (the header's link) shows the account's form:
  // the page names that view, so it has its title and photo
  it.each([['/profile'], ['/profile?view=unknown']])('%s is the account view', (entry) => {
    const { getByTestId } = renderWithProviders(<Profile />, { initialEntries: [entry], routePath: '/profile', theme: themeWithValues() })
    expect(getByTestId('profile-ui')).toHaveAttribute('data-view', 'account')
  })

  it('a view with its own content stays', () => {
    const { getByTestId } = renderWithProviders(<Profile />, { initialEntries: ['/profile?view=notifications'], routePath: '/profile', theme: themeWithValues() })
    expect(getByTestId('profile-ui')).toHaveAttribute('data-view', 'notifications')
  })
})
