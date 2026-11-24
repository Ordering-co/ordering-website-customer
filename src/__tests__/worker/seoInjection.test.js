import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'

const workerMockState = vi.hoisted(() => ({
  firstLoad: null,
  seoData: null,
  bootI18n: null,
  businessShareImages: null,
  businessFetchCalls: []
}))

vi.mock('../../../worker/seo.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchFirstLoad: vi.fn(async () => workerMockState.firstLoad),
    fetchSeo: vi.fn(async () => workerMockState.seoData),
    fetchBootI18n: vi.fn(async () => workerMockState.bootI18n),
    fetchSitemap: vi.fn(async () => null),
    // Same payload for every slug asked (tests only ever configure one
    // business); callers track which slugs they asked via businessFetchCalls,
    // to prove the favicon ladder never asks for the same business twice.
    fetchBusinessShareImages: vi.fn(async (_config, slug) => {
      if (!slug) return null
      workerMockState.businessFetchCalls.push(slug)
      return workerMockState.businessShareImages
    })
  }
})

const SHELL_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="theme-color" content="#000000" />
    <meta name="author" content="Shell template" />
    <meta name="description" content="Food marketplace by ordering.inc" />
    <meta property="og:title" content="Shell OG title" />
    <meta property="og:description" content="Food marketplace by ordering.inc" />
    <title>My Site</title>
  </head>
  <body>
    <div id="root"></div>
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
      append: (content) => el.insertAdjacentHTML('beforeend', content)
    })
    for (const { selector, handler } of this.handlers) {
      doc.querySelectorAll(selector).forEach(el => handler.element?.(facade(el)))
    }
    return {
      body: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    }
  }
}

const buildEnv = (html) => ({
  PROJECT: 'synthetic-project',
  ASSETS: {
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === '/config.json') {
        return new Response(JSON.stringify({
          project: 'synthetic-project',
          app_id: 'synthetic-app',
          api: { url: 'https://api.synthetic-fixture.invalid' }
        }), { headers: { 'content-type': 'application/json' } })
      }
      globalThis.__testAssetHtml = html
      return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
    }
  }
})

const firstLoadFixture = (site = {}, themeSite = {}) => ({
  site: { name: 'Synthetic Tenant', code: 'synthetic-app', ...site },
  configs: {},
  theme: {
    version: 2,
    values: { site: { name: 'Synthetic Tenant', ...themeSite } }
  }
})

const extractSeoPayload = (html) => {
  const match = html.match(/window\.__SEO__ = (\{[^<]*?\});/)
  return match ? JSON.parse(match[1]) : null
}

const extractConfigPayload = (html) => {
  const match = html.match(/window\.__CONFIG__ = (\{[^<]*?\});/)
  return match ? JSON.parse(match[1]) : null
}

const descriptionTags = (doc) => [...doc.querySelectorAll('meta')].filter(m =>
  ['description', 'og:description', 'twitter:description'].includes(m.getAttribute('name')) ||
  ['description', 'og:description', 'twitter:description'].includes(m.getAttribute('property'))
)

const callWorker = async (pathname = '/') => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const request = new Request(`http://localhost${pathname}`, {
    headers: { accept: 'text/html' }
  })
  const response = await worker.fetch(request, buildEnv(SHELL_HTML), { waitUntil: vi.fn() })
  return response.text()
}

// Same as callWorker, but at a given origin (host) instead of localhost — a
// preview host — so isOrderingHost actually sees a real Ordering domain.
const callWorkerAt = async (origin, pathname = '/') => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const request = new Request(`${origin}${pathname}`, {
    headers: { accept: 'text/html' }
  })
  const response = await worker.fetch(request, buildEnv(SHELL_HTML), { waitUntil: vi.fn() })
  return response.text()
}

