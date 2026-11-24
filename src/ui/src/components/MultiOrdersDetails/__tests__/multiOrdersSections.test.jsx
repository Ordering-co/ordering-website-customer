import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { MultiOrdersDetails } from '../index'

// pages.multi_orders (group main): the theme orders the greeting, the
// customer, the summary and the orders and hides the first two.

const customerFixture = { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', cellphone: '555-0199', address: '1 Main St', photo: 'jane.png' }

vi.mock('~components/components/MultiOrdersDetails', () => ({
  MultiOrdersDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      ordersList={{ loading: false, error: null, orders: [{ ...pastOrder, customer: customerFixture }] }}
      customer={customerFixture}
      ordersSummary={{ total: 15.5 }}
      paymentEvents={[]}
      handleOrderRedirect={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order }) => <div data-doc-section='multi-order-card'>{order.business.name}</div>
}))

const themedWith = (keys, hidden = []) => themeWithValues((values) => {
  values.pages.multi_orders.sections = keys.map((key) => ({ key, visible: !hidden.includes(key) }))
  return values
})

const blocks = (container) => Array.from(container.querySelector('[data-doc-section="multi-order-details"]').children)
  .map((block) => {
    if (block.querySelector('h1') && block.textContent.includes('Hey')) return 'greeting'
    const section = block.getAttribute('data-doc-section')
    return {
      'multi-order-customer': 'customer',
      'multi-order-summary': 'summary',
      'multi-order-card': 'orders'
    }[section] || block.tagName.toLowerCase()
  })
  .filter((key) => ['greeting', 'customer', 'summary', 'orders', 'h1'].includes(key))

describe('multi orders: pages.multi_orders', () => {
  it('the schema defaults: greeting, customer, summary and orders', () => {
    const { container } = renderWithProviders(<MultiOrdersDetails />, { theme: defaultTheme })
    expect(blocks(container)).toEqual(['greeting', 'customer', 'summary', 'orders'])
  })

  it('the theme orders the sections', () => {
    const { container } = renderWithProviders(<MultiOrdersDetails />, {
      theme: themedWith(['orders', 'summary', 'greeting', 'customer'])
    })
    expect(blocks(container)).toEqual(['orders', 'summary', 'greeting', 'customer'])
  })

  it('the greeting and the customer hide (the page keeps its h1); summary and orders do not', () => {
    const { container, getAllByRole } = renderWithProviders(<MultiOrdersDetails />, {
      theme: themedWith(['greeting', 'customer', 'summary', 'orders'], ['greeting', 'customer', 'summary', 'orders'])
    })
    expect(blocks(container)).toEqual(['h1', 'summary', 'orders'])
    const titles = getAllByRole('heading', { level: 1 })
    expect(titles).toHaveLength(1)
    expect(titles[0]).toHaveTextContent('Your Orders')
  })
})

describe('multi orders: confirmation.customer.*', () => {
  const customerBlock = (theme) => renderWithProviders(<MultiOrdersDetails />, { theme })
    .container.querySelector('[data-doc-section="multi-order-customer"]')
  const KEYS = ['photo', 'email', 'phone', 'address']

  it('the keys hide the photo, email, phone and address; the name stays', () => {
    const block = customerBlock(themeWithValues((values) => ({
      ...values,
      visibility: { ...values.visibility, ...Object.fromEntries(KEYS.map((key) => [`confirmation.customer.${key}`, false])) }
    })))
    expect(block).toHaveTextContent('Jane Doe')
    for (const text of ['jane@test.com', '555-0199', '1 Main St', 'Delivery address']) {
      expect(block).not.toHaveTextContent(text)
    }
    expect(block.querySelector('img')).toBeNull()
  })

  it('by default: all of them shown', () => {
    const block = customerBlock(defaultTheme)
    for (const text of ['jane@test.com', '555-0199', '1 Main St']) {
      expect(block).toHaveTextContent(text)
    }
  })

  const withOrders = (orders) => renderWithProviders(
    <MultiOrdersDetails ordersList={{ loading: false, error: null, orders }} />
  )

  it('hides the delivery heading in pickup groups, even if a saved address exists', () => {
    const orders = [pastOrder, { ...pastOrder, id: 42 }].map(order => ({ ...order, delivery_type: 2, customer: customerFixture }))
    const { container, queryByRole, queryByText } = withOrders(orders)
    expect(container.querySelector('[data-doc-section="multi-order-customer"]')).toHaveTextContent('Jane Doe')
    expect(queryByRole('heading', { name: 'Delivery address' })).not.toBeInTheDocument()
    expect(queryByText('1 Main St')).not.toBeInTheDocument()
  })

  it('shows the delivery order’s address when the first order is pickup', () => {
    const { getByRole, getByText, queryByText } = withOrders([
      { ...pastOrder, delivery_type: 2, customer: customerFixture },
      { ...pastOrder, id: 42, delivery_type: 1, customer: { address: '2 Delivery Lane' } }
    ])
    expect(getByRole('heading', { name: 'Delivery address' })).toBeInTheDocument()
    expect(getByText('2 Delivery Lane')).toBeInTheDocument()
    expect(queryByText('1 Main St')).not.toBeInTheDocument()
  })

  it('hides the delivery heading when no delivery order has a usable address', () => {
    const { queryByRole } = withOrders([{ ...pastOrder, delivery_type: 1, customer: { address: '   ' } }])
    expect(queryByRole('heading', { name: 'Delivery address' })).not.toBeInTheDocument()
  })

  // implementation notes review fix: PhotoWrapper (MultiOrdersDetails/styles.js) is shared
  // with SingleOrderCard's business logo ($isLogo, contain); the customer's own
  // photo is not a logo mark and stays cover, as before.
  it('the customer\'s own photo stays cover (not a logo mark)', () => {
    const block = customerBlock(defaultTheme)
    const img = block.querySelector('img')
    expect(img).toHaveAttribute('src', 'jane.png')
    expect(cssFor(img.parentElement)).toContain('object-fit:cover')
    expect(cssFor(img.parentElement)).not.toContain('object-fit:contain')
  })
})
