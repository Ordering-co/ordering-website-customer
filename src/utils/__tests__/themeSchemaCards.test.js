import { describe, expect, it } from 'vitest'
import { schemaEntry, schemaInherits, schemaKeys } from '../themeSchema'

const typeOf = (path) => schemaEntry(path)?.type

// One element of the theme per purpose: the specific cards follow `card`
// (inherits), and the pieces that had a twin of a shared component use it.
describe('product.schema.json: no twins of card, avatar, rating and the driver tips\' title', () => {
  it('offer_card and wallet_balance inherit from card, as the other cards', () => {
    ;['business_card', 'offer_card', 'wallet_balance'].forEach((component) => expect(schemaInherits(component), component).toBe('card'))
    // what they take from card is what they have of the same name
    ;['background', 'border', 'radius', 'shadow', 'padding'].forEach((key) => {
      expect(typeOf(`components.offer_card.base.${key}`), key).toBe(typeOf(`components.card.base.${key}`))
    })
    expect(typeOf('components.wallet_balance.base.padding')).toBe(typeOf('components.card.base.padding'))
  })

  it('order_tracking has no card of its own (its blocks are card)', () => {
    const base = schemaKeys('components.order_tracking.base')
    expect(base.length).toBeGreaterThan(0)
    ;['radius', 'shadow', 'card_background', 'card_border', 'card_padding', 'card_padding_wide'].forEach((key) => {
      expect(base).not.toContain(key)
    })
  })

  it('business_reviews has no avatar of its own (components.avatar), business_card no star color (components.rating)', () => {
    expect(schemaKeys('components.business_reviews.base').filter((key) => key.startsWith('avatar_'))).toEqual([])
    expect(schemaKeys('components.business_card.base')).not.toContain('rating')
  })

  it('driver_tips has no title of its own (checkout.section_title)', () => {
    expect(schemaKeys('components.driver_tips.base')).not.toContain('title')
    expect(schemaKeys('components.driver_tips.base')).not.toContain('title_color')
    expect(schemaKeys('components.driver_tips.variants.multi')).not.toContain('title')
  })
})
