import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { MessagesListing } from '../index'

// stable props: a new object per render would loop the listing's effects
const emptyList = vi.hoisted(() => ({ orderList: { loading: false, orders: [] }, pagination: { currentPage: 1, totalPages: 1 }, loadMoreOrders: () => {} }))
vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => <UIComponent {...emptyList} {...rest} />
}))
const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }] }))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~components/components/OrderDetails', () => ({ OrderDetails: () => null }))

beforeEach(() => {
  window.localStorage.setItem('user-customer', JSON.stringify({ id: 1 }))
})

// implementation notesthe empty inbox talks about conversations, not about the order history
describe('MessagesListing empty state', () => {
  it('names the conversations, never the order history, and keeps Go to home', () => {
    const { container, getByText, queryByText } = renderWithProviders(<MessagesListing onRedirectPage={vi.fn()} />)
    const empty = container.querySelector("[data-doc-section='messages-empty']")
    expect(empty).toBeInTheDocument()
    expect(getByText('No conversations yet')).toBeInTheDocument()
    expect(getByText('Messages about your orders will appear here.')).toBeInTheDocument()
    expect(queryByText(/order history/i)).toBeNull()
    expect(queryByText(/any orders yet/i)).toBeNull()
    expect(empty.querySelector('svg')).toBeInTheDocument()
    expect(getByText('Go to home').closest('button')).toBeInTheDocument()
  })

  it('Go to home still goes home', () => {
    emit.mockClear()
    const { getByText } = renderWithProviders(<MessagesListing onRedirectPage={vi.fn()} />)
    fireEvent.click(getByText('Go to home'))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'home' })
  })
})
