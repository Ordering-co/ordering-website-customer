import React, { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { NavigationBar } from '../index'

const mocks = vi.hoisted(() => ({ session: { auth: false, user: {} }, emit: vi.fn(), invite: null }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.session, { login: vi.fn() }]
}))
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit: mocks.emit, on: vi.fn(), off: vi.fn() }]
}))
// the setup's loadable never resolves a lazy chunk: React.lazy does
vi.mock('@loadable/component', async () => {
  const { lazy } = await import('react')
  return { default: (loader) => lazy(() => loader().then((component) => ({ default: component }))) }
})
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <div data-testid='login-form' /> }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => <div data-testid='signup-form' /> }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
// the invitation has its own tests: here, what the bar asks of it
vi.mock('~ui/src/components/AccountInvite', () => ({
  AccountInvite: (props) => {
    mocks.invite = props
    return props.open
      ? (
        <div data-testid='invite' data-entry={props.entry}>
          <button type='button' onClick={props.onDone}>invite done</button>
          <button type='button' onClick={props.onClose}>invite close</button>
        </div>
        )
      : null
  }
}))

const show = () => renderWithProviders(<Suspense fallback={null}><NavigationBar /></Suspense>, { initialEntries: ['/search'], routePath: '/search' })

beforeEach(() => {
  mocks.session = { auth: false, user: {} }
  mocks.invite = null
})

describe('NavigationBar: Orders and Profile without a session', () => {
  it('Orders opens the invitation to create an account, not the login', async () => {
    show()
    fireEvent.click(screen.getByText('Orders'))
    expect(await screen.findByTestId('invite')).toHaveAttribute('data-entry', 'orders')
    expect(screen.queryByTestId('login-form')).toBeNull()
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('Profile opens it with its own entry', async () => {
    show()
    fireEvent.click(screen.getByText('Profile'))
    expect(await screen.findByTestId('invite')).toHaveAttribute('data-entry', 'profile')
  })

  it('any other page still opens the login', async () => {
    show()
    fireEvent.click(screen.getByText('Explore'))
    expect(await screen.findByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('once an account is made or the guest logs in, it goes where it was asked', async () => {
    show()
    fireEvent.click(screen.getByText('Profile'))
    fireEvent.click(await screen.findByText('invite done'))
    expect(mocks.emit).toHaveBeenCalledWith('go_to_page', { page: 'profile', search: '?view=account' })
  })

  it('closing it goes nowhere and leaves the bar as it was', async () => {
    show()
    fireEvent.click(screen.getByText('Orders'))
    fireEvent.click(await screen.findByText('invite close'))
    await waitFor(() => expect(screen.queryByTestId('invite')).toBeNull())
    expect(mocks.emit).not.toHaveBeenCalled()
    expect(screen.getByText('Orders')).toBeInTheDocument()
  })
})

describe('NavigationBar: with a session', () => {
  it.each([
    ['a user', { id: 4, name: 'Ana' }],
    ['a guest', { id: 5, guest_id: 'g-1' }]
  ])('%s goes straight to the page, as today', async (_name, user) => {
    mocks.session = { auth: true, user }
    show()
    fireEvent.click(screen.getByText('Orders'))
    fireEvent.click(screen.getByText('Profile'))
    expect(mocks.emit).toHaveBeenNthCalledWith(1, 'go_to_page', { page: 'orders' })
    expect(mocks.emit).toHaveBeenNthCalledWith(2, 'go_to_page', { page: 'profile', search: '?view=account' })
    expect(screen.queryByTestId('invite')).toBeNull()
    expect(screen.queryByTestId('login-form')).toBeNull()
  })
})
