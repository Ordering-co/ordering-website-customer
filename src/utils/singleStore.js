/**
 * Single store site: the whole site is one store, with no business listing to
 * go back to. It is on when the site settings say so (`site.mode =
 * 'single_store'` plus its `business_slug`, src/utils/siteSettings.js) or the
 * config names a store (`businessSlug`). Not the kiosk (`use_kiosk`) nor the
 * marketplace (`use_marketplace`) modes, which App.js also treats as "single
 * business".
 */
import { isFullWebsite, singleStoreSlug } from './siteSettings'
import { parseUnaddressedOrderTypes } from '~components/utils/orderTypeAddress'

export { singleStoreSlug }

// captured once at boot (App.js imports this module eagerly): the pathname
// the visitor's browser loaded first, before any client-side navigation
const ENTRY_PATHNAME = typeof window !== 'undefined' ? window.location.pathname : null

const BUSINESS_URL_FALLBACK = '/store/:business_slug'

// The paths a full website gives the menu ('/order') and the redirect to it ('/home'): a store cannot live there
const FULL_WEBSITE_MENU_PATHS = ['/order', '/home']

/**
 * The store's address in the site's business URL template (the one the store
 * page itself goes to when a product closes), e.g. `/store/mcbonalds`.
 * With `fullWebsite`, a store whose address would be the menu's (slug `order`
 * in `/:business_slug`) gets the fallback `/store/<slug>` instead: the one
 * resolution every redirect and link of a full website shares.
 */
export const singleStorePath = (site, slug, { fullWebsite } = {}) => {
  const raw = site?.business_url_template
  const template = !raw ? BUSINESS_URL_FALLBACK : raw[0] === '/' ? raw : `/${raw}`
  const path = template.replace(':business_slug', slug)
  return fullWebsite && FULL_WEBSITE_MENU_PATHS.includes(path.split('?')[0]) ? BUSINESS_URL_FALLBACK.replace(':business_slug', slug) : path
}

/** `singleStorePath` for the site of `theme` (a full website or not): what every link to a store calls. */
export const themeStorePath = (theme, site, slug) => singleStorePath(site, slug, { fullWebsite: isFullWebsite(theme) })

/** The short `/<slug>` address of a store (what the app also routes to it), `/store/<slug>` when a full website's menu owns it. */
export const shortStorePath = (slug, { fullWebsite } = {}) =>
  fullWebsite && FULL_WEBSITE_MENU_PATHS.includes(`/${slug}`) ? BUSINESS_URL_FALLBACK.replace(':business_slug', slug) : `/${slug}`

/**
 * Where a single business site goes home (App.js's `singleBusinessHome`, what the redirects of the menu use): a
 * single store (`direct`: not the kiosk nor the marketplace) at its address in the business URL template, which
 * the store page keeps when a product opens or closes (the short `/<slug>` remounted the store and lost the
 * scroll); the short `/<businessSlug>` when the template carries a query (the redirects take a pathname), the
 * site is the kiosk or the marketplace. A full website's menu owns `/order` (`singleStorePath`).
 */
export const singleBusinessHomePath = ({ site, slug, businessSlug, direct, fullWebsite }) => {
  const templatePath = direct && slug ? singleStorePath(site, slug, { fullWebsite }) : null
  return templatePath && !templatePath.includes('?') ? templatePath : shortStorePath(businessSlug, { fullWebsite })
}

/**
 * Whether the pathname is the store's page: its template path or the short
 * `/<slug>` the app also routes to it.
 */
export const isSingleStorePathname = (pathname, site, slug, { fullWebsite } = {}) => {
  if (!slug || !pathname) return false
  const templatePath = singleStorePath(site, slug, { fullWebsite }).split('?')[0]
  return pathname === templatePath || pathname === shortStorePath(slug, { fullWebsite })
}

/**
 * Whether `pathname` belongs to `slug`'s store: its own page
 * (`isSingleStorePathname`) or a page under it (a deep link into a category
 * or product of that store, e.g. `/store/<slug>/<category>/<product>`, the
 * short `/<slug>/<category>`…). Home ('/') or any other store's page is
 * never this store's own page.
 * @param {string} pathname the page to check, e.g. the current one
 */
export const isSingleStoreOwnPage = (pathname, site, slug, { fullWebsite } = {}) => {
  if (!slug || !pathname) return false
  if (isSingleStorePathname(pathname, site, slug, { fullWebsite })) return true
  const templatePath = singleStorePath(site, slug, { fullWebsite }).split('?')[0]
  // a template that carries the slug in its query (`/store?store=:business_slug`) has no per-store path to match under
  const underTemplate = templatePath.includes(slug) && pathname.startsWith(`${templatePath}/`)
  return underTemplate || pathname.startsWith(`${shortStorePath(slug, { fullWebsite })}/`)
}

