import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { serviceProductFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { ServiceForm } from '../index'

// implementation notes"Book" and "Login / Sign Up" / "Sold out" of a service are the design system's
// Button (md: Book primary solid, the other outline); a request in flight is `loading`.

// a professional with a schedule (every day closed: no time is picked, so "Book" asks for one)
const PRO = vi.hoisted(() => ({ id: 1, name: 'Alex', lastname: 'Pro', busy_times: [], schedule: Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] })) }))
const state = vi.hoisted(() => ({ auth: true, orderLoading: false, actionLoading: false, soldOut: false, handleSave: null }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: state.auth, user: { id: 1 } }, { login: vi.fn() }]
}))
// the day chips read t('DAY<n>') without a fallback: the key stands in
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ loading: false }, (key, fallback) => fallback ?? key]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1 }, carts: {}, loading: state.orderLoading }, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: serviceProductFixture, loading: false, error: null }}
      professionalListState={{ loading: false, professionals: [PRO] }}
      professionalSelected={PRO}
      handleSave={state.handleSave}
      isSoldOut={state.soldOut}
      maxProductQuantity={99}
      handleCreateGuestUser={vi.fn()}
      business={{ id: 1 }}
      productCart={null}
      actionStatus={{ loading: state.actionLoading }}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <div data-testid='login-form' /> }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, content }) => (open ? <div role='alert'>{content}</div> : null)
}))

const theme = themeWithValues()
const look = (appearance) => componentVars(theme, 'button', { size: 'md', color: 'primary', appearance })
const expectLook = (button, appearance) => {
  ;['--ui-button-height', '--ui-button-background', '--ui-button-border'].forEach((name) => {
    expect(button.style.getPropertyValue(name)).toBe(look(appearance)[name] ?? '')
  })
}
const render = () => renderWithProviders(<ServiceForm businessSlug='demo-store' />, { theme })

beforeEach(() => {
  Object.assign(state, { auth: true, orderLoading: false, actionLoading: false, soldOut: false, handleSave: vi.fn() })
})

describe('ServiceForm: "Book" is the base Button', () => {
  it('primary solid md; a click runs the booking (without a time it asks for one)', () => {
    const { getByRole } = render()
    const book = getByRole('button', { name: 'Book' })
    expect(book).toHaveAttribute('data-slot', 'button')
    expect(book).toHaveAttribute('data-doc-control', 'appointment-book')
    expect(book).not.toHaveAttribute('aria-busy')
    expect(book).toBeEnabled()
    expectLook(book, 'solid')
    fireEvent.click(book)
    expect(getByRole('alert')).toHaveTextContent('The field schedule is required')
    expect(state.handleSave).not.toHaveBeenCalled()
  })

  it('while the order updates: loading (busy, keeps its name and focus), no click', () => {
    state.orderLoading = true
    const { getByRole, queryByRole } = render()
    const book = getByRole('button', { name: 'Book' })
    expect(book).toHaveAttribute('aria-busy', 'true')
    expect(book).toHaveAttribute('data-loading')
    expect(book.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    fireEvent.click(book)
    // the booking did not run: no "schedule required" alert either
    expect(queryByRole('alert')).toBeNull()
    expect(state.handleSave).not.toHaveBeenCalled()
  })
})

describe('ServiceForm: "Login / Sign Up" and "Sold out" are the base Button', () => {
  it('a guest: outline md, it opens the login', () => {
    state.auth = false
    const { getByRole, queryByRole, getByTestId } = render()
    expect(queryByRole('button', { name: 'Book' })).toBeNull()
    const login = getByRole('button', { name: 'Login / Sign Up' })
    expect(login).toHaveAttribute('data-slot', 'button')
    // it fills the slot of the bar, which has no class hook on the Button
    expect(login).toHaveClass('ui:w-full')
    expect(login).not.toHaveClass('add')
    expectLook(login, 'outline')
    fireEvent.click(login)
    expect(getByTestId('login-form')).toBeInTheDocument()
  })

  it('sold out: disabled, with its class; while the guest is created: loading', () => {
    state.soldOut = true
    const sold = render()
    const button = sold.getByRole('button', { name: 'Sold out' })
    expect(button).toBeDisabled()
    expect(cssFor(button.parentElement)).toMatch(/pointer-events:\s*none/)
    expect(button).not.toHaveClass('soldout')
    sold.unmount()

    Object.assign(state, { soldOut: false, auth: false, actionLoading: true })
    const busy = render().getByRole('button', { name: 'Login / Sign Up' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })
})
