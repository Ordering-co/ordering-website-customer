import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor } from '../../../styles/__tests__/themeTestUtils'
import { BusinessController } from '../index'

// implementation notesthe listing card's logo is never cropped (contain, not
// cover), like the store header's.

const businessFixture = { id: 1, name: 'Demo Store', slug: 'demo-store', logo: 'logo.png', enabled: true, open: true }

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

vi.mock('~components/components/BusinessController', () => ({
  BusinessController: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      isBusinessOpen
      getBusinessOffer={vi.fn(() => null)}
      businessState={{ business: businessFixture, loading: false }}
      orderType={1}
      isSkeleton={false}
      businessUrlTemplate='/store/:business_slug'
      withLogoAndFavorite
      {...rest}
    />
  )
}))

describe('BusinessController: the listing card logo', () => {
  it('contain, not cover', () => {
    const { container } = renderWithProviders(<BusinessController />)
    const logo = container.querySelector('[style*="logo.png"]')
    expect(logo).not.toBeNull()
    expect(cssFor(logo)).toMatch(/background-size:\s*contain/)
  })
})
