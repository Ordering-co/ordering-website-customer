import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { useHistory, useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { AccountInviteOnEnter } from '../AccountInviteOnEnter'

const mocks = vi.hoisted(() => ({ session: { auth: true, user: null }, customer: { user: null }, settings: {} }))

vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [mocks.session, { login: vi.fn() }] }))
vi.mock('~components/contexts/CustomerContext', () => ({ useCustomer: () => [mocks.customer, {}] }))
vi.mock('~/config', () => ({ get default () { return mocks.settings } }))
// the invitation itself has its own tests: here, only whether it is open
vi.mock('../AccountInvite', () => ({
  AccountInvite: ({ entry, open, onClose }) => (open ? <div data-testid='invite' data-entry={entry}><button type='button' onClick={onClose}>close invite</button></div> : null)
}))

const guest = { guest_id: 'g-1', name: 'Ana' }

// A link to the page it is on: the router gives it a new location key
const Reenter = () => {
  const history = useHistory()
  const location = useLocation()
  return <button type='button' onClick={() => history.push(location.pathname)}>enter again</button>
}
const show = (options) => renderWithProviders(<><Reenter /><AccountInviteOnEnter entry='orders' /></>, options)

beforeEach(() => {
  mocks.session = { auth: true, user: { ...guest } }
  mocks.customer = { user: null }
  mocks.settings = {}
})

describe('AccountInviteOnEnter', () => {
  it('opens for a guest when the page is entered, with its entry', () => {
    show()
    expect(screen.getByTestId('invite')).toHaveAttribute('data-entry', 'orders')
  })

  it('does not open for a user with an account, nor for a visitor', () => {
    mocks.session = { auth: true, user: { id: 5, name: 'Ana' } }
    const view = show()
    expect(screen.queryByTestId('invite')).toBeNull()
    view.unmount()
    mocks.session = { auth: false, user: {} }
    show()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it.each([
    ['the kiosk', () => { mocks.settings.use_kiosk = true }, undefined],
    ['the call center\'s customer mode', () => { mocks.customer = { user: { id: 3 } } }, undefined],
    ['a tracking-only site', () => {}, themeWithValues((values) => { values.site.tracking_only = true; return values })]
  ])('does not open in %s', (_name, arrange, theme) => {
    arrange()
    show({ theme })
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('opens again each time the page is entered, even the same route', () => {
    show()
    fireEvent.click(screen.getByText('close invite'))
    expect(screen.queryByTestId('invite')).toBeNull()
    fireEvent.click(screen.getByText('enter again'))
    expect(screen.getByTestId('invite')).toBeInTheDocument()
  })

  it('stays open when the guest becomes a user while it is open (the account was created)', () => {
    const view = show()
    expect(screen.getByTestId('invite')).toBeInTheDocument()
    mocks.session = { auth: true, user: { id: 7 } }
    act(() => { view.rerender(<><Reenter /><AccountInviteOnEnter entry='orders' /></>) })
    expect(screen.getByTestId('invite')).toBeInTheDocument()
  })

  it('and when that new user enters a page it does not open', () => {
    show()
    fireEvent.click(screen.getByText('close invite'))
    mocks.session = { auth: true, user: { id: 7 } }
    fireEvent.click(screen.getByText('enter again'))
    expect(screen.queryByTestId('invite')).toBeNull()
  })
})
