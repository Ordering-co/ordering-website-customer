import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { BusinessController } from '../index'

// implementation notes"Order now" of a favorite's card is the design system's Button with the options of
// business_card.slots.cta (secondary by default); it only shows what the card does: out of the
// tab order and of the accessibility tree, and the pointer goes through it to the card's link.

const business = vi.hoisted(() => ({ id: 1, name: 'Demo Store', slug: 'demo-store', logo: 'logo.png', enabled: true, open: true }))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
vi.mock('~components/components/BusinessController', () => ({
  BusinessController: ({ UIComponent, ...rest }) => (
    <UIComponent business={business} isBusinessOpen getBusinessOffer={vi.fn(() => null)} businessState={{ business, loading: false }} orderType={1} isSkeleton={false} businessUrlTemplate='/store/:business_slug' {...rest} />
  )
}))

describe('BusinessController: "Order now" is the base Button', () => {
  it('secondary solid md by default; hidden from assistive technology and the keyboard; the pointer goes through it', () => {
    const theme = themeWithValues()
    const { container, queryByRole } = renderWithProviders(<BusinessController handleClick={vi.fn()} fromFavoriteList />, { theme })
    const cta = container.querySelector('.order-now-button')
    expect(cta).toHaveAttribute('data-slot', 'button')
    expect(cta).toHaveTextContent('Order now')
    expect(cta).toHaveAttribute('aria-hidden', 'true')
    expect(cta).toHaveAttribute('tabindex', '-1')
    expect(queryByRole('button', { name: 'Order now' })).toBeNull()
    const vars = componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'solid' })
    expect(cta.style.getPropertyValue('--ui-button-background')).toBe(vars['--ui-button-background'])
    // the card's own rule lets the pointer through it to the card's stretched link (cardDecorationCss;
    // jsdom does not hit-test, so the click itself is not measured here)
    expect(cssFor(cta.parentElement).replace(/\s+/g, '')).toContain('.order-now-button{pointer-events:none;}')
  })
})

describe('BusinessController: the favorite is the base Button', () => {
  it('a toggle of the favorite component: its name, its pressed state and the theme variables', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<BusinessController handleClick={vi.fn()} withLogoAndFavorite />, { theme })
    const heart = getByRole('button', { name: 'Favorite' })
    expect(heart).toHaveAttribute('data-slot', 'button')
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    const favorite = componentVars(theme, 'favorite')
    expect(heart.style.getPropertyValue('--ui-favorite-color')).toBe(favorite['--ui-favorite-color'])
    expect(heart.style.getPropertyValue('--ui-favorite-icon-size')).toBe(favorite['--ui-favorite-icon-size'])
  })
})
