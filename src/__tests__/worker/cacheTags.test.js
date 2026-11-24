import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hostCacheTag,
  validateProjectViaCurrent,
  fetchSeo,
  fetchSitemap,
  fetchFirstLoad,
  fetchBootI18n
} from '../../../worker/seo.js'

const config = { project: 'shop', api: { url: 'http://localhost:8080/', version: 'v400', language: 'en' } }
const ORIGIN = 'https://Shop.Example.com:8443'
const HOSTNAME = 'shop.example.com'
const TAG = 'host-shop.example.com'
const SITEMAP_XML = '<?xml version="1.0"?><urlset><url><loc>https://shop.example.com/</loc></url></urlset>'

const cache = { match: vi.fn(), put: vi.fn() }
const ctx = { waitUntil: vi.fn() }
const env = {}

beforeEach(() => {
  cache.match.mockReset().mockResolvedValue(undefined)
  cache.put.mockReset().mockResolvedValue(undefined)
  ctx.waitUntil.mockReset()
  vi.stubGlobal('caches', { default: cache })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const jsonResponse = (json, status = 200) => new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } })
const stubFetch = (makeResponse) => {
  const spy = vi.fn().mockImplementation(async () => makeResponse())
  vi.stubGlobal('fetch', spy)
  return spy
}
const putTags = () => cache.put.mock.calls.map(([, res]) => res.headers.get('cache-tag'))
// an SWR entry older than any soft TTL: served, then refreshed in the background
const staleEntry = (data) => jsonResponse({ __swr: true, storedAt: Date.now() - 7 * 86400 * 1000, data })
const runBackgroundRefreshes = () => Promise.all(ctx.waitUntil.mock.calls.map(([p]) => p))

describe('hostCacheTag', () => {
  it('is host-<hostname>, lowercase, without scheme or port', () => {
    expect(hostCacheTag('shop.example.com')).toBe(TAG)
    expect(hostCacheTag('Shop.EXAMPLE.com')).toBe(TAG)
    expect(hostCacheTag('shop.example.com:3000')).toBe(TAG)
    expect(hostCacheTag('https://Shop.Example.com:8443')).toBe(TAG)
    expect(hostCacheTag('http://shop.example.com/some/path?x=1')).toBe(TAG)
    expect(hostCacheTag('shop.example.com.')).toBe(TAG)
  })

  it('is null without a host', () => {
    expect(hostCacheTag('')).toBeNull()
    expect(hostCacheTag(null)).toBeNull()
    expect(hostCacheTag(undefined)).toBeNull()
  })
})

