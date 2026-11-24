import { describe, expect, it } from 'vitest'
import { defaultTheme, themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { businessListingLayout, groupShowcase } from '../listingLayout'

const withLayout = (layout) => themeWithValues((values) => {
  values.components.business_listing_page.base.layout = layout
})

describe('businessListingLayout', () => {
  it('the theme without a choice is the grid, and showcase is the one it can choose', () => {
    expect(businessListingLayout(defaultTheme)).toBe('grid')
    expect(businessListingLayout(withLayout('grid'))).toBe('grid')
    expect(businessListingLayout(withLayout('showcase'))).toBe('showcase')
  })

  it('a value it does not know is the grid', () => {
    expect(businessListingLayout(withLayout('carousel'))).toBe('grid')
    expect(businessListingLayout(withLayout(null))).toBe('grid')
  })
})

const store = (id, extra = {}) => ({ id, name: `Store ${id}`, open: true, featured: false, ...extra })
const ids = (list) => list.map((business) => business.id)

describe('groupShowcase', () => {
  it('two pages of the API in one list: the first featured open store is the hero, the rest keep the API order', () => {
    const page1 = [store(1), store(2, { open: false }), store(3, { featured: true }), store(4, { featured: true })]
    const page2 = [store(5, { open: false }), store(6), store(7, { featured: true, open: false })]
    const { hero, open, later } = groupShowcase([...page1, ...page2], { withHero: true })
    expect(hero.id).toBe(3)
    expect(ids(open)).toEqual([1, 4, 6])
    expect(ids(later)).toEqual([2, 5, 7])
  })

  it('without withHero there is no hero and the featured store stays in its group', () => {
    const { hero, open } = groupShowcase([store(1), store(2, { featured: true })])
    expect(hero).toBeNull()
    expect(ids(open)).toEqual([1, 2])
  })

  it('all closed: nothing open, no hero, all of them later', () => {
    const { hero, open, later } = groupShowcase([store(1, { open: false }), store(2, { open: false, featured: true })], { withHero: true })
    expect(hero).toBeNull()
    expect(open).toEqual([])
    expect(ids(later)).toEqual([1, 2])
  })

  it('no featured store: no hero', () => {
    const { hero, open } = groupShowcase([store(1), store(2)], { withHero: true })
    expect(hero).toBeNull()
    expect(ids(open)).toEqual([1, 2])
  })

  it('the only store is not the hero: it stays in its group', () => {
    const { hero, open } = groupShowcase([store(1, { featured: true })], { withHero: true })
    expect(hero).toBeNull()
    expect(ids(open)).toEqual([1])
  })

  it('a closed featured store is not the hero', () => {
    const { hero, later } = groupShowcase([store(1, { featured: true, open: false }), store(2)], { withHero: true })
    expect(hero).toBeNull()
    expect(ids(later)).toEqual([1])
  })

  it('enabled: false counts as closed, even if open', () => {
    const { hero, open, later } = groupShowcase([store(1, { featured: true, enabled: false }), store(2, { enabled: true })], { withHero: true })
    expect(hero).toBeNull()
    expect(ids(open)).toEqual([2])
    expect(ids(later)).toEqual([1])
  })

  it('an empty or missing list is three empty groups', () => {
    expect(groupShowcase([], { withHero: true })).toEqual({ hero: null, open: [], later: [] })
    expect(groupShowcase(undefined)).toEqual({ hero: null, open: [], later: [] })
  })
})
