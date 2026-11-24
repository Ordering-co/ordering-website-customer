import { describe, expect, it } from 'vitest'
import { GENERIC_FAVICON_PATH, businessFaviconLinks, faviconHref, faviconLinks, iconMimeType, isSvgIcon, pngIconUrl } from '../iconLinks'

const CDN = 'https://res.cloudinary.com/acme/image/upload'

describe('iconMimeType: the type of the file, never a guessed one', () => {
  it('PNG, SVG and ICO by the extension, whatever its case or query', () => {
    expect(iconMimeType('https://cdn.test/icon.png')).toBe('image/png')
    expect(iconMimeType('/favicon.PNG?v=2')).toBe('image/png')
    expect(iconMimeType('https://cdn.test/icon.svg#x')).toBe('image/svg+xml')
    expect(iconMimeType('https://cdn.test/favicon.ico')).toBe('image/x-icon')
  })

  it('any other format, no extension or nothing: undefined (the link goes without type)', () => {
    expect(iconMimeType('https://cdn.test/icon.webp')).toBeUndefined()
    expect(iconMimeType('https://cdn.test/icon.jpg')).toBeUndefined()
    expect(iconMimeType('https://cdn.test/icon')).toBeUndefined()
    expect(iconMimeType('https://cdn.test/png')).toBeUndefined()
    expect(iconMimeType('')).toBeUndefined()
    expect(iconMimeType(null)).toBeUndefined()
  })

  it('a CDN transformation decides: f_png is a PNG, f_auto cannot be told', () => {
    expect(iconMimeType(`${CDN}/w_96,h_96,c_fit,f_png/v1/icon.ico`)).toBe('image/png')
    expect(iconMimeType(`${CDN}/f_auto,q_auto,h_2000,c_limit/v1/icon.png`)).toBeUndefined()
    expect(iconMimeType(`${CDN}/q_auto/v1/icon.png`)).toBe('image/png')
  })

  it('a data URL by its media type', () => {
    expect(iconMimeType('data:image/svg+xml,<svg/>')).toBe('image/svg+xml')
    expect(iconMimeType('data:image/png;base64,AAAA')).toBe('image/png')
    expect(iconMimeType('data:image/vnd.microsoft.icon;base64,AAAA')).toBe('image/x-icon')
    expect(iconMimeType('data:image/webp;base64,AAAA')).toBeUndefined()
  })
})

describe('isSvgIcon', () => {
  it('by the extension or the data type', () => {
    expect(isSvgIcon('https://cdn.test/icon.svg?v=1')).toBe(true)
    expect(isSvgIcon('data:image/svg+xml,<svg/>')).toBe(true)
    expect(isSvgIcon('https://cdn.test/icon.png')).toBe(false)
    expect(isSvgIcon('')).toBe(false)
  })
})

describe('faviconHref: the CDN serves the favicon as a 96 px PNG when it can', () => {
  it('a PNG or ICO on the CDN, in place of its transformations', () => {
    expect(faviconHref(`${CDN}/f_auto,q_auto,h_2000,c_limit/v1/icon.png`)).toBe(`${CDN}/w_96,h_96,c_fit,f_png/v1/icon.png`)
    expect(faviconHref(`${CDN}/v1/favicon.ico`)).toBe(`${CDN}/w_96,h_96,c_fit,f_png/v1/favicon.ico`)
  })

  it('an SVG, a URL off the CDN or a bundled one goes as it is', () => {
    expect(faviconHref(`${CDN}/v1/icon.svg`)).toBe(`${CDN}/v1/icon.svg`)
    expect(faviconHref(' https://cdn.test/favicon.ico ')).toBe('https://cdn.test/favicon.ico')
    expect(faviconHref('/default-favicon.png')).toBe('/default-favicon.png')
  })
})

