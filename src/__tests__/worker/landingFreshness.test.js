import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { landingFetch } from '../../pages/Landing/__tests__/landingFixtures.js'
import { buildOwnFirstLoadCacheKey, fetchFirstLoad } from '../../../worker/seo.js'

// `/` of a Full Website does not outlive a change of the store's privacy: the real seo.js / landingData.js /
// index.js run with a Cache API stand-in, a fetch that answers by URL and a fake render (the SSR bundle is
// not built here). The store is made private at the origin WITHOUT purging any cache.
const ssrState = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../../../worker/landingSsrBundle.js', () => ({
  loadLandingSsr: async () => ({
    renderLanding: () => {
      ssrState.calls += 1
      return { html: '<main>STORE-SSR Casa Lupita</main>', css: '' }
    }
  })
}))

const SHELL_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>My Site</title></head>
<body><noscript>JS</noscript><div id="root"></div><script type="module" src="/src/index.js"></script></body></html>`

class FakeHTMLRewriter {
  constructor () { this.handlers = [] }

  on (selector, handler) {
    this.handlers.push({ selector, handler })
    return this
  }

  transform (response) {
    const doc = new JSDOM(SHELL_HTML).window.document
    const facade = (el) => ({
      remove: () => el.remove(),
      setInnerContent: (content) => { el.textContent = content },
      append: (content) => el.insertAdjacentHTML('beforeend', content),
      before: (content) => el.insertAdjacentHTML('beforebegin', content)
    })
    for (const { selector, handler } of this.handlers) doc.querySelectorAll(selector).forEach((el) => handler.element?.(facade(el)))
    return { body: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, status: response.status, statusText: response.statusText, headers: response.headers }
  }
}

const fakeCaches = () => {
  const store = new Map()
  return { store, default: { match: async (request) => store.get(request.url)?.clone(), put: async (request, response) => { store.set(request.url, response) } } }
}

const configJson = { project: 'synthetic-project', app_id: 'synthetic-app', api: { url: 'https://api.synthetic-fixture.invalid' } }
const buildEnv = (extra = {}, config = configJson) => ({
  PROJECT: 'synthetic-project',
  ...extra,
  ASSETS: {
    fetch: async (request) => new URL(request.url).pathname === '/config.json'
      ? new Response(JSON.stringify(config), { headers: { 'content-type': 'application/json' } })
      : new Response(SHELL_HTML, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
  }
})

const firstLoadResult = (storePrivate) => ({
  site: { name: 'Synthetic Tenant', code: 'synthetic-app' },
  theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'single_store', experience: 'full_website', business_slug: 'casa-lupita' } } },
  ...(storePrivate !== undefined && { store_private: storePrivate })
})

// What the origin answers: `firstLoad` (a function of the call, or a payload), and the store's reads, public or 403
const origin = { firstLoad: null, storePrivate: false }
const stub = () => {
  const reads = landingFetch()
  const fetchMock = vi.fn(async (url, init) => {
    const text = String(url)
    if (text.includes('/frontends/first_load')) return origin.firstLoad(init)
    if (/\/(seo|translations|languages)/.test(text) || text.includes('/inactive_site/storefront')) return new Response('{}', { status: 404 })
    // the store's reads (business, menus, products, reviews, the share-image read of the business)
    if (origin.storePrivate) return new Response(JSON.stringify({ error: true, result: ['forbidden'] }), { status: 403 })
    return new Response(JSON.stringify(await (await reads(url, init)).json()))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const answer = (storePrivate) => new Response(JSON.stringify({ error: false, result: firstLoadResult(storePrivate) }))

const callWorker = async (path = '/', { env, config } = {}) => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const pending = []
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: 'text/html' } }), buildEnv(env, config), { waitUntil: (promise) => pending.push(promise) })
  const html = await response.text()
  await Promise.all(pending)
  return { response, html }
}

const doc = (html) => new JSDOM(html).window.document
const ogImagesOf = (html) => [...doc(html).querySelectorAll('meta[property="og:image"]')].map((meta) => meta.getAttribute('content'))
const GENERIC = 'http://localhost/og-default.png'
const STORE_HEADER = 'img.test/header.jpg'

// nothing of the store may be in the page
const expectNoStoreData = ({ html }) => {
  expect(html).not.toContain('landing-ssr')
  expect(html).not.toContain('STORE-SSR')
  expect(html).not.toContain('__LANDING__')
  expect(html).not.toContain('ld+json')
  expect(html).not.toContain(STORE_HEADER)
  expect(ogImagesOf(html)).toEqual([GENERIC])
}

describe('worker: the Full Website `/` and the store\'s privacy', () => {
  let fetchMock
  let caches

  // a public store served once: first_load and every landing read are cached
  const warm = async () => {
    origin.storePrivate = false
    origin.firstLoad = () => answer(false)
    const first = await callWorker('/')
    expect(first.html).toContain('STORE-SSR')
    expect(caches.store.size).toBeGreaterThan(5)
    fetchMock.mockClear()
    ssrState.calls = 0
  }

  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    caches = fakeCaches()
    vi.stubGlobal('caches', caches)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchMock = stub()
    ssrState.calls = 0
    origin.storePrivate = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('control: a public store paints the landing, with its JSON-LD, seed and og:image', async () => {
    origin.firstLoad = () => answer(false)
    const { html } = await callWorker('/')
    expect(html).toContain('landing-ssr')
    expect(html).toContain('STORE-SSR')
    expect(html).toContain('window.__LANDING__')
    expect(html).toContain('ld+json')
    expect(ogImagesOf(html)).toEqual([`https://${STORE_HEADER}`])
  })

  it('a store turned private, with every cache still warm and nothing purged: the FIRST anonymous response has none of its data', async () => {
    await warm()
    origin.storePrivate = true
    origin.firstLoad = () => answer(true)
    const result = await callWorker('/')

    expectNoStoreData(result)
    expect(ssrState.calls).toBe(0)
    // and the private headers of the store, from the live answer (the cached one still said public)
    expect(result.response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(result.response.headers.get('cache-control')).toBe('private, no-store')
    // the whole response is made from the live first_load: the injected __FIRST_LOAD__ says private, not the cached public one
    const injected = /window\.__FIRST_LOAD__ = (\{.*?\});<\/script>/.exec(result.html)
    expect(JSON.parse(injected[1]).store_private).toBe(true)
    // the live read rewrote the first_load cache with the fresh answer
    const cachedFirstLoad = await caches.store.get(buildOwnFirstLoadCacheKey('http://localhost')).clone().json()
    expect(cachedFirstLoad.result.store_private).toBe(true)
  })

  it('a project found inactive by the live read (cached first_load still active): the inactive page, none of the store\'s data', async () => {
    await warm()
    origin.firstLoad = () => new Response(JSON.stringify({
      error: true,
      result: 'Your project is not active, please pay your invoice or contact the Ordering.co sales team for assistance.',
      inactive_project: { reason: 'inactive', id: 42, name: 'Cha Sha', logo: null }
    }), { status: 401, headers: { 'content-type': 'application/json' } })
    const result = await callWorker('/')

    expect(result.response.status).toBe(503)
    expect(result.html).toContain('Cha Sha')
    // the inactive page itself: no landing, seed, JSON-LD or store header
    for (const text of ['landing-ssr', 'STORE-SSR', '__LANDING__', 'ld+json', STORE_HEADER]) expect(result.html).not.toContain(text)
    expect(ssrState.calls).toBe(0)
  })

  it.each([
    ['an answer that is not OK (403)', () => new Response('{"error":true}', { status: 403 })],
    ['an invalid payload', () => new Response(JSON.stringify({ error: false }))],
    ['an error payload', () => new Response(JSON.stringify({ error: true, result: ['x'] }))],
    ['a payload that is not JSON', () => new Response('<html>')],
    ['an exception', () => { throw new Error('network down') }]
  ])('live first_load with %s: the shell without the store\'s data (the page itself still ships)', async (_, live) => {
    await warm()
    origin.firstLoad = live
    const result = await callWorker('/')

    expect(result.response.status).toBe(200)
    expectNoStoreData(result)
    expect(ssrState.calls).toBe(0)
    // not a privacy answer: the page is as indexable as before
    expect(result.response.headers.get('x-robots-tag')).toBeNull()
  })

  it('live first_load that times out (the landing\'s LANDING_TIMEOUT_MS, not first_load\'s): shell without the store\'s data, and it does not wait longer', async () => {
    await warm()
    origin.firstLoad = (init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))
    const started = Date.now()
    // first_load's own limit is long: only the landing's 30 ms can end this read
    const result = await callWorker('/', { env: { LANDING_TIMEOUT_MS: '30', FIRST_LOAD_TIMEOUT_MS: '60000' } })

    expect(Date.now() - started).toBeLessThan(3000)
    expect(result.response.status).toBe(200)
    expectNoStoreData(result)
    expect(ssrState.calls).toBe(0)
  })

  it('the live read skips the cache, carries the landing\'s time limit, and the other routes keep the cached first_load', async () => {
    await warm()
    origin.firstLoad = () => answer(false)
    const { html } = await callWorker('/')
    const firstLoads = fetchMock.mock.calls.filter(([url]) => String(url).includes('/frontends/first_load'))
    // the cached read is a hit (no fetch); the live read is the one fetch
    expect(firstLoads).toHaveLength(1)
    expect(firstLoads[0][1].signal).toBeInstanceOf(AbortSignal)
    expect(html).toContain('STORE-SSR')

    fetchMock.mockClear()
    await callWorker('/order')
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/frontends/first_load'))).toHaveLength(0)
  })

  it('seo.fetchFirstLoad({ fresh: true }) ignores a warm cache and rewrites it', async () => {
    const cfg = { api: { url: 'https://api.synthetic-fixture.invalid' }, project: 'p', app_id: 'a' }
    const ctx = { waitUntil: (promise) => promise }
    origin.firstLoad = () => answer(false)
    expect(await fetchFirstLoad(cfg, {}, ctx, 'http://localhost', 'http://localhost/')).toMatchObject({ store_private: false })
    await Promise.resolve()
    origin.firstLoad = () => answer(true)
    // cached: still public
    expect(await fetchFirstLoad(cfg, {}, ctx, 'http://localhost', 'http://localhost/')).toMatchObject({ store_private: false })
    expect(await fetchFirstLoad(cfg, {}, ctx, 'http://localhost', 'http://localhost/', { fresh: true })).toMatchObject({ store_private: true })
    await Promise.resolve()
    expect(await fetchFirstLoad(cfg, {}, ctx, 'http://localhost', 'http://localhost/')).toMatchObject({ store_private: true })
  })
})

