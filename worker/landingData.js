// The store data of the marketing page `/` of a Full Website (docs/FULL_WEBSITE.md), read by the
// Worker for the JSON-LD and the share image, and for the render step that follows.
// The reads are the browser hook's own (src/pages/Landing/landingReads.js). Fail-open: any failure or
// a timeout is `null` and the page ships as it does without Full Website.
import { fetchBusiness, fetchFeatured, fetchReviews, fetchServices, readPage } from '../src/pages/Landing/landingReads.js'
import {
  buildApiBase,
  buildLandingCacheKey,
  getThemeFranchiseId,
  getThemeSite,
  hostCacheTag,
  isThemeEnvelope,
  pickNonEmptyString,
  readJsonWithLimit,
  resolvePositiveInt,
  swrRead,
  swrWrite
} from './seo.js'

const DEFAULT_LANDING_TTL = 120
const DEFAULT_LANDING_TIMEOUT_MS = 1500
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
// The stores are read as the client does (src/pages/Landing/useFranchiseStores.js: 100 per page, the API's
// maximum), but only up to this many pages. shortcut: 3 pages = 300 stores (the client reads up to 1000, but
// the Worker waits at most LANDING_TIMEOUT_MS); a franchise with more is `franchiseTruncated` and gets no
// server paint, and its main store is only taken when the list confirms it.
export const FRANCHISE_PAGE_SIZE = 100
export const FRANCHISE_MAX_PAGES = 3
const FRANCHISE_PARAMS = 'id,name,slug,address,address_notes,location,phone,schedule,timezone,logo,header,open,today,featured'

/** Full Website as the Worker reads it from the raw theme envelope: `experience` and not `tracking_only`. */
export const isFullWebsiteTheme = (theme) => {
  const site = getThemeSite(theme)
  return !!site && site.experience === 'full_website' && !site.tracking_only
}

/** The time limit of the landing's reads (and of the live first_load that gates them), in ms. */
export const landingTimeoutMs = (env) => resolvePositiveInt(env?.LANDING_TIMEOUT_MS, DEFAULT_LANDING_TIMEOUT_MS)

/**
 * The photo of the hero for the share image (an unvalidated string; resolveShareImage checks it):
 * the store's header (the main store's in a franchise, confirmed or not at all: never another store's),
 * or the marketplace hero's `images.home_hero`.
 */
export const landingHeroImage = (theme, data) => {
  if (!data) return null
  if (data.mode === 'marketplace') return isThemeEnvelope(theme) ? theme.values.images?.home_hero ?? null : null
  return data.business?.header ?? null
}

// A store id (number) or slug (text), else null.
const storeRef = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : pickNonEmptyString(value))

export const fetchLandingData = async ({ config, theme, site, env = {}, ctx, hostname } = {}) => {
  const themeSite = getThemeSite(theme)
  if (!isFullWebsiteTheme(theme) || !config?.api?.url) return null

  const timeoutMs = landingTimeoutMs(env)
  const ttl = resolvePositiveInt(env.LANDING_TTL, DEFAULT_LANDING_TTL)
  const maxBytes = resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES)
  const ordering = { root: buildApiBase(config), appId: config.app_id }
  const cacheTag = hostCacheTag(hostname)

  // the browser hook's `read`, with this Worker's time limit and size limit
  const limitedFetch = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    .then((response) => ({ json: () => readJsonWithLimit(response, maxBytes) }))

  // One resource through the Worker's cache (fresh, or stale and refreshed in the background).
  // `load` throws when the read fails: an error is never cached.
  const cached = async (resource, id, load) => {
    const key = buildLandingCacheKey(hostname, resource, id, config)
    const refresh = async () => {
      const data = await load(limitedFetch)
      if (data === null || data === undefined) throw new Error(`${resource}: empty answer`)
      swrWrite(key, data, env, ctx, cacheTag)
      return data
    }
    const hit = await swrRead(key, env, ttl)
    if (hit && hit.data !== null && hit.data !== undefined) {
      if (hit.isStale) ctx?.waitUntil?.(refresh().catch(() => {}))
      return hit.data
    }
    return refresh()
  }
  const orNull = (promise) => promise.catch(() => null)

  const storeData = async (business) => {
    const [featured, services, reviews] = await Promise.all([
      orNull(cached('featured', business.id, (f) => fetchFeatured(ordering, business, f))),
      orNull(cached('services', business.id, (f) => fetchServices(ordering, business, f))),
      orNull(cached('reviews', business.id, (f) => fetchReviews(ordering, business, f)))
    ])
    return { business, featured, services, reviews }
  }
  const businessOf = (store) => cached('business', store, (f) => fetchBusiness(ordering, store, f))
  const noStore = { business: null, featured: null, services: null, reviews: null }

  const gather = async () => {
    if (themeSite.mode === 'single_store') {
      const store = pickNonEmptyString(themeSite.business_slug) || pickNonEmptyString(site?.business?.slug)
      if (!store) return null
      return { mode: 'single_store', ...await storeData(await businessOf(store)), franchiseBusinesses: null }
    }
    if (themeSite.mode === 'franchise') {
      const franchise = getThemeFranchiseId(theme)
      if (franchise === null) return null
      const { stores: list, truncated } = await cached('franchise', franchise, async (f) => {
        const stores = []
        for (let page = 1; page <= FRANCHISE_MAX_PAGES; page += 1) {
          const { result, pagination } = await readPage(ordering, `franchises/${encodeURIComponent(franchise)}/businesses?params=${FRANCHISE_PARAMS}&page=${page}&page_size=${FRANCHISE_PAGE_SIZE}`, f)
          if (!Array.isArray(result)) throw new Error('franchise: invalid list')
          // pagination can repeat a store across pages: keep the first
          stores.push(...result.filter((store) => !stores.some((seen) => seen?.id != null && seen.id === store?.id)))
          const more = Number.isFinite(pagination?.total_pages) ? page < pagination.total_pages : result.length >= FRANCHISE_PAGE_SIZE
          if (!result.length || !more) return { stores, truncated: false }
        }
        return { stores, truncated: true }
      })
      // only the main store gets its own reads, resolved as the client does (resolveMainStore): the list's
      // store `main_store` names, else the first one. A cut list that does not hold the named store cannot
      // confirm which the client will pick: no main store (never another one's data).
      const named = storeRef(themeSite.main_store)
      const main = (named !== null && list.find((store) => String(store?.id) === String(named))) || (named !== null && truncated ? null : list[0])
      const ref = storeRef(main?.id)
      const business = ref === null ? null : await orNull(businessOf(ref))
      return { mode: 'franchise', ...(business ? await storeData(business) : noStore), franchiseBusinesses: list, franchiseTruncated: truncated }
    }
    // a marketplace has no store to read
    return { mode: 'marketplace', ...noStore, franchiseBusinesses: null }
  }

  let timer
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs) })
  // The page does not wait past the limit, but the reads in flight still finish and write the cache
  // (ctx.waitUntil keeps the Worker alive for them) so the next request finds them.
  try {
    const work = gather()
    ctx?.waitUntil?.(work.catch(() => {}))
    return await Promise.race([work, timeout])
  } catch (_) {
    return null
  } finally {
    clearTimeout(timer)
  }
}
