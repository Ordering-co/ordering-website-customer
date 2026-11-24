import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { cssFor } from '../../../styles/__tests__/themeTestUtils'
import { BusinessInfoComponent } from '../BusinessInfoComponent'

// implementation notesthe "Change store" action paints its icon, and the header's
// actions keep a 44px touch area (an accessibility floor, not a theme value).

vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 1024, height: 768 }) }))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/BusinessStickyHeader', () => ({ BusinessStickyHeader: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: () => null }))
vi.mock('~ui/src/design-system/components/Select', () => ({ Select: () => <div data-testid='sort' /> }))

const props = {
  loading: false,
  business: { ...businessFixture },
  categoryState: { products: [{ id: 1 }] },
  setOpenBusinessInformation: vi.fn(),
  setIsBusinessReviews: vi.fn(),
  setIsPreOrder: vi.fn(),
  handleFavoriteBusiness: vi.fn(),
  setOpenSearchProducts: vi.fn(),
  showStoreSwitcher: true
}

const render = () => renderWithProviders(<BusinessInfoComponent {...props} />).container

beforeEach(() => vi.clearAllMocks())

describe('"Change store" action', () => {
  it('paints its icon: a decorative svg of the base Icon beside the label', () => {
    const svg = render().querySelector('button[aria-label="Change store"] svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('touch area of the header actions (44px floor with a coarse pointer)', () => {
  it('the actions group (Info...) and the search button draw it, and the group does not clip it', () => {
    const container = render()
    const group = container.querySelector('[data-testid="business-actions-bar"] > div')
    const search = container.querySelector('[data-doc-control="business-product-search-open"]')
    const groupCss = cssFor(group)
    const controls = [...group.querySelectorAll('button'), search]
    expect(controls.length).toBeGreaterThan(1)
    for (const control of controls) {
      expect(control).toHaveAttribute('data-slot', 'button')
      expect(control.classList.contains('ui:max-mobile:after:min-h-[44px]')).toBe(true)
      expect(control.classList.contains('ui:pointer-coarse:after:min-w-[44px]')).toBe(true)
    }
    expect(groupCss).not.toMatch(/overflow:\s*hidden/)
  })
})
