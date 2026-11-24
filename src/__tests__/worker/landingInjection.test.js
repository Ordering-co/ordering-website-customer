import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { business, franchiseStores, landingFetch } from '../../pages/Landing/__tests__/landingFixtures.js'
import { FRANCHISE_MAX_PAGES, FRANCHISE_PAGE_SIZE } from '../../../worker/landingData.js'
import { FRANCHISE_STORE_FIELDS } from '../../../worker/landingSsr.js'

// The Worker's initial HTML for `/` of a Full Website: JSON-LD and the hero as og:image.
// first_load and the SEO API are mocked as in the other Worker suites; the store reads go through a
// stubbed fetch with the Landing fixtures, and the real landingData / structuredData / seo modules.
const workerMockState = vi.hoisted(() => ({ firstLoad: null, seoData: null, businessShareImages: null }))

// The SSR bundle (worker/generated/landing-ssr.mjs, `pnpm build`) is not in the repo: its loader
// (worker/landingSsrBundle.js) is mocked, and by default the bundle is
// "not built" (the page ships as without it, whatever is on this machine's disk); the server-render tests
// plug the real render of src/pages/Landing/ssr in its place and see what it is called with.
const ssrState = vi.hoisted(() => ({ render: null, calls: [] }))
vi.mock('../../../worker/landingSsrBundle.js', () => ({
  loadLandingSsr: async () => ({
    renderLanding: (args) => {
      ssrState.calls.push(args)
      if (!ssrState.render) throw new Error('not built')
      return ssrState.render(args)
    }
  })
}))

// src/setupTests.js mocks the contexts and a few hooks for the component tests; the render runs on the real ones.
vi.unmock('~components/contexts/LanguageContext')
vi.unmock('~components/contexts/ConfigContext')
vi.unmock('~components/contexts/SessionContext')
vi.unmock('~components/contexts/ApiContext')
vi.unmock('~components/contexts/OrderContext')
vi.unmock('~components/contexts/UtilsContext')
vi.unmock('~components/contexts/SiteContext')
vi.unmock('~components/contexts/EventContext')
vi.unmock('~ui/hooks/useWindowSize')
vi.unmock('swiper/react')
vi.unmock('~ui/utils')
vi.unmock('react-loading-skeleton')
vi.unmock('~ui-icon')

vi.mock('../../../worker/seo.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchFirstLoad: vi.fn(async () => workerMockState.firstLoad),
    fetchSeo: vi.fn(async () => workerMockState.seoData),
    fetchBootI18n: vi.fn(async () => null),
    fetchSitemap: vi.fn(async () => null),
    fetchBusinessShareImages: vi.fn(async () => workerMockState.businessShareImages)
  }
})

