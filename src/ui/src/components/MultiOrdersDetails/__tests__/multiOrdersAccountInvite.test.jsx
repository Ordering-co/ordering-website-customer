import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { MultiOrdersDetails } from '../index'

// implementation notesthe confirmation of several orders (/multi-orders/:id) invites a guest like the single one
const state = vi.hoisted(() => ({ session: { auth: true, user: {} }, ordersList: { loading: false, error: null, orders: [] } }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [state.session, { login: vi.fn() }]
}))
vi.mock('~components/components/MultiOrdersDetails', () => ({
  MultiOrdersDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      ordersList={state.ordersList}
      customer={{ name: 'Jane', lastname: 'Doe' }}
      ordersSummary={{ total: 15.5 }}
      paymentEvents={[]}
      handleOrderRedirect={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order }) => <div>{order.business.name}</div>
}))
// the invitation has its own tests: here, whether the page opens it
vi.mock('../../AccountInvite/AccountInvite', () => ({
  AccountInvite: ({ entry, open }) => (open ? <div data-testid='invite' data-entry={entry} /> : null)
}))

const render = ({ user, ordersList }) => {
  state.session = { auth: true, user }
  state.ordersList = ordersList
  return renderWithProviders(<MultiOrdersDetails />)
}

describe('MultiOrdersDetails · account invitation', () => {
  it('invites a guest once the orders are there', () => {
    render({ user: { id: 7, guest_id: 'g-1' }, ordersList: { loading: false, error: null, orders: [pastOrder] } })
    expect(screen.getByTestId('invite')).toHaveAttribute('data-entry', 'confirmation')
  })

  it('does not invite a user with an account', () => {
    render({ user: { id: 7 }, ordersList: { loading: false, error: null, orders: [pastOrder] } })
    expect(screen.queryByTestId('invite')).not.toBeInTheDocument()
  })

  it('waits for the orders, and does not invite on an error', () => {
    render({ user: { id: 7, guest_id: 'g-1' }, ordersList: { loading: true, error: null, orders: [] } })
    expect(screen.queryByTestId('invite')).not.toBeInTheDocument()
    render({ user: { id: 7, guest_id: 'g-1' }, ordersList: { loading: false, error: ['ERROR'], orders: [] } })
    expect(screen.queryByTestId('invite')).not.toBeInTheDocument()
  })
})
