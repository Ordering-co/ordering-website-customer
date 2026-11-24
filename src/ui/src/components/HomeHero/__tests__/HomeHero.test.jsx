import React from 'react'
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { HomeHero } from '../index'

const sessionState = vi.hoisted(() => ({
  auth: false,
  loading: false,
  login: vi.fn()
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: sessionState.auth, loading: sessionState.loading, user: {} }, { login: sessionState.login }]
}))

const orderState = vi.hoisted(() => ({
  current: { options: { address: {} }, loading: false, carts: {} }
}))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState.current, { refreshOrderOptions: vi.fn() }]
}))

const translations = vi.hoisted(() => ({ current: {} }))

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ language: { code: 'en' } }, (key, fallback) => translations.current[key] ?? fallback]
}))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 400, height: 800 })
}))
// the window of that phone, for the theme's platform too (below 576px
// themeVisible answers platforms.mobile_web.visibility)
const realInnerWidth = window.innerWidth
const setInnerWidth = (value) => Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value })
beforeAll(() => setInnerWidth(400))
afterAll(() => setInnerWidth(realInnerWidth))

vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: ({ elementLinkToSignup, elementLinkToForgotPassword }) => (
    <div data-testid='login-form'>
      {elementLinkToSignup}
      {elementLinkToForgotPassword}
    </div>
  )
}))
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: () => <div data-testid='signup-form' />
}))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => <div data-testid='forgot-form' />
}))

const withHeroImages = (values) => {
  values.images.home_hero = 'hero.jpg'
  values.images.home_hero_mobile = 'hero-m.jpg'
  return values
}
const heroTheme = themeWithValues(withHeroImages)

describe('HomeHero', () => {
  beforeEach(() => {
    sessionState.auth = false
    sessionState.loading = false
    orderState.current = { options: { address: {} }, loading: false, carts: {} }
    translations.current = {}
  })

  it('the search button reads its own key (HOME_HERO_SEARCH_BUTTON), not the shared SEARCH', async () => {
    translations.current = { HOME_HERO_SEARCH_BUTTON: 'Find restaurants near me', SEARCH: 'Shared search' }
    const onFindBusiness = vi.fn()
    const { container, getByText, findByRole, queryByText } = renderWithProviders(
      <HomeHero onFindBusiness={onFindBusiness} />,
      { theme: heroTheme }
    )
    const button = container.querySelector('[data-doc-control="website-find-businesses"]')
    expect(button).toHaveTextContent('Find restaurants near me')
    expect(queryByText('Shared search')).toBeNull()
    fireEvent.click(getByText('Find restaurants near me'))
    expect(await findByRole('dialog', { name: 'Guest' })).toBeInTheDocument()
    expect(onFindBusiness).not.toHaveBeenCalled()
  })

  it('renders search CTA and opens address modal without location: the base dialog, titled, whose close closes it', async () => {
    const onFindBusiness = vi.fn()
    const { getByText, findByRole, queryByRole } = renderWithProviders(
      <HomeHero onFindBusiness={onFindBusiness} />,
      { theme: heroTheme }
    )
    expect(getByText('Search')).toBeInTheDocument()
    fireEvent.click(getByText('Search'))
    const dialog = await findByRole('dialog', { name: 'Guest' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(dialog).getByTestId('address-form')).toBeInTheDocument()
    expect(onFindBusiness).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('calls onFindBusiness when address location exists', () => {
    orderState.current = {
      options: { address: { address: '1 Main', location: { lat: 1, lng: 2 } } },
      loading: false,
      carts: {}
    }
    const onFindBusiness = vi.fn()
    const { getByText, queryByRole } = renderWithProviders(
      <HomeHero onFindBusiness={onFindBusiness} />,
      { theme: heroTheme }
    )
    fireEvent.click(getByText('Search'))
    expect(onFindBusiness).toHaveBeenCalled()
    expect(queryByRole('dialog')).toBeNull()
  })

  it('shows mobile login account actions: the base dialog, closed only by its close (onRemove, as on main)', async () => {
    const { getByText, findByRole, queryByRole } = renderWithProviders(
      <HomeHero onFindBusiness={vi.fn()} />,
      { theme: heroTheme }
    )
    expect(getByText('Use your account')).toBeInTheDocument()
    fireEvent.click(getByText('login'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(within(dialog).getByTestId('login-form')).toBeInTheDocument()
    // no onClose: Escape leaves it open, as the legacy authModal did
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(queryByRole('dialog')).toBe(dialog)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('hideLoginAccount leaves out the "Use your account" block and the space it reserves; without it the home is as it was', () => {
    const shown = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme: heroTheme })
    const reserved = (view) => cssFor(view.container.querySelector('[data-doc-section="website-home-hero"]')).replace(/\s+/g, '')
    expect(shown.getByText('Use your account')).toBeInTheDocument()
    expect(reserved(shown)).toContain('margin-bottom:30vh;')
    shown.unmount()
    const hidden = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} hideLoginAccount />, { theme: heroTheme })
    expect(hidden.queryByText('Use your account')).toBeNull()
    expect(hidden.queryByRole('button', { name: 'login' })).toBeNull()
    expect(hidden.queryByRole('button', { name: 'Sign up' })).toBeNull()
    expect(reserved(hidden)).not.toContain('margin-bottom:30vh;')
    // the search is still there
    expect(hidden.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('switches auth modal to signup from login link', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <HomeHero onFindBusiness={vi.fn()} />,
      { theme: heroTheme }
    )
    fireEvent.click(getByText('login'))
    fireEvent.click(getByText('Create account'))
    expect(getByTestId('signup-form')).toBeInTheDocument()
  })

  it('renders signup button path', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <HomeHero onFindBusiness={vi.fn()} />,
      { theme: heroTheme }
    )
    fireEvent.click(getByText('Sign up'))
    expect(getByTestId('signup-form')).toBeInTheDocument()
  })

  it('the mobile logo over the hero is the theme\'s isotype for dark backgrounds (images.isotype_inverse), else its isotype', () => {
    const ISOTYPE = 'https://cdn.test/isotype-inverse.svg'
    const PLAIN_ISOTYPE = 'https://cdn.test/isotype.svg'
    const LOGOTYPE = 'https://cdn.test/logotype-inverse.svg'
    const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
    const both = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme: withImages({ isotype_inverse: ISOTYPE, logotype_inverse: LOGOTYPE }) })
    expect(both.getByAltText('Logo')).toHaveAttribute('src', ISOTYPE)
    both.unmount()
    // the fallback is the isotype, not the other inverse
    const noIsotypeInverse = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme: withImages({ logotype_inverse: LOGOTYPE, isotype: PLAIN_ISOTYPE }) })
    expect(noIsotypeInverse.getByAltText('Logo')).toHaveAttribute('src', PLAIN_ISOTYPE)
  })
})
