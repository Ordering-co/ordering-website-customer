import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../__tests__/helpers/testUtils'
import { sampleGiftCard } from './helpers/giftCardStudentTestMocks'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../styles/__tests__/themeTestUtils'
import { SingleGiftCard } from '../GiftCard/SingleGiftCard'
import { OfferTabCount } from '../CouponControl/styles'
import { UnreadMessageCounter } from '../MessagesListing/styles'
import { ProductQuantity } from '../OrderDetails/layouts/Tracking/styles'

vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit: vi.fn(), on: vi.fn(), off: vi.fn() }]
}))

// The served values of the schema's defaults
const NEUTRAL = { background: '#E9ECEF', color: '#000000' }
const flat = (css) => css.replace(/\s+/g, '')
// The CSS of every class of an element (it may carry a class of its own last)
const allCssFor = (el) => {
  const rules = injectedCss().split('}')
  return Array.from(el.classList).map((cls) => rules.filter((rule) => rule.includes(`.${cls}`)).join('}')).join('}')
}

describe('badge sites (components.badge', () => {
  it('gift card status: a badge in the variant of its state, md', () => {
    const theme = themeWithValues()
    const { getByText } = renderWithProviders(<SingleGiftCard card={sampleGiftCard} />, { theme })
    const status = getByText('Pending')
    expect(status.tagName).toBe('SPAN')
    const css = allCssFor(status)
    expect(css).toContain(`background:${theme.values.components.badge.variants.warning.background}`)
    expect(css).toContain(`height:${theme.values.components.badge.sizes.md.height}px`)
    expect(css).toContain(`padding:0 ${theme.values.components.badge.sizes.md.padding_x}px`)
  })

  it('counts: neutral sm (offers), primary md (unread), neutral md (tracking quantity), round, today\'s weight', () => {
    const theme = themeWithValues()
    const { sizes, shapes, variants } = theme.values.components.badge
    const offers = flat(cssFor(renderWith(theme, <OfferTabCount>3</OfferTabCount>).getByText('3')))
    expect(offers).toContain(`background:${NEUTRAL.background}`)
    expect(offers).toContain(`min-width:${sizes.sm.height}px`)
    expect(offers).toContain(`border-radius:${shapes.count.radius}px`)
    expect(offers).toContain('font-weight:700')
    const unread = flat(cssFor(renderWith(theme, <UnreadMessageCounter>5</UnreadMessageCounter>).getByText('5')))
    expect(unread).toContain(`background:${variants.primary.background}`)
    expect(unread).toContain(`min-width:${sizes.md.height}px`)
    expect(unread).toContain('position:absolute')
    const quantity = flat(cssFor(renderWith(theme, <ProductQuantity>2</ProductQuantity>).getByText('2')))
    expect(quantity).toContain(`background:${NEUTRAL.background}`)
    expect(quantity).toContain(`min-width:${sizes.md.height}px`)
    expect(quantity).toContain('font-weight:600')
  })
})
