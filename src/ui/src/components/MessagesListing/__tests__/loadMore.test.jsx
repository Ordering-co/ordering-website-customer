import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { orderListFixture } from '../../__tests__/helpers/ordersTestMocks'
import { MessagesListing } from '../index'

// The list's «Load more orders»: the base Button, primary outline md
// (stable objects: the list's effects run again with a new one at every render)
const listState = vi.hoisted(() => ({ orderList: null, pagination: { currentPage: 1, totalPages: 2 }, loadMoreOrders: null }))

vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => (
    <UIComponent
      orderList={listState.orderList}
      pagination={listState.pagination}
      loadMoreOrders={listState.loadMoreOrders}
      small
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~components/components/OrderDetails', () => ({ OrderDetails: () => null }))

const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe('MessagesListing: load more', () => {
  it('is the base Button (primary outline md), named, and loads on click', () => {
    listState.orderList = orderListFixture
    listState.loadMoreOrders = vi.fn()
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<MessagesListing />, { theme })
    const button = getByRole('button', { name: 'Load more orders' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).not.toBeDisabled()
    expect(vars(button)).toEqual(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' }))
    fireEvent.click(button)
    expect(listState.loadMoreOrders).toHaveBeenCalledTimes(1)
  })

  it('while the list loads it keeps its name, is busy and does not load', () => {
    listState.orderList = { ...orderListFixture, loading: true }
    listState.loadMoreOrders = vi.fn()
    const { getByRole } = renderWithProviders(<MessagesListing />, { theme: themeWithValues() })
    const button = getByRole('button', { name: 'Load more orders' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(listState.loadMoreOrders).not.toHaveBeenCalled()
  })
})