describe('pngIconUrl: a PNG of an icon, or null', () => {
  it('the CDN\'s 180×180 PNG, else the URL when it is a PNG', () => {
    expect(pngIconUrl(`${CDN}/v1/favicon.ico`)).toBe(`${CDN}/w_180,h_180,c_fill,f_png/v1/favicon.ico`)
    expect(pngIconUrl('https://cdn.test/icon.png')).toBe('https://cdn.test/icon.png')
  })

  it('an SVG, an ICO or a WebP off the CDN, or nothing: null', () => {
    expect(pngIconUrl(`${CDN}/v1/icon.svg`)).toBeNull()
    expect(pngIconUrl('https://cdn.test/favicon.ico')).toBeNull()
    expect(pngIconUrl('https://cdn.test/icon.webp')).toBeNull()
    expect(pngIconUrl('')).toBeNull()
  })
})

describe('faviconLinks', () => {
  const FALLBACK = '/default-favicon.png'

  it('a PNG: one link with its type', () => {
    expect(faviconLinks('https://cdn.test/icon.png', FALLBACK)).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'https://cdn.test/icon.png', id: 'favicon' }
    ])
  })

  it('an ICO off the CDN: image/x-icon', () => {
    expect(faviconLinks('https://cdn.test/favicon.ico', FALLBACK)[0]).toMatchObject({ type: 'image/x-icon', href: 'https://cdn.test/favicon.ico' })
  })

  it('a URL whose format cannot be told: no type', () => {
    const [link] = faviconLinks('https://cdn.test/brand-icon', FALLBACK)
    expect(link).not.toHaveProperty('type')
    expect(link.href).toBe('https://cdn.test/brand-icon')
  })

  it('an SVG: the bundled PNG first (32x32), then the SVG (any)', () => {
    expect(faviconLinks('https://cdn.test/icon.svg', FALLBACK)).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: FALLBACK, id: 'favicon-fallback' },
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: 'https://cdn.test/icon.svg', id: 'favicon' }
    ])
  })

  it('an SVG without a fallback: the SVG alone; no URL: nothing', () => {
    expect(faviconLinks('https://cdn.test/icon.svg')).toHaveLength(1)
    expect(faviconLinks('', FALLBACK)).toEqual([])
  })
})

describe('businessFaviconLinks: a single-store business\'s own favicon', () => {
  const CDN2 = 'https://cloud-assets.orderingplus.com/image/upload'

  it('the logo, cropped to a square on the CDN, in place of its own transformations', () => {
    expect(businessFaviconLinks({ logo: `${CDN2}/f_auto,q_auto,h_200,c_limit/a/1.jpg`, header: `${CDN2}/f_auto,q_auto,w_1600/a/2.jpg` })).toEqual({
      icon: `${CDN2}/w_96,h_96,c_fill,f_png/a/1.jpg`,
      touchIcon: `${CDN2}/w_180,h_180,c_fill,f_png/a/1.jpg`
    })
  })

  it('the header when there is no logo', () => {
    expect(businessFaviconLinks({ logo: null, header: `${CDN2}/f_auto,q_auto,w_1600/a/2.jpg` })).toEqual({
      icon: `${CDN2}/w_96,h_96,c_fill,f_png/a/2.jpg`,
      touchIcon: `${CDN2}/w_180,h_180,c_fill,f_png/a/2.jpg`
    })
  })

  it('a URL off the CDN goes as it is, for both sizes', () => {
    expect(businessFaviconLinks({ logo: 'https://cdn.test/logo.jpg' })).toEqual({
      icon: 'https://cdn.test/logo.jpg',
      touchIcon: 'https://cdn.test/logo.jpg'
    })
  })

  it('null without a usable logo or header', () => {
    expect(businessFaviconLinks({})).toBeNull()
    expect(businessFaviconLinks({ logo: '', header: null })).toBeNull()
    expect(businessFaviconLinks()).toBeNull()
  })
})

describe('GENERIC_FAVICON_PATH', () => {
  it('a bundled PNG path, shared by the worker and the client', () => {
    expect(GENERIC_FAVICON_PATH).toBe('/site-icon.png')
  })
})
