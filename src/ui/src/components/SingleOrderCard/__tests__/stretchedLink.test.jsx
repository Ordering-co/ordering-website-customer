import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
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
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: ({ open, title, children }) => open ? <div>{title}{children}</div> : null }))
vi.mock('~ui/src/components/Confirm', () => ({ Confirm: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))

const INTERACTIVE = 'a[href], button, [role="button"], [role="link"], [tabindex]'

describe('SingleOrderCard: stretched link', () => {
  it('the title is the one button that opens the order; the card is a box', () => {
    const onRedirectPage = vi.fn()
    const { container, getByRole } = renderWithProviders(<SingleOrderCard onRedirectPage={onRedirectPage} />, { theme: themeWithValues() })
    const card = container.querySelector('#order-card')
    const heading = getByRole('heading', { name: 'Pizza Place' })
    const link = within(heading).getByRole('button', { name: 'Pizza Place' })
    expect(link).toHaveAttribute('data-card-link')
    expect(card.querySelectorAll('[data-card-link]')).toHaveLength(1)
    // nothing interactive inside another interactive element
    card.querySelectorAll(INTERACTIVE).forEach((el) => {
      expect(el.parentElement.closest(INTERACTIVE)).toBeNull()
    })
    fireEvent.click(card)
    expect(onRedirectPage).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(onRedirectPage).toHaveBeenCalledWith({ page: 'order_detail', params: { orderId: pastOrder.uuid } })
    expect(cssFor(card)).toContain('position:relative')
  })

  it('favorite, review and reorder work apart: they do not open the order', () => {
    const onRedirectPage = vi.fn()
    const handleFavoriteOrder = vi.fn()
    const handleReorder = vi.fn()
    const { getByRole } = renderWithProviders(
      <SingleOrderCard onRedirectPage={onRedirectPage} handleFavoriteOrder={handleFavoriteOrder} handleReorder={handleReorder} />,
      { theme: themeWithValues() }
    )
    const favorite = getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(favorite)
    expect(handleFavoriteOrder).toHaveBeenCalledWith(true)
    fireEvent.click(getByRole('button', { name: 'Reorder' }))
    expect(handleReorder).toHaveBeenCalledWith(pastOrder.id)
    fireEvent.click(getByRole('button', { name: 'Review' }))
    expect(onRedirectPage).not.toHaveBeenCalled()
  })

  it('without the business name the button is still there, named by the title', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<SingleOrderCard />, { theme: { ...theme, orders: { components: { business_name: { hidden: true } } } } })
    expect(getByRole('button', { name: 'Pizza Place' })).toHaveAttribute('data-card-link')
  })
})
