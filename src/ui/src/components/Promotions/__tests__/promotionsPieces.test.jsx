import React, { useState } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Promotions } from '../index'

// implementation notesthe "Use coupon" buttons (the offer card's and each business's of its dialog) are
// the design system's Button with the options of offer_card.slots.action.

const OFFERS = [
  { id: 1, name: 'Summer Deal', description: '10% off', type: 2, coupon: 'SUMMER', target: 1, rate_type: 1, rate: 10, end: '2026-12-01', businesses: [{ id: 7, name: 'Cafe', slug: 'cafe' }] }
]
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: () => 'Jan 1', parsePrice: (v) => `$${v}`, optimizeImage: (url) => url }]
}))
vi.mock('~ui/src/components/SearchBar', () => ({ SearchBar: () => null }))
const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))
vi.mock('~components/components/PromotionsController', () => ({
  PromotionsController: ({ UIComponent, ...rest }) => {
    const [offerSelected, setOfferSelected] = useState(null)
    return (
      <UIComponent offersState={{ loading: false, error: null, offers: OFFERS }} handleSearchValue={vi.fn()} searchValue='' offerSelected={offerSelected} setOfferSelected={setOfferSelected} {...rest} />
    )
  }
}))

beforeEach(() => emit.mockClear())

const background = (el) => el.style.getPropertyValue('--ui-button-background')
const useCoupon = (root) => within(root).getByRole('button', { name: 'Use coupon' })
const card = (view) => view.container.querySelector('[data-doc-section="promotion-card"]')
const dialog = () => document.querySelector('[data-doc-section="promotion-details-dialog"]')

describe('Promotions: "Use coupon" is the base Button', () => {
  it('the card\'s opens the offer; the business\'s goes to the store', () => {
    const view = renderWithProviders(<Promotions businessUrlTemplate='/store/:business_slug' />, { theme: themeWithValues() })
    const open = useCoupon(card(view))
    expect(open).toHaveAttribute('data-slot', 'button')
    expect(open).toHaveAttribute('data-doc-control', 'promotion-open')
    fireEvent.click(open)
    const go = useCoupon(dialog())
    expect(go).toHaveAttribute('data-slot', 'button')
    expect(go).toHaveAttribute('data-doc-control', 'promotion-open-business')
    fireEvent.click(go)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'cafe' } })
  })

  it('both follow offer_card.slots.action: primary md by default, the slot\'s color and size in another theme', () => {
    const plain = themeWithValues()
    const slotted = themeWithValues((values) => {
      values.components.offer_card.slots.action = { ...values.components.offer_card.slots.action, color: 'secondary', size: 'lg' }
      return values
    })
    const slot = plain.values.components.offer_card.slots.action ?? {}
    const expected = [
      [plain, { size: slot.size ?? 'md', color: slot.color ?? 'primary', appearance: slot.appearance ?? 'solid' }],
      [slotted, { size: 'lg', color: 'secondary', appearance: slot.appearance ?? 'solid' }]
    ]
    const seen = expected.map(([theme, options]) => {
      const view = renderWithProviders(<Promotions businessUrlTemplate='/store/:business_slug' />, { theme })
      const vars = componentVars(theme, 'button', options)
      const open = useCoupon(card(view))
      ;['--ui-button-height', '--ui-button-background'].forEach((name) => expect(open.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
      fireEvent.click(open)
      expect(background(useCoupon(dialog()))).toBe(vars['--ui-button-background'])
      const value = background(open)
      view.unmount()
      return value
    })
    expect(seen[0]).not.toBe(seen[1])
  })
})
