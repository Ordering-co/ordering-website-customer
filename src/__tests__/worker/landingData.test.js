import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FRANCHISE_MAX_PAGES, FRANCHISE_PAGE_SIZE, fetchLandingData, isFullWebsiteTheme, landingHeroImage } from '../../../worker/landingData.js'
import { buildLandingCacheKey } from '../../../worker/seo.js'
import { api, business, landingFetch, urlsOf } from '../../pages/Landing/__tests__/landingFixtures.js'

const config = { api: { url: 'https://api.ordering.test', version: 'v400', language: 'en' }, project: 'demo', app_id: api.appId }
const HOST = 'tacos.example.com'

const themeOf = (site) => ({ version: 2, values: { site: { mode: 'single_store', experience: 'full_website', business_slug: 'casa-lupita', ...site } } })

const franchiseList = [
  { id: 5, name: 'Casa Lupita', slug: 'casa-lupita', header: 'https://img.test/header.jpg' },
  { id: 9, name: 'Casa Lupita Norte', slug: 'casa-lupita-norte', header: 'https://img.test/norte.jpg' }
]

// Stands in for the Cache API: entries by URL, as the Worker writes them.
const fakeCaches = () => {
  const store = new Map()
  return {
    store,
    default: {
      match: async (request) => store.get(request.url)?.clone(),
      put: async (request, response) => { store.set(request.url, response) }
    }
  }
}

// The fixtures' fetch answers `{ json }`; the Worker reads real Responses (size-limited), so adapt it.
const asWorkerFetch = (inner, overrides = {}) => vi.fn(async (url, init) => {
  const text = String(url)
  if (text.includes('/franchises/')) {
    const list = overrides.franchise ?? franchiseList
    return new Response(JSON.stringify(list instanceof Error ? { error: true, result: [list.message] } : { error: false, result: list }))
  }
  return new Response(JSON.stringify(await (await inner(url, init)).json()))
})

let pending
const run = async (theme, extra = {}) => {
  const result = await fetchLandingData({
    config, theme, site: { business: { slug: 'from-first-load' } }, env: {}, hostname: HOST, ctx: { waitUntil: (promise) => pending.push(promise) }, ...extra
  })
  await Promise.all(pending)
  return result
}