describe('worker: `/` is not painted when the app does not mount the landing there (kiosk, Spoonity login)', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    vi.stubGlobal('caches', fakeCaches())
    origin.storePrivate = false
    origin.firstLoad = () => answer(false)
    stub()
    ssrState.calls = 0
  })

  afterEach(() => vi.unstubAllGlobals())

  const painted = (html) => html.includes('landing-ssr') || html.includes('__LANDING__')

  it('control: neither kiosk nor Spoonity login: painted; a Spoonity query without its token, or any other, still is', async () => {
    expect(painted((await callWorker('/')).html)).toBe(true)
    expect(painted((await callWorker('/?integration_code=spoonity')).html)).toBe(true)
    expect(painted((await callWorker('/?utm_source=x')).html)).toBe(true)
  })

  it('the Spoonity login in the query: no server paint, no seed, no JSON-LD', async () => {
    const { html } = await callWorker('/?integration_code=spoonity&integration_token=abc')
    expect(painted(html)).toBe(false)
    expect(html).not.toContain('STORE-SSR')
    expect(html).not.toContain('ld+json')
    expect(ssrState.calls).toBe(0)
  })

  it('a kiosk (the served config\'s use_kiosk, the client\'s own `settings.use_kiosk`): no server paint, no seed, no JSON-LD', async () => {
    const { html } = await callWorker('/', { config: { ...configJson, use_kiosk: true } })
    expect(painted(html)).toBe(false)
    expect(html).not.toContain('STORE-SSR')
    expect(html).not.toContain('ld+json')
    expect(ssrState.calls).toBe(0)
  })
})