const SHELL_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta property="og:image" content="https://shell.example/og.png" />
    <title>My Site</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>`

class FakeHTMLRewriter {
  constructor () {
    this.handlers = []
  }

  on (selector, handler) {
    this.handlers.push({ selector, handler })
    return this
  }

  transform (response) {
    const doc = new JSDOM(globalThis.__testAssetHtml || '').window.document
    const facade = (el) => ({
      remove: () => el.remove(),
      setInnerContent: (content) => { el.textContent = content },
      append: (content) => el.insertAdjacentHTML('beforeend', content),
      before: (content) => el.insertAdjacentHTML('beforebegin', content)
    })
    for (const { selector, handler } of this.handlers) {
      doc.querySelectorAll(selector).forEach(el => handler.element?.(facade(el)))
    }
    return { body: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, status: response.status, statusText: response.statusText, headers: response.headers }
  }
}

const buildEnv = () => ({
  PROJECT: 'synthetic-project',
  ASSETS: {
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === '/config.json') {
        return new Response(JSON.stringify({ project: 'synthetic-project', app_id: 'synthetic-app', api: { url: 'https://api.synthetic-fixture.invalid' } }), { headers: { 'content-type': 'application/json' } })
      }
      globalThis.__testAssetHtml = SHELL_HTML
      return new Response(SHELL_HTML, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
    }
  }
})

const franchiseList = [
  { id: 5, name: 'Casa Lupita', slug: 'casa-lupita', address: '14277 Kuykendahl Rd, Tomball, TX', header: 'https://img.test/list-header.jpg' },
  { id: 9, name: 'Casa Lupita Norte', slug: 'casa-lupita-norte', header: 'https://img.test/norte.jpg' }
]

// the stores' reads: the fixtures' fetch, answered as real Responses
let storeFetch
// `list`: the stores, or a function of the URL (a page of them); `pagination`: what the API answers next to them
const stubStoreFetch = (overrides, list = franchiseList, pagination) => {
  const inner = landingFetch(overrides)
  storeFetch = vi.fn(async (url, init) => {
    if (String(url).includes('/franchises/')) return new Response(JSON.stringify({ error: false, result: typeof list === 'function' ? list(String(url)) : list, ...(pagination && { pagination }) }))
    return new Response(JSON.stringify(await (await inner(url, init)).json()))
  })
  vi.stubGlobal('fetch', storeFetch)
}

const fakeCaches = () => {
  const store = new Map()
  return { default: { match: async (request) => store.get(request.url)?.clone(), put: async (request, response) => { store.set(request.url, response) } } }
}

const firstLoadOf = (themeSite, { images, site } = {}) => ({
  site: { name: 'Synthetic Tenant', code: 'synthetic-app', ...site },
  theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'single_store', business_slug: 'casa-lupita', ...themeSite }, ...(images && { images }) } }
})

const callWorker = async (pathname = '/', headers = {}, cf) => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const request = new Request(`http://localhost${pathname}`, { headers: { accept: 'text/html', ...headers } })
  // Cloudflare's request properties (the visitor's zone): a plain Request has none
  if (cf) Object.defineProperty(request, 'cf', { value: cf })
  const pending = []
  const response = await worker.fetch(request, buildEnv(), { waitUntil: (promise) => pending.push(promise) })
  const html = await response.text()
  await Promise.all(pending)
  return html
}

const doc = (html) => new JSDOM(html).window.document
const jsonLdOf = (html) => [...doc(html).querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent))
const ogImagesOf = (html) => [...doc(html).querySelectorAll('meta[property="og:image"]')].map((meta) => meta.getAttribute('content'))
// the page without its first_load payload, which carries the theme (and so the site type) itself
const withoutFirstLoad = (html) => html.replace(/<script>window\.__FIRST_LOAD__ = [\s\S]*?<\/script>/, '')

