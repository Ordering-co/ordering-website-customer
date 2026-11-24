import { matchPath } from 'react-router-dom'
import { pages } from '../../product.schema.json'
import { readEntry } from './themeSchemaReader'

/**
 * Sections of a page (`pages` of product.schema.json): their order, which ones
 * are hidden and whether the page shows the footer.
 *
 * Schema of a page (read with src/utils/themeSchemaReader.js, either format):
 *   footer:   bool, default null            — null follows `visibility.footer`
 *   sections: sections, default [{ key, visible, hideable, group }, …]
 *     - the default order is the order of the list;
 *     - `visible`: the default visibility;
 *     - `group`: the section moves only among the sections of its group
 *       (siblings in one container); null keeps it in its place;
 *     - `hideable: false`: always visible (the page does not work without it).
 *
 * Value of a page (`values.pages[page]`, and `values.platforms.mobile_web
 * .pages[page]` below MOBILE_WEB_MAX_WIDTH, a whole page of the same type):
 *   { footer: true | false | null, sections: [{ key, visible }, …] }
 *
 * A page the theme leaves out (or a section it does not list) keeps the
 * schema's order and default visibility.
 */

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

// Only the block it reads: the whole schema stays out of the entry chunk
// (implementation notes; src/utils/themeSchema.js).
const PAGES_SCHEMA = { pages }

const schemaSections = (schema, page) => {
  const list = readEntry(schema, ['pages', page, 'sections'])?.value
  return Array.isArray(list) ? list.filter((section) => isObject(section) && typeof section.key === 'string') : []
}

/** The page's value for this screen width: each field of mobile_web over the base. */
const pageValue = (theme, page, mobile) => {
  const base = isObject(theme?.values?.pages?.[page]) ? theme.values.pages[page] : {}
  const small = mobile && isObject(theme?.values?.platforms?.mobile_web?.pages?.[page]) ? theme.values.platforms.mobile_web.pages[page] : {}
  return {
    footer: typeof small.footer === 'boolean' ? small.footer : base.footer,
    sections: Array.isArray(small.sections) ? small.sections : base.sections
  }
}

/**
 * The theme's order in the default slots: each group fills the places its
 * sections have in the default list, in the theme's order; fixed sections
 * stay. Unknown and repeated keys are dropped, missing ones keep their
 * default place in their group.
 */
const orderedSections = (defaults, value) => {
  const themed = Array.isArray(value) ? value.filter((item) => isObject(item) && typeof item.key === 'string') : []
  const byKey = new Map(defaults.map((section) => [section.key, section]))
  const themeOrder = []
  const seen = new Set()
  themed.forEach((item) => {
    if (byKey.has(item.key) && !seen.has(item.key)) {
      seen.add(item.key)
      themeOrder.push(item.key)
    }
  })
  const queues = {}
  defaults.forEach((section) => {
    if (section.group == null) return
    const group = section.group
    if (!queues[group]) {
      const inGroup = defaults.filter((s) => s.group === group).map((s) => s.key)
      const ordered = themeOrder.filter((key) => byKey.get(key).group === group)
      inGroup.forEach((key) => { if (!ordered.includes(key)) ordered.splice(inGroup.indexOf(key), 0, key) })
      queues[group] = ordered
    }
  })
  return defaults.map((section) => (section.group == null ? section : byKey.get(queues[section.group].shift())))
}

/**
 * Sections of `page` in the order to paint them: `[{ key, visible, group }]`.
 * `mobile`: the width is below MOBILE_WEB_MAX_WIDTH (platforms.mobile_web).
 * `schema`: a schema (or its `{ pages }`) in either format, the repo's by default.
 */
export const pageSections = (theme, page, { mobile = false, schema = PAGES_SCHEMA } = {}) => {
  const defaults = schemaSections(schema, page)
  const value = pageValue(theme, page, mobile)
  const themed = Array.isArray(value?.sections) ? value.sections : []
  const visibleOf = new Map()
  themed.forEach((item) => {
    if (isObject(item) && !visibleOf.has(item.key) && typeof item.visible === 'boolean') visibleOf.set(item.key, item.visible)
  })
  return orderedSections(defaults, themed).map((section) => ({
    key: section.key,
    group: section.group ?? null,
    visible: section.hideable === false || (visibleOf.has(section.key) ? visibleOf.get(section.key) : section.visible !== false)
  }))
}

/** Whether one section of `page` is painted (unknown sections are). */
export const isPageSectionVisible = (theme, page, key, options) => {
  const section = pageSections(theme, page, options).find((item) => item.key === key)
  return section ? section.visible : true
}

/**
 * Footer of `page`: true / false when the page sets it, null when it follows
 * the global `visibility.footer`.
 */
export const pageFooterVisible = (theme, page, { mobile = false } = {}) => {
  if (!page) return null
  const value = pageValue(theme, page, mobile)
  return typeof value?.footer === 'boolean' ? value.footer : null
}

/**
 * Route patterns of each page of `pages` (react-router v5, matched exact and
 * in this order: the first match wins). The product routes are the business
 * page with the product open.
 */
export const PAGE_ROUTES = [
  ['home', ['/', '/home']],
  ['business_listing', ['/search']],
  ['business_search', ['/business_search']],
  ['promotions', ['/promotions']],
  ['checkout', ['/checkout/:cartUuid?']],
  ['multi_checkout', ['/multi-checkout/:cartUuid?']],
  ['multi_cart', ['/multi-cart']],
  ['order_details', ['/orders/:orderId']],
  ['multi_orders', ['/multi-orders/:orderId']],
  ['profile', ['/profile']],
  ['orders', ['/profile/orders']],
  ['addresses', ['/profile/addresses']],
  ['cards', ['/profile/cards']],
  ['wallets', ['/wallets']],
  ['favorites', ['/favorite']],
  ['sessions', ['/sessions']],
  ['messages', ['/messages']],
  ['help', ['/help']],
  ['verify', ['/verify']],
  ['reset_password', ['/password/reset']],
  ['signup_business', ['/signup_business']],
  ['signup_driver', ['/signup-driver']],
  ['pages_list', ['/pages']],
  ['cms_page', ['/pages/:pageSlug']],
  ['business', [
    '/store',
    '/store/:business_slug',
    '/store/:business_slug/:category_slug/:product_slug',
    '/store/:category_slug/:product_slug',
    '/:business_slug',
    '/:business_slug/:category_slug',
    '/:business_slug/:category_slug/:product_slug'
  ]]
]

/**
 * Route patterns of a full website (`experience` full_website, checked first):
 * its '/' is the marketing home page and the menu lives at '/order'.
 */
export const FULL_WEBSITE_ROUTES = [
  ['landing', ['/']],
  ['home', ['/order', '/home']]
]

/**
 * The page of `pages` a path belongs to (`not_found` when none).
 * `fullWebsite`: the site is a full website (isFullWebsite, src/utils/siteSettings.js).
 */
export const pageForPath = (pathname, { fullWebsite = false } = {}) => {
  const matches = ([, paths]) => paths.some((path) => matchPath(pathname || '/', { path, exact: true }))
  const match = (fullWebsite && FULL_WEBSITE_ROUTES.find(matches)) || PAGE_ROUTES.find(matches)
  return match ? match[0] : 'not_found'
}
