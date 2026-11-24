import { useTheme } from 'styled-components'
import settings from '~/config'
import { franchiseId, franchiseSlug, singleStoreSlug, siteSetting } from '~/utils/siteSettings'
import { useApi } from '~components/contexts/ApiContext'
import { readPage, resetStoreLandingCache, seedResource, seedStoreLanding, useResource } from './useStoreLanding'

/**
 * The stores of the site's franchise, for the marketing home page of a franchise
 * (full website): the main store whose story it tells and the list of locations.
 *
 * ```
 * useFranchiseStores() → { data, loading, error, retry }
 *   data: null until the stores arrive, then [{ id, name, slug, address, location, schedule,
 *     timezone, logo, open }] in the API's order, each once (by id). [] when the franchise has none.
 *     null and idle (nothing is requested) when the site has no franchise or none whose id is an integer.
 * useMainStore() → { store, loading, error, retry }
 *   store: the id of the main store (what useStoreLanding takes), null while the stores load, when
 *     they failed or when the franchise has none; loading, error and retry are the stores'.
 * resolveMainStore(mainStoreId, stores) → the store object or null
 * ```
 *
 * The endpoint (api-core `FranchiseController@businesses`, anonymous) returns only the stores that are
 * enabled, not snoozed and with some menu enabled, so nothing is filtered here (`enabled` is not even one
 * of its `params`); `open` and `today` are computed in each store's zone. Its `{franchise_id}` must be an
 * INTEGER: a slug answers 404 `franchise.not_found`. The id is the site's `franchise_id`, else the
 * `franchise_slug` / config's `franchiseSlug` (the worker puts the id there) when that is an integer; with
 * none the hook stays idle and the page has no stores.
 *
 * Same module cache as useStoreLanding (by `<api root>|<franchise>`): every caller shares one read.
 */

const PAGE_SIZE = 100 // the API's maximum
// shortcut: 10 pages = 1000 stores; a franchise with more shows the first 1000, raise it when one does
const MAX_PAGES = 10
// what the cards, the map, the footer and the main store's resolution read
export const STORE_PARAMS = 'id,name,slug,address,location,schedule,timezone,logo,open'

const fetchStores = async (ordering, franchise) => {
  const stores = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { result, pagination } = await readPage(ordering, `franchises/${encodeURIComponent(franchise)}/businesses?params=${STORE_PARAMS}&page=${page}&page_size=${PAGE_SIZE}`)
    const list = Array.isArray(result) ? result : []
    // a paginated list that shifts between pages can repeat a store: one card, one `key`
    stores.push(...list.filter((store) => !stores.some((seen) => seen.id === store.id)))
    const more = Number.isFinite(pagination?.total_pages) ? page < pagination.total_pages : list.length >= PAGE_SIZE
    if (!list.length || !more) break
  }
  return stores
}

const integerId = (value) => (Number.isInteger(value) || /^\d+$/.test(value) ? String(value) : null)

/** The franchise id the stores are read by (an integer, as text), or null. */
export const franchiseOf = (theme) => integerId(franchiseId(theme)) || integerId(franchiseSlug(theme, settings))

const storesKey = (root, franchise) => `${root}|${franchise}|franchise-stores`

export const useFranchiseStores = () => {
  const [ordering] = useApi()
  const franchise = franchiseOf(useTheme())
  return useResource(franchise ? storesKey(ordering?.root, franchise) : null, () => fetchStores(ordering, franchise))
}

/** Empties the cache (tests): it is useStoreLanding's, so it also empties the stores' reads. */
export const resetFranchiseStoresCache = resetStoreLandingCache

/**
 * The main store: the one `site.main_store` names; when it is missing or is not one of the franchise's
 * stores (deleted, or no longer its), the first of the list; null when the list is empty or not there.
 */
export const resolveMainStore = (mainStoreId, stores) => {
  if (!stores?.length) return null
  const named = mainStoreId === null || mainStoreId === undefined || mainStoreId === '' ? null : stores.find((store) => String(store.id) === String(mainStoreId))
  return named || stores[0]
}

export const useMainStore = () => {
  const theme = useTheme()
  const { data, loading, error, retry } = useFranchiseStores()
  const main = resolveMainStore(siteSetting(theme, 'main_store'), data)
  return { store: main ? main.id : null, loading, error, retry }
}

/**
 * Seeds what the Worker read for a franchise (`{ franchiseStores, business, featured, services, reviews }`):
 * the list of stores, and the main store's resources only when `business` is the store the client will resolve
 * as main (a main store the Worker could not read leaves it to load, as without a seed).
 */
export const seedFranchiseLanding = (root, theme, { franchiseStores, ...landing }) => {
  const franchise = franchiseOf(theme)
  if (!franchise || !Array.isArray(franchiseStores)) return
  seedResource(storesKey(root, franchise), franchiseStores)
  const main = resolveMainStore(siteSetting(theme, 'main_store'), franchiseStores)
  if (main && String(landing.business?.id) === String(main.id)) seedStoreLanding(root, main.id, landing)
}

/**
 * The one entry point that seeds the landing's cache from a server's data (the Worker's `window.__LANDING__`
 * on the client, `landing` in the server render): a franchise's (it carries `franchiseStores`) or one store's,
 * which the sections ask for as the theme names it, else `fallbackStore`.
 */
export const seedLanding = (root, theme, seed, fallbackStore) => {
  if (seed?.franchiseStores) seedFranchiseLanding(root, theme, seed)
  else seedStoreLanding(root, singleStoreSlug(theme, settings) || fallbackStore, seed)
}