describe('worker: initial HTML of / on a Full Website', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    vi.stubGlobal('caches', fakeCaches())
    stubStoreFetch()
    workerMockState.seoData = null
    workerMockState.businessShareImages = null
    workerMockState.firstLoad = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.__testAssetHtml
  })

  it('one store: a valid Restaurant JSON-LD and a single og:image with the store header', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website' })
    workerMockState.seoData = { metas: [{ name: 'description', content: 'Street tacos and bold Mexican plates.' }] }

    const html = await callWorker('/')
    const [ld, ...others] = jsonLdOf(html)

    expect(others).toHaveLength(0)
    expect(ld).toMatchObject({ '@context': 'https://schema.org', '@type': 'Restaurant', name: 'Casa Lupita', url: 'http://localhost/', hasMenu: 'http://localhost/order' })
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.8, reviewCount: 212 })
    // never the reviews themselves
    expect(html).not.toMatch(/Laura|Handmade tortillas/)
    expect(ogImagesOf(html)).toEqual([business.header])
    expect(doc(html).querySelector('meta[name="twitter:image"]').getAttribute('content')).toBe(business.header)
  })

  it('one store: the header also reaches og:image when the share-image read of the store is not there', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website' })
    workerMockState.businessShareImages = null
    expect(ogImagesOf(await callWorker('/'))).toEqual([business.header])
  })

  it('site.social_share, the owner\'s explicit choice, still wins over the hero', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website' }, { site: { social_share: 'https://cdn.example.com/share.png' } })
    const html = await callWorker('/')
    expect(ogImagesOf(html)).toEqual(['https://cdn.example.com/share.png'])
    expect(jsonLdOf(html)).toHaveLength(1)
  })

  it('franchise: an Organization graph with its branches and the main store header as og:image', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website', mode: 'franchise', franchise_id: 7, main_store: 5, business_slug: '' })
    const html = await callWorker('/')
    const [ld] = jsonLdOf(html)

    expect(ld['@graph'][0]).toMatchObject({ '@type': 'Organization', name: 'Synthetic Tenant' })
    expect(ld['@graph'].filter((node) => node['@type'] === 'Restaurant').map((node) => node.name)).toEqual(['Casa Lupita', 'Casa Lupita Norte'])
    expect(ogImagesOf(html)).toEqual([business.header])
  })

  it('marketplace: WebSite and Organization, and the theme\'s hero image as og:image', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website', mode: 'marketplace', business_slug: '' }, { images: { home_hero: 'https://img.test/home-hero.jpg' } })
    const html = await callWorker('/')
    const [ld] = jsonLdOf(html)

    expect(ld['@graph'].map((node) => node['@type'])).toEqual(['WebSite', 'Organization'])
    expect(ogImagesOf(html)).toEqual(['https://img.test/home-hero.jpg'])
    expect(storeFetch).not.toHaveBeenCalled()
  })

  it('Online Ordering Only and a Full Website on /order: no JSON-LD, no store reads, the same HTML as without the feature', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: undefined })
    const baseline = withoutFirstLoad(await callWorker('/'))
    const baselineOrder = withoutFirstLoad(await callWorker('/order'))

    workerMockState.firstLoad = firstLoadOf({ experience: 'ordering_only' })
    const orderingOnly = await callWorker('/')
    expect(withoutFirstLoad(orderingOnly)).toBe(baseline)
    expect(jsonLdOf(orderingOnly)).toHaveLength(0)

    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website' })
    const order = await callWorker('/order')
    expect(withoutFirstLoad(order)).toBe(baselineOrder)
    expect(jsonLdOf(order)).toHaveLength(0)
    // tracking_only wins over full_website
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website', tracking_only: true })
    expect(withoutFirstLoad(await callWorker('/'))).toBe(baseline)

    expect(baseline).not.toContain('ld+json')
    expect(storeFetch).not.toHaveBeenCalled()
  })

  it('the store API down: the page ships as it does without Full Website', async () => {
    workerMockState.firstLoad = firstLoadOf({ experience: undefined })
    const baseline = withoutFirstLoad(await callWorker('/'))

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    workerMockState.firstLoad = firstLoadOf({ experience: 'full_website' })
    const html = await callWorker('/')

    expect(withoutFirstLoad(html)).toBe(baseline)
    expect(jsonLdOf(html)).toHaveLength(0)
  })
})

