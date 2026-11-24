import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { createLanguageWrapper } from '../../../../../__tests__/helpers/languageTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { customerFixture } from '../../__tests__/helpers/shellTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { useSite } from '~components/contexts/SiteContext'
import { SidebarMenu } from '../index'
import THEME_COMPILED from '~/theme.compiled.json'
import { scopedTheme } from '~/utils/themeGroups'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { HEADER_LAYER } from '../../Header/styles'

const windowSize = vi.hoisted(() => ({ width: 1024, height: 768 }))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => windowSize
}))
vi.mock('../../../../config', () => ({
  default: { franchiseSlug: null, businessSlug: null }
}))
vi.mock('../../../hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ hasMultiple: true })
}))
vi.mock('../../SavedCards/useSavedCardsGateway', () => ({
  useSavedCardsGateway: () => ({ isAvailable: true })
}))
vi.mock('~ui/src/components/LogoutButton', () => ({
  LogoutButton: ({ onCustomClick }) => (
    <button type='button' data-testid='logout-button' onClick={onCustomClick}>Logout</button>
  )
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: ({ elementLinkToSignup }) => <div data-testid='login-form'>{elementLinkToSignup}</div>
}))
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: ({ elementLinkToLogin }) => <div data-testid='signup-form'>{elementLinkToLogin}</div>
}))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => <div data-testid='forgot-form'>ForgotPasswordForm</div>
}))

const emit = vi.hoisted(() => vi.fn())
const schoolModuleValue = vi.hoisted(() => ({ value: '1' }))
// The rewards: the wallets (a feature of the plan) and the offers
const rewards = vi.hoisted(() => ({ cashWallet: '1', offers: '1' }))

vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))

const sessionState = vi.hoisted(() => ({
  auth: false,
  user: { id: 1, name: 'Jane', lastname: 'Doe', loyalty_level: { name: 'Gold' } },
  token: 'test-token'
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [sessionState, { login: vi.fn() }]
}))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      cash_wallet: { value: rewards.cashWallet },
      wallet_cash_enabled: { value: '1' },
      wallet_credit_point_enabled: { value: '1' },
      platform_store_giftcard_enabled: { value: '1' },
      advanced_offers_module: { value: rewards.offers },
      plan_enterprise: { value: '1' },
      school_module_enabled: { value: schoolModuleValue.value }
    }
  }]
}))

