import React from 'react'
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { HomeHero } from '../index'

// implementation notesthe hero's Search and the account's Login / Sign up (phone) are the design
// system's Button, each with the options of its slot (home_hero.slots.search / login / signup).

const order = vi.hoisted(() => ({ location: null }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: false, loading: false, user: {} }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { address: order.location ? { address: '1 Main', location: order.location } : {} }, loading: false, carts: {} }, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 400, height: 800 }) }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, onRemove: authModal }) => (open ? <div data-testid={authModal ? 'auth-modal' : 'modal'}>{children}</div> : null)
}))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <div data-testid='login-form' /> }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => <div data-testid='signup-form' /> }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

// a phone (the account buttons show below 576px; themeVisible reads the window)
const realInnerWidth = window.innerWidth
const setInnerWidth = (value) => Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value })
beforeAll(() => setInnerWidth(400))
afterAll(() => setInnerWidth(realInnerWidth))
beforeEach(() => { order.location = null })

const varOf = (el, name) => el.style.getPropertyValue(name)
const LOOK = ['--ui-button-height', '--ui-button-padding-x', '--ui-button-background', '--ui-button-color', '--ui-button-border']
const expectLook = (button, theme, options) => {
  const vars = componentVars(theme, 'button', options)
  LOOK.forEach((name) => expect(varOf(button, name)).toBe(vars[name] ?? ''))
}
const searchOf = (view) => view.container.querySelector('[data-doc-control="website-find-businesses"]')

describe('HomeHero: Search, Login and Sign up are the base Button', () => {
  it('by default: Search primary solid lg, Login primary solid md, Sign up primary tonal md', () => {
    const theme = themeWithValues()
    const view = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme })
    const search = searchOf(view)
    expect(search).toHaveAttribute('data-slot', 'button')
    expect(search).toHaveAttribute('name', 'find-business')
    const slot = (name) => theme.values.components.home_hero.slots[name] ?? {}
    expectLook(search, theme, { size: slot('search').size ?? 'lg', color: slot('search').color ?? 'primary', appearance: slot('search').appearance ?? 'solid' })
    const login = view.getByRole('button', { name: 'login' })
    const signup = view.getByRole('button', { name: 'Sign up' })
    ;[login, signup].forEach((button) => expect(button).toHaveAttribute('data-slot', 'button'))
    expectLook(login, theme, { size: slot('login').size ?? 'md', color: slot('login').color ?? 'primary', appearance: slot('login').appearance ?? 'solid' })
    expectLook(signup, theme, { size: slot('signup').size ?? 'md', color: slot('signup').color ?? 'primary', appearance: slot('signup').appearance ?? 'tonal' })
  })

  it('the slots follow the theme: another size and color for Search and Sign up', () => {
    const theme = themeWithValues((values) => {
      values.components.home_hero.slots.search = { ...values.components.home_hero.slots.search, size: 'sm', color: 'secondary', appearance: 'outline' }
      values.components.home_hero.slots.signup = { ...values.components.home_hero.slots.signup, color: 'secondary', appearance: 'solid' }
      return values
    })
    const view = renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme })
    expectLook(searchOf(view), theme, { size: 'sm', color: 'secondary', appearance: 'outline' })
    expectLook(view.getByRole('button', { name: 'Sign up' }), theme, { size: 'md', color: 'secondary', appearance: 'solid' })
  })

  it('Search finds the businesses (asks for an address first); Login and Sign up open their forms', () => {
    const onFindBusiness = vi.fn()
    const view = renderWithProviders(<HomeHero onFindBusiness={onFindBusiness} />, { theme: themeWithValues() })
    fireEvent.click(searchOf(view))
    expect(view.getByTestId('address-form')).toBeInTheDocument()
    expect(onFindBusiness).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'login' }))
    expect(view.getByTestId('login-form')).toBeInTheDocument()
    view.unmount()

    order.location = { lat: 1, lng: 2 }
    const located = renderWithProviders(<HomeHero onFindBusiness={onFindBusiness} />, { theme: themeWithValues() })
    fireEvent.click(searchOf(located))
    expect(onFindBusiness).toHaveBeenCalledTimes(1)
    fireEvent.click(located.getByRole('button', { name: 'Sign up' }))
    expect(located.getByTestId('signup-form')).toBeInTheDocument()
  })
})