/**
 * Whether the entry pathname (the page the visitor's browser loaded first,
 * implementation notes) belongs to `slug`'s store (`isSingleStoreOwnPage`, its own
 * page or a page under it, e.g. a product deep link).
 */
export const isEntryStore = (site, slug, { fullWebsite } = {}) => isSingleStoreOwnPage(ENTRY_PATHNAME, site, slug, { fullWebsite })

/**
 * The slug of the entry page's store, read from the URL itself
 * (no candidate slug needed, unlike `isEntryStore`): the business URL
 * template's own path, e.g. `/store/:business_slug`, applied to
 * `ENTRY_PATHNAME`, or a page under it (a product URL). Null when the
 * template carries the slug in its query (`/store?store=:business_slug`,
 * no path position to read it from), the path otherwise doesn't match, or
 * the template has no path segment of its own before the slug (e.g. the
 * short `/:business_slug` as the template) — reading a slug from a bare
 * `/<anything>` would be ambiguous with every other one-segment route
 * (`/search`, `/favorite`…); `isEntryStore` with a known slug still covers
 * that shorthand.
 */
export const entryStoreSlug = (site) => {
  if (!ENTRY_PATHNAME) return null
  const raw = site?.business_url_template
  const template = !raw ? BUSINESS_URL_FALLBACK : raw[0] === '/' ? raw : `/${raw}`
  const templatePath = template.split('?')[0]
  const placeholderIndex = templatePath.indexOf(':business_slug')
  if (placeholderIndex === -1) return null
  const prefix = templatePath.slice(0, placeholderIndex)
  if (prefix === '/' || !ENTRY_PATHNAME.startsWith(prefix)) return null
  const slug = ENTRY_PATHNAME.slice(prefix.length).split('/')[0]
  return slug || null
}

/**
 * Whether a store starts in pickup without an address: the
 * site is one store or the visitor's entry page was this store's
 * (`singleStore` or `entry`), the project allows pickup (`configTypes`,
 * project `order_types_allowed`) and the business does not disable it
 * (explicit `business.pickup === false`; no other business field for this
 * was found in the Ordering API business object).
 */
export const storePickupApplies = ({ singleStore, entry, configTypes, business }) =>
  !!(singleStore || entry) && !!configTypes?.includes(2) && business?.pickup !== false

// Whether this page load has already forced the order into pickup. Only the
// first store `storePickupApplies` decides on, on the whole page load, forces
// changeType(2); going back to that store after the user switched to
// delivery must not re-force it.
let storePickupStarted = false

/** True the first time this is called on the page load; false every time after. */
export const takeStorePickupStart = () => {
  if (storePickupStarted) return false
  storePickupStarted = true
  return true
}

/** True once `takeStorePickupStart` has been taken this page load; never consumes it. */
export const storePickupStartTaken = () => storePickupStarted

// The order type (and the store it belongs to) the page had right before
// the pickup gate forced it into pickup ahead of the business
// loading. If that business turns out to disable pickup (`business.pickup
// === false`), BusinessProductsListingUI restores this type once — only for
// that same store (by slug), so a fast client nav to a different store
// before the first one's business ever loads can't restore its type there.
let storePickupForcedFrom = null

/** Records the type to restore (and the store it's for) if the forced pickup turns out not to apply. */
export const setStorePickupForcedFrom = (type, slug) => { storePickupForcedFrom = { type, slug } }

/** The `{type, slug}` recorded by `setStorePickupForcedFrom`, once; null every other time. */
export const takeStorePickupForcedFrom = () => {
  const forcedFrom = storePickupForcedFrom
  storePickupForcedFrom = null
  return forcedFrom
}

/** Whether a forced-from record is waiting to be taken, without consuming it. */
export const storePickupForcedFromRecorded = () => storePickupForcedFrom != null

/**
 * Whether a forced pickup is still landing: recorded, but
 * `type` isn't 2 yet. A caller deciding whether to release its own loading
 * gate must keep waiting while this is true (never forever: it turns false
 * either once the type lands, or once whoever is forcing it gives up and
 * the record is taken away) instead of treating a consumed page-load latch
 * (`takeStorePickupStart` already false) as "nothing to do".
 */
export const storePickupLanding = (type) => storePickupForcedFromRecorded() && type !== 2

/**
 * Whether a caller holding a loading gate open for `storePickupLanding`
 * may release it, and whether it should give up on the
 * record (clear it) while doing so: not landing → release, nothing to give
 * up on. Still landing → keep waiting, UNLESS `changeType(2)` already
 * `settled` (resolved or rejected) without the type ever landing (e.g. an
 * API error applied it silently) or the caller's own fallback `timedOut` —
 * either way release AND give up, so a bad force can never hang the gate
 * forever.
 */
export const bootPickupRelease = ({ landing, settled, timedOut }) => {
  const giveUp = !!landing && !!(settled || timedOut)
  return { release: !landing || giveUp, giveUp }
}

