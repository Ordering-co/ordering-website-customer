import { themeValue } from '~/utils/themeTokens'

// The store list's layout, by `components.business_listing_page.base.layout`:
// `grid` (every store in one grid) or `showcase` (a featured store on top, the
// stores open now, then the ones to order for later). A theme without it, or
// with a value this code does not know, is `grid`.
export const businessListingLayout = (theme) => (
  themeValue(theme, 'business_listing_page', 'base.layout') === 'showcase' ? 'showcase' : 'grid'
)

// What a store card calls open (SingleBusinessCard's `isBusinessOpen`)
const isOpen = (business) => Boolean(business?.open && business?.enabled !== false)

// The showcase's groups, each one in the API's order: `hero` the first
// featured store that is open (only with `withHero`, and only when it is not the
// only store: alone it stays in its group), taken out of the rest, then `open`
// and `later` (closed or disabled).
export const groupShowcase = (businesses, { withHero = false } = {}) => {
  const list = (businesses || []).filter(Boolean)
  const hero = (withHero && list.length > 1 && list.find((business) => business.featured && isOpen(business))) || null
  const rest = list.filter((business) => business !== hero)
  return { hero, open: rest.filter(isOpen), later: rest.filter((business) => !isOpen(business)) }
}
