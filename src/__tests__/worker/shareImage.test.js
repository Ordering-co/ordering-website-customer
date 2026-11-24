import { describe, expect, it } from 'vitest'
import { extractApiImage, resolveShareImage } from '../../../worker/seo.js'

const ORIGIN = 'https://tenant.example.com'
const GENERIC = 'https://tenant.example.com/og-default.png'
const CDN = 'https://res.cloudinary.com/acme/image/upload/v1/photo.jpg'
const CDN_TRANSFORMED = (transform) => `https://res.cloudinary.com/acme/image/upload/${transform}/v1/photo.jpg`
const PLAIN = 'https://cdn.example.com/photo.jpg' // not a transformable host

const themeOf = (site = {}, images = {}) => ({ version: 2, values: { site, images } })

const base = (overrides) => ({
  seoPath: '/seo/general',
  site: null,
  theme: null,
  business: null,
  apiImage: null,
  origin: ORIGIN,
  genericImage: GENERIC,
  ...overrides
})

describe('resolveShareImage: never empty', () => {
  it('falls back to the generic image, sized 1200x630, when nothing is configured anywhere', () => {
    expect(resolveShareImage(base({}))).toEqual({ url: GENERIC, width: 1200, height: 630 })
  })

  it('treats blank, "null", "undefined" and the legacy placeholder as absent', () => {
    const site = { social_share: '   ', logo: 'null', header: 'undefined', image: 'https://x/y.png' }
    expect(resolveShareImage(base({ site }))).toEqual({ url: GENERIC, width: 1200, height: 630 })
    expect(resolveShareImage(base({ site: { logo: '/default-logo.png' } }))).toEqual({ url: GENERIC, width: 1200, height: 630 })
  })

  it('rejects a data: URI candidate as absent (never serves it)', () => {
    const site = { social_share: 'data:image/png;base64,AAAA' }
    expect(resolveShareImage(base({ site })).url).toBe(GENERIC)
  })

  it('treats an empty-string apiImage as absent (never serves it, even unwrapped)', () => {
    expect(resolveShareImage(base({ apiImage: '' })).url).toBe(GENERIC)
  })
})

describe('resolveShareImage: home / general route', () => {
  it('site.social_share wins over everything else', () => {
    const site = { social_share: PLAIN, header: 'https://cdn.example.com/header.png' }
    expect(resolveShareImage(base({ site, apiImage: 'https://api/img.png' })).url).toBe(PLAIN)
  })

  it('without a website image, falls to the general API og:image', () => {
    expect(resolveShareImage(base({ apiImage: 'https://api.example.com/general.png' })).url)
      .toBe('https://api.example.com/general.png')
  })

  it('the hero photo of a Full Website home: a valid API image (the owner\'s choice) wins; an empty, template or generic one does not cover it', () => {
    const heroImage = 'https://cdn.example.com/hero.jpg'
    expect(resolveShareImage(base({ apiImage: 'https://api.example.com/general.png', heroImage })).url).toBe('https://api.example.com/general.png')
    expect(resolveShareImage(base({ site: { social_share: PLAIN }, apiImage: 'https://api.example.com/general.png', heroImage })).url).toBe(PLAIN)
    ;['', '   ', 'null', '/default-logo.png', 'data:image/png;base64,AAAA', GENERIC, '/og-default.png'].forEach((apiImage) => {
      expect(resolveShareImage(base({ apiImage, heroImage })).url).toBe(heroImage)
    })
    expect(resolveShareImage(base({ heroImage })).url).toBe(heroImage)
  })

  it('single_store theme, no site.social_share: business.header wins over business.logo and the website backup images', () => {
    const theme = themeOf({ mode: 'single_store' })
    const business = { header: 'https://cdn.example.com/biz-header.png', logo: CDN, seo_image: null }
    const site = { header: 'https://cdn.example.com/site-header.png' }
    expect(resolveShareImage(base({ theme, business, site })).url).toBe('https://cdn.example.com/biz-header.png')
  })

  it('single_store theme: business.logo wins when there is no business.header, with the logo transform, no width/height', () => {
    const theme = themeOf({ mode: 'single_store' })
    const business = { header: null, logo: CDN, seo_image: null }
    expect(resolveShareImage(base({ theme, business }))).toEqual({
      url: CDN_TRANSFORMED('w_1200,h_630,c_limit,f_jpg')
    })
  })

  it('marketplace theme never looks at business images, even when business data is present', () => {
    const theme = themeOf({ mode: 'marketplace' })
    const business = { header: 'https://cdn.example.com/biz-header.png' }
    expect(resolveShareImage(base({ theme, business })).url).toBe(GENERIC)
  })

  it('falls to the website backup images, then the theme placeholder, before the generic image', () => {
    const theme = themeOf({ mode: 'marketplace' }, { placeholder: { business_header: 'https://cdn.example.com/placeholder.png' } })
    expect(resolveShareImage(base({ theme, site: { logo: 'https://cdn.example.com/logo.png' } })).url)
      .toBe('https://cdn.example.com/logo.png')
    expect(resolveShareImage(base({ theme })).url).toBe('https://cdn.example.com/placeholder.png')
  })
})

describe('resolveShareImage: /seo/pages/ routes', () => {
  it('keeps the page\'s own apiImage first, ahead of the website image', () => {
    const site = { social_share: PLAIN }
    expect(resolveShareImage(base({ seoPath: '/seo/pages/slug/about', site, apiImage: 'https://api/page.png' })).url)
      .toBe('https://api/page.png')
  })

  it('falls back to the website image when the page has none of its own', () => {
    const site = { social_share: PLAIN }
    expect(resolveShareImage(base({ seoPath: '/seo/pages/slug/about', site })).url).toBe(PLAIN)
  })
})

