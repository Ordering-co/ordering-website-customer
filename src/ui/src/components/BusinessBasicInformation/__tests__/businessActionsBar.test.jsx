import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessInfoComponent } from '../BusinessInfoComponent'

// The single actions bar below the identity block (implementation notes, proposal A):
// the data line (fee, time, distance), the actions group and the search,
// grouped together and aligned with the identity above them.

const viewport = vi.hoisted(() => ({ width: 1024, height: 768 }))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => viewport
}))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/BusinessStickyHeader', () => ({ BusinessStickyHeader: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: () => null }))
vi.mock('~ui/src/design-system/components/Select', () => ({ Select: () => <div data-testid='sort' /> }))
// Pickup (the literal "Service fee" / "Pickup time" labels of this suite)
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 2 } }, { refreshOrderOptions: vi.fn() }]
}))

const business = { ...businessFixture }

const props = {
  loading: false,
  business,
  categoryState: { products: [] },
  setOpenBusinessInformation: vi.fn(),
  setIsBusinessReviews: vi.fn(),
  setIsPreOrder: vi.fn(),
  handleFavoriteBusiness: vi.fn()
}

const render = (business, theme) => renderWithProviders(
  <BusinessInfoComponent {...props} business={business} />,
  { theme }
).container

beforeEach(() => {
  viewport.width = 1024
})

describe('the data line: fee, time and distance', () => {
  it('fee 0 and time null: no Service fee, no Pickup time, no data line', () => {
    const store = { ...business, service_fee: 0, pickup_time: null }
    const container = render(store, themeWithValues())
    expect(container.textContent).not.toMatch(/Service fee/)
    expect(container.textContent).not.toMatch(/Pickup time/)
    expect(container.querySelector('[data-testid="business-data-line"]')).toBeNull()
  })

  it('fee and time real: both show with their value; hideFee/hideTime hides only that one', () => {
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }

    const shown = render(store, themeWithValues())
    expect(shown.textContent).toMatch(/Service fee/)
    expect(shown.textContent).toMatch(/Pickup time/)

    const noFee = render(store, themeWithValues((values) => {
      values.visibility['business.header.fee'] = false
      return values
    }))
    expect(noFee.textContent).not.toMatch(/Service fee/)
    expect(noFee.textContent).toMatch(/Pickup time/)

    const noTime = render(store, themeWithValues((values) => {
      values.visibility['business.header.time'] = false
      return values
    }))
    expect(noTime.textContent).toMatch(/Service fee/)
    expect(noTime.textContent).not.toMatch(/Pickup time/)
  })
})

describe('alignment: the actions bar starts at the identity\'s left edge', () => {
  it('without a logo: the bar has no left padding reserved; it stays a sibling of the name block', () => {
    const store = { ...business, logo: undefined, service_fee: 1.5, pickup_time: '00:20:00' }
    const container = render(store, themeWithValues())
    expect(container.querySelector('[style*="logo.png"]')).toBeNull()
    const bar = container.querySelector('[data-testid="business-actions-bar"]')
    expect(bar).not.toBeNull()
    expect(cssFor(bar)).not.toMatch(/padding-left/)
  })

  it('with a logo: the logo paints and the actions bar is still there', () => {
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }
    const container = render(store, themeWithValues())
    expect(container.querySelector('[style*="logo.png"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="business-actions-bar"]')).not.toBeNull()
  })
})

describe('grouping: the actions and the search share the same bar', () => {
  it('Info and the search ("Search Products") live inside the same bar container', () => {
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }
    const container = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} categoryState={{ products: [{ id: 1 }] }} />,
      { theme: themeWithValues() }
    ).container
    const bar = container.querySelector('[data-testid="business-actions-bar"]')
    expect(bar).not.toBeNull()
    expect(bar.querySelector('[data-doc-control="business-information"]')).not.toBeNull()
    expect(bar.querySelector('[aria-label="Search Products"]')).not.toBeNull()
  })

  it('without any action nor search, the bar does not render', () => {
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }
    // products are not the reason the search is gone: the theme hides it
    const hiddenTheme = themeWithValues((values) => {
      values.visibility['business.header.info'] = false
      values.visibility['business.header.search'] = false
      values.visibility['business.header.sort'] = false
      values.visibility['business.header.preorder'] = false
      return values
    })
    const container = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} categoryState={{ products: [{ id: 1 }] }} />,
      { theme: hiddenTheme }
    ).container
    expect(container.querySelector('[data-testid="business-actions-bar"]')).toBeNull()
  })

  it('with products and the search visible, the bar renders even without any action', () => {
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }
    const noActionsTheme = themeWithValues((values) => {
      values.visibility['business.header.info'] = false
      values.visibility['business.header.preorder'] = false
      return values
    })
    const container = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} categoryState={{ products: [{ id: 1 }] }} />,
      { theme: noActionsTheme }
    ).container
    const bar = container.querySelector('[data-testid="business-actions-bar"]')
    expect(bar).not.toBeNull()
    expect(bar.querySelector('[data-doc-control="business-information"]')).toBeNull()
    expect(bar.querySelector('[aria-label="Search Products"]')).not.toBeNull()
  })
})

describe('mobile (<768): everything stays in the one bar, left-aligned', () => {
  it('Info and the search are still in the bar; its CSS wraps left below 768px, and the search is static (not absolute)', () => {
    viewport.width = 390
    const store = { ...business, service_fee: 1.5, pickup_time: '00:20:00' }
    const container = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} categoryState={{ products: [{ id: 1 }] }} />,
      { theme: themeWithValues() }
    ).container
    const bar = container.querySelector('[data-testid="business-actions-bar"]')
    expect(bar).not.toBeNull()
    expect(bar.querySelector('[data-doc-control="business-information"]')).not.toBeNull()
    expect(bar.querySelector('[aria-label="Search Products"]')).not.toBeNull()
    // business_header's own actions bar: justify-content: flex-start below 768px
    expect(cssFor(bar)).toMatch(/max-width: ?767\.98px\)\{?[^}]*justify-content: ?flex-start/)
    // WrapperSearch($inline): static, not the absolute positioning it floats
    // with over the cover (the `&&` specificity, not `!important`)
    const searchWrapper = bar.querySelector('#search-component')
    expect(cssFor(searchWrapper)).toMatch(/position: ?static/)
  })
})
