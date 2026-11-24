import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, getOrderStatus } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { SingleOrderCard } from '../index'

vi.mock('~components/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
      pastOrders
      getOrderStatus={getOrderStatus}
      handleReorder={vi.fn()}
      onRedirectPage={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: () => null
}))

vi.mock('~ui/src/components/ReviewOrder', () => ({
  ReviewOrder: () => null
}))

vi.mock('~ui/src/components/ReviewProduct', () => ({
  ReviewProduct: () => null
}))

vi.mock('~ui/src/components/ReviewDriver', () => ({
  ReviewDriver: () => null
}))

describe('SingleOrderCard', () => {
  it('renders business name and reorder action', () => {
    const { getByText } = renderWithProviders(<SingleOrderCard />)
    expect(getByText('Pizza Place')).toBeInTheDocument()
    expect(getByText('Reorder')).toBeInTheDocument()
  })

  it('a group order is titled with its group number', () => {
    const order = { ...pastOrder, cart_group_id: 12, business: [pastOrder.business, { ...pastOrder.business, id: 2, name: 'Sushi Bar' }] }
    const { getByText } = renderWithProviders(<SingleOrderCard order={order} />)
    expect(getByText('Group Order No. 12')).toBeInTheDocument()
  })

  it('the favorite is a named toggle button', () => {
    const handleFavoriteOrder = vi.fn()
    const { getByRole } = renderWithProviders(<SingleOrderCard handleFavoriteOrder={handleFavoriteOrder} />)
    const favorite = getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('type', 'button')
    expect(favorite).toHaveAttribute('aria-pressed', String(!!pastOrder.favorite))
    favorite.click()
    expect(handleFavoriteOrder).toHaveBeenCalledWith(!pastOrder.favorite)
  })

  it('a long business name wraps to 2 lines before it is cut, never on one line with "…"; its text is the title', () => {
    const longName = 'The Extraordinarily Long Restaurant Name Kitchen & Bar Downtown'
    const order = { ...pastOrder, business: { ...pastOrder.business, name: longName } }
    const { getByText } = renderWithProviders(<SingleOrderCard order={order} />)
    const h3 = getByText(longName).closest('h3')
    expect(h3).toHaveAttribute('title', longName)
    const cls = [...h3.parentElement.classList].pop()
    const css = cssFor(h3).replace(/\s+/g, '')
    const h3Rule = css.match(new RegExp(`\\.${cls}h3\\{[^}]*\\}`))[0]
    expect(h3Rule).toMatch(/-webkit-line-clamp:2;/)
    expect(h3Rule).not.toMatch(/white-space:nowrap/)
  })

  it('Review opens the review in a base dialog named by its title; its close closes it', async () => {
    const order = { ...pastOrder, review: null }
    renderWithProviders(<SingleOrderCard order={order} />)
    fireEvent.click(screen.getByText('Review'))
    const dialog = await screen.findByRole('dialog', { name: 'Review your order' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('the card is lg inside, its texts the theme\'s', () => {
    const theme = themeWithValues()
    const { getByText } = renderWithProviders(<SingleOrderCard />, { theme })
    const card = getByText('Pizza Place').closest('#order-card')
    expect(cssFor(card)).toContain(`padding:${theme.values.tokens.space.lg}px`)
  })
})
