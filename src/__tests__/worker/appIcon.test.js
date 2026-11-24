import { describe, expect, it } from 'vitest'
import { appleTouchIconUrl, buildIconLinks, getFaviconBusinessSlug, getThemeAppIcon, presentImage } from '../../../worker/seo.js'
import { transformedImageUrl } from '../../utils/imageTransform'

const envelopeSite = (site) => ({ version: 2, values: { site } })

describe('getFaviconBusinessSlug: the business a single-store favicon may fall back to', () => {
  it('the theme\'s own business, only on a single-store site', () => {
    expect(getFaviconBusinessSlug(envelopeSite({ mode: 'single_store', business_slug: 'cha_sha' }), null)).toBe('cha_sha')
    expect(getFaviconBusinessSlug(envelopeSite({ mode: 'marketplace', business_slug: 'cha_sha' }), null)).toBeNull()
    expect(getFaviconBusinessSlug(envelopeSite({}), null)).toBeNull()
  })

  it('falls back to the API\'s site.business.slug when the theme has none', () => {
    expect(getFaviconBusinessSlug(envelopeSite({ mode: 'single_store' }), { business: { slug: 'api-slug' } })).toBe('api-slug')
  })
})

describe('presentImage (worker/seo.js): absent/placeholder/invalid images read as null', () => {
  it('a usable image, trimmed', () => {
    expect(presentImage(' https://cdn.test/logo.png ')).toBe('https://cdn.test/logo.png')
  })

  it('blank, "null"/"undefined", the legacy placeholder, or a non-http(s) scheme: null', () => {
    expect(presentImage('')).toBeNull()
    expect(presentImage(null)).toBeNull()
    expect(presentImage('null')).toBeNull()
    expect(presentImage('/default-logo.png')).toBeNull()
    expect(presentImage('javascript:alert(1)')).toBeNull()
  })
})

const envelope = (images) => ({ version: 2, values: { images } })

describe('worker: the app icon of a v2 theme (apple-touch-icon)', () => {
  it('reads images.app_icon of a v2 theme; v1 and an empty value have none', () => {
    expect(getThemeAppIcon(envelope({ app_icon: ' https://cdn.test/icon.png ' }))).toBe('https://cdn.test/icon.png')
    expect(getThemeAppIcon(envelope({ app_icon: '' }))).toBeNull()
    expect(getThemeAppIcon({ general: {} })).toBeNull()
  })

  it('without an app icon, the isotype (images.isotype); never the white-label placeholder', () => {
    expect(getThemeAppIcon(envelope({ app_icon: 'https://cdn.test/icon.png', isotype: 'https://cdn.test/iso.png' }))).toBe('https://cdn.test/icon.png')
    expect(getThemeAppIcon(envelope({ app_icon: '', isotype: ' https://cdn.test/iso.png ' }))).toBe('https://cdn.test/iso.png')
    expect(getThemeAppIcon(envelope({ app_icon: '', isotype: '/default-logo.png' }))).toBeNull()
  })

  it('a Cloudinary / cloud-assets icon is served as a 180×180 PNG, in place of the transformations it had', () => {
    expect(appleTouchIconUrl('https://res.cloudinary.com/acme/image/upload/f_auto,q_auto,h_2000,c_limit/v1/icon.webp'))
      .toBe('https://res.cloudinary.com/acme/image/upload/w_180,h_180,c_fill,f_png/v1/icon.webp')
  })

  it('any other URL (another host, an SVG) goes as it is', () => {
    expect(appleTouchIconUrl('https://cdn.test/icon.png')).toBe('https://cdn.test/icon.png')
    expect(appleTouchIconUrl('https://res.cloudinary.com/acme/image/upload/v1/icon.svg')).toBe('https://res.cloudinary.com/acme/image/upload/v1/icon.svg')
  })
})

