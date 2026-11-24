import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { MyOrders } from '../index'

const state = vi.hoisted(() => ({ session: { auth: true, user: {} } }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [state.session, { login: vi.fn() }]
}))
vi.mock('~ui/src/components/OrdersOption', () => ({ OrdersOption: () => <div data-testid='orders-option-stub' /> }))
vi.mock('~ui/src/components/GiftCard/GiftCardOrdersList', () => ({ GiftCardOrdersList: () => null }))
// the invitation has its own tests: here, whether the page opens it
vi.mock('../../AccountInvite/AccountInvite', () => ({
  AccountInvite: ({ entry, open }) => (open ? <div data-testid='invite' data-entry={entry} /> : null)
}))

const show = (props) => renderWithProviders(
  <MyOrders onRedirectPage={vi.fn()} onProductRedirect={vi.fn()} businessesSearchList={{ loading: false, result: [] }} {...props} />
)

describe('MyOrders: the invitation to create an account', () => {
  beforeEach(() => {
    state.session = { auth: true, user: { id: 5, guest_id: 'g-1' } }
  })

  it('a guest is invited when My orders is entered', () => {
    show()
    expect(screen.getByTestId('invite')).toHaveAttribute('data-entry', 'orders')
  })

  it('a user with an account is not', () => {
    state.session = { auth: true, user: { id: 5 } }
    show()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('the orders embedded in the search are not the page: no invitation', () => {
    show({ hideOrders: true })
    expect(screen.queryByTestId('invite')).toBeNull()
  })
})
