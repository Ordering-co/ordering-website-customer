import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderDetails } from '../index'

const orderState = vi.hoisted(() => ({ status: 9 }))

const orderFixture = {
  ...activeOrder,
  products: [],
  taxes: [],
  subtotal: 15.5,
  business: {
    ...activeOrder.business,
    location: { lat: 40.71, lng: -74.0 }
  },
  customer: { location: { lat: 40.72, lng: -74.01 } }
}

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ loading: false, error: null, order: { ...orderFixture, status: orderState.status }, businessData: orderFixture.business }}
      messages={{ messages: [] }}
      reorderState={{ loading: false, error: null, result: null }}
      loyaltyPlansState={{ result: [] }}
      setMessages={vi.fn()}
      readMessages={vi.fn()}
      driverLocation={null}
      getOrder={vi.fn()}
      handleReorder={vi.fn()}
      handleBusinessRedirect={vi.fn()}
      handleOrderRedirect={vi.fn()}
      onGoBack={vi.fn()}
      orderTypes={[{ value: 1, text: 'Delivery' }]}
      googleMapsControls={{}}
      {...rest}
    />
  )
}))

vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps-stub' />
}))

vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({
  useDriverLocationInterpolation: vi.fn()
}))

vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({
  OrderEta: () => <span>ETA</span>
}))

vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: () => null
}))

vi.mock('~ui/src/components/TaxInformation', () => ({
  TaxInformation: () => null
}))

vi.mock('~ui/src/components/Messages', () => ({
  Messages: () => null
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

vi.mock('~ui/src/components/ReviewProfessional', () => ({
  ReviewProfessional: () => null
}))

vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({
  SendGiftCard: () => null
}))

// the statuses of the order: its text and percentage
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => ({
      9: { value: 'On the way', percentage: 70 },
      11: { value: 'Delivered', percentage: 100 },
      2: { value: 'Rejected', percentage: 0 }
    })[status],
    getOrderStatus: () => null
  })
}))

const completeTheme = themeWithValues()
const progress = completeTheme.values.components.progress

// CSS rules of every class of the element (the bar and the screen's margin)
const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}{`))).join('}')
}

describe('OrderDetails status bar', () => {
  it('components.progress lg, active while in progress', () => {
    orderState.status = 9
    const { getByRole } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme: completeTheme })
    const bar = getByRole('progressbar', { name: 'On the way' })
    expect(bar).toHaveAttribute('aria-valuenow', '70')
    expect(rulesOf(bar)).toContain(`height:${progress.sizes.lg.height}px`)
    // the screen's margin: px-map lg / sm (was 18px / 8px)
    expect(rulesOf(bar)).toContain(`margin:${completeTheme.css.tokens.space.lg} 0px ${completeTheme.css.tokens.space.sm}`)
    expect(cssFor(bar.firstChild)).toContain(`background:${progress.base.fill}`)
    expect(cssFor(bar.firstChild)).toMatch(/animation:\S+ 1600ms/)
  })

  it('completed and rejected orders still draw no bar', () => {
    for (const status of [11, 2]) {
      orderState.status = status
      const { queryByRole, unmount } = renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme: completeTheme })
      expect(queryByRole('progressbar')).toBeNull()
      unmount()
    }
  })
})