describe('worker: the landing painted on the server (render-and-swap)', () => {
  beforeEach(async () => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    vi.stubGlobal('caches', fakeCaches())
    stubStoreFetch()
    workerMockState.seoData = null
    workerMockState.businessShareImages = null
    ssrState.calls = []
    ssrState.render = (await import('../../pages/Landing/ssr/render.jsx')).renderLanding
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete globalThis.__testAssetHtml
  })

  const fullWebsite = (themeSite) => { workerMockState.firstLoad = firstLoadOf({ experience: 'full_website', ...themeSite }) }
  const landingNode = (html) => doc(html).getElementById('landing-ssr')

  it('one store: the page comes with the sections\' real markup in #landing-ssr, right before #root', async () => {
    fullWebsite()
    const html = await callWorker('/')
    const page = doc(html)
    const node = page.getElementById('landing-ssr')

    expect(node).not.toBeNull()
    // style, markup, the page's data and the guard, then #root
    expect([...node.parentElement.children].map((el) => el.id || el.tagName).slice(-6)).toEqual(['landing-ssr-style', 'landing-ssr', 'SCRIPT', 'SCRIPT', 'root', 'SCRIPT'])
    expect(node.textContent).toContain('Handmade corn tortillas and slow-cooked birria')
    expect(node.querySelector('[data-landing-chrome="header"]')).not.toBeNull()
    expect(node.querySelectorAll('h1')).toHaveLength(1)
    expect(node.querySelector('h1').textContent).toContain('Casa Lupita')
    expect(node.querySelector('img[src="https://img.test/g1.jpg"][alt]')).not.toBeNull()
    expect(node.querySelector('a[href="/order"]')).not.toBeNull()
    expect(page.querySelectorAll('h1')).toHaveLength(1)
    // its style hides #root and carries the CSS, in the same tag the client removes
    const style = page.getElementById('landing-ssr-style')
    expect(style.textContent.startsWith('#root{display:none}')).toBe(true)
    expect(style.textContent.length).toBeGreaterThan(500)
    expect(style.nextElementSibling).toBe(node)
    // no <style data-styled>: the client's styled-components would take it as its own and remove it
    expect(html).not.toContain('data-styled')
  })

  it('the client gets the store\'s data (public reads only) and the guard, after the markup and before the app', async () => {
    fullWebsite()
    const html = await callWorker('/')
    const page = doc(html)
    const scripts = [...page.querySelectorAll('body script')]
    const seed = scripts.find((script) => script.textContent.startsWith('window.__LANDING__'))
    const guard = scripts.find((script) => script.textContent.includes('landing-ssr'))
    const data = JSON.parse(seed.textContent.replace(/^window\.__LANDING__ = /, '').replace(/;$/, ''))

    expect(Object.keys(data).sort()).toEqual(['business', 'featured', 'reviews', 'services'])
    expect(data.business.slug).toBe('casa-lupita')
    expect(data.featured.map((dish) => dish.name)).toEqual(['Birria Tacos', 'Horchata'])
    expect(data.reviews.recent[0]).toEqual({ id: 1, author: 'Laura S.', comment: 'Handmade tortillas and great salsa.', rating: 5, createdAt: '2026-11-01 10:00:00' })
    // never the reviewers' whole user
    expect(seed.textContent).not.toMatch(/laura@example|Smith|laura\.jpg|user_id/)
    expect(guard.textContent).toContain('location.pathname')
    expect(page.getElementById('landing-ssr').compareDocumentPosition(seed) & 4).toBeTruthy() // the data after the markup…
    expect(seed.compareDocumentPosition(page.querySelector('script[type=module]')) & 4).toBeTruthy() // …before the app
  })

  it('the shell\'s noscript notice goes: without JavaScript the page is the markup', async () => {
    fullWebsite()
    expect(doc(await callWorker('/')).querySelector('noscript')).toBeNull()
  })

  it('a marketplace paints its own sections, with no store data to hand over', async () => {
    fullWebsite({ mode: 'marketplace', business_slug: '' })
    const html = await callWorker('/')
    expect(landingNode(html)).not.toBeNull()
    expect(landingNode(html).querySelector('main')).not.toBeNull()
    expect(html).not.toContain('__LANDING__')
    expect(storeFetch).not.toHaveBeenCalled()
  })

  it('the call carries what the page needs: the API root, the store, the first_load configs, the translations and the phone', async () => {
    workerMockState.firstLoad = { ...firstLoadOf({ experience: 'full_website' }), configs: { format_number_currency: { value: '€' } }, features: {} }
    await callWorker('/', { 'sec-ch-ua-mobile': '?1' })
    await callWorker('/', { 'sec-ch-ua-mobile': '?0', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })
    await callWorker('/', { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' })
    await callWorker('/', { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })

    expect(ssrState.calls.map((call) => call.mobile)).toEqual([true, false, true, false])
    expect(ssrState.calls[0]).toMatchObject({
      api: { root: 'https://api.synthetic-fixture.invalid/v400/en/synthetic-project', appId: 'synthetic-app' },
      store: 'casa-lupita',
      configs: { format_number_currency: { value: '€' } },
      language: 'en'
    })
    expect(ssrState.calls[0].envelope.values.site.business_slug).toBe('casa-lupita')
  })

  it('Online Ordering Only, /order and any other route: the page as it ships without the feature', async () => {
    ssrState.render = () => { throw new Error('must not be called') }
    workerMockState.firstLoad = firstLoadOf({ experience: undefined })
    const baseline = withoutFirstLoad(await callWorker('/'))
    const baselineOrder = withoutFirstLoad(await callWorker('/order'))
    const baselineStore = withoutFirstLoad(await callWorker('/store/casa-lupita'))

    workerMockState.firstLoad = firstLoadOf({ experience: 'ordering_only' })
    expect(withoutFirstLoad(await callWorker('/'))).toBe(baseline)
    fullWebsite()
    expect(withoutFirstLoad(await callWorker('/order'))).toBe(baselineOrder)
    expect(withoutFirstLoad(await callWorker('/store/casa-lupita'))).toBe(baselineStore)
    expect(ssrState.calls).toHaveLength(0)
  })

  it('a render that throws (or a bundle that is not there): the page ships as without it, JSON-LD included', async () => {
    fullWebsite()
    ssrState.render = () => { throw new Error('boom') }
    const failed = await callWorker('/')
    ssrState.render = null
    const unbuilt = await callWorker('/')

    for (const html of [failed, unbuilt]) {
      expect(landingNode(html)).toBeNull()
      expect(html).not.toMatch(/landing-ssr|__LANDING__/)
      expect(doc(html).getElementById('root')).not.toBeNull()
      expect(jsonLdOf(html)).toHaveLength(1)
      expect(doc(html).querySelector('noscript')).not.toBeNull()
    }
    expect(withoutFirstLoad(failed)).toBe(withoutFirstLoad(unbuilt))
  })

  describe('franchise', () => {
    const franchiseSite = { mode: 'franchise', franchise_id: 7, main_store: 5, business_slug: '' }
    const seedOf = (html) => {
      const seed = [...doc(html).querySelectorAll('body script')].find((script) => script.textContent.startsWith('window.__LANDING__'))
      return JSON.parse(seed.textContent.replace(/^window\.__LANDING__ = /, '').replace(/;$/, ''))
    }

    beforeEach(() => stubStoreFetch(undefined, franchiseStores))

    it('the main store\'s sections and a card per store in #landing-ssr, with the stores for the client in window.__LANDING__', async () => {
      fullWebsite(franchiseSite)
      const html = await callWorker('/')
      const node = landingNode(html)

      expect(node).not.toBeNull()
      expect(node.querySelectorAll('h1')).toHaveLength(1)
      expect(node.textContent).toContain('Handmade corn tortillas and slow-cooked birria')
      expect([...node.querySelectorAll('#landing-locations h3')].map((h) => h.textContent)).toEqual(['Downtown', 'Tomball', 'Katy'])
      expect(node.textContent).toContain('1 Main St, Houston, TX')
      expect(node.textContent).toMatch(/(Open|Closed) · /)
      expect(html).not.toContain('data-styled')

      const data = seedOf(html)
      expect(Object.keys(data).sort()).toEqual(['business', 'featured', 'franchiseStores', 'reviews', 'services'])
      expect(data.business.id).toBe(5)
      expect(data.franchiseStores.map((store) => store.id)).toEqual([2, 5, 9])
      // only the fields the client reads of each store: the list's phone and header stay out
      data.franchiseStores.forEach((store) => expect(FRANCHISE_STORE_FIELDS).toEqual(expect.arrayContaining(Object.keys(store))))
      expect(data.franchiseStores[0]).toMatchObject({ name: 'Downtown', timezone: 'America/Chicago', open: true })
      expect(JSON.stringify(data.franchiseStores)).not.toMatch(/phone|header|img\.test\/header/)
      // never the reviewers' whole user
      expect(html).not.toMatch(/laura@example|Smith|user_id/)
    })

    it('the render is told the visitor\'s zone (request.cf.timezone); an unknown one, or none, is not passed', async () => {
      fullWebsite(franchiseSite)
      await callWorker('/', {}, { timezone: 'Asia/Tokyo' })
      await callWorker('/', {}, { timezone: 'Not/AZone' })
      await callWorker('/')
      expect(ssrState.calls.map((call) => call.visitorZone)).toEqual(['Asia/Tokyo', undefined, undefined])
      expect(ssrState.calls[0].landing.franchiseStores).toHaveLength(3)
    })

    it('a franchise without stores is not painted: the page as it ships without it', async () => {
      stubStoreFetch(undefined, [])
      fullWebsite(franchiseSite)
      const html = await callWorker('/')
      expect(landingNode(html)).toBeNull()
      expect(html).not.toMatch(/landing-ssr|__LANDING__/)
      expect(doc(html).querySelector('noscript')).not.toBeNull()
      expect(ssrState.calls).toHaveLength(0)
    })

    const stores = (count, from = 0) => Array.from({ length: count }, (_, index) => ({ ...franchiseStores[0], id: 100 + from + index, name: `Store ${from + index}` }))

    it('a list the Worker stops reading (its page cap) may be cut: no server paint (the client\'s refresh would change the cards)', async () => {
      fullWebsite(franchiseSite)
      // a 4th page exists, but the Worker reads 3: the list it holds is a cut one
      stubStoreFetch(undefined, (url) => stores(FRANCHISE_PAGE_SIZE, (Number(/page=(\d+)/.exec(url)[1]) - 1) * FRANCHISE_PAGE_SIZE), { total_pages: FRANCHISE_MAX_PAGES + 1 })
      const cut = await callWorker('/')
      expect(landingNode(cut)).toBeNull()
      expect(cut).not.toMatch(/landing-ssr|__LANDING__/)
      expect(ssrState.calls).toHaveLength(0)
    })

    it('more stores than one page (the client\'s 100) but all read: painted, the list whole', async () => {
      fullWebsite(franchiseSite)
      stubStoreFetch(undefined, (url) => (/page=1&/.test(url) ? stores(FRANCHISE_PAGE_SIZE) : stores(5, FRANCHISE_PAGE_SIZE)), { total_pages: 2 })
      const html = await callWorker('/')
      expect(landingNode(html).querySelectorAll('#landing-locations h3')).toHaveLength(FRANCHISE_PAGE_SIZE + 5)
      expect(seedOf(html).franchiseStores).toHaveLength(FRANCHISE_PAGE_SIZE + 5)
    })

    it('one store fewer than the page is the whole list: painted', async () => {
      fullWebsite(franchiseSite)
      stubStoreFetch(undefined, stores(FRANCHISE_PAGE_SIZE - 1))
      expect(landingNode(await callWorker('/')).querySelectorAll('#landing-locations h3')).toHaveLength(FRANCHISE_PAGE_SIZE - 1)
    })

    it('the seed keeps only objects and each id once, the first one winning, as the client\'s read leaves them', async () => {
      stubStoreFetch(undefined, [franchiseStores[0], null, 'x', { ...franchiseStores[0], name: 'Repeated' }, franchiseStores[1]])
      fullWebsite(franchiseSite)
      const html = await callWorker('/')
      expect(seedOf(html).franchiseStores.map((store) => [store.id, store.name])).toEqual([[2, 'Downtown'], [5, 'Tomball']])
      expect([...landingNode(html).querySelectorAll('#landing-locations h3')].map((h) => h.textContent)).toEqual(['Downtown', 'Tomball'])
    })

    it('a main store that could not be read leaves its sections to load, and the locations are still painted', async () => {
      stubStoreFetch({ business: new Error('not found') }, franchiseStores)
      fullWebsite(franchiseSite)
      const html = await callWorker('/')
      expect(landingNode(html).querySelectorAll('#landing-locations h3')).toHaveLength(3)
      expect(seedOf(html)).toMatchObject({ business: null, featured: null, franchiseStores: expect.any(Array) })
    })

    it('a render that throws: the page ships as without it, JSON-LD included', async () => {
      fullWebsite(franchiseSite)
      ssrState.render = () => { throw new Error('boom') }
      const html = await callWorker('/')
      expect(landingNode(html)).toBeNull()
      expect(html).not.toMatch(/landing-ssr|__LANDING__/)
      expect(jsonLdOf(html)).toHaveLength(1)
      expect(doc(html).getElementById('root')).not.toBeNull()
    })
  })

  it('a store that could not be read paints no landing', async () => {
    fullWebsite()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    expect(landingNode(await callWorker('/'))).toBeNull()
  })
})