describe('Cache-Tag on every per-host entry', () => {
  it('/current lookup: tagged with the hostname of its origin key', async () => {
    stubFetch(() => jsonResponse({ error: false, result: { code: 'shop' } }))
    const code = await validateProjectViaCurrent(config, '_', env, ctx, ORIGIN, `${ORIGIN}/`)
    expect(code).toBe('shop')
    expect(cache.put).toHaveBeenCalledTimes(1)
    expect(cache.put.mock.calls[0][0].url).toContain(`origin=${encodeURIComponent(ORIGIN)}`)
    expect(putTags()).toEqual([TAG])
  })

  it('/current lookup: a background SWR refresh keeps the tag', async () => {
    cache.match.mockImplementation(async () => staleEntry({ code: 'shop' }))
    stubFetch(() => jsonResponse({ error: false, result: { code: 'shop' } }))
    expect(await validateProjectViaCurrent(config, '_', env, ctx, ORIGIN, `${ORIGIN}/`)).toBe('shop')
    await runBackgroundRefreshes()
    expect(putTags()).toEqual([TAG])
  })

  it('SEO: tagged with the hostname of its key', async () => {
    stubFetch(() => jsonResponse({ error: false, result: { title: { innerHtml: 'Shop' } } }))
    await fetchSeo(config, '/seo/general', env, ctx, 'Shop.Example.com')
    expect(putTags()).toEqual([TAG])
  })

  it('SEO: a background SWR refresh keeps the tag', async () => {
    cache.match.mockImplementation(async () => staleEntry({ title: { innerHtml: 'Old' } }))
    stubFetch(() => jsonResponse({ error: false, result: { title: { innerHtml: 'New' } } }))
    const seo = await fetchSeo(config, '/seo/general', env, ctx, HOSTNAME)
    expect(seo.title.innerHtml).toBe('Old')
    await runBackgroundRefreshes()
    expect(putTags()).toEqual([TAG])
    expect(await cache.put.mock.calls[0][1].clone().json()).toMatchObject({ __swr: true, data: { title: { innerHtml: 'New' } } })
  })

  it('first_load: tagged with the hostname of its origin key', async () => {
    stubFetch(() => jsonResponse({ error: false, result: { site: { id: 1 } } }))
    expect(await fetchFirstLoad(config, env, ctx, ORIGIN, `${ORIGIN}/`)).toEqual({ site: { id: 1 } })
    expect(putTags()).toEqual([TAG])
  })

  it('sitemap: keyed by host and tagged with it, keeping its own headers', async () => {
    const fetchSpy = stubFetch(() => new Response(SITEMAP_XML, { status: 200, headers: { 'content-type': 'application/xml' } }))
    const sitemap = await fetchSitemap(config, env, ctx, ORIGIN, `${ORIGIN}/sitemap.xml`)
    expect(sitemap.xml).toBe(SITEMAP_XML)

    const [requestUrl, requestInit] = fetchSpy.mock.calls[0]
    expect(requestUrl).toContain(`url=${encodeURIComponent(ORIGIN)}`)
    expect(requestInit.headers['x-domain-x']).toBe(ORIGIN)
    expect(requestInit.headers.origin).toBe(ORIGIN)
    expect(requestInit.headers.referer).toBe(`${ORIGIN}/sitemap.xml`)

    const [req, res] = cache.put.mock.calls[0]
    expect(req.url).toContain(`host=${HOSTNAME}`)
    expect(res.headers.get('cache-tag')).toBe(TAG)
    expect(res.headers.get('content-type')).toBe('text/xml; charset=UTF-8')
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/)
    expect(await res.text()).toBe(SITEMAP_XML)
  })

  it('sitemap: two hosts get separate cache keys', async () => {
    stubFetch(() => new Response(SITEMAP_XML, { status: 200, headers: { 'content-type': 'application/xml' } }))
    await fetchSitemap(config, env, ctx, ORIGIN, `${ORIGIN}/`)
    await fetchSitemap(config, env, ctx, 'https://other.example.com', 'https://other.example.com/')
    const keys = cache.put.mock.calls.map(([req]) => req.url)
    expect(keys[0]).toContain(`host=${HOSTNAME}`)
    expect(keys[1]).toContain('host=other.example.com')
    expect(keys[0]).not.toBe(keys[1])
  })

  it('sitemap: a cached entry for the host is served without calling the API again', async () => {
    cache.match.mockImplementation(async (request) =>
      request.url.includes(`host=${HOSTNAME}`) ? new Response(SITEMAP_XML) : undefined)
    const fetchSpy = stubFetch(() => new Response(SITEMAP_XML, { status: 200, headers: { 'content-type': 'application/xml' } }))
    const sitemap = await fetchSitemap(config, env, ctx, ORIGIN, `${ORIGIN}/`)
    expect(sitemap.xml).toBe(SITEMAP_XML)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('i18n (per project): no Cache-Tag', async () => {
    stubFetch(() => jsonResponse({ error: false, result: [] }))
    const i18n = await fetchBootI18n(config, env, ctx, ORIGIN, `${ORIGIN}/`)
    expect(i18n).toMatchObject({ project: 'shop' })
    expect(cache.put).toHaveBeenCalledTimes(2)
    expect(putTags()).toEqual([null, null])
  })
})

describe('nothing is cached from a failed upstream answer', () => {
  const failures = [404, 500, 503]

  it.each(failures)('/current: not cached on %i', async (status) => {
    stubFetch(() => jsonResponse({ error: true, result: 'x' }, status))
    await validateProjectViaCurrent(config, '_', env, ctx, ORIGIN, `${ORIGIN}/`)
    expect(cache.put).not.toHaveBeenCalled()
  })

  it.each(failures)('SEO: not cached on %i', async (status) => {
    stubFetch(() => jsonResponse({ error: false, result: { title: {} } }, status))
    expect(await fetchSeo(config, '/seo/general', env, ctx, HOSTNAME)).toBeNull()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it.each(failures)('first_load: not cached on %i', async (status) => {
    stubFetch(() => jsonResponse({ error: false, result: { site: {} } }, status))
    expect(await fetchFirstLoad(config, env, ctx, ORIGIN, `${ORIGIN}/`)).toBeNull()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it.each(failures)('sitemap: not cached on %i', async (status) => {
    stubFetch(() => new Response(SITEMAP_XML, { status }))
    expect(await fetchSitemap(config, env, ctx, ORIGIN, `${ORIGIN}/sitemap.xml`)).toBeNull()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it.each(failures)('i18n: not cached on %i', async (status) => {
    stubFetch(() => jsonResponse({ error: false, result: [] }, status))
    expect(await fetchBootI18n(config, env, ctx, ORIGIN, `${ORIGIN}/`)).toBeNull()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('first_load: a 200 answering error: true is not cached', async () => {
    stubFetch(() => jsonResponse({ error: true, result: 'Project not found' }))
    expect(await fetchFirstLoad(config, env, ctx, ORIGIN, `${ORIGIN}/`)).toBeNull()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('/current, SEO and i18n: a 200 answering error: true is not cached', async () => {
    stubFetch(() => jsonResponse({ error: true, result: ['ERROR'] }))
    await validateProjectViaCurrent(config, '_', env, ctx, ORIGIN, `${ORIGIN}/`)
    await fetchSeo(config, '/seo/general', env, ctx, HOSTNAME)
    await fetchBootI18n(config, env, ctx, ORIGIN, `${ORIGIN}/`)
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('a failed background SWR refresh keeps the stale entry instead of caching the failure', async () => {
    cache.match.mockImplementation(async () => staleEntry({ title: { innerHtml: 'Old' } }))
    stubFetch(() => jsonResponse({ error: true, result: 'down' }, 502))
    expect((await fetchSeo(config, '/seo/general', env, ctx, HOSTNAME)).title.innerHtml).toBe('Old')
    await runBackgroundRefreshes()
    expect(ctx.waitUntil).toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
