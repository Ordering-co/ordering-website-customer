import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { OrderDetails } from '../index'

// pages.order_details on the order's page (the active and the finished
// layouts) and the props of components.order_details: the theme orders and
// hides the sections.

const state = vi.hoisted(() => ({ status: 9, deliveryType: 2 }))

const baseOrder = {
  ...activeOrder,
  products: [],
  taxes: [],
  subtotal: 15.5,
  reporting_data: { at: {} },
  business: { ...activeOrder.business, address: '1 Pizza St', location: { lat: 40.71, lng: -74.0 } },
  driver: { name: 'Alex', lastname: 'Driver', photo: 'driver.png', cellphone: '555-0101' },
  customer: { address: '123 Main St', location: { lat: 40.72, lng: -74.01 } }
}

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { google_maps_api_key: { value: 'test-key' } } }]
}))

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{
        loading: false,
        error: null,
        order: { ...baseOrder, status: state.status, delivery_type: state.deliveryType },
        businessData: baseOrder.business
      }}
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
      orderTypes={[{ value: 1, text: 'Delivery' }, { value: 2, text: 'Pickup' }]}
      googleMapsControls={{}}
      {...rest}
    />
  )
}))

vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => <div data-testid='live-map' /> }))
vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({ useDriverLocationInterpolation: vi.fn() }))
vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({ OrderEta: () => <span>ETA</span> }))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({ ProductItemAccordion: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))
vi.mock('~ui/src/components/ReviewProfessional', () => ({ ReviewProfessional: () => null }))
vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({ SendGiftCard: () => null }))
vi.mock('~ui/src/components/OrderDetails/OrderBillSection', () => ({ OrderBillSection: () => <div data-testid='bill' /> }))
vi.mock('~ui/src/components/OrderDetails/OrderRewardsBanner', () => ({ OrderRewardsBanner: () => <div data-testid='rewards' /> }))
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => (status === 11
      ? { value: 'Delivered', percentage: 100 }
      : { value: 'On the way', percentage: 70 }),
    getOrderStatus: () => null
  })
}))

const ACTIVE = 9
const FINISHED = 11

const sectionsOf = (keys, hidden = []) => keys.map((key) => ({ key, visible: !hidden.includes(key) }))

// A theme with the page's sections (`[keys, hidden]`), its
// visibility and its components changed
const themedWith = ({ sections, hidden, visibility = {}, details = {}, slots = {} } = {}) => themeWithValues((values) => {
  if (sections) values.pages.order_details.sections = sectionsOf(sections, hidden)
  Object.assign(values.visibility, visibility)
  Object.assign(values.components.order_details.base, details)
  Object.assign(values.components.order_details.slots, slots)
  return values
})

const render = (theme, { status = ACTIVE, deliveryType = 2 } = {}) => {
  state.status = status
  state.deliveryType = deliveryType
  return renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />, { theme })
}

const activePage = (container) => container.querySelector('[data-doc-section="order-details-active"]')
const finishedPage = (container) => container.querySelector('[data-doc-section="order-details-terminal"]')

// The blocks of the active page after its title, by what they hold
const activeBlocks = (container) => Array.from(activePage(container).children)
  .map((block) => {
    if (block.tagName === 'H1') return 'title'
    if (block.querySelector('.order-progress')) return 'status'
    if (block.getAttribute('data-doc-section') === 'order-details-summary') return 'summary'
    if (block.querySelector('.map-container') || block.textContent.includes('Get Directions')) return 'map'
    return 'other'
  })