const iconRels = ['icon', 'shortcut-icon', 'apple-touch-icon', 'android-touch-icon', 'windows-touch-icon']
const iconLinksOf = (doc) => [...doc.querySelectorAll('link')]
  .filter((l) => iconRels.includes(l.getAttribute('rel')))
  .map((l) => ({ rel: l.getAttribute('rel'), href: l.getAttribute('href'), sizes: l.getAttribute('sizes') }))

describe('worker SEO injection', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    workerMockState.firstLoad = null
    workerMockState.seoData = null
    workerMockState.bootI18n = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.__testAssetHtml
  })

  it('injects the theme description, OG and __SEO__ on the homepage when only the theme is configured', async () => {
    workerMockState.firstLoad = firstLoadFixture({}, { description: 'Theme configured description' })

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    const desc = doc.querySelector('meta[name="description"]')
    expect(desc?.getAttribute('content')).toBe('Theme configured description')
    expect(desc?.getAttribute('data-react-helmet')).toBe('true')
    const og = doc.querySelector('meta[property="og:description"]')
    expect(og?.getAttribute('content')).toBe('Theme configured description')
    expect(og?.getAttribute('data-react-helmet')).toBe('true')
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(doc.querySelectorAll('meta[property="og:description"]')).toHaveLength(1)
    expect(doc.querySelector('title')?.textContent).toBe('Synthetic Tenant')

    expect(extractSeoPayload(html)).toEqual({
      title: null,
      description: 'Theme configured description',
      ogDescription: 'Theme configured description',
      pathname: '/'
    })
  })

  it('injects the API site description when the theme has none', async () => {
    workerMockState.firstLoad = firstLoadFixture({ description: 'API site description' })

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('API site description')
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('API site description')
    expect(extractSeoPayload(html)?.description).toBe('API site description')
  })

  it('marks only the two description tags as Helmet-managed', async () => {
    workerMockState.firstLoad = firstLoadFixture({}, { description: 'Theme configured description' })

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    const managed = [...doc.querySelectorAll('meta[data-react-helmet="true"]')]
    expect(managed.length).toBe(2)
    const keys = managed.map(m => m.getAttribute('name') || m.getAttribute('property'))
    expect(keys.sort()).toEqual(['description', 'og:description'])
  })

  it('preserves configured SEO API descriptions on page routes when the site has none', async () => {
    workerMockState.firstLoad = firstLoadFixture()
    workerMockState.seoData = {
      title: { innerHtml: 'Store SEO title' },
      metas: [
        { name: 'description', content: 'API page description' },
        { property: 'og:description', content: 'API page OG description' }
      ]
    }

    const html = await callWorker('/store/synthetic-store')
    const doc = new JSDOM(html).window.document

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('API page description')
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('API page OG description')
    expect(doc.querySelector('title')?.textContent).toBe('Store SEO title')

    expect(extractSeoPayload(html)).toEqual({
      title: 'Store SEO title',
      description: 'API page description',
      ogDescription: 'API page OG description',
      pathname: '/store/synthetic-store'
    })
  })

  it('keeps valid API descriptions on the general route when site and theme descriptions are blank', async () => {
    workerMockState.firstLoad = firstLoadFixture(
      { description: '   ' },
      { description: ' ' }
    )
    workerMockState.seoData = {
      metas: [
        { name: 'description', content: 'API general description' },
        { property: 'og:description', content: 'API general OG description' }
      ]
    }

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('API general description')
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('API general OG description')
    expect(extractSeoPayload(html)).toEqual({
      title: null,
      description: 'API general description',
      ogDescription: 'API general OG description',
      pathname: '/'
    })
  })

  it('emits no description and no __SEO__ on the general route when nothing is configured', async () => {
    workerMockState.firstLoad = firstLoadFixture()

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(descriptionTags(doc)).toHaveLength(0)
    expect(extractSeoPayload(html)).toBeNull()
    expect(html).not.toMatch(/ordering\.inc|orderingplus|ordering\.co|dummy description/i)
    expect(doc.querySelector('title')?.textContent).toBe('Synthetic Tenant')
  })

  it('emits no description on a page route when nothing is configured, keeping its title', async () => {
    workerMockState.firstLoad = firstLoadFixture()
    workerMockState.seoData = { title: { innerHtml: 'Store SEO title' }, metas: [] }

    const html = await callWorker('/store/synthetic-store')
    const doc = new JSDOM(html).window.document

    expect(descriptionTags(doc)).toHaveLength(0)
    expect(extractSeoPayload(html)).toEqual({
      title: 'Store SEO title',
      description: null,
      ogDescription: null,
      pathname: '/store/synthetic-store'
    })
  })

  it('escapes quotes and angle brackets in attributes and the __SEO__ script', async () => {
    workerMockState.firstLoad = firstLoadFixture(
      { description: 'A "quoted" <special> description' }
    )

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('A "quoted" <special> description')
    expect(doc.getElementsByTagName('special')).toHaveLength(0)
    expect(html).toContain('&quot;quoted&quot;')
    expect(html).toContain('A \\"quoted\\" \\u003cspecial> description')

    expect(extractSeoPayload(html)?.description).toBe('A "quoted" <special> description')
  })

  it('canonicalizes alias OG and drops template twitter descriptions on the general route', async () => {
    workerMockState.firstLoad = firstLoadFixture()
    workerMockState.seoData = {
      metas: [
        { name: 'description', content: 'Food marketplace by ordering.inc' },
        { name: 'og:description', content: '   ' },
        { property: 'og:description', content: 'Valid API OG' },
        { name: 'twitter:description', content: 'a dummy description about this page' }
      ]
    }

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document
    const allMetas = [...doc.querySelectorAll('meta')]

    const ogTags = allMetas.filter(m =>
      m.getAttribute('property') === 'og:description' || m.getAttribute('name') === 'og:description'
    )
    expect(ogTags).toHaveLength(1)
    expect(ogTags[0].getAttribute('property')).toBe('og:description')
    expect(ogTags[0].getAttribute('name')).toBeNull()
    expect(ogTags[0].getAttribute('content')).toBe('Valid API OG')
    expect(ogTags[0].getAttribute('data-react-helmet')).toBe('true')

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Valid API OG')
    expect(allMetas.some(m =>
      m.getAttribute('name') === 'twitter:description' || m.getAttribute('property') === 'twitter:description'
    )).toBe(false)
    for (const meta of allMetas) {
      expect(meta.getAttribute('content') || '').not.toContain('ordering.inc')
      expect(meta.getAttribute('content') || '').not.toContain('dummy description')
    }
  })

  it('emits canonical OG and twitter shapes with __SEO__ on a page route', async () => {
    workerMockState.firstLoad = firstLoadFixture()
    workerMockState.seoData = {
      title: { innerHtml: 'Store title' },
      metas: [
        { name: 'description', content: 'Store page description' },
        { name: 'og:description', content: 'Custom OG copy' },
        { property: 'twitter:description', content: 'Tweet copy' }
      ]
    }

    const html = await callWorker('/store/synthetic-store')
    const doc = new JSDOM(html).window.document
    const allMetas = [...doc.querySelectorAll('meta')]

    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Store page description')
    const og = doc.querySelector('meta[property="og:description"]')
    expect(og?.getAttribute('content')).toBe('Custom OG copy')
    expect(og?.getAttribute('data-react-helmet')).toBe('true')
    expect(allMetas.filter(m => m.getAttribute('name') === 'og:description')).toHaveLength(0)

    const tw = doc.querySelector('meta[name="twitter:description"]')
    expect(tw?.getAttribute('content')).toBe('Tweet copy')
    expect(tw?.getAttribute('data-react-helmet')).toBeNull()
    expect(allMetas.filter(m => m.getAttribute('property') === 'twitter:description')).toHaveLength(0)

    expect(extractSeoPayload(html)?.ogDescription).toBe('Custom OG copy')
    expect(extractSeoPayload(html)?.description).toBe('Store page description')
  })

  it('emits no description when every description source is a template or blank', async () => {
    workerMockState.firstLoad = firstLoadFixture({ description: 'Food marketplace by ordering.inc.' })
    workerMockState.seoData = {
      metas: [
        { name: 'description', content: 'a dummy description about this page' },
        { property: 'og:description', content: 'food marketplace by orderingplus' },
        { name: 'twitter:description', content: '  ' }
      ]
    }

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(descriptionTags(doc)).toHaveLength(0)
    expect(extractSeoPayload(html)).toBeNull()
    for (const meta of doc.querySelectorAll('meta')) {
      const content = meta.getAttribute('content') || ''
      expect(content).not.toMatch(/ordering\.inc|orderingplus|dummy description/i)
    }
  })

  it('removes shell template metas without duplicating worker metadata', async () => {
    workerMockState.firstLoad = firstLoadFixture({}, { description: 'Theme configured description' })

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document

    expect(doc.querySelector('meta[name="author"]')).toBeNull()
    const ogTitles = doc.querySelectorAll('meta[property="og:title"]')
    expect(ogTitles).toHaveLength(1)
    expect(ogTitles[0].getAttribute('content')).toBe('Synthetic Tenant')
    expect(ogTitles[0].getAttribute('data-react-helmet')).toBeNull()
  })
})