describe('worker: fetchLandingData', () => {
  let inner
  let fetchMock

  const useFetch = (overrides = {}, franchiseOverrides = {}) => {
    inner = landingFetch(overrides)
    fetchMock = asWorkerFetch(inner, franchiseOverrides)
    vi.stubGlobal('fetch', fetchMock)
  }

  // the ids or slugs of the stores asked for (`business/<store>?params=`)
  const storesAsked = () => fetchMock.mock.calls.map(([url]) => /\/business\/([^/?]+)\?/.exec(String(url))?.[1]).filter(Boolean)

  beforeEach(() => {
    pending = []
    vi.stubGlobal('caches', fakeCaches())
    useFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('one store: the business, its featured dishes, services and reviews, through the browser hook reads', async () => {
    const data = await run(themeOf())

    expect(data.mode).toBe('single_store')
    expect(data.business).toMatchObject({ id: 5, name: 'Casa Lupita', header: 'https://img.test/header.jpg' })
    expect(data.featured.map((dish) => dish.name)).toEqual(['Birria Tacos', 'Horchata'])
    expect(data.services).toEqual({ delivery: { enabled: true, time: 30 }, pickup: { enabled: true, time: 15 }, eatin: { enabled: false } })
    expect(data.reviews.count).toBe(212)
    // privacy: only the name and the initial of the last name leave the reads
    expect(data.reviews.recent[0]).toMatchObject({ author: 'Laura S.' })
    expect(JSON.stringify(data.reviews)).not.toMatch(/laura@example|photo|Smith/)
    expect(data.franchiseBusinesses).toBeNull()

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(new RegExp(`^${api.root}/business/casa-lupita\\?params=id,name,slug,logo,header`))
    expect(init.headers['X-App-X']).toBe(api.appId)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('one store: without business_slug in the theme it uses the first_load business', async () => {
    await run(themeOf({ business_slug: '' }))
    expect(String(fetchMock.mock.calls[0][0])).toContain('/business/from-first-load?')
  })

  it('one store: without any store, or when the store fails, it is null', async () => {
    expect(await run(themeOf({ business_slug: '' }), { site: null })).toBeNull()
    useFetch({ business: new Error('not found') })
    expect(await run(themeOf())).toBeNull()
  })

  it('franchise with a main store: the list of stores plus the main store\'s own reads', async () => {
    const data = await run(themeOf({ mode: 'franchise', franchise_id: 7, main_store: 5 }))

    expect(data.mode).toBe('franchise')
    expect(data.franchiseBusinesses).toEqual(franchiseList)
    expect(data.business.id).toBe(5)
    expect(data.featured).toHaveLength(2)
    const listUrl = fetchMock.mock.calls.map(([url]) => String(url)).find((url) => url.includes('/franchises/'))
    expect(listUrl).toBe(`${api.root}/franchises/7/businesses?params=id,name,slug,address,address_notes,location,phone,schedule,timezone,logo,header,open,today,featured&page=1&page_size=100`)
    expect(storesAsked()[0]).toBe('5')
  })

  it('franchise: a main store that is not in the list falls to the first store of the list, without asking for the missing one', async () => {
    const data = await run(themeOf({ mode: 'franchise', franchise_id: 7, main_store: 99 }))
    expect(data.business.id).toBe(5)
    expect(storesAsked()).toEqual(['5'])
  })

  it('franchise: the main store is the list\'s store the site names, as text or number, whatever its place', async () => {
    useFetch({ business: (url) => ({ ...business, id: Number(/\/business\/(\d+)\?/.exec(url)[1]) }) })
    expect((await run(themeOf({ mode: 'franchise', franchise_id: 7, main_store: '9' }))).business.id).toBe(9)
    expect(storesAsked()).toEqual(['9'])
  })

  it('franchise without a main store: the first store of the list is read; without the list it is null', async () => {
    const data = await run(themeOf({ mode: 'franchise', franchise_id: 'my-franchise', main_store: null }))
    expect(data).toMatchObject({ mode: 'franchise', franchiseBusinesses: franchiseList })
    expect(data.business.id).toBe(5)
    expect(storesAsked()).toEqual(['5'])

    useFetch({}, { franchise: [] })
    expect(await run(themeOf({ mode: 'franchise', franchise_id: 7 }), { hostname: 'empty.example.com' })).toEqual({ mode: 'franchise', business: null, featured: null, services: null, reviews: null, franchiseBusinesses: [], franchiseTruncated: false })
    expect(storesAsked()).toHaveLength(0)

    useFetch({}, { franchise: new Error('nope') })
    expect(await run(themeOf({ mode: 'franchise', franchise_id: 7 }), { hostname: 'other.example.com' })).toBeNull()
  })

  it('marketplace: only the mode, no request', async () => {
    const data = await run(themeOf({ mode: 'marketplace' }))
    expect(data).toEqual({ mode: 'marketplace', business: null, featured: null, services: null, reviews: null, franchiseBusinesses: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ordering_only, tracking_only and a theme without site settings: null and no request', async () => {
    for (const theme of [
      themeOf({ experience: 'ordering_only' }),
      themeOf({ experience: undefined }),
      themeOf({ tracking_only: true }),
      { version: 2, values: {} },
      { site: 'nope' },
      null
    ]) {
      expect(await run(theme)).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isFullWebsiteTheme(themeOf())).toBe(true)
  })

  it('a timeout is null (fail-open)', async () => {
    // like a real fetch: it ends when its time limit (AbortSignal.timeout) fires
    fetchMock = vi.fn((url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))))
    vi.stubGlobal('fetch', fetchMock)
    const started = Date.now()
    expect(await run(themeOf(), { env: { LANDING_TIMEOUT_MS: '30' } })).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('a timeout does not cut the cache writes: the whole gather is handed to ctx.waitUntil and finishes', async () => {
    vi.stubGlobal('fetch', async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      return fetchMock(...args)
    })
    expect(await run(themeOf(), { env: { LANDING_TIMEOUT_MS: '30' } })).toBeNull()
    // the page already gave up, but the reads kept going and wrote business, featured, services and reviews
    for (let i = 0; i < 3; i++) await Promise.all(pending)
    expect(caches.store.size).toBe(4)
  })

  it('privacy: the business\'s reviews are reduced to { total, reviews_count } before they are cached or served', async () => {
    const user = { id: 70, name: 'Laura', lastname: 'Smith', email: 'laura@example.com', photo: 'https://img.test/laura.jpg' }
    useFetch({ business: { ...business, reviews: { total: 4.5, reviews: [{ id: 1, comment: 'Great', user }, { id: 2, comment: 'Good', user }] } } })
    const data = await run(themeOf())
    expect(data.business.reviews).toEqual({ total: 4.5, reviews_count: 2 })
    expect(data.reviews.count).toBe(2)
    const everything = JSON.stringify(data) + [...caches.store.values()].map((response) => response.url).join('')
    const cached = JSON.stringify(await Promise.all([...caches.store.values()].map((response) => response.clone().text())))
    for (const text of [everything, cached]) expect(text).not.toMatch(/lastname|laura@example|photo|"user"/)
  })

  it('a secondary read that fails leaves only its own field null', async () => {
    useFetch({ products: new Error('boom') })
    let data = await run(themeOf())
    expect(data.featured).toBeNull()
    expect(data.business.id).toBe(5)
    expect(data.services).not.toBeNull()
    expect(data.reviews.count).toBe(212)

    useFetch({ reviews: new Error('boom'), menus: new Error('boom') })
    data = await run(themeOf(), { hostname: 'other.example.com' })
    expect(data.reviews).toBeNull()
    expect(data.services).toBeNull()
    expect(data.featured).toHaveLength(2)
  })

  it('caches every read per host: the second request makes no fetch; another host asks again', async () => {
    const first = await run(themeOf())
    const calls = fetchMock.mock.calls.length
    expect(calls).toBeGreaterThanOrEqual(4)

    const second = await run(themeOf())
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(calls)

    await run(themeOf(), { hostname: 'other.example.com' })
    expect(fetchMock.mock.calls.length).toBe(calls * 2)
  })

  it('tags the cache entries with the host and never stores an error', async () => {
    useFetch({ business: new Error('down') })
    expect(await run(themeOf())).toBeNull()
    expect(globalThis.caches.store.size).toBe(0)

    useFetch({ products: new Error('down') })
    await run(themeOf())
    const entries = [...globalThis.caches.store.entries()]
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every(([key, response]) => key.includes('resource=') && response.headers.get('cache-tag') === `host-${HOST}`)).toBe(true)
    expect(entries.some(([key]) => key.includes('resource=featured'))).toBe(false)

    // the failed read is asked again, and now cached
    useFetch()
    expect((await run(themeOf())).featured).toHaveLength(2)
    expect(urlsOf(inner, 'products').length).toBeGreaterThan(0)
    expect(storesAsked()).toHaveLength(0)
  })

  it('honours LANDING_TTL: a stale entry is served and refreshed in the background', async () => {
    await run(themeOf())
    const calls = fetchMock.mock.calls.length
    const stale = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 121_000)
    const data = await run(themeOf())
    stale.mockRestore()
    expect(data.business.id).toBe(5)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls)
    // within the TTL set by the env, the same age is still fresh
    const fresh = fetchMock.mock.calls.length
    const later = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 121_000)
    await run(themeOf(), { env: { LANDING_TTL: '600' } })
    later.mockRestore()
    expect(fetchMock.mock.calls.length).toBe(fresh)
  })
})

describe('worker: landingHeroImage', () => {
  it('one store: its header; franchise: the main store\'s header and never another store\'s; marketplace: images.home_hero', () => {
    expect(landingHeroImage(null, { mode: 'single_store', business })).toBe(business.header)
    expect(landingHeroImage(null, { mode: 'franchise', business: { header: 'https://img.test/main.jpg' }, franchiseBusinesses: franchiseList })).toBe('https://img.test/main.jpg')
    // a main store that could not be confirmed or read: no hero (og:image falls to the site's images), never the first branch's header
    expect(landingHeroImage(null, { mode: 'franchise', business: null, franchiseBusinesses: franchiseList })).toBeNull()
    const theme = { version: 2, values: { images: { home_hero: 'https://img.test/hero.jpg' } } }
    expect(landingHeroImage(theme, { mode: 'marketplace' })).toBe('https://img.test/hero.jpg')
    expect(landingHeroImage(null, { mode: 'marketplace' })).toBeNull()
    expect(landingHeroImage(theme, null)).toBeNull()
  })
})

describe('worker: a franchise of more stores than one page', () => {
  const store = (id) => ({ id, name: `Store ${id}`, slug: `store-${id}`, header: `https://img.test/header-${id}.jpg` })
  const pageOf = (page) => Array.from({ length: FRANCHISE_PAGE_SIZE }, (_, index) => store((page - 1) * FRANCHISE_PAGE_SIZE + index + 1))
  let fetchMock
  let pending

  // `franchisePages(page)` is the API's answer for that page: its stores and its `pagination`
  const useStores = (franchisePages) => {
    const inner = landingFetch({ business: (url) => ({ ...business, id: Number(/\/business\/(\d+)\?/.exec(url)[1]), header: `https://img.test/header-${/\/business\/(\d+)\?/.exec(url)[1]}.jpg` }) })
    fetchMock = vi.fn(async (url, init) => {
      if (!String(url).includes('/franchises/')) return new Response(JSON.stringify(await (await inner(url, init)).json()))
      const { result, pagination } = franchisePages(Number(/page=(\d+)/.exec(String(url))[1]))
      return new Response(JSON.stringify({ error: false, result, pagination }))
    })
    vi.stubGlobal('fetch', fetchMock)
  }
  const franchiseUrls = () => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/franchises/'))
  const run = async (mainStore, hostname) => {
    const data = await fetchLandingData({
      config, theme: themeOf({ mode: 'franchise', franchise_id: 7, main_store: mainStore }), site: null, env: {}, hostname, ctx: { waitUntil: (promise) => pending.push(promise) }
    })
    await Promise.all(pending)
    return data
  }

  beforeEach(() => {
    pending = []
    vi.stubGlobal('caches', fakeCaches())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads the pages as the client does (100 per page) and resolves a main store that sits on page 2', async () => {
    useStores((page) => ({ result: page === 1 ? pageOf(1) : [store(150)], pagination: { total_pages: 2 } }))
    const data = await run(150, 'a.example.com')

    expect(franchiseUrls().map((url) => /page=(\d+)&page_size=(\d+)$/.exec(url).slice(1))).toEqual([['1', '100'], ['2', '100']])
    expect(data.franchiseBusinesses).toHaveLength(FRANCHISE_PAGE_SIZE + 1)
    expect(data.franchiseTruncated).toBe(false)
    expect(data.business.id).toBe(150)
    expect(landingHeroImage(null, data)).toBe('https://img.test/header-150.jpg')
  })

  it('a store that pagination repeats on the next page is listed once, the first one kept', async () => {
    useStores((page) => ({ result: page === 1 ? pageOf(1) : [{ ...store(100), name: 'Repeated' }, store(150)], pagination: { total_pages: 2 } }))
    const data = await run(null, 'dup.example.com')
    expect(data.franchiseBusinesses).toHaveLength(FRANCHISE_PAGE_SIZE + 1)
    expect(data.franchiseBusinesses.filter((s) => s.id === 100)).toEqual([store(100)])
  })

  it('without `pagination`, a full page asks for the next one; a short page ends the list', async () => {
    useStores((page) => ({ result: page === 1 ? pageOf(1) : [store(150)] }))
    const data = await run(null, 'b.example.com')
    expect(franchiseUrls()).toHaveLength(2)
    expect(data.franchiseBusinesses).toHaveLength(FRANCHISE_PAGE_SIZE + 1)
    expect(data.franchiseTruncated).toBe(false)
  })

  it('stops at the cap: the list is flagged cut; the named main store beyond it is NOT confirmed, so no store is read and the hero is not a branch\'s', async () => {
    useStores((page) => ({ result: pageOf(page), pagination: { total_pages: FRANCHISE_MAX_PAGES + 2 } }))
    const data = await run(999, 'c.example.com')

    expect(franchiseUrls()).toHaveLength(FRANCHISE_MAX_PAGES)
    expect(data.franchiseTruncated).toBe(true)
    expect(data.business).toBeNull()
    expect(fetchMock.mock.calls.some(([url]) => /\/business\/\d+\?/.test(String(url)))).toBe(false)
    // without the confirmed main store the share image has no hero (og:image falls to the site's images), never store 1's header
    expect(landingHeroImage(null, data)).toBeNull()
    expect(data.franchiseBusinesses[0].header).toBe('https://img.test/header-1.jpg')
  })

  it('a cut list with no named main store still resolves it: the first store, as the client\'s', async () => {
    useStores((page) => ({ result: pageOf(page), pagination: { total_pages: FRANCHISE_MAX_PAGES + 2 } }))
    const data = await run(null, 'd.example.com')
    expect(data.franchiseTruncated).toBe(true)
    expect(data.business.id).toBe(1)
  })

  it('a complete list without the named main store falls to the first store, as the client\'s resolveMainStore', async () => {
    useStores(() => ({ result: [store(1), store(2)], pagination: { total_pages: 1 } }))
    const data = await run(999, 'e.example.com')
    expect(data.franchiseTruncated).toBe(false)
    expect(data.business.id).toBe(1)
  })
})

describe('worker: the landing cache key (buildLandingCacheKey)', () => {
  const base = { project: 'demo', app_id: 'app-1', api: { url: 'https://api.ordering.test', version: 'v400', language: 'en' } }
  const keyOf = (overrides = {}, host = HOST, resource = 'business', id = 5) => buildLandingCacheKey(host, resource, id, { ...base, ...overrides, api: { ...base.api, ...overrides.api } })

  it('same host, API root, site identity, resource and id: the same key; it is versioned and keeps the host in it for the purge tag', () => {
    expect(keyOf()).toBe(keyOf())
    expect(keyOf()).toContain('v=2')
  })

  it('misses when any of host, project, API version, language, API url, app_id, resource or id changes (repeated ids included)', () => {
    const keys = new Set([
      keyOf(),
      keyOf({}, 'other.example.com'),
      keyOf({ project: 'other' }),
      keyOf({ api: { version: 'v500' } }),
      keyOf({ api: { language: 'es' } }),
      keyOf({ api: { url: 'https://api.other.test' } }),
      keyOf({ app_id: 'app-2' }),
      keyOf({}, HOST, 'featured'),
      keyOf({}, HOST, 'business', 9)
    ])
    expect(keys.size).toBe(9)
  })

  it('through the Worker\'s cache: a hit with everything equal, a miss for each field that changes, with the same store ids', async () => {
    vi.stubGlobal('caches', fakeCaches())
    const inner = landingFetch()
    const fetchMock = vi.fn(async (url, init) => new Response(JSON.stringify(await (await inner(url, init)).json())))
    vi.stubGlobal('fetch', fetchMock)
    const pending = []
    const read = async (overrides = {}, hostname = HOST) => {
      await fetchLandingData({
        config: { ...config, ...overrides, api: { ...config.api, ...overrides.api } }, theme: themeOf(), site: null, env: {}, hostname, ctx: { waitUntil: (promise) => pending.push(promise) }
      })
      await Promise.all(pending)
    }
    await read()
    const calls = fetchMock.mock.calls.length
    await read()
    expect(fetchMock).toHaveBeenCalledTimes(calls) // all equal: every read is a hit

    let expected = calls
    for (const [overrides, hostname] of [
      [{ project: 'other' }, HOST],
      [{ api: { version: 'v500' } }, HOST],
      [{ api: { language: 'es' } }, HOST],
      [{ app_id: 'other-app' }, HOST],
      [{}, 'other.example.com']
    ]) {
      await read(overrides, hostname)
      expected += calls
      expect(fetchMock).toHaveBeenCalledTimes(expected) // each changed field asks the API again for the same store
    }
    vi.unstubAllGlobals()
  })
})