// The CSS rules of every class of the element
const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}`))).join('}')
}

describe('order details, active: pages.order_details (group active)', () => {
  it('the theme orders the blocks under the fixed title', () => {
    const { container } = render(themedWith({ sections: ['title', 'summary', 'map', 'status'] }))
    expect(activeBlocks(container)).toEqual(['title', 'summary', 'map', 'status'])
  })

  it('a hidden map leaves the directions; status and summary cannot be hidden', () => {
    const { container, getByText } = render(themedWith({
      sections: ['title', 'status', 'map', 'summary'],
      hidden: ['map', 'status', 'summary']
    }))
    expect(container.querySelector('#google-maps-image')).not.toBeInTheDocument()
    expect(getByText('Get Directions')).toBeInTheDocument()
    expect(activeBlocks(container)).toEqual(['title', 'status', 'map', 'summary'])
  })

  it('the address and the rewards of the summary follow their sections (address, rewards), as in a finished order', () => {
    const shown = render(themeWithValues())
    const summary = () => shown.container.querySelector('[data-doc-section="order-details-summary"]')
    expect(summary().querySelector('[data-testid="rewards"]')).toBeInTheDocument()
    expect(summary().querySelector('.order-type-address')).toBeInTheDocument()
    shown.unmount()

    const { container } = render(themedWith({
      sections: ['title', 'status', 'map', 'summary', 'header', 'products', 'bill', 'review_actions', 'rewards', 'address', 'driver'],
      hidden: ['rewards', 'address']
    }))
    const hiddenSummary = container.querySelector('[data-doc-section="order-details-summary"]')
    expect(hiddenSummary.querySelector('[data-testid="rewards"]')).toBeNull()
    expect(hiddenSummary.querySelector('.order-type-address')).toBeNull()
  })
})

describe('order details, active: the driver and the address of the summary (sections driver, address)', () => {
  // The parts of the active summary in the order they are painted
  const summaryOrder = (container) => {
    const summary = container.querySelector('[data-doc-section="order-details-summary"]')
    const order = []
    summary.querySelectorAll('[data-testid="bill"], [data-testid="rewards"], .order-type-address, .driver-info').forEach((el) => {
      const key = el.getAttribute('data-testid') || (el.classList.contains('driver-info') ? 'driver' : 'address')
      if (order[order.length - 1] !== key) order.push(key)
    })
    return order
  }

  it('the driver and the address hide with their sections', () => {
    const { container } = render(themedWith({
      sections: ['title', 'status', 'map', 'summary', 'header', 'products', 'bill', 'review_actions', 'rewards', 'address', 'driver'],
      hidden: ['driver', 'address']
    }))
    expect(summaryOrder(container)).toEqual(['bill', 'rewards'])
    expect(container.querySelector('img[src="driver.png"]')).toBeNull()
  })

  it('the driver stays on top; the rest follows the theme\'s order of those sections', () => {
    const { container } = render(themedWith({
      sections: ['title', 'status', 'map', 'summary', 'header', 'address', 'products', 'driver', 'bill', 'review_actions', 'rewards']
    }))
    expect(summaryOrder(container)).toEqual(['driver', 'address', 'bill', 'rewards'])
    // with the schema's order (driver last) it is still the first part, followed by its band
    const first = render(themedWith())
    expect(summaryOrder(first.container)).toEqual(['driver', 'bill', 'rewards', 'address'])
    const driverBlock = first.container.querySelector('.driver-info').closest('[data-doc-section="order-details-summary"] > div > *')
    expect(driverBlock.nextElementSibling.textContent).toBe('')
  })
})

describe('order details, finished: pages.order_details (group summary)', () => {
  const receiptOrder = (container) => {
    const page = finishedPage(container)
    const order = []
    page.querySelectorAll('.order-info, [data-testid="bill"], [data-testid="rewards"], .order-type-address, .driver-info, [data-doc-control="order-again"]').forEach((el) => {
      const key = el.classList.contains('order-info')
        ? 'header'
        : el.getAttribute('data-testid') || (el.classList.contains('order-type-address')
          ? 'address'
          : el.classList.contains('driver-info') ? 'driver' : 'review_actions')
      if (order[order.length - 1] !== key) order.push(key)
    })
    return order
  }

  it('the schema\'s order: the header then the receipt (one container)', () => {
    const { container } = render(themeWithValues(), { status: FINISHED })
    const page = finishedPage(container)
    expect(page.children).toHaveLength(3)
    expect(page.children[1]).toHaveClass('order-info')
    expect(receiptOrder(container)).toEqual(['header', 'bill', 'review_actions', 'rewards', 'address', 'driver'])
  })

  it('the header among the receipt\'s sections in the theme\'s order', () => {
    const { container } = render(themedWith({
      sections: ['driver', 'bill', 'header', 'address', 'review_actions', 'products', 'rewards']
    }), { status: FINISHED })
    expect(receiptOrder(container)).toEqual(['driver', 'bill', 'header', 'address', 'review_actions', 'rewards'])
    // the receipt's sections before and after the header, each run in the
    // receipt's container
    const page = finishedPage(container)
    expect(page.children).toHaveLength(4)
    expect(page.children[2]).toHaveClass('order-info')
  })

  it('rewards, address and driver hide; the header and the bill do not', () => {
    const { container, getByText } = render(themedWith({
      sections: ['header', 'products', 'bill', 'review_actions', 'rewards', 'address', 'driver'],
      hidden: ['header', 'bill', 'rewards', 'address', 'driver']
    }), { status: FINISHED })
    expect(receiptOrder(container)).toEqual(['header', 'bill', 'review_actions'])
    expect(getByText('Order again')).toBeInTheDocument()
  })
})

describe('order details: visibility of the ETA and the customer\'s address', () => {
  it('the defaults: the ETA of the header and the delivery address show', () => {
    const { container, getByText } = render(themeWithValues(), { deliveryType: 1 })
    expect(container.querySelector('.time-container')).toBeInTheDocument()
    expect(getByText('123 Main St')).toBeInTheDocument()
  })

  it('visibility confirmation.order.eta hides the ETA of the header', () => {
    const { container } = render(themedWith({ visibility: { 'confirmation.order.eta': false } }))
    expect(container.querySelector('.time-container')).not.toBeInTheDocument()
  })

  it('confirmation.customer.address hides the customer\'s address of a delivery (not the store\'s)', () => {
    const themed = themedWith({ visibility: { 'confirmation.customer.address': false } })
    const delivery = render(themed, { deliveryType: 1 })
    expect(delivery.queryByText('123 Main St')).not.toBeInTheDocument()
    delivery.unmount()
    const finished = render(themed, { deliveryType: 1, status: FINISHED })
    expect(finished.queryByText('123 Main St')).not.toBeInTheDocument()
    finished.unmount()
    const pickup = render(themed, { deliveryType: 2 })
    expect(pickup.getByText('1 Pizza St')).toBeInTheDocument()
  })
})

describe('components.order_details', () => {
  it('the status text and color, the total text and the map height', () => {
    const { container } = render(themedWith({
      details: {
        status_text: { size: 31, line: 1.19, weight: 800 },
        status_color: '#123456',
        total_text: { size: 27, line: 1.22, weight: 500 },
        map_height: 420
      }
    }))
    const info = container.querySelector('.order-progress').parentElement
    const css = rulesOf(info)
    expect(css).toMatch(/\.order-progress span\{[^}]*font-size:31px;[^}]*color:#123456;/)
    const total = container.querySelector('p.total')
    expect(rulesOf(total.parentElement)).toMatch(/p\.total\{(?:font-family:[^;]+;)?font-size:27px;line-height:1\.22;font-weight:500;/)
    const map = container.querySelector('#google-maps-image').parentElement
    expect(rulesOf(map)).toContain('height:420px;')
  })

  it('the sizes of the progress and of the driver\'s photo', () => {
    const { container } = render(themedWith({ details: { progress_size: 'sm', driver_avatar_size: 'xl' } }))
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toBeInTheDocument()
    expect(rulesOf(bar)).toContain(`height:${themeWithValues().values.components.progress.sizes.sm.height}px`)
    const photo = container.querySelector('img[src="driver.png"]')
    expect(photo.parentElement.style.getPropertyValue('--ui-avatar-size')).toBe(themeWithValues().css.components.avatar.sizes.xl.size)
  })

  it('the slots of the help, directions, review and reorder buttons', () => {
    const theme = themedWith({
      slots: {
        help: { component: 'button', size: 'lg', appearance: 'ghost', color: 'primary', shape: 'icon' },
        directions: { component: 'button', size: 'lg', appearance: 'solid', color: 'secondary', shape: null },
        reorder: { component: 'button', size: 'md', appearance: 'outline', color: 'primary', shape: null }
      }
    })
    const height = (button) => button.style.getPropertyValue('--ui-button-height')
    const active = render(theme)
    expect(height(active.getByRole('button', { name: 'Help' }))).toBe(`${theme.values.components.button.sizes.lg.height}px`)
    expect(height(active.getByRole('button', { name: 'Get Directions' }))).toBe(`${theme.values.components.button.sizes.lg.height}px`)
    active.unmount()
    const finished = render(theme, { status: FINISHED })
    expect(height(finished.getByRole('button', { name: 'Order again' }))).toBe(`${theme.values.components.button.sizes.md.height}px`)
  })
})
