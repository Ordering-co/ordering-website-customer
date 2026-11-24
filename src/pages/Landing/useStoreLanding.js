import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useApi } from '~components/contexts/ApiContext'
import { fetchBusiness, fetchFeatured, fetchServices, fetchReviews } from './landingReads'

// the reads live in landingReads (shared with the Worker's SSR); useFranchiseStores reads its pages through here
export { readPage } from './landingReads'

/**
 * The store's public data for the marketing home page (full website). One
 * source for the header, the footer and every section: they all call the hook
 * with the same store and share one request per resource.
 *
 * ```
 * useStoreLanding(store, resources?)
 *   store: the store's id (number) or slug (string); null / '' → everything idle, nothing is requested
 *   resources: optional list of the resources the caller reads ('business', 'featured', 'services',
 *     'reviews'; business is always loaded). The others stay idle and are not requested, so a hidden
 *     section does not cost a request. Without it, all four.
 *   → { business, featured, services, reviews }, each one { data, loading, error, retry }
 *
 * Every resource: data (null until it arrives), loading (true from the first render of a
 * store until it settles; a store that does not exist yet reads loading, not empty), error
 * (an Error, or null) and retry() (asks that one resource again). featured, services and
 * reviews wait for business.data.id: while the business loads they read loading, and when
 * it fails they stay idle (the hero shows the error and the retry).
 *
 * business.data: the store as GET business/{id|slug}?params=id,name,slug,logo,header,
 *   description,about,address,address_notes,location,phone,cellphone,schedule,timezone,open,
 *   today,gallery,reviews,delivery_time,pickup_time,facebook_profile,instagram_profile,
 *   tiktok_profile,whatsapp_number returns it (galleryPhotos(business) → the images only)
 * featured.data: [{ id, name, price, image, slug, category_id }]  (featured products of
 *   the menus open now, at most 8; image is a URL or null)
 * services.data: { delivery: { enabled, time }, pickup: { enabled, time }, eatin: { enabled } }
 *   (enabled: some enabled menu serves it; time: the store's delivery_time / pickup_time in
 *   minutes, or null)
 * reviews.data: { average, count, recent: [{ id, author, comment, rating, createdAt }] }
 *   (average and count: the store's reviews; recent: at most 3 of 4-5 stars with a comment,
 *   newest first. Privacy: author is the name and the initial of the last name ("Laura S."),
 *   '' when the reviewer has no name; nothing else of the reviewer is kept)
 * ```
 *
 * The cache lives in the module, by `<api root>|<store>|<resource>`: simultaneous callers
 * share one in-flight request. A resolved resource is not asked again while it is fresh
 * (5 minutes); a caller that mounts after that, or after an error, asks again (the stale
 * data stays on screen meanwhile). While mounted, an error waits for retry().
 */

const CACHE_TTL = 5 * 60 * 1000

// ---- cache ---------------------------------------------------------------

const IDLE = Object.freeze({ data: null, loading: false, error: null })
const INITIAL = Object.freeze({ data: null, loading: true, error: null })
const cache = new Map()

const entryOf = (key) => {
  if (!cache.has(key)) cache.set(key, { snap: INITIAL, promise: null, listeners: new Set() })
  return cache.get(key)
}

const publish = (entry, snap) => {
  entry.snap = snap
  entry.listeners.forEach((listener) => listener())
}

// quiet: a refresh of stale data keeps it on screen and, if it fails, keeps it too
const run = (entry, fetcher, quiet = false) => {
  if (entry.promise) return
  if (!quiet) publish(entry, { data: null, loading: true, error: null })
  entry.promise = Promise.resolve()
    .then(fetcher)
    .then(
      (data) => {
        entry.at = Date.now()
        publish(entry, { data, loading: false, error: null })
      },
      (error) => {
        if (!quiet) publish(entry, { data: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) })
      }
    )
    .finally(() => { entry.promise = null })
}

/**
 * Puts data a server (or the Worker's `window.__LANDING__`) already read under one cache key, so the first
 * render paints with it. Stale on purpose: the Worker's data may be stale itself, so the hook shows it at
 * once and refreshes it quietly on mount. null or undefined data is left alone (it loads as usual).
 */
