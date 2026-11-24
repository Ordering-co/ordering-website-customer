import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, getOrderStatus } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { SingleOrderCard } from '../index'

// The date of an order card: a past order's in the site's format (parseDate's
// default, dates_general_format), the one the active orders' ETA uses.
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{
    parseDate: (value, options = {}) => `${value}|${options.outputFormat || 'site'}`,
    parsePrice: (value) => `$${value}`,
    optimizeImage: (value) => value
  }]
}))
vi.mock('~components/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
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

const facts = (container) => container.querySelector('.order-number')?.textContent

describe('SingleOrderCard: the past order\'s date format', () => {
  it('the site\'s format', () => {
    const { container } = renderWithProviders(<SingleOrderCard pastOrders />, { theme: themeWithValues() })
    expect(facts(container)).toContain(`${pastOrder.delivery_datetime_utc}|site`)
  })
})