describe('SidebarMenu', () => {
  it.each([
    ['es', 'Inicio', 'Casa'],
    ['bg', 'Начало', 'Дом']
  ])('keeps the legacy Home navigation translation in %s', async (code, nav, address) => {
    const { getByLabelText, findByText, queryByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />,
      { wrapper: createLanguageWrapper({ WEBSITE_HOME: nav, WEBSITE_ADDRESS_HOME: address }, code) }
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(await findByText(nav)).toBeInTheDocument()
    expect(queryByText(address)).not.toBeInTheDocument()
  })

  // implementation notesthe menu asks for the header's key; SIGNUP resolves to "signUp" in English
  it('Sign up uses the header key SIGN_UP, so it reads "Sign up" in text and name', async () => {
    const { getByLabelText, findByRole, queryByText } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup={false} />,
      { wrapper: createLanguageWrapper({ SIGN_UP: 'Sign up', SIGNUP: 'signUp' }, 'en') }
    )
    fireEvent.click(getByLabelText('Open menu'))
    const signUp = await findByRole('button', { name: 'Sign up' })
    expect(signUp).toHaveTextContent(/^Sign up$/)
    expect(queryByText('signUp')).not.toBeInTheDocument()
  })

  beforeEach(() => {
    emit.mockClear()
    schoolModuleValue.value = '1'
    rewards.cashWallet = '1'
    rewards.offers = '1'
    windowSize.width = 1024
    sessionState.auth = false
    sessionState.user = { id: 1, name: 'Jane', lastname: 'Doe', loyalty_level: { name: 'Gold' } }
    delete window.location
    window.location = new URL('http://localhost/home')
  })

  it('renders menu toggle for guests', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup={false} />
    )
    expect(getByLabelText('Open menu')).toBeInTheDocument()
  })

  it('opens sidebar content when menu is clicked', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(getByText('Sign in')).toBeInTheDocument()
    expect(getByText('Sign up')).toBeInTheDocument()
  })

  it('opens login modal from Sign in: the base dialog, whose close closes it', async () => {
    const { getByLabelText, getByText, findByRole, queryByRole } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Sign in'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog).toHaveAttribute('data-doc-section', 'sidebar-authentication-dialog')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(dialog).getByTestId('login-form')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('opens signup modal from Sign up', () => {
    const { getByLabelText, getByText, getByTestId } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Sign up'))
    expect(getByTestId('signup-form')).toBeInTheDocument()
  })

  it.each([
    ['Sign in', 'Escape'],
    ['Sign up', 'Close']
  ])('returns focus to the menu after opening %s and closing with %s', async (entry, dismiss) => {
    windowSize.width = 390
    const { getByRole, findByRole, queryByRole } = renderWithProviders(<SidebarMenu auth={false} />)
    const toggle = getByRole('button', { name: 'Open menu' })
    fireEvent.click(toggle)
    const trigger = getByRole('button', { name: entry })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = await findByRole('dialog')
    const close = within(dialog).getByRole('button', { name: 'Close' })
    close.focus()
    if (dismiss === 'Escape') fireEvent.keyDown(close, { key: 'Escape' })
    else fireEvent.click(close)

    await waitFor(() => {
      expect(queryByRole('dialog')).toBeNull()
      expect(toggle).toHaveFocus()
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('sidebar_menu')).toHaveAttribute('inert')
  })

  it('moves focus inside the dialog when switching between Login and Registration', async () => {
    windowSize.width = 390
    const { getByRole, findByRole } = renderWithProviders(<SidebarMenu auth={false} />)
    fireEvent.click(getByRole('button', { name: 'Open menu' }))
    fireEvent.click(getByRole('button', { name: 'Sign in' }))
    const dialog = await findByRole('dialog')
    const close = within(dialog).getByRole('button', { name: 'Close' })

    for (const [switchLabel, form] of [['Create account', 'signup-form'], ['Login', 'login-form']]) {
      const link = within(dialog).getByRole('link', { name: switchLabel })
      link.focus()
      fireEvent.click(link)
      expect(within(dialog).getByTestId(form)).toBeInTheDocument()
      expect(close).toHaveFocus()
    }
  })

  it('renders authenticated navigation links', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(getByText('Orders')).toBeInTheDocument()
    expect(getByText('View account')).toBeInTheDocument()
    expect(getByText('Cash wallet')).toBeInTheDocument()
    expect(getByText('My addresses')).toBeInTheDocument()
  })

  it('Browse & Search follows the theme (visibility menu.browse)', () => {
    const open = (theme) => {
      const utils = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme })
      fireEvent.click(utils.getAllByLabelText('Open menu').slice(-1)[0])
      return utils
    }
    const shown = open(themeWithValues())
    expect(shown.queryByText('Browse & Search')).toBeInTheDocument()
    shown.unmount()
    const hidden = themeWithValues((values) => { values.visibility['menu.browse'] = false; return values })
    expect(open(hidden).queryByText('Browse & Search')).toBeNull()
  })

  it('Home is the menu: /home, or /order on a full website', () => {
    const fullWebsite = themeWithValues((values) => { values.site.experience = 'full_website'; return values })
    const orderingOnly = renderWithProviders(<SidebarMenu auth isHideSignup={false} />)
    fireEvent.click(orderingOnly.getByLabelText('Open menu'))
    expect(orderingOnly.getByText('Home').closest('a')).toHaveAttribute('href', '/home')
    orderingOnly.unmount()

    window.location = new URL('http://localhost/order')
    const full = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: fullWebsite })
    fireEvent.click(full.getByLabelText('Open menu'))
    const home = full.getByText('Home').closest('a')
    expect(home).toHaveAttribute('href', '/order')
    expect(home).toHaveAttribute('aria-current', 'page')
    fireEvent.click(home)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('a full website\'s single store named `order`: Home is /store/order, not the menu\'s /order', () => {
    const [{ site }] = useSite()
    const template = site.business_url_template
    site.business_url_template = '/:business_slug'
    try {
      const theme = themeWithValues((values) => {
        values.site.mode = 'single_store'
        values.site.business_slug = 'order'
        values.site.experience = 'full_website'
        return values
      })
      window.location = new URL('http://localhost/store/order')
      const view = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme })
      fireEvent.click(view.getByLabelText('Open menu'))
      expect(view.getByText('Home').closest('a')).toHaveAttribute('href', '/store/order')
    } finally {
      site.business_url_template = template
    }
  })

  it('a single store site: never Browse & Search; Home is the store, current at either address', () => {
    const singleStore = () => themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'mcbonalds'
      return values
    })
    window.location = new URL('http://localhost/mcbonalds')
    const view = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: singleStore() })
    fireEvent.click(view.getByLabelText('Open menu'))
    expect(view.queryByText('Browse & Search')).toBeNull()
    const home = view.getByText('Home').closest('a')
    // the store at the site's business template (setupTests: /store/:business_slug)
    expect(home).toHaveAttribute('href', '/store/mcbonalds')
    expect(home).toHaveAttribute('aria-current', 'page')
    fireEvent.click(home)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'mcbonalds' } })
    view.unmount()

    window.location = new URL('http://localhost/store/mcbonalds')
    const atTemplate = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: singleStore() })
    fireEvent.click(atTemplate.getByLabelText('Open menu'))
    expect(atTemplate.getByText('Home').closest('a')).toHaveAttribute('aria-current', 'page')
  })

  it('Favorites follows the theme (visibility menu.favorites)', () => {
    const open = (theme) => {
      const utils = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme })
      fireEvent.click(utils.getAllByLabelText('Open menu').slice(-1)[0])
      return utils
    }
    const shown = open(themeWithValues())
    expect(shown.queryByText('Favorites')).toBeInTheDocument()
    shown.unmount()
    const hidden = themeWithValues((values) => { values.visibility['menu.favorites'] = false; return values })
    expect(open(hidden).queryByText('Favorites')).toBeNull()
  })

  it('the Rewards section only with wallets or offers in it', () => {
    const open = () => {
      const view = renderWithProviders(<SidebarMenu auth isHideSignup={false} />)
      fireEvent.click(view.getByLabelText('Open menu'))
      return view
    }
    const both = open()
    expect(both.getByText('Rewards')).toBeInTheDocument()
    both.unmount()

    rewards.cashWallet = undefined
    const offersOnly = open()
    expect(offersOnly.getByText('Rewards')).toBeInTheDocument()
    expect(offersOnly.queryByText('Cash wallet')).toBeNull()
    offersOnly.unmount()

    rewards.offers = '0'
    const none = open()
    expect(none.queryByText('Rewards')).toBeNull()
  })

  it('navigates to orders when orders link is clicked', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Orders'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({ page: 'orders' }))
  })

  it('shows customer greeting when userCustomer is provided', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu
        auth={false}
        isHideSignup={false}
        userCustomer={customerFixture}
      />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(getByText(/Hi/)).toBeInTheDocument()
    expect(getByText(/Alex Customer/)).toBeInTheDocument()
  })

  it('closes sidebar from close control', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const sidebar = document.getElementById('sidebar_menu')
    sidebar.style.width = '340px'
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByLabelText('Close menu'))
    expect(sidebar.style.width).toMatch(/^0/)
  })

  it('renders logout control for authenticated users', () => {
    const { getByLabelText, getByTestId } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(getByTestId('logout-button')).toBeInTheDocument()
  })

  it('navigates home when home link is clicked', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Home'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })

  it('navigates to loyalty points wallet', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Loyalty points'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({
      page: 'wallets',
      search: '?wallet=credit_point'
    }))
  })

  it('navigates to gift cards wallet', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Gift cards'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({
      page: 'wallets',
      search: '?wallet=gift_card'
    }))
  })

  it('navigates to offers when promotions are enabled', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Offers'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'promotions' })
  })

  it('navigates to my students when school module is enabled', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('My students'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({
      page: 'profile',
      search: '?view=students'
    }))
  })

  it('hides my students when school module is off', () => {
    schoolModuleValue.value = '0'
    const { getByLabelText, queryByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(queryByText('My students')).not.toBeInTheDocument()
  })

  it('navigates to saved cards', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('My cards'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'cards' })
  })

  it('navigates to messages', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Messages'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'messages' })
  })

  it('navigates to language settings', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Language'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({
      page: 'profile',
      search: '?view=language'
    }))
  })

  it('navigates to notifications settings', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Notifications'))
    expect(emit).toHaveBeenCalledWith('go_to_page', expect.objectContaining({
      page: 'profile',
      search: '?view=notifications'
    }))
  })

  it('navigates to help', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('help'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'help' })
  })

  it('navigates to sessions for enterprise users', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    fireEvent.click(getByLabelText('Open menu'))
    fireEvent.click(getByText('Sessions'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'sessions' })
  })

  it('hides signup for guests when isHideSignup is true', () => {
    const { getByLabelText, queryByText } = renderWithProviders(
      <SidebarMenu auth={false} isHideSignup />
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(queryByText('Sign up')).not.toBeInTheDocument()
  })

  it('closes sidebar when clicking outside', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const sidebar = document.getElementById('sidebar_menu')
    fireEvent.click(getByLabelText('Open menu'))
    expect(sidebar.style.width).not.toMatch(/^0/)
    fireEvent.mouseDown(document.body)
    expect(sidebar.style.width).toMatch(/^0/)
  })

  it('uses full viewport width on small screens when menu opens', () => {
    windowSize.width = 400
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const sidebar = document.getElementById('sidebar_menu')
    fireEvent.click(getByLabelText('Open menu'))
    expect(sidebar.style.width).toMatch(/100v/)
  })

  it('closed, the panel is inert (its options out of the tab order); the menu button says it is collapsed', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const panel = document.getElementById('sidebar_menu')
    const toggle = getByLabelText('Open menu')
    expect(panel).toHaveAttribute('inert')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'sidebar_menu')
    fireEvent.click(toggle)
    expect(panel).not.toHaveAttribute('inert')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('Escape and the close button close the open panel and give the focus back to the menu button', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const panel = document.getElementById('sidebar_menu')
    const toggle = getByLabelText('Open menu')
    fireEvent.click(toggle)
    getByLabelText('Close menu').focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(panel).toHaveAttribute('inert')
    expect(document.activeElement).toBe(toggle)

    fireEvent.click(toggle)
    getByLabelText('Close menu').focus()
    fireEvent.click(getByLabelText('Close menu'))
    expect(panel).toHaveAttribute('inert')
    expect(document.activeElement).toBe(toggle)
  })

  it('implementation notesa click outside the panel closes it and gives the focus back to the menu button, as Escape and the X do', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const panel = document.getElementById('sidebar_menu')
    const toggle = getByLabelText('Open menu')
    fireEvent.click(toggle)
    expect(document.activeElement).toBe(getByLabelText('Close menu'))
    fireEvent.mouseDown(document.body)
    expect(panel).toHaveAttribute('inert')
    expect(toggle.closest('[inert]')).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('implementation notesopen, the focus is in the panel, the page behind is inert and Tab goes round the panel', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const toggle = getByLabelText('Open menu')
    fireEvent.click(toggle)
    expect(document.activeElement).toBe(getByLabelText('Close menu'))
    expect(toggle.closest('[inert]')).not.toBeNull()
    const panel = document.getElementById('sidebar_menu')
    expect(panel.closest('[inert]')).toBeNull()
    const options = panel.querySelectorAll('a[href], button')
    options[options.length - 1].focus()
    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(document.activeElement).toBe(options[0])
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(options[options.length - 1])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(toggle.closest('[inert]')).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('Escape does nothing while the panel is closed', () => {
    const { getByLabelText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    const other = document.createElement('button')
    document.body.appendChild(other)
    other.focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(other)
    expect(document.getElementById('sidebar_menu')).toHaveAttribute('inert')
    expect(getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'false')
    other.remove()
  })

  it('the option of the page on screen is the current one (aria-current page); the others are not', () => {
    window.location = new URL('http://localhost/favorite')
    const { getByText } = renderWithProviders(
      <SidebarMenu auth isHideSignup={false} />
    )
    expect(getByText('Favorites').closest('a')).toHaveAttribute('aria-current', 'page')
    expect(getByText('Orders').closest('a')).not.toHaveAttribute('aria-current')
  })

  describe('the theme hides each option with its key (visibility menu.*)', () => {
    const open = (theme, props = {}) => {
      const utils = renderWithProviders(<SidebarMenu auth isHideSignup={false} {...props} />, { theme })
      fireEvent.click(utils.getAllByLabelText('Open menu').slice(-1)[0])
      return utils
    }
    const hiding = (keys) => themeWithValues((values) => {
      keys.forEach((key) => { values.visibility[key] = false })
      return values
    })
    const options = {
      'menu.home': 'Home',
      'menu.addresses': 'My addresses',
      'menu.cards': 'My cards',
      'menu.language': 'Language',
      'menu.notifications': 'Notifications',
      'menu.loyalty_points': 'Loyalty points',
      'menu.gift_cards': 'Gift cards'
    }

    it('each key hides its option; by default they are there', () => {
      Object.entries(options).forEach(([key, text]) => {
        const shown = open(themeWithValues())
        expect(shown.getByText(text)).toBeInTheDocument()
        shown.unmount()
        const hidden = open(hiding([key]))
        expect(hidden.queryByText(text)).toBeNull()
        hidden.unmount()
      })
    })

    it('menu.greeting hides the greeting (the header row stays)', () => {
      const hidden = open(hiding(['menu.greeting']), { userCustomer: customerFixture })
      expect(hidden.queryByText(/Hi/)).toBeNull()
      expect(hidden.getByLabelText('Close menu')).toBeInTheDocument()
      hidden.unmount()
      const shown = open(themeWithValues(), { userCustomer: customerFixture })
      expect(shown.getByText(/Hi/)).toBeInTheDocument()
    })

    it('loyalty points and gift cards have their own keys: menu.wallet hides only the cash wallet', () => {
      const themed = open(hiding(['menu.wallet']))
      expect(themed.queryByText('Cash wallet')).toBeNull()
      expect(themed.getByText('Loyalty points')).toBeInTheDocument()
      expect(themed.getByText('Gift cards')).toBeInTheDocument()
    })

    it('a group left empty has no title', () => {
      schoolModuleValue.value = '0'
      rewards.offers = '0'
      const theme = hiding(['menu.addresses', 'menu.cards', 'menu.messages', 'menu.language', 'menu.notifications', 'menu.wallet', 'menu.loyalty_points', 'menu.gift_cards'])
      const view = open(theme)
      expect(view.queryByText('My account')).toBeNull()
      expect(view.queryByText('Rewards')).toBeNull()
      // Logout is always in Information
      expect(view.getByText('Information')).toBeInTheDocument()
    })

    it('sidebar_menu.base.show_titles false: no group titles; true by default', () => {
      const theme = themeWithValues((values) => {
        values.components.sidebar_menu.base.show_titles = false
        return values
      })
      const themed = open(theme)
      expect(themed.queryByText('Rewards')).toBeNull()
      expect(themed.queryByText('My account')).toBeNull()
      expect(themed.queryByText('Information')).toBeNull()
      expect(themed.getByText('My addresses')).toBeInTheDocument()
      themed.unmount()
      const shown = open(themeWithValues())
      expect(shown.getByText('Rewards')).toBeInTheDocument()
      expect(shown.getByText('My account')).toBeInTheDocument()
      expect(shown.getByText('Information')).toBeInTheDocument()
    })

    it('sidebar_menu.base.width: the open panel\'s width (never wider than the screen); the default is 340px', () => {
      const width = (value) => themeWithValues((values) => {
        values.components.sidebar_menu.base.width = value
        return values
      })
      // the panel is in document.body: read its width while the menu is mounted
      const panelWidth = (theme) => {
        const view = open(theme)
        const value = document.getElementById('sidebar_menu').style.width
        view.unmount()
        return value
      }
      expect(panelWidth(width(400))).toBe('400px')
      // a width out of its range is clamped
      const [, max] = THEME_COMPILED.values.components.sidebar_menu.base.width.$rule
      expect(panelWidth(width(560))).toBe(`${max}px`)
      expect(panelWidth(themeWithValues())).toBe('340px')
    })

    it('menu.login / menu.signup: hide a guest\'s Sign in and Sign up, each; by default both are there', () => {
      const guest = (theme) => open(theme, { auth: false })
      const shown = guest(themeWithValues())
      expect(shown.getByText('Sign in')).toBeInTheDocument()
      expect(shown.getByText('Sign up')).toBeInTheDocument()
      shown.unmount()
      const noLogin = guest(hiding(['menu.login']))
      expect(noLogin.queryByText('Sign in')).toBeNull()
      expect(noLogin.getByText('Sign up')).toBeInTheDocument()
      noLogin.unmount()
      const noSignup = guest(hiding(['menu.signup']))
      expect(noSignup.queryByText('Sign up')).toBeNull()
      expect(noSignup.getByText('Sign in')).toBeInTheDocument()
    })

    it('menu.loyalty_levels: off by default; on, the user\'s level, a link to the points wallet', () => {
      const hidden = open(themeWithValues())
      expect(hidden.queryByText('Loyalty levels')).toBeNull()
      hidden.unmount()
      const theme = themeWithValues((values) => {
        values.visibility['menu.loyalty_levels'] = true
        return values
      })
      const shown = open(theme)
      const row = shown.getByText('Loyalty levels').closest('a')
      expect(row).toHaveAttribute('href', '/wallets?wallet=credit_point')
      expect(row).toHaveTextContent('Gold')
      fireEvent.click(row)
      expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'wallets', search: '?wallet=credit_point' })
    })

    it('menu.loyalty_levels on alone keeps the Rewards title', () => {
      rewards.offers = '0'
      const theme = themeWithValues((values) => {
        ['menu.wallet', 'menu.loyalty_points', 'menu.gift_cards'].forEach((key) => { values.visibility[key] = false })
        values.visibility['menu.loyalty_levels'] = true
        return values
      })
      const view = open(theme)
      expect(view.getByText('Rewards')).toBeInTheDocument()
      expect(view.getByText('Loyalty levels')).toBeInTheDocument()
    })

    it('Information has no title when Help, Sessions and the connection status are hidden (Logout stays)', () => {
      const view = open(hiding(['menu.help', 'menu.sessions', 'connection_status']))
      expect(view.queryByText('Information')).toBeNull()
      expect(view.getByTestId('logout-button')).toBeInTheDocument()
      view.unmount()
      const oneLeft = open(hiding(['menu.help']))
      expect(oneLeft.getByText('Information')).toBeInTheDocument()
    })
  })

  describe('its buttons and icons are the design system\'s', () => {
    const slotTheme = themeWithValues((values) => {
      values.components.header.slots = { ...values.components.header.slots, menu_toggle: { component: 'button', size: 'lg', color: 'primary', appearance: 'solid' } }
      return values
    })
    const varsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

    it('the toggle is a base icon Button of header.slots.menu_toggle, named, with the menu glyph', () => {
      const { getByLabelText } = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: slotTheme })
      const toggle = getByLabelText('Open menu')
      expect(toggle).toHaveAttribute('data-slot', 'button')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(varsOf(toggle)).toEqual(componentVars(scopedTheme(slotTheme, 'header'), 'button', { size: 'lg', shape: 'icon', color: 'primary', appearance: 'solid' }))
      expect(toggle.querySelector('svg')).toHaveClass('lucide-menu')
      expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })

    it('without a slot it is the neutral ghost md icon button it always was', () => {
      const bare = themeWithValues((values) => { delete values.components.header.slots; return values })
      const { getByLabelText } = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: bare })
      expect(varsOf(getByLabelText('Open menu'))).toEqual(componentVars(scopedTheme(bare, 'header'), 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' }))
    })

    it('the close button is a base icon Button and the panel\'s option icons are the base Icon, decorative', () => {
      const { getByLabelText } = renderWithProviders(<SidebarMenu auth isHideSignup={false} />)
      fireEvent.click(getByLabelText('Open menu'))
      const close = getByLabelText('Close menu')
      expect(close).toHaveAttribute('data-slot', 'button')
      expect(close.querySelector('svg')).toHaveClass('lucide-menu')
      const icons = [...document.querySelectorAll('#sidebar_menu a svg')]
      expect(icons.length).toBeGreaterThan(5)
      icons.forEach((svg) => {
        expect(svg.getAttribute('class')).toMatch(/lucide/)
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  // The menu button sits at the header's side: the left one, the right one with a right-to-left language
  it('keeps the header\'s side space on the button\'s own side in rtl', () => {
    const ltr = renderWithProviders(<SidebarMenu auth isHideSignup={false} />)
    const side = getComputedStyle(ltr.getByLabelText('Open menu').parentElement).paddingLeft
    expect(parseFloat(side)).toBeGreaterThan(0)
    ltr.unmount()
    const { getByLabelText } = renderWithProviders(<SidebarMenu auth isHideSignup={false} />, { theme: { ...themeWithValues(), rtl: true } })
    const rtl = getComputedStyle(getByLabelText('Open menu').parentElement)
    expect(rtl.paddingRight).toBe(side)
    expect(parseFloat(rtl.paddingLeft) || 0).toBe(0)
  })

  // The header is a stacking context (sticky, HEADER_LAYER 10002): a panel inside it
  // would be held under the modals (20001) and the cookie banner whatever its own z-index
  describe('its layer', () => {
    it('the panel and its overlay hang from document.body, outside the header, over its layer', () => {
      const themed = themeWithValues((values) => { values.components.sidebar_menu.base.overlay = 'rgba(0, 0, 0, 0.5)'; return values })
      const { getByLabelText } = renderWithProviders(<div data-app-header=''><SidebarMenu auth isHideSignup={false} /></div>, { theme: themed })
      fireEvent.click(getByLabelText('Open menu'))
      const header = document.querySelector('[data-app-header]')
      const panel = document.getElementById('sidebar_menu')
      const overlay = panel.previousElementSibling
      expect(header.contains(panel)).toBe(false)
      expect(header.contains(overlay)).toBe(false)
      expect(panel.parentElement).toBe(document.body)
      expect(overlay.parentElement).toBe(document.body)
      // SidebarContent 20500 and SidebarOverlay 20499 (SidebarMenu/styles.js); the header's is Header/styles.js
      expect(HEADER_LAYER).toBe(10002)
      expect(Number(getComputedStyle(panel).zIndex)).toBeGreaterThan(HEADER_LAYER)
      expect(Number(getComputedStyle(overlay).zIndex)).toBeGreaterThan(HEADER_LAYER)
    })

    it('a click inside the panel (now outside the menu\'s own box) does not close it; one outside does', () => {
      const { getByLabelText, getByText } = renderWithProviders(<SidebarMenu auth isHideSignup={false} />)
      fireEvent.click(getByLabelText('Open menu'))
      fireEvent.mouseDown(getByText('Favorites'))
      expect(getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'true')
      fireEvent.mouseDown(document.body)
      expect(getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