export const seedResource = (key, data) => {
  if (data === null || data === undefined) return
  const entry = entryOf(key)
  entry.snap = { data, loading: false, error: null }
  entry.at = 0
}

/**
 * Seeds a store's resources (seedResource). `root`: the API's ordering root (`useApi()[0].root`);
 * `store`: as the sections ask for it (id or slug); `resources`: `{ business, featured, services, reviews }`.
 */
export const seedStoreLanding = (root, store, resources) => {
  ['business', 'featured', 'services', 'reviews'].forEach((resource) => seedResource(`${root}|${store}|${resource}`, resources?.[resource]))
}

/** Empties the cache (tests). */
export const resetStoreLandingCache = () => cache.clear()

// also read by useFranchiseStores: the same cache and the same way to ask
export const useResource = (key, fetcher) => {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const entry = key ? entryOf(key) : null
  const snap = useSyncExternalStore(
    (listener) => {
      if (!entry) return () => {}
      entry.listeners.add(listener)
      return () => entry.listeners.delete(listener)
    },
    () => (entry ? entry.snap : IDLE),
    // the server render (src/pages/Landing/ssr) reads the seeded snapshot; useSyncExternalStore throws without one
    () => (entry ? entry.snap : IDLE)
  )
  useEffect(() => {
    if (!entry || entry.promise) return
    // on mount: ask what was never asked or failed; refresh what is older than the TTL
    const stale = !snap.loading && !snap.error && Date.now() - entry.at > CACHE_TTL
    if (snap.loading || snap.error || stale) run(entry, () => fetcherRef.current(), stale)
  }, [entry])
  const retry = () => { if (entry) run(entry, () => fetcherRef.current()) }
  return { ...snap, retry }
}

// ---- hook ----------------------------------------------------------------

export const useStoreLanding = (store, resources) => {
  const [ordering] = useApi()
  const hasStore = store !== null && store !== undefined && store !== ''
  const keyOf = (resource) => `${ordering?.root}|${store}|${resource}`

  const business = useResource(hasStore ? keyOf('business') : null, () => fetchBusiness(ordering, store))
  const loaded = business.data
  // featured, services and reviews wait for the business id
  const keyIfLoaded = (resource) => (loaded && (!resources || resources.includes(resource)) ? keyOf(resource) : null)
  const featured = useResource(keyIfLoaded('featured'), () => fetchFeatured(ordering, loaded))
  const services = useResource(keyIfLoaded('services'), () => fetchServices(ordering, loaded))
  const reviews = useResource(keyIfLoaded('reviews'), () => fetchReviews(ordering, loaded))
  // while the business loads they read loading; when it failed they stay idle
  const waiting = (resource, result) => {
    if (resources && !resources.includes(resource)) return { ...IDLE, retry: () => {} }
    return loaded ? result : { ...IDLE, loading: hasStore && business.loading, retry: business.retry }
  }

  return { business, featured: waiting('featured', featured), services: waiting('services', services), reviews: waiting('reviews', reviews) }
}

// ---- what each section needs ---------------------------------------------

/** The images of the store's gallery (its videos are left out). */
export const galleryPhotos = (business) => (business?.gallery || []).filter((item) => item?.file)

/** The text of the about section: `about`, else `description`, else ''. */
export const aboutText = (business) => String(business?.about || business?.description || '').trim()

/**
 * The sections that have something to show, from the result of useStoreLanding:
 * a Set of keys among hero, featured, about, services, gallery, reviews, visit.
 * The header and the footer use it to link only to sections that exist.
 */
export const landingSectionsWithData = (landing) => {
  const business = landing?.business?.data
  const sections = new Set()
  if (!business) return sections
  sections.add('hero')
  if (landing.featured?.data?.length) sections.add('featured')
  if (aboutText(business)) sections.add('about')
  const services = landing.services?.data
  if (services && (services.delivery.enabled || services.pickup.enabled || services.eatin.enabled)) sections.add('services')
  if (galleryPhotos(business).length) sections.add('gallery')
  if (landing.reviews?.data?.count > 0) sections.add('reviews')
  if (String(business.address || '').trim()) sections.add('visit')
  return sections
}
