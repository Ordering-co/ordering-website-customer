import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder, pastOrder, getOrderStatus } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { SingleOrderCard } from '../index'

// The pieces of an order card the theme shows or hides (visibility orders.*)
vi.mock('~components/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={activeOrder}
      getOrderStatus={getOrderStatus}
      handleReorder={vi.fn()}
      onRedirectPage={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('../../OrderDetails/OrderEta', () => ({ OrderEta: () => 'in 20 min' }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: ({ open, title, children }) => open ? <div>{title}{children}</div> : null }))
vi.mock('~ui/src/components/Confirm', () => ({ Confirm: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))

const visible = (visibility) => themeWithValues((values) => {
  values.visibility = { ...values.visibility, ...visibility }
  return values
})
const render = (theme, props = {}) => renderWithProviders(<SingleOrderCard {...props} />, { theme })
const facts = (container) => container.querySelector('.order-number')?.textContent
const logo = (container) => container.querySelector('#order-card [style*="background-image"]')

describe('SingleOrderCard: visibility orders.*', () => {
  it('by default: the number with its date, the count, the type, the total and the logo', () => {
    const { container, getByText } = render(themeWithValues())
    expect(facts(container)).toBe('Order No. 43 • in 20 min')
    expect(getByText('1 Product')).toBeInTheDocument()
    expect(container.querySelector('.total')).not.toBeNull()
    expect(logo(container)).not.toBeNull()
  })

  it('orders.date hides the date alone, orders.order_number the number alone', () => {
    const noDate = render(visible({ 'orders.date': false }))
    expect(facts(noDate.container)).toBe('Order No. 43')
    noDate.unmount()
    const noNumber = render(visible({ 'orders.order_number': false }))
    expect(facts(noNumber.container)).toBe('in 20 min')
    noNumber.unmount()
    const neither = render(visible({ 'orders.order_number': false, 'orders.date': false }))
    expect(neither.container.querySelector('.order-number')).toBeNull()
  })

  it('a past order\'s date follows orders.date too', () => {
    const { container } = render(visible({ 'orders.order_number': false }), { order: pastOrder, pastOrders: true })
    expect(facts(container)).toBe(pastOrder.delivery_datetime_utc)
  })

  it('orders.products_count, orders.delivery_type and orders.total hide their pieces', () => {
    // the count, the status and the type
    const pieces = (container) => container.querySelector('.order-status').parentElement.querySelectorAll('p')
    const shown = render(themeWithValues())
    expect(pieces(shown.container)).toHaveLength(3)
    shown.unmount()
    const { container, queryByText } = render(visible({ 'orders.products_count': false, 'orders.delivery_type': false, 'orders.total': false }))
    expect(queryByText('1 Product')).toBeNull()
    expect(pieces(container)).toHaveLength(1)
    expect(container.querySelector('.total')).toBeNull()
  })

  it('orders.business_logo hides the logo', () => {
    const { container } = render(visible({ 'orders.business_logo': false }))
    expect(logo(container)).toBeNull()
  })
})
