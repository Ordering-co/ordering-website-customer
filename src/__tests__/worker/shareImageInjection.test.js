import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'

const workerMockState = vi.hoisted(() => ({
  firstLoad: null,
  seoData: null,
  businessShareImages: null
}))

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

const callWorker = async (pathname = '/') => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const request = new Request(`http://localhost${pathname}`, {
    headers: { accept: 'text/html' }
  })
  const response = await worker.fetch(request, buildEnv(SHELL_HTML), { waitUntil: vi.fn() })
  return response.text()
}

const metasOf = (doc) => ({
  ogImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
  ogImageWidth: doc.querySelector('meta[property="og:image:width"]')?.getAttribute('content'),
  ogImageHeight: doc.querySelector('meta[property="og:image:height"]')?.getAttribute('content'),
  twitterImage: doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
  twitterCard: doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
  ogImageCount: doc.querySelectorAll('meta[property="og:image"]').length,
  twitterImageCount: doc.querySelectorAll('meta[name="twitter:image"]').length
})

describe('worker: og:image / twitter:image are always present', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    workerMockState.firstLoad = null
    workerMockState.seoData = null
    workerMockState.businessShareImages = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.__testAssetHtml
  })

  it('home: an empty API og:image never ships empty — falls to the generic bundled image', async () => {
    workerMockState.firstLoad = { site: { name: 'Synthetic Tenant', code: 'synthetic-app' }, theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'marketplace' } } } }
    workerMockState.seoData = { metas: [{ property: 'og:image', content: '' }] }

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document
    const metas = metasOf(doc)

    expect(metas.ogImage).toBeTruthy()
    expect(metas.ogImage).not.toBe('')
    // http://localhost is a dev origin: resolveShareImage leaves it on that
    // scheme instead of forcing https (so the generic image loads locally)
    expect(metas.ogImage).toMatch(/^http:\/\/localhost\/.*og-default\.png$/)
    expect(metas.ogImageCount).toBe(1)
    expect(metas.twitterImage).toBe(metas.ogImage)
    expect(metas.twitterImageCount).toBe(1)
    expect(metas.twitterCard).toBe('summary_large_image')
    expect(metas.ogImageWidth).toBe('1200')
    expect(metas.ogImageHeight).toBe('630')
  })

  it('home: site.social_share wins and is served as an absolute https URL', async () => {
    workerMockState.firstLoad = {
      site: { name: 'Synthetic Tenant', code: 'synthetic-app', social_share: 'https://cdn.example.com/share.png' },
      theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'marketplace' } } }
    }

    const html = await callWorker('/')
    const doc = new JSDOM(html).window.document
    const metas = metasOf(doc)

    expect(metas.ogImage).toBe('https://cdn.example.com/share.png')
    expect(metas.twitterImage).toBe('https://cdn.example.com/share.png')
    expect(metas.twitterCard).toBe('summary_large_image')
    // a site image's real render size is unknown: no width/height declared
    expect(metas.ogImageWidth).toBeUndefined()
    expect(metas.ogImageHeight).toBeUndefined()
  })

  it('store route: no SEO image at all still ships a real og:image (the business header)', async () => {
    workerMockState.firstLoad = { site: { name: 'Synthetic Tenant', code: 'synthetic-app' }, theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'marketplace' } } } }
    workerMockState.seoData = { title: { innerHtml: 'Example Restaurant' }, metas: [] }
    workerMockState.businessShareImages = { seo_image: null, header: 'https://cdn.example.com/business-header.png', logo: null }

    const html = await callWorker('/store/example_restaurant')
    const doc = new JSDOM(html).window.document
    const metas = metasOf(doc)

    expect(metas.ogImage).toBe('https://cdn.example.com/business-header.png')
    expect(metas.twitterImage).toBe('https://cdn.example.com/business-header.png')
    expect(metas.twitterCard).toBe('summary_large_image')
    // a business image's real render size is unknown: no width/height declared
    expect(metas.ogImageWidth).toBeUndefined()
    expect(metas.ogImageHeight).toBeUndefined()
  })

  it('store route: a logo-only business ships its logo, not the shop\'s own stale og:image meta', async () => {
    workerMockState.firstLoad = { site: { name: 'Synthetic Tenant', code: 'synthetic-app' }, theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'marketplace' } } } }
    workerMockState.seoData = { metas: [{ property: 'og:image', content: 'https://cdn.example.com/wrong-logo.png' }] }
    workerMockState.businessShareImages = { seo_image: null, header: null, logo: 'https://cdn.example.com/business-logo.png' }

    const html = await callWorker('/store/cha_sha')
    const doc = new JSDOM(html).window.document
    const metas = metasOf(doc)

    // the business's own logo wins over whatever the SEO API returned
    expect(metas.ogImage).toBe('https://cdn.example.com/business-logo.png')
    expect(metas.ogImageCount).toBe(1)
  })

  it('single_store home (no /store/ in the URL): asks for the theme\'s configured business_slug and uses its header, transformed, no width/height', async () => {
    workerMockState.firstLoad = {
      site: { name: 'Synthetic Tenant', code: 'synthetic-app' },
      theme: { version: 2, values: { site: { name: 'Synthetic Tenant', mode: 'single_store', business_slug: 'demo_store' } } }
    }
    workerMockState.businessShareImages = {
      seo_image: null,
      header: 'https://cloud-assets.orderingplus.com/demo/image/upload/v1/header.jpg',
      logo: null
    }

    const html = await callWorker('/')

    // the mocked fetchBusinessShareImages is what the real implementation
    // would call fetch(`${apiBase}/business/demo_store?...`) through: its
    // slug argument is the business the worker actually asked for
    const { fetchBusinessShareImages } = await import('../../../worker/seo.js')
    expect(fetchBusinessShareImages.mock.calls[0][1]).toBe('demo_store')

    const doc = new JSDOM(html).window.document
    const metas = metasOf(doc)
    const expectedUrl = 'https://cloud-assets.orderingplus.com/demo/image/upload/w_1200,h_630,c_fill,f_jpg/v1/header.jpg'

    expect(metas.ogImage).toBe(expectedUrl)
    expect(metas.twitterImage).toBe(expectedUrl)
    expect(metas.ogImageWidth).toBeUndefined()
    expect(metas.ogImageHeight).toBeUndefined()
  })
})
