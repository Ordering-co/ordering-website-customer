import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ firstLoad: null, sitemap: null }))

vi.mock('../../../worker/seo.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchFirstLoad: vi.fn(async () => state.firstLoad),
    fetchSeo: vi.fn(async () => null),
    fetchBootI18n: vi.fn(async () => null),
    fetchBusinessShareImages: vi.fn(async () => null),
    fetchSitemap: vi.fn(async () => state.sitemap)
  }
})

class FakeHTMLRewriter {
  on () { return this }
  transform (response) { return { body: '<html><head></head></html>', status: 200, statusText: 'OK', headers: response.headers } }
}

const env = {
  PROJECT: 'synthetic-project',
  ASSETS: {
    fetch: async (request) => {
      if (new URL(request.url).pathname === '/config.json') {
        return new Response(JSON.stringify({ project: 'synthetic-project', app_id: 'a', api: { url: 'https://api.synthetic-fixture.invalid' } }), { headers: { 'content-type': 'application/json' } })
      }
      return new Response('<html><head></head></html>', { headers: { 'content-type': 'text/html; charset=UTF-8' } })
    }
  }
}

const call = async (pathname, accept = 'text/html') => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  return worker.fetch(new Request(`https://shop.example.com${pathname}`, { headers: { accept } }), env, { waitUntil: vi.fn() })
}

const SITEMAP = '<?xml version="1.0"?><urlset><url><loc>https://shop.example.com/a</loc></url></urlset>'

describe('worker with a private store (first_load.store_private)', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
    state.sitemap = { xml: SITEMAP, ttl: 60 }
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the HTML out of search engines and caches', async () => {
    state.firstLoad = { site: { code: 'a' }, store_private: true }
    const response = await call('/')

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('leaves a public store as it was', async () => {
    state.firstLoad = { site: { code: 'a' }, store_private: false }
    const response = await call('/')

    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(response.headers.get('cache-control')).toContain('no-cache')
  })

  it('lists nothing in the sitemap, even with one cached', async () => {
    state.firstLoad = { site: { code: 'a' }, store_private: true }
    const response = await call('/sitemap.xml', 'application/xml')
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('<urlset')
    expect(body).not.toContain('<url>')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('serves the sitemap of a public store', async () => {
    state.firstLoad = { site: { code: 'a' }, store_private: false }
    expect(await (await call('/sitemap.xml', 'application/xml')).text()).toBe(SITEMAP)
  })
})
