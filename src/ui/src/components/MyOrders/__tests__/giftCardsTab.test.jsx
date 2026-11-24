import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { MyOrders } from '../index'

// a site with gift cards: the wallet on, the store's gift cards not off
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { cash_wallet: { value: '1' }, wallet_cash_enabled: { value: '1' } } }]
}))
vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...rest}
      orderList={{ loading: false, error: null, orders: [pastOrder] }}
      pagination={{ currentPage: 1, totalPages: 1 }}
      reorderState={{ loading: false, error: null, result: null }}
      businesses={{ loading: false, result: [] }}
      products={[]}
      professionals={[]}
      handleReorder={vi.fn()}
      handleUpdateOrderList={vi.fn()}
      loadMoreOrders={vi.fn()}
      loadOrders={vi.fn()}
      getPage={vi.fn()}
    />
  )
}))
vi.mock('~ui/src/components/SingleOrderCard', () => ({ SingleOrderCard: () => <div data-testid='order-card' /> }))
vi.mock('~ui/src/components/GiftCard/GiftCardOrdersList', () => ({
  GiftCardOrdersList: () => <div data-testid='gift-card-orders' />
}))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))

const renderPage = (theme) => renderWithProviders(
  <MyOrders onRedirectPage={vi.fn()} onProductRedirect={vi.fn()} businessesSearchList={{ loading: false, result: [] }} />,
  { theme }
)
const giftTab = (container) => container.querySelector('[data-doc-tab="giftCards"]')

describe('/profile/orders: visibility orders.gift_cards_tab', () => {
  it('the schema: shown by default, and it opens the gift cards', () => {
    expect(schemaDefault('visibility.orders.gift_cards_tab')).toBe(true)
    const { container, getByTestId } = renderPage(themeWithValues())
    const tab = giftTab(container)
    expect(tab).not.toBeNull()
    fireEvent.click(tab)
    expect(getByTestId('gift-card-orders')).toBeInTheDocument()
  })

  it('the theme hides the tab; the other tabs stay', () => {
    const { container } = renderPage(themeWithValues((values) => { values.visibility['orders.gift_cards_tab'] = false; return values }))
    expect(giftTab(container)).toBeNull()
    expect(container.querySelector('[data-doc-tab="orders"]')).not.toBeNull()
  })
})