describe('worker: icon links per host (favicon, apple-touch-icon, Ordering touch icons)', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    workerMockState.firstLoad = null
    workerMockState.seoData = null
    workerMockState.bootI18n = null
    workerMockState.businessShareImages = null
    workerMockState.businessFetchCalls = []
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.__testAssetHtml
  })

  // theme.values.images as the API's first_load would send them (the worker
  // reads the raw envelope, no schema validation — that is the frontend's).
  const withImages = (images) => ({
    site: { name: 'Synthetic Tenant', code: 'synthetic-app' },
    configs: {},
    theme: { version: 2, values: { site: { name: 'Synthetic Tenant' }, images } }
  })

  // Before, index.html shipped android/windows-touch-icon and four
  // apple-touch-icon links statically, and the worker removed the shell's
  // links of every rel it injected: so an Ordering host showed its static
  // apple-touch-icons only when the worker injected none. These pin that.
  it('an Ordering host with nothing configured serves the same icon links as before', async () => {
    workerMockState.firstLoad = withImages({})

    const html = await callWorkerAt('https://tenant.tryordering.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc)).toEqual([
      { rel: 'icon', href: '/favicon.png', sizes: '32x32' },
      { rel: 'shortcut-icon', href: '/favicon.png', sizes: null },
      { rel: 'apple-touch-icon', href: '/favicon.png', sizes: null },
      { rel: 'android-touch-icon', href: '/favicon.png', sizes: null },
      { rel: 'windows-touch-icon', href: '/favicon.png', sizes: null }
    ])
  })

  it('an Ordering host with its own favicon and logo serves the same icon links as before', async () => {
    workerMockState.firstLoad = withImages({ favicon: 'https://cdn.test/tenant-favicon.png', logotype: 'https://cdn.test/tenant-logo.png' })

    const html = await callWorkerAt('https://tenant.tryordering.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc)).toEqual([
      { rel: 'icon', href: 'https://cdn.test/tenant-favicon.png', sizes: '32x32' },
      { rel: 'shortcut-icon', href: 'https://cdn.test/tenant-favicon.png', sizes: null },
      { rel: 'apple-touch-icon', href: 'https://cdn.test/tenant-favicon.png', sizes: null },
      { rel: 'android-touch-icon', href: '/favicon.png', sizes: null },
      { rel: 'windows-touch-icon', href: '/favicon.png', sizes: null }
    ])
  })

  it('an Ordering host whose SEO sets its icon (no apple-touch-icon injected) keeps the four Ordering apple-touch-icons', async () => {
    workerMockState.firstLoad = withImages({})
    workerMockState.seoData = { links: [{ rel: 'icon', href: 'https://cdn.test/seo-icon.png' }] }

    const html = await callWorkerAt('https://tenant.tryordering.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc).filter(l => l.rel === 'apple-touch-icon')).toEqual([
      { rel: 'apple-touch-icon', href: '/touch-icon-iphone.png', sizes: null },
      { rel: 'apple-touch-icon', href: '/touch-icon-ipad.png', sizes: '152x152' },
      { rel: 'apple-touch-icon', href: '/touch-icon-iphone-retina.png', sizes: '180x180' },
      { rel: 'apple-touch-icon', href: '/touch-icon-ipad-retina.png', sizes: '167x167' }
    ])
  })

  it('a white-label site with its own app icon gets only its own apple-touch-icon, none of Ordering\'s', async () => {
    workerMockState.firstLoad = withImages({ app_icon: 'https://cdn.test/icon.png' })

    const html = await callWorkerAt('https://shop.example.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc)).toEqual([
      { rel: 'icon', href: 'https://cdn.test/icon.png', sizes: '32x32' },
      { rel: 'shortcut-icon', href: 'https://cdn.test/icon.png', sizes: null },
      { rel: 'apple-touch-icon', href: 'https://cdn.test/icon.png', sizes: '180x180' }
    ])
  })

  it('a white-label site with its own favicon and logo gets only those, none of Ordering\'s', async () => {
    workerMockState.firstLoad = withImages({ favicon: 'https://cdn.test/favicon.png', logotype: 'https://cdn.test/logo.png' })

    const html = await callWorkerAt('https://shop.example.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc)).toEqual([
      { rel: 'icon', href: 'https://cdn.test/favicon.png', sizes: '32x32' },
      { rel: 'shortcut-icon', href: 'https://cdn.test/favicon.png', sizes: null },
      { rel: 'apple-touch-icon', href: 'https://cdn.test/favicon.png', sizes: null }
    ])
  })

  it('a white-label site with nothing configured gets the bundled generic favicon, not Ordering\'s and no default-logo', async () => {
    workerMockState.firstLoad = withImages({})

    const html = await callWorkerAt('https://shop.example.com', '/')
    const doc = new JSDOM(html).window.document

    expect(iconLinksOf(doc)).toEqual([
      { rel: 'icon', href: '/site-icon.png', sizes: null },
      { rel: 'shortcut-icon', href: '/site-icon.png', sizes: null },
      { rel: 'apple-touch-icon', href: '/site-icon.png', sizes: null }
    ])
    expect(html).not.toContain('default-logo')
    expect(html).not.toContain('default-favicon')
  })

  // implementation noteswithout a site-level favicon, a single-store site falls back
  // to its own business's logo/header (cropped square on the CDN), never the
  // bundled generic or Ordering's — and a marketplace never does, even on its
  // own `/store/<slug>`.
  describe('favicon fallback to the single-store business', () => {
    const CDN = 'https://cloud-assets.orderingplus.com/image/upload'
    const singleStore = (images, businessSlug = 'cha_sha') => ({
      site: { name: 'Synthetic Tenant', code: 'synthetic-app' },
      configs: {},
      theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'single_store', business_slug: businessSlug }, images } }
    })

    it('the business logo, cropped to a square on the CDN, with no declared type or sizes', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: `${CDN}/f_auto,q_auto,w_1600,c_limit/chasha/b/2.jpg` }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document

      const icon = doc.getElementById('favicon')
      expect(icon.getAttribute('href')).toBe(`${CDN}/w_96,h_96,c_fill,f_png/chasha/a/1.jpg`)
      expect(icon.getAttribute('type')).toBeNull()
      expect(icon.getAttribute('sizes')).toBeNull()
      expect(doc.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')).toBe(`${CDN}/w_180,h_180,c_fill,f_png/chasha/a/1.jpg`)
      expect(doc.querySelector('link[rel="shortcut-icon"]').getAttribute('type')).toBeNull()
      // only one business fetch: the favicon ladder reuses the share-image one (same business)
      expect(workerMockState.businessFetchCalls).toEqual(['cha_sha'])
    })

    it('without a logo, the business header', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: null, header: `${CDN}/f_auto,q_auto,w_1600,c_limit/nabe/c/3.jpg` }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document

      expect(doc.getElementById('favicon').getAttribute('href')).toBe(`${CDN}/w_96,h_96,c_fill,f_png/nabe/c/3.jpg`)
    })

    it('without a logo or header either, the bundled generic icon', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: null, header: null }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document

      expect(doc.getElementById('favicon').getAttribute('href')).toBe('/site-icon.png')
    })

    it('a marketplace (not single-store) never uses a business image, even on its own /store/<slug>', async () => {
      workerMockState.firstLoad = {
        site: { name: 'Synthetic Tenant', code: 'synthetic-app' },
        configs: {},
        theme: { version: 2, values: { site: { name: 'Synthetic Tenant' }, images: {} } }
      }
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/mkt/a/1.jpg`, header: null }

      const html = await callWorkerAt('https://shop.example.com', '/store/some_biz')
      const doc = new JSDOM(html).window.document

      expect(doc.getElementById('favicon').getAttribute('href')).toBe('/site-icon.png')
    })

    it('a different /store/<slug> than the theme\'s own business asks the API for both, once each', async () => {
      workerMockState.firstLoad = singleStore({}, 'cha_sha')
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: null }

      await callWorkerAt('https://shop.example.com', '/store/another_biz')

      expect(workerMockState.businessFetchCalls.sort()).toEqual(['another_biz', 'cha_sha'])
    })

    it('an Ordering host keeps its own favicon.png, never a business image', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: null }

      const html = await callWorkerAt('https://tenant.tryordering.com', '/')
      const doc = new JSDOM(html).window.document

      expect(doc.getElementById('favicon').getAttribute('href')).toBe('/favicon.png')
    })

    it('a configured theme favicon wins over the business, with no extra business read for the favicon', async () => {
      workerMockState.firstLoad = singleStore({ favicon: 'https://cdn.test/tenant-favicon.png' })
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: null }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document

      expect(doc.getElementById('favicon').getAttribute('href')).toBe('https://cdn.test/tenant-favicon.png')
      // only the share image's own read of the theme's business
      expect(workerMockState.businessFetchCalls).toEqual(['cha_sha'])
    })

    it('injects the chosen fallback href into window.__CONFIG__.favicon_fallback, same as link#favicon', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: null }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document
      const config = extractConfigPayload(html)

      expect(config.favicon_fallback).toBe(doc.getElementById('favicon').getAttribute('href'))
      expect(config.favicon_fallback).toBe(`${CDN}/w_96,h_96,c_fill,f_png/chasha/a/1.jpg`)
    })

    it('omits favicon_fallback from __CONFIG__ when the site already has its own favicon', async () => {
      workerMockState.firstLoad = withImages({ favicon: 'https://cdn.test/favicon.png' })

      const html = await callWorkerAt('https://shop.example.com', '/')
      const config = extractConfigPayload(html)

      expect(config.favicon_fallback).toBeUndefined()
    })

    it('an SEO icon with no site-level favicon: favicon_fallback is that icon, so the app keeps it', async () => {
      workerMockState.firstLoad = singleStore({})
      workerMockState.businessShareImages = { logo: `${CDN}/f_auto,q_auto,h_200,c_limit/chasha/a/1.jpg`, header: null }
      workerMockState.seoData = { links: [{ rel: 'icon', href: 'https://cdn.test/seo-icon.png' }] }

      const html = await callWorkerAt('https://shop.example.com', '/')
      const doc = new JSDOM(html).window.document
      const config = extractConfigPayload(html)

      expect(doc.getElementById('favicon').getAttribute('href')).toBe('https://cdn.test/seo-icon.png')
      expect(config.favicon_fallback).toBe('https://cdn.test/seo-icon.png')
    })
  })
})
