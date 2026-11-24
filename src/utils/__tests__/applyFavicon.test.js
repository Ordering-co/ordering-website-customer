import { afterEach, describe, expect, it } from 'vitest'
import { applyFavicon } from '../applyFavicon'

const FALLBACK = '/default-favicon.png'
const icons = () => Array.from(document.head.querySelectorAll('link[rel="icon"]'))
const attrs = (link) => ({
  id: link.id,
  type: link.getAttribute('type'),
  sizes: link.getAttribute('sizes'),
  href: link.getAttribute('href')
})

describe('applyFavicon', () => {
  afterEach(() => icons().forEach((link) => link.remove()))

  it('creates link#favicon with the type of its file', () => {
    applyFavicon('https://cdn.test/favicon.ico', FALLBACK)
    expect(icons().map(attrs)).toEqual([
      { id: 'favicon', type: 'image/x-icon', sizes: '32x32', href: 'https://cdn.test/favicon.ico' }
    ])
  })

  it('fixes the type the worker (or an older build) declared and drops it when it cannot be told', () => {
    const link = document.createElement('link')
    link.id = 'favicon'
    link.rel = 'icon'
    link.setAttribute('type', 'image/png')
    link.setAttribute('href', '/old.png')
    document.head.appendChild(link)

    applyFavicon('https://cdn.test/brand-icon', FALLBACK)
    expect(icons()).toHaveLength(1)
    expect(attrs(icons()[0])).toEqual({ id: 'favicon', type: null, sizes: '32x32', href: 'https://cdn.test/brand-icon' })
  })

  it('an SVG gets the bundled PNG before it, which goes when the favicon is no longer an SVG', () => {
    applyFavicon('https://cdn.test/icon.svg', FALLBACK)
    expect(icons().map(attrs)).toEqual([
      { id: 'favicon-fallback', type: 'image/png', sizes: '32x32', href: FALLBACK },
      { id: 'favicon', type: 'image/svg+xml', sizes: 'any', href: 'https://cdn.test/icon.svg' }
    ])

    applyFavicon('https://cdn.test/icon.png', FALLBACK)
    expect(icons().map(attrs)).toEqual([
      { id: 'favicon', type: 'image/png', sizes: '32x32', href: 'https://cdn.test/icon.png' }
    ])
  })

  it('does not touch an href that is already right', () => {
    applyFavicon('https://cdn.test/icon.png', FALLBACK)
    const link = icons()[0]
    let changes = 0
    new MutationObserver((records) => { changes += records.length }).observe(link, { attributes: true })
    applyFavicon('https://cdn.test/icon.png', FALLBACK)
    return Promise.resolve().then(() => expect(changes).toBe(0))
  })

  it('removes link#favicon and link#favicon-fallback when nothing resolves at all (no site favicon, no fallback href)', () => {
    applyFavicon('https://cdn.test/icon.svg', FALLBACK)
    expect(icons()).toHaveLength(2)
    applyFavicon('', '')
    expect(icons()).toHaveLength(0)
  })

  describe('without a site-level favicon, the fallback href', () => {
    it('applies it verbatim: no type, no sizes, no re-transform', () => {
      const businessHref = 'https://cloud-assets.orderingplus.com/image/upload/w_96,h_96,c_fill,f_png/biz/logo.jpg'
      applyFavicon('', FALLBACK, businessHref)
      expect(icons().map(attrs)).toEqual([
        { id: 'favicon', type: null, sizes: null, href: businessHref }
      ])
    })

    it('a falsy fallback href still removes the favicon links (no site favicon, nothing else to show)', () => {
      applyFavicon('https://cdn.test/icon.svg', FALLBACK)
      applyFavicon('', FALLBACK, '')
      expect(icons()).toHaveLength(0)
    })

    it('is ignored once a site-level favicon resolves', () => {
      applyFavicon('https://cdn.test/icon.png', FALLBACK, 'https://cdn.test/should-not-apply.png')
      expect(icons().map(attrs)).toEqual([
        { id: 'favicon', type: 'image/png', sizes: '32x32', href: 'https://cdn.test/icon.png' }
      ])
    })

    it('does not touch an unchanged fallback href (no flicker when the app re-applies the worker\'s own choice)', () => {
      const href = 'https://cdn.test/generic.png'
      applyFavicon('', FALLBACK, href)
      const link = icons()[0]
      let changes = 0
      new MutationObserver((records) => { changes += records.length }).observe(link, { attributes: true })
      applyFavicon('', FALLBACK, href)
      return Promise.resolve().then(() => expect(changes).toBe(0))
    })
  })
})