describe('resolveShareImage: store routes (/seo/business/...)', () => {
  const STORE_PATH = '/seo/business/example_restaurant'

  it('business.seo_image beats header, logo, website and placeholder', () => {
    const business = { seo_image: 'https://cdn/seo.png', header: 'https://cdn/header.png', logo: 'https://cdn/logo.png' }
    const site = { social_share: PLAIN }
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business, site })).url).toBe('https://cdn/seo.png')
  })

  it('without seo_image, header wins over logo and the website image', () => {
    const business = { seo_image: null, header: 'https://cdn/header.png', logo: 'https://cdn/logo.png' }
    const site = { social_share: PLAIN }
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business, site })).url).toBe('https://cdn/header.png')
  })

  it('without seo_image or header, the logo wins (fit transform, no width/height) over the website image', () => {
    const business = { seo_image: null, header: null, logo: CDN }
    const site = { social_share: PLAIN }
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business, site }))).toEqual({
      url: CDN_TRANSFORMED('w_1200,h_630,c_limit,f_jpg')
    })
  })

  it('with no business images at all, falls to the website image, then the theme placeholder, then generic', () => {
    const business = { seo_image: null, header: null, logo: null }
    const theme = themeOf({}, { placeholder: { business_header: 'https://cdn.example.com/placeholder.png' } })
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business, site: { social_share: PLAIN } })).url).toBe(PLAIN)
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business, theme })).url).toBe('https://cdn.example.com/placeholder.png')
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business })).url).toBe(GENERIC)
  })

  it('when the business fetch failed (business is null), uses the page\'s own apiImage before the website image', () => {
    expect(resolveShareImage(base({ seoPath: STORE_PATH, business: null, apiImage: 'https://api/biz.png', site: { social_share: PLAIN } })).url)
      .toBe('https://api/biz.png')
  })

  it('a category/product page keeps its own apiImage untouched, even when the business has its own seo_image', () => {
    const business = { seo_image: 'https://cdn/seo.png' }
    const categoryPath = `${STORE_PATH}/category/mains`
    expect(resolveShareImage(base({ seoPath: categoryPath, business, apiImage: 'https://api/product.png' })).url)
      .toBe('https://api/product.png')
    const productPath = `${STORE_PATH}/category/mains/product/sushi`
    expect(resolveShareImage(base({ seoPath: productPath, business, apiImage: 'https://api/sushi.png' })).url)
      .toBe('https://api/sushi.png')
  })

  it('a category/product page without its own apiImage falls through to the business ladder', () => {
    const business = { seo_image: 'https://cdn/seo.png' }
    const categoryPath = `${STORE_PATH}/category/mains`
    expect(resolveShareImage(base({ seoPath: categoryPath, business, apiImage: null })).url).toBe('https://cdn/seo.png')
  })
})

describe('resolveShareImage: URL normalization and dimensions', () => {
  it('resolves a relative image against the origin', () => {
    expect(resolveShareImage(base({ site: { social_share: '/images/share.png' } })).url).toBe('https://tenant.example.com/images/share.png')
  })

  it('upgrades a protocol-relative URL to https', () => {
    expect(resolveShareImage(base({ site: { social_share: '//cdn.example.com/share.png' } })).url).toBe('https://cdn.example.com/share.png')
  })

  it('forces http:// to https://', () => {
    expect(resolveShareImage(base({ site: { social_share: 'http://cdn.example.com/share.png' } })).url)
      .toBe('https://cdn.example.com/share.png')
  })

  it('on a local dev origin, keeps a relative image on the dev origin\'s own scheme', () => {
    expect(resolveShareImage(base({ origin: 'http://localhost:8787', genericImage: 'http://localhost:8787/og-default.png', site: { social_share: '/share.png' } })).url)
      .toBe('http://localhost:8787/share.png')
  })

  it('never declares width/height for a site image, whether or not the CDN can transform it', () => {
    const transformable = resolveShareImage(base({ site: { social_share: CDN } }))
    expect(transformable.width).toBeUndefined()
    expect(transformable.height).toBeUndefined()
    expect(transformable.url).toBe(CDN_TRANSFORMED('w_1200,h_630,c_fill,f_jpg'))

    const untransformable = resolveShareImage(base({ site: { social_share: PLAIN } }))
    expect(untransformable.width).toBeUndefined()
    expect(untransformable.height).toBeUndefined()
    expect(untransformable.url).toBe(PLAIN)
  })

  it('without a hero photo, a general route keeps the API image even when it is the generic one (unchanged order)', () => {
    const site = { header: 'https://cdn.example.com/site-header.png' }
    expect(resolveShareImage(base({ site, apiImage: GENERIC })).url).toBe(GENERIC)
  })

  it('the generic fallback always carries its known 1200x630 size', () => {
    expect(resolveShareImage(base({}))).toEqual({ url: GENERIC, width: 1200, height: 630 })
  })
})

describe('extractApiImage', () => {
  it('reads the first non-absent og:image or twitter:image from the SEO API metas', () => {
    expect(extractApiImage({ metas: [{ property: 'og:image', content: '' }, { name: 'twitter:image', content: 'https://api/img.png' }] }))
      .toBe('https://api/img.png')
    expect(extractApiImage({ metas: [{ property: 'og:image', content: 'https://api/og.png' }] })).toBe('https://api/og.png')
    expect(extractApiImage({ metas: [{ property: 'og:image', content: '' }] })).toBeNull()
    expect(extractApiImage(null)).toBeNull()
    expect(extractApiImage({})).toBeNull()
  })
})