/**
 * The pickup-start decision for this page load, shared by
 * every caller that can be first to decide it (App.js's boot gate,
 * BusinessProductsListing's own gate as a fallback): whether pickup without
 * an address (implementation notes, `storePickupApplies`) applies. A restored address
 * or cart preserves the current type and settles the decision for the page
 * load.
 * Takes the page-load latch (`takeStorePickupStart`) and records the type
 * and store to restore (`setStorePickupForcedFrom`) when it decides to
 * force pickup; the caller still has to call `changeType(2)` itself.
 * @param {string} slug the store this decision is for (singleStore's own
 *   slug, or the entry store's), recorded so the restore only ever applies
 *   to it.
 * @returns {{action: 'skip'}|{action: 'already'}|{action: 'force', from: number}}
 *   'skip': doesn't apply, the type was restored, or another caller already decided.
 *   'already': already pickup; nothing to change.
 *   'force': not pickup yet; the caller must changeType(2).
 */
export const bootPickupStart = ({ singleStore, entry, configTypes, business, options, carts, slug }) => {
  if (!storePickupApplies({ singleStore, entry, configTypes, business })) return { action: 'skip' }
  if (!takeStorePickupStart()) return { action: 'skip' }
  const type = options?.type
  if (type === 2) return { action: 'already' }
  const hasCart = Object.values(carts ?? {}).some(cart => cart?.products?.length || cart?.reservation)
  if (options?.address_id || options?.address?.location || hasCart) return { action: 'skip' }
  if (!business) setStorePickupForcedFrom(type, slug)
  return { action: 'force', from: type }
}

/**
 * The order types that need the customer's address: delivery
 * (1) and catering delivery (7), same as api-core
 * `Config::orderTypeRequiresAddress`.
 */
export const ADDRESS_ORDER_TYPES = [1, 7]

/**
 * Whether the customer's address field shows for this order type: only
 * delivery and catering delivery (`ADDRESS_ORDER_TYPES`). An unknown or
 * undefined type keeps showing it (the behaviour before this type existed).
 */
export const showsCustomerAddress = (type) => type == null || ADDRESS_ORDER_TYPES.includes(Number(type))

// Every known order type (1-8) that never needs the customer's address: all
// but ADDRESS_ORDER_TYPES.
export const NON_ADDRESS_ORDER_TYPES = [1, 2, 3, 4, 5, 6, 7, 8].filter(type => !ADDRESS_ORDER_TYPES.includes(type))

/**
 * The project's unaddressed order types (`unaddressed_order_types_allowed`),
 * plus every order type that never needs the customer's address
 * (implementation notespickup and the rest, `NON_ADDRESS_ORDER_TYPES`) — those are
 * unaddressed regardless of `orderState`, kept only for the callers' signature.
 */
export const unaddressedTypesFor = (configs, orderState) => {
  const types = parseUnaddressedOrderTypes(configs?.unaddressed_order_types_allowed?.value)
  return [...new Set([...types, ...NON_ADDRESS_ORDER_TYPES])]
}

/**
 * The carts of the single store among the user's carts (the user's carts of
 * other stores of the project stay out), matched by slug or business id like
 * the header's cart.
 */
export const singleStoreCarts = (carts, slug) => {
  if (!Array.isArray(carts)) return carts
  if (!slug) return carts
  return carts.filter(cart => cart?.business?.slug === slug || cart?.business_id === slug)
}

/** Whether a business (a cart's, an order's, a product's) is the single store. */
export const isSingleStoreBusiness = (business, slug) =>
  !!slug && !!business && (business.slug === slug || String(business.id) === String(slug))

/**
 * Whether a guest may add to cart and check out here without signing in
 * first: the site is one store, or the visitor's entry page
 * was this store's (`singleStore` or `isEntryStore`). In both cases the web
 * lets a guest go ahead, ignoring the site's guest checkout settings
 * (`guest_checkout_enabled`, `allowed_order_types_guest_checkout`).
 */
export const isGuestStore = ({ singleStore, site, slug, fullWebsite }) => !!singleStore || isEntryStore(site, slug, { fullWebsite })

/**
 * The user's favorites of the single store only: the store itself, its
 * products (and only its offer of each) and its orders. Without a single
 * store the list comes back as it is.
 * @param {Array<object>} favorites
 * @param {'business'|'product'|'order'|'professional'} kind
 */
export const singleStoreFavorites = (favorites, kind, slug) => {
  if (!slug || !Array.isArray(favorites)) return favorites
  if (kind === 'business') return favorites.filter(business => isSingleStoreBusiness(business, slug))
  if (kind === 'order') {
    return favorites.filter(order => isSingleStoreBusiness(order?.business, slug) || String(order?.business_id) === String(slug))
  }
  if (kind === 'product') {
    return favorites
      .map(product => ({ ...product, businesses: (product?.businesses || []).filter(business => isSingleStoreBusiness(business, slug)) }))
      .filter(product => product.businesses.length > 0)
  }
  return favorites
}