describe('transformedImageUrl', () => {
  it('only https Cloudinary / cloud-assets URLs with /upload/, no query', () => {
    expect(transformedImageUrl('http://res.cloudinary.com/a/image/upload/x.png', 'w_1')).toBeNull()
    expect(transformedImageUrl('https://res.cloudinary.com/a/image/fetch/x.png', 'w_1')).toBeNull()
    expect(transformedImageUrl('https://res.cloudinary.com/a/image/upload/x.png?v=1', 'w_1')).toBeNull()
    expect(transformedImageUrl('https://cloud-assets.orderingplus.com/a/image/upload/x.png', 'w_1'))
      .toBe('https://cloud-assets.orderingplus.com/a/image/upload/w_1/x.png')
  })
})

describe('worker: the icon links injected into index.html (buildIconLinks)', () => {
  const FALLBACK = '/default-favicon.png'
  const CDN = 'https://res.cloudinary.com/acme/image/upload'
  const byRel = (links, rel) => links.filter(link => link.rel === rel)

  it('a PNG favicon: icon, shortcut-icon and apple-touch-icon, all image/png', () => {
    const links = buildIconLinks({ faviconUrl: 'https://cdn.test/icon.png', fallbackPng: FALLBACK })
    expect(links).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'https://cdn.test/icon.png', id: 'favicon' },
      { rel: 'shortcut-icon', type: 'image/png', href: 'https://cdn.test/icon.png' },
      { rel: 'apple-touch-icon', type: 'image/png', href: 'https://cdn.test/icon.png' }
    ])
  })

  it('a favicon on the CDN: a 96 px PNG for the tab, a 180 px PNG for iOS', () => {
    const links = buildIconLinks({ faviconUrl: `${CDN}/f_auto,q_auto/v1/favicon.ico`, fallbackPng: FALLBACK })
    expect(byRel(links, 'icon')).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${CDN}/w_96,h_96,c_fit,f_png/v1/favicon.ico`, id: 'favicon' }
    ])
    expect(byRel(links, 'apple-touch-icon')[0].href).toBe(`${CDN}/w_180,h_180,c_fill,f_png/v1/favicon.ico`)
  })

  it('an ICO off the CDN: image/x-icon, and the bundled PNG for iOS', () => {
    const links = buildIconLinks({ faviconUrl: 'https://cdn.test/favicon.ico', fallbackPng: FALLBACK })
    expect(byRel(links, 'icon')[0]).toMatchObject({ type: 'image/x-icon' })
    expect(byRel(links, 'shortcut-icon')[0]).toMatchObject({ type: 'image/x-icon' })
    expect(byRel(links, 'apple-touch-icon')).toEqual([{ rel: 'apple-touch-icon', type: 'image/png', href: FALLBACK }])
  })

  it('an SVG favicon: the bundled PNG before it; iOS gets the bundled PNG', () => {
    const links = buildIconLinks({ faviconUrl: `${CDN}/v1/icon.svg`, fallbackPng: FALLBACK })
    expect(byRel(links, 'icon')).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: FALLBACK, id: 'favicon-fallback' },
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: `${CDN}/v1/icon.svg`, id: 'favicon' }
    ])
    expect(byRel(links, 'apple-touch-icon')[0].href).toBe(FALLBACK)
  })

  it('a favicon whose format cannot be told goes without type', () => {
    const links = buildIconLinks({ faviconUrl: 'https://cdn.test/brand-icon', fallbackPng: FALLBACK })
    expect(byRel(links, 'icon')[0]).not.toHaveProperty('type')
    expect(byRel(links, 'shortcut-icon')[0]).not.toHaveProperty('type')
  })

  it('an SEO icon stays, with the type of its file (or none) in place of the declared one', () => {
    const links = buildIconLinks({
      seoLinks: [
        { rel: 'icon', type: 'image/png', href: 'https://cdn.test/seo.svg' },
        { rel: 'icon', type: 'image/png', href: 'https://cdn.test/seo-icon' },
        { rel: 'icon', href: FALLBACK },
        { rel: 'canonical', href: 'https://site.test/' }
      ],
      faviconUrl: 'https://cdn.test/icon.png',
      fallbackPng: FALLBACK
    })
    expect(links).toEqual([
      { rel: 'icon', type: 'image/svg+xml', href: 'https://cdn.test/seo.svg' },
      { rel: 'icon', href: 'https://cdn.test/seo-icon' },
      { rel: 'canonical', href: 'https://site.test/' }
    ])
  })

  it('without a site favicon, a fallback (business/generic, implementation notes) fills icon, shortcut-icon and apple-touch-icon', () => {
    const links = buildIconLinks({ fallbackIconLinks: { icon: 'https://cdn.test/biz.jpg', touchIcon: 'https://cdn.test/biz-180.jpg' } })
    expect(links).toEqual([
      { rel: 'icon', id: 'favicon', href: 'https://cdn.test/biz.jpg' },
      { rel: 'shortcut-icon', href: 'https://cdn.test/biz.jpg' },
      { rel: 'apple-touch-icon', href: 'https://cdn.test/biz-180.jpg' }
    ])
  })

  it('a fallback given its own type/sizes carries them on every link', () => {
    const links = buildIconLinks({ fallbackIconLinks: { icon: '/site-icon.png', touchIcon: '/site-icon.png', type: 'image/png', sizes: '180x180' } })
    expect(links).toEqual([
      { rel: 'icon', id: 'favicon', type: 'image/png', sizes: '180x180', href: '/site-icon.png' },
      { rel: 'shortcut-icon', type: 'image/png', sizes: '180x180', href: '/site-icon.png' },
      { rel: 'apple-touch-icon', type: 'image/png', sizes: '180x180', href: '/site-icon.png' }
    ])
  })

  it('a configured faviconUrl wins over the fallback: fallback is only used without one', () => {
    const links = buildIconLinks({ faviconUrl: 'https://cdn.test/icon.png', fallbackIconLinks: { icon: 'https://cdn.test/biz.jpg' } })
    expect(byRel(links, 'icon')).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'https://cdn.test/icon.png', id: 'favicon' }
    ])
  })

  it('an SEO-configured icon wins over the fallback too', () => {
    const links = buildIconLinks({
      seoLinks: [{ rel: 'icon', href: 'https://cdn.test/seo-icon.png' }],
      fallbackIconLinks: { icon: 'https://cdn.test/biz.jpg' }
    })
    expect(links).toEqual([{ rel: 'icon', type: 'image/png', href: 'https://cdn.test/seo-icon.png' }])
  })

  it('the app icon still overrides the fallback\'s apple-touch-icon', () => {
    const links = buildIconLinks({
      fallbackIconLinks: { icon: 'https://cdn.test/biz.jpg', touchIcon: 'https://cdn.test/biz-180.jpg' },
      appIcon: `${CDN}/v1/app.webp`
    })
    expect(byRel(links, 'apple-touch-icon')).toEqual([
      { rel: 'apple-touch-icon', sizes: '180x180', href: `${CDN}/w_180,h_180,c_fill,f_png/v1/app.webp` }
    ])
  })

  it('the app icon is the only apple-touch-icon, as a PNG; an SVG isotype leaves the favicon\'s', () => {
    const withApp = buildIconLinks({ faviconUrl: 'https://cdn.test/icon.png', fallbackPng: FALLBACK, appIcon: `${CDN}/v1/app.webp` })
    expect(byRel(withApp, 'apple-touch-icon')).toEqual([
      { rel: 'apple-touch-icon', sizes: '180x180', href: `${CDN}/w_180,h_180,c_fill,f_png/v1/app.webp` }
    ])
    const svgIsotype = buildIconLinks({ faviconUrl: 'https://cdn.test/icon.png', fallbackPng: FALLBACK, appIcon: `${CDN}/v1/iso.svg` })
    expect(byRel(svgIsotype, 'apple-touch-icon')).toEqual([
      { rel: 'apple-touch-icon', type: 'image/png', href: 'https://cdn.test/icon.png' }
    ])
  })
})
