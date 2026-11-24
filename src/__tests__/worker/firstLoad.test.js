import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildFirstLoadUrl,
  buildOwnFirstLoadCacheKey,
  fetchFirstLoad,
  getThemeFavicon,
  getThemeFranchiseId,
  getThemeSite,
  getThemeSiteName
} from '../../../worker/seo.js'

const config = { project: 'development', api: { url: 'http://localhost:8080/', version: 'v400', language: 'en' } }
const ORIGIN = 'https://shop.example.com'
const ROUTER_KEY = `https://websites-router.internal/first-load?origin=${encodeURIComponent(ORIGIN)}`

const cache = { match: vi.fn(), put: vi.fn() }
const ctx = { waitUntil: vi.fn() }

beforeEach(() => {
  cache.match.mockReset().mockResolvedValue(undefined)
  cache.put.mockReset().mockResolvedValue(undefined)
  ctx.waitUntil.mockReset()
  vi.stubGlobal('caches', { default: cache })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const okResponse = (json) => new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } })

describe('first_load theme version', () => {
  it('always asks for theme_version=2', () => {
    expect(buildFirstLoadUrl(config)).toMatch(/^http:\/\/localhost:8080\/v400\/en\/development\/frontends\/first_load\?params=.+&theme_version=2&product_type=marketplace_website&theme_schema_version=\d+\.\d+\.\d+$/)
    // the env switch back to v1 is gone
    expect(buildFirstLoadUrl(config, 1)).toContain('theme_version=2')
  })

  it('uses its own versioned cache key, never the router one', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse({ error: false, result: { theme: { version: 2, values: {} } } }))
    vi.stubGlobal('fetch', fetchSpy)
    const result = await fetchFirstLoad(config, { FIRST_LOAD_THEME_VERSION: '1' }, ctx, ORIGIN, `${ORIGIN}/`, ROUTER_KEY)

    expect(result.theme.version).toBe(2)
    expect(fetchSpy.mock.calls[0][0]).toContain('theme_version=2')
    const read = cache.match.mock.calls[0][0].url
    const written = cache.put.mock.calls[0][0].url
    expect(read).toBe(buildOwnFirstLoadCacheKey(ORIGIN))
    expect(written).toBe(read)
    expect(read).toContain('website-marketplace-v26.internal')
    expect(read).toContain('theme_version=2')
    // a v2 payload cached without product_type is not read back
    expect(read).toContain('product_type=marketplace_website')
    // nor one cached for another schema version
    expect(read).toMatch(/theme_schema_version=\d+\.\d+\.\d+/)
    expect(read).not.toContain('websites-router')
  })
})

describe('theme helpers of the worker', () => {
  it('reads the site settings of a v2 theme only', () => {
    const theme = { version: 2, values: { site: { name: ' Pizza ', franchise_id: 7 } } }
    expect(getThemeSite(theme)).toEqual({ name: ' Pizza ', franchise_id: 7 })
    expect(getThemeSiteName(theme)).toBe('Pizza')
    expect(getThemeFranchiseId(theme)).toBe(7)
    expect(getThemeFranchiseId({ version: 2, values: { site: { franchise_id: ' f1 ' } } })).toBe('f1')
    expect(getThemeFranchiseId({ version: 2, values: { site: { franchise_id: '' } } })).toBeNull()
    expect(getThemeSiteName({ version: 2, values: { site: { name: '  ' } } })).toBeNull()
    // the v1 tree and `legacy` are ignored
    const legacy = { my_products: { components: { website_settings: { components: { values: { name: 'Pizza' } } } } } }
    expect(getThemeSite({ version: 2, values: {}, legacy })).toBeNull()
    expect(getThemeSiteName(legacy)).toBeNull()
    expect(getThemeFranchiseId(null)).toBeNull()
  })

  it('reads the favicon of a v2 theme only', () => {
    expect(getThemeFavicon({ version: 2, values: { images: { favicon: 'https://cdn.test/f.png' } } })).toBe('https://cdn.test/f.png')
    expect(getThemeFavicon({ general: { components: { favicon: { components: { image: 'https://cdn.test/v1.png' } } } } })).toBeUndefined()
    expect(getThemeFavicon(null)).toBeUndefined()
  })
})
