import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { orderListFixture, paginationFixture } from '../../__tests__/helpers/ordersTestMocks'
import { LastOrders } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { OrderCard, WrapperImage } from '../styles'

vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => (
    <UIComponent
      orderList={orderListFixture}
      pagination={paginationFixture}
      {...rest}
    />
  )
}))

describe('LastOrders', () => {
  it('renders last order section with business name', () => {
    const { getByText } = renderWithProviders(<LastOrders onRedirect={vi.fn()} />)
    expect(getByText('Last order')).toBeInTheDocument()
    expect(getByText('Pizza Place')).toBeInTheDocument()
  })
})

describe('LastOrders: components.order_card texts', () => {
  const CARD = {
    name: { size: 21, line: 1.38, weight: 700 },
    name_color: '#0A0B0C',
    meta: { size: 13, line: 1.31, weight: 400 },
    meta_color: '#1A1B1C',
    status_color: '#2A2B2C',
    total: { size: 19, line: 1.32, weight: 400 },
    total_color: '#3A3B3C'
  }
  const themed = () => themeWithValues((values) => {
    values.components.order_card.base = { ...values.components.order_card.base, ...CARD }
    return values
  })

  it('the name, facts, status and total of the card (the total keeps its weight)', () => {
    const { container } = renderWithProviders(<LastOrders onRedirect={vi.fn()} />, { theme: themed() })
    const css = cssFor(container.querySelector('button').parentElement).replace(/\s+/g, '')
    expect(css).toMatch(/\.business-name\{(?:font-family:[^;]*;)?font-size:21px;line-height:1\.38;font-weight:700;[^}]*color:#0A0B0C;/)
    expect(css).toMatch(/\.line\{(?:font-family:[^;]*;)?font-size:13px;line-height:1\.31;font-weight:400;[^}]*color:#1A1B1C;/)
    expect(css).toContain('.green{color:#2A2B2C;}')
    expect(css).toMatch(/\.order-price\.line\{(?:font-family:[^;]*;)?font-size:19px;line-height:1\.32;font-weight:600;[^}]*color:#3A3B3C;/)
  })
})

// The orders' card keys (visibility.orders.*) on the help page's last order
describe('LastOrders: visibility orders.*', () => {
  const hiding = (...keys) => themeWithValues((values) => {
    keys.forEach((key) => { values.visibility[key] = false })
    return values
  })
  const card = (theme) => {
    const utils = renderWithProviders(<LastOrders onRedirect={vi.fn()} />, { theme })
    const button = utils.container.querySelector('button')
    const result = {
      logo: !!button.querySelector('.order-header-left'),
      name: !!button.querySelector('.business-name'),
      text: button.textContent,
      // the line of the number and the date
      facts: button.querySelector('.facts')?.textContent ?? null,
      status: !!button.querySelector('.green'),
      type: !!button.querySelector('.order-type'),
      total: !!button.querySelector('.order-price')
    }
    utils.unmount()
    return result
  }

  it('every piece by default', () => {
    const shown = card(themeWithValues())
    expect(shown).toMatchObject({ logo: true, name: true, status: true, type: true, total: true })
    expect(shown.facts).toMatch(/^No\. 41 • \S/)
  })

  it('the theme hides each one; the dots go with them', () => {
    expect(card(hiding('orders.business_logo')).logo).toBe(false)
    expect(card(hiding('orders.business_name')).name).toBe(false)
    expect(card(hiding('orders.total')).total).toBe(false)
    const noNumber = card(hiding('orders.order_number'))
    expect(noNumber.text).not.toContain('No. 41')
    expect(noNumber.facts).not.toContain('•')
    const noDate = card(hiding('orders.date'))
    expect(noDate.facts).toBe('No. 41')
    expect(card(hiding('orders.order_number', 'orders.date')).facts).toBeNull()
    const noStatus = card(hiding('orders.order_status'))
    expect(noStatus).toMatchObject({ status: false, type: true })
    const noType = card(hiding('orders.delivery_type'))
    expect(noType).toMatchObject({ status: true, type: false })
    const none = card(hiding('orders.order_status', 'orders.delivery_type', 'orders.order_number', 'orders.date'))
    expect(none.text).not.toContain('•')
  })
})

describe('LastOrders: fluid sizes', () => {
  it('the row minimum is a multiple of the theme size and the empty photo is the 3xs media level', () => {
    const theme = themeWithValues()
    const { container } = renderWith(theme, <OrderCard>x</OrderCard>)
    expect(container.querySelector('button, a, div[role]').style.minHeight).toBe('calc(1.25 * 56px)')
    const photo = renderWith(theme, <WrapperImage hideContent />)
    expect(cssFor(photo.container.firstChild)).toMatch(/width:\s*70px/)
  })
})
