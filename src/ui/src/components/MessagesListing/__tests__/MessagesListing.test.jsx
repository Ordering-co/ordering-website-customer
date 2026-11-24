import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { orderListFixture } from '../../__tests__/helpers/ordersTestMocks'
import { MessagesListing } from '../index'
import { DriverName } from '../styles'

vi.mock('~components/components/OrderList', () => ({
  // the list says how it is sorted
  OrderList: ({ UIComponent, ...rest }) => (
    <div data-testid='order-list' data-order-by={rest.orderBy}>
      <UIComponent
        orderList={orderListFixture}
        pagination={{ currentPage: 1, totalPages: 1 }}
        loadMoreOrders={vi.fn()}
        handleOrderCardClick={rest.handleOrderCardClick}
        selectedOrderCard={rest.selectedOrderCard}
        small
        {...rest}
      />
    </div>
  )
}))

vi.mock('~ui/src/components/Messages', () => ({
  Messages: () => <div data-testid='messages-pane'>Messages pane</div>
}))

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ loading: false, order: orderListFixture.orders[0] }}
      messages={[]}
      setMessages={vi.fn()}
      readMessages={vi.fn()}
      {...rest}
    />
  )
}))

beforeEach(() => {
  window.localStorage.setItem('user-customer', JSON.stringify({ id: 1 }))
})

describe('MessagesListing', () => {
  it('renders messages listing header', () => {
    const { getByText } = renderWithProviders(<MessagesListing onRedirectPage={vi.fn()} />)
    expect(getByText('Messages')).toBeInTheDocument()
  })
})

const withVisibility = (visibility) => themeWithValues((values) => {
  Object.assign(values.visibility, visibility)
  return values
})
const renderInbox = (theme) => renderWithProviders(<MessagesListing onRedirectPage={vi.fn()} />, { theme })
const card = (container) => container.querySelector('[data-doc-item="messages-order"]')

describe('MessagesListing: visibility messages.sort_tabs', () => {
  it('the schema: hidden by default, the newest chats first', () => {
    expect(schemaDefault('visibility.messages.sort_tabs')).toBe(false)
    const { queryByText, getByTestId } = renderInbox(themeWithValues())
    expect(queryByText('Newest')).toBeNull()
    expect(getByTestId('order-list')).toHaveAttribute('data-order-by', 'last_direct_message_at')
  })

  it('on: the tabs sort the chats by the newest message or by the order number', () => {
    const { getByText, getByTestId } = renderInbox(withVisibility({ 'messages.sort_tabs': true }))
    expect(getByText('Newest')).toBeInTheDocument()
    fireEvent.click(getByText('Order number'))
    expect(getByTestId('order-list')).toHaveAttribute('data-order-by', 'id')
    fireEvent.click(getByText('Newest'))
    expect(getByTestId('order-list')).toHaveAttribute('data-order-by', 'last_direct_message_at')
  })
})

describe('MessagesListing: visibility messages.card_details', () => {
  it('the schema: hidden by default, the card with its big logo', () => {
    expect(schemaDefault('visibility.messages.card_details')).toBe(false)
    const { container } = renderInbox(themeWithValues())
    expect(card(container).querySelector('.info')).toBeNull()
  })

  it('on: the store (name and city) and the driver under the card', () => {
    const { container } = renderInbox(withVisibility({ 'messages.card_details': true }))
    const info = card(container).querySelector('.info')
    expect(info).not.toBeNull()
    expect(info.textContent).toContain('Pizza Place')
  })

  it('the business name wraps to 2 lines before it is cut, never on one line with "…"; its text is the title', () => {
    const { container } = renderInbox(withVisibility({ 'messages.card_details': true }))
    const name = card(container).querySelector('.info p.bold')
    expect(name).toHaveAttribute('title', 'Pizza Place')
    const css = injectedCss().replace(/\s+/g, '')
    const infoCls = [...name.closest('.info').parentElement.classList].pop()
    const rule = css.match(new RegExp(`\\.${infoCls}p\\{[^}]*\\}`))[0]
    expect(rule).toMatch(/-webkit-line-clamp:2;/)
    expect(rule).not.toMatch(/white-space:nowrap/)
  })

  it('DriverName wraps to 2 lines before it is cut, never on one line with "…"; its text is the title', () => {
    const { getByText } = renderWith(themeWithValues(), <DriverName>Alexandra Driverson-Longname</DriverName>)
    const name = getByText('Alexandra Driverson-Longname')
    expect(name).toHaveAttribute('title', 'Alexandra Driverson-Longname')
    const css = injectedCss().replace(/\s+/g, '')
    const cls = [...name.classList].pop()
    expect(css).toMatch(new RegExp(`\\.${cls}\\{[^}]*-webkit-line-clamp:2;`))
    expect(css).not.toMatch(new RegExp(`\\.${cls}\\{[^}]*white-space:nowrap`))
  })
})

// The orders' card keys (visibility.orders.*) on the chats' cards
describe('MessagesListing: visibility orders.*', () => {
  const pieces = (theme) => {
    const utils = renderInbox(theme)
    const el = card(utils.container)
    const result = {
      logo: !!el.querySelector('.order-header-left'),
      name: !!el.querySelector('.business-name'),
      facts: el.querySelector('.facts')?.textContent ?? null,
      status: !!el.querySelector('.green'),
      type: !!el.querySelector('.order-type')
    }
    utils.unmount()
    return result
  }

  it('every piece by default', () => {
    const shown = pieces(themeWithValues())
    expect(shown).toMatchObject({ logo: true, name: true, status: true, type: true })
    expect(shown.facts).toMatch(/^No\. 41 • \S/)
  })

  it('the theme hides each one; the dots go with them', () => {
    expect(pieces(withVisibility({ 'orders.business_logo': false })).logo).toBe(false)
    expect(pieces(withVisibility({ 'orders.business_name': false })).name).toBe(false)
    expect(pieces(withVisibility({ 'orders.date': false })).facts).toBe('No. 41')
    expect(pieces(withVisibility({ 'orders.order_number': false })).facts).not.toContain('No.')
    expect(pieces(withVisibility({ 'orders.order_number': false, 'orders.date': false })).facts).toBeNull()
    expect(pieces(withVisibility({ 'orders.order_status': false }))).toMatchObject({ status: false, type: true })
    expect(pieces(withVisibility({ 'orders.delivery_type': false }))).toMatchObject({ status: true, type: false })
  })
})
