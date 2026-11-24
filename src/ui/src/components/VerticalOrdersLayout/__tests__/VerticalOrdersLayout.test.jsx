import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, paginationFixture, getOrderStatus } from '../../__tests__/helpers/ordersTestMocks'
import { VerticalOrdersLayout } from '../index'
import { cardOnPageColor } from '../styles'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order, setOrderSelected }) => (
    <div data-testid='order-card'>
      {order.business.name}
      <button type='button' onClick={() => setOrderSelected(order)}>Review</button>
    </div>
  )
}))

vi.mock('~ui/src/components/ReviewOrder', () => ({
  ReviewOrder: () => <div>Review order modal</div>
}))

vi.mock('~ui/src/components/ReviewProduct', () => ({
  ReviewProduct: () => null
}))

vi.mock('~ui/src/components/ReviewDriver', () => ({
  ReviewDriver: () => null
}))

describe('VerticalOrdersLayout', () => {
  it('renders orders and load more button', () => {
    const { getByText } = renderWithProviders(
      <VerticalOrdersLayout
        orders={[pastOrder]}
        pagination={paginationFixture}
        loadMoreOrders={vi.fn()}
        getOrderStatus={getOrderStatus}
        handleUpdateOrderList={vi.fn()}
        setRefreshOrders={vi.fn()}
      />
    )
    expect(getByText('Pizza Place')).toBeInTheDocument()
    expect(getByText('Load more orders')).toBeInTheDocument()
  })

  it('the review opens in a dialog named by its step; its close closes it', async () => {
    const setRefreshOrders = vi.fn()
    const view = renderWithProviders(
      <VerticalOrdersLayout
        orders={[{ ...pastOrder, review: null }]}
        pagination={paginationFixture}
        loadMoreOrders={vi.fn()}
        getOrderStatus={getOrderStatus}
        handleUpdateOrderList={vi.fn()}
        setRefreshOrders={setRefreshOrders}
      />
    )
    fireEvent.click(view.getByRole('button', { name: 'Review' }))
    const dialog = await view.findByRole('dialog', { name: 'Review order' })
    expect(dialog).toHaveTextContent('Review order modal')
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
    expect(setRefreshOrders).toHaveBeenCalledWith(true)
  })
})

describe('VerticalOrdersLayout: load more', () => {
  const draw = (props = {}, theme = themeWithValues()) => renderWithProviders(
    <VerticalOrdersLayout
      orders={[pastOrder]}
      pagination={paginationFixture}
      loadMoreOrders={vi.fn()}
      getOrderStatus={getOrderStatus}
      handleUpdateOrderList={vi.fn()}
      setRefreshOrders={vi.fn()}
      {...props}
    />,
    { theme }
  )
  const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

  it('is the base Button of the orders_page.load_more slot (primary outline md by default) and loads on click', () => {
    const loadMoreOrders = vi.fn()
    const theme = themeWithValues((values) => {
      values.components.orders_page.slots.load_more = { component: 'button', size: 'lg', appearance: 'tonal', color: 'secondary', shape: null }
      return values
    })
    const { getByRole } = draw({ loadMoreOrders }, theme)
    const button = getByRole('button', { name: 'Load more orders' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('data-doc-control', 'order-history-load-more')
    expect(vars(button)).toEqual(componentVars(theme, 'button', { size: 'lg', color: 'secondary', appearance: 'tonal' }))
    fireEvent.click(button)
    expect(loadMoreOrders).toHaveBeenCalledTimes(1)
  })

  it('without a slot it is primary outline md; while it loads it keeps its name, is busy and does not load', () => {
    const theme = themeWithValues()
    const { getByRole, unmount } = draw({}, theme)
    expect(vars(getByRole('button', { name: 'Load more orders' }))).toEqual(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' }))
    unmount()
    // loading keeps the label, shows the spinner and answers no click
    const loadMoreOrders = vi.fn()
    const loading = draw({ isLoadingMore: true, loadMoreOrders }, theme)
    const busy = loading.getByRole('button', { name: 'Load more orders' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(busy.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    fireEvent.click(busy)
    expect(loadMoreOrders).not.toHaveBeenCalled()
  })
})

describe('cardOnPageColor', () => {
  it('a card of the page\'s own color (order_card, else surface), whatever the hex is', () => {
    expect(cardOnPageColor(themeWithValues())).toBe(true)
    const dark = themeWithValues((values) => {
      values.tokens.color.background = '#101010'
      values.tokens.color.surface = '#101010'
      values.components.order_card.base.background = '#101010'
      return values
    })
    expect(cardOnPageColor(dark)).toBe(true)
  })

  it('a card of another color than the page\'s', () => {
    const tinted = themeWithValues((values) => {
      values.tokens.color.background = '#F2F2F2'
      return values
    })
    expect(cardOnPageColor(tinted)).toBe(false)
  })
})
