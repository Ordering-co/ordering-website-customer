import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { OrderDetail } from '../OrderDetail'

// The order detail preview shown from the checkout's "order detail" modal:
// the customer's address only for order types that need it.

vi.mock('~ui/src/components/OrderDetails/OrderBillSection', () => ({
  OrderBillSection: () => null
}))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: () => null
}))

const item = { products: [] }

describe('Checkout OrderDetail: the customer address by order type', () => {
  it('order type 1 (delivery) shows it', () => {
    const { queryByText } = renderWithProviders(
      <OrderDetail item={item} orderType={1} customerAddress='123 Main St' onClick={vi.fn()} />
    )
    expect(queryByText('123 Main St')).toBeInTheDocument()
  })

  it('order type 2 (pickup) hides it', () => {
    const { queryByText } = renderWithProviders(
      <OrderDetail item={item} orderType={2} customerAddress='123 Main St' onClick={vi.fn()} />
    )
    expect(queryByText('123 Main St')).toBeNull()
  })
})
