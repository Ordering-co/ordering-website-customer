import { afterEach, describe, expect, it } from 'vitest'

import { ORDERING_FAVICON, getFallbackFaviconUrl, getGenericFaviconUrl, getSiteFaviconUrl, getSiteLogoUrl, getThemeAppIcon, getThemeInverseLogo, getThemeLogoUrl, isOfficialOrderingHost, getSiteName, headerBrand, brandRepeatsStore, readStoredBrandLogo, writeStoredBrandLogo } from '../siteBranding'
import { GENERIC_FAVICON_PATH } from '../iconLinks'
import { BUNDLED_IMAGES } from '../bundledImages'
import { themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'
import { getFallbackFaviconPath, isOrderingHost, resolveTenantFaviconUrl } from '../../../worker/seo'

// legacy white-label placeholder paths this app used to serve; kept only to
// prove they are still recognized as unconfigured (never exported anymore)
const LEGACY_LOGO = '/default-logo.png'
const LEGACY_FAVICON = '/default-favicon.png'

const officialHosts = [
  'demo.orderingplus.com',
  'tenant.tryordering.com',
  'shop.ordering.co',
  'v26-demo.orderingplus.com'
]

const nonOfficialHosts = [
  'custom.example.com',
  'localhost',
  ''
]

const orderingLogo = '/assets/logotype.svg'
const projectLogo = 'https://cloud-assets.orderingplus.com/tenant/logo.png'
const projectFavicon = 'https://cloud-assets.orderingplus.com/tenant/favicon.png'
const appIcon = 'https://cloud-assets.orderingplus.com/tenant/app-icon.png'

describe('host detection stays in sync with the worker', () => {
  it.each(officialHosts)('recognizes official host %s', hostname => {
    expect(isOfficialOrderingHost(hostname)).toBe(true)
    expect(isOrderingHost(hostname)).toBe(true)
  })

  it.each(nonOfficialHosts)('rejects non-official host %s', hostname => {
    expect(isOfficialOrderingHost(hostname)).toBe(false)
    expect(isOrderingHost(hostname)).toBe(false)
  })
})

describe('official Ordering hosts', () => {
  it.each(officialHosts)('falls back to Ordering branding on %s', hostname => {
    expect(getSiteLogoUrl('', orderingLogo, hostname)).toBe(orderingLogo)
    expect(getSiteFaviconUrl('', '', hostname)).toBe(ORDERING_FAVICON)
  })

  it.each(officialHosts)('ignores legacy white-label placeholders on %s', hostname => {
    expect(getSiteLogoUrl(LEGACY_LOGO, orderingLogo, hostname)).toBe(orderingLogo)
    expect(getSiteFaviconUrl(LEGACY_FAVICON, '', hostname)).toBe(ORDERING_FAVICON)
  })

  it.each(officialHosts)('lets the configured project override Ordering branding on %s', hostname => {
    expect(getSiteLogoUrl(projectLogo, orderingLogo, hostname)).toBe(projectLogo)
    expect(getSiteFaviconUrl(projectFavicon, '', hostname)).toBe(projectFavicon)
  })
})

describe('white-label and custom domains: nothing configured means none, not a placeholder', () => {
  it.each(nonOfficialHosts)('gets no logo and no favicon on %s', hostname => {
    expect(getSiteLogoUrl('', orderingLogo, hostname)).toBe('')
    expect(getSiteFaviconUrl('', '', hostname)).toBe('')
  })

  it.each(nonOfficialHosts)('keeps the configured project branding on %s', hostname => {
    expect(getSiteLogoUrl(projectLogo, orderingLogo, hostname)).toBe(projectLogo)
    expect(getSiteFaviconUrl(projectFavicon, '', hostname)).toBe(projectFavicon)
  })
})

describe('favicon order: configured favicon > app icon > site.logo > Ordering default > none', () => {
  it.each(officialHosts)('uses site.logo when no custom favicon or app icon exists on %s', hostname => {
    expect(getSiteFaviconUrl('', projectLogo, hostname)).toBe(projectLogo)
    expect(resolveTenantFaviconUrl('', projectLogo, hostname)).toBe(projectLogo)
  })

  it.each(nonOfficialHosts)('uses site.logo on white-label host %s', hostname => {
    expect(getSiteFaviconUrl('', projectLogo, hostname)).toBe(projectLogo)
    expect(resolveTenantFaviconUrl('', projectLogo, hostname)).toBe(projectLogo)
  })

  it('the app icon wins over the site logo', () => {
    expect(getSiteFaviconUrl('', projectLogo, 'wegoo.es', appIcon)).toBe(appIcon)
    expect(resolveTenantFaviconUrl('', projectLogo, 'wegoo.es', appIcon)).toBe(appIcon)
  })

  it('a configured favicon wins over the app icon and the site logo', () => {
    expect(getSiteFaviconUrl(projectFavicon, projectLogo, 'wegoo.es', appIcon)).toBe(projectFavicon)
    expect(resolveTenantFaviconUrl(projectFavicon, projectLogo, 'wegoo.es', appIcon)).toBe(projectFavicon)
  })

  it('ignores a legacy placeholder favicon and uses site.logo', () => {
    expect(getSiteFaviconUrl(LEGACY_FAVICON, projectLogo, 'wegoo.es')).toBe(projectLogo)
    expect(resolveTenantFaviconUrl(LEGACY_FAVICON, projectLogo, 'wegoo.es')).toBe(projectLogo)
  })

  it('ignores a legacy placeholder site.logo: Ordering default on an Ordering host, none off it', () => {
    expect(getSiteFaviconUrl('', LEGACY_LOGO, 'demo.orderingplus.com')).toBe(ORDERING_FAVICON)
    expect(getSiteFaviconUrl('', LEGACY_LOGO, 'wegoo.es')).toBe('')
    expect(resolveTenantFaviconUrl('', LEGACY_LOGO, 'demo.orderingplus.com')).toBe(ORDERING_FAVICON)
    expect(resolveTenantFaviconUrl('', LEGACY_LOGO, 'wegoo.es')).toBe('')
  })

  it('nothing resolves on a white-label host with nothing configured', () => {
    expect(getSiteFaviconUrl('', '', 'wegoo.es')).toBe('')
    expect(resolveTenantFaviconUrl('', '', 'wegoo.es')).toBe('')
  })
})

describe('getSiteName', () => {
  const blank = themeWithValues()
  it('the theme\'s site name, else the site\'s, else "My Site" (never the app\'s name)', () => {
    const theme = themeWithValues((values) => { values.site.name = ' Theme Name ' })
    expect(getSiteName({ theme, site: { name: 'Site' }, settings: { app_name: 'App' } })).toBe('Theme Name')
    expect(getSiteName({ theme: blank, site: { name: 'Site' }, settings: { app_name: 'App' } })).toBe('Site')
    expect(getSiteName({ theme: blank, settings: { app_name: 'App' } })).toBe('My Site')
  })

  it('takes the caller\'s fallback', () => {
    expect(getSiteName({ theme: blank, fallback: 'shop.example.com' })).toBe('shop.example.com')
    expect(getSiteName({ theme: blank, site: { name: ' ' }, fallback: '' })).toBe('')
  })
})

describe('getThemeLogoUrl', () => {
  const theme = (images) => ({ values: { images } })

  it('the theme\'s logotype (the isotype first when asked), else the brand of the host, else none', () => {
    expect(getThemeLogoUrl(theme({ logotype: 'https://cdn.test/l.png', isotype: 'https://cdn.test/m.png' }), { hostname: 'wegoo.es' })).toBe('https://cdn.test/l.png')
    expect(getThemeLogoUrl(theme({ logotype: 'https://cdn.test/l.png', isotype: 'https://cdn.test/m.png' }), { mobile: true, hostname: 'wegoo.es' })).toBe('https://cdn.test/m.png')
    expect(getThemeLogoUrl(theme({ logotype: 'https://cdn.test/l.png', isotype: '' }), { mobile: true, hostname: 'wegoo.es' })).toBe('https://cdn.test/l.png')
    // white label, nothing configured: '', not a placeholder
    expect(getThemeLogoUrl(theme({ logotype: '' }), { hostname: 'wegoo.es' })).toBe('')
    expect(getThemeLogoUrl(theme({ logotype: '' }), { hostname: 'demo.orderingplus.com' })).toBe(BUNDLED_IMAGES.logos.logotype)
  })
})

describe('getThemeAppIcon', () => {
  const theme = (images) => ({ values: { images } })

  it('the theme\'s app icon, else its isotype (not the white-label placeholder); null with neither', () => {
    expect(getThemeAppIcon(theme({ app_icon: 'https://cdn.test/icon.png', isotype: 'https://cdn.test/iso.png' }))).toBe('https://cdn.test/icon.png')
    expect(getThemeAppIcon(theme({ app_icon: '', isotype: 'https://cdn.test/iso.png' }))).toBe('https://cdn.test/iso.png')
    expect(getThemeAppIcon(theme({ app_icon: '', isotype: LEGACY_LOGO }))).toBeNull()
    expect(getThemeAppIcon(theme({}))).toBeNull()
  })

  it('the smart banner\'s logo (App.js): the app icon or the isotype, else the site\'s logo, else none', () => {
    const bannerLogo = (images) => getThemeAppIcon(theme(images)) || getThemeLogoUrl(theme(images), { mobile: true, hostname: 'wegoo.es' })
    expect(bannerLogo({ isotype: 'https://cdn.test/iso.png', logotype: 'https://cdn.test/l.png' })).toBe('https://cdn.test/iso.png')
    expect(bannerLogo({ logotype: 'https://cdn.test/l.png' })).toBe('https://cdn.test/l.png')
    expect(bannerLogo({})).toBe('')
  })
})

describe('getThemeInverseLogo', () => {
  const theme = (images) => ({ values: { images } })
  const LOGOTYPE = 'https://cdn.test/logotype-inverse.svg'
  const ISOTYPE = 'https://cdn.test/isotype-inverse.svg'

  it('the logotype for dark backgrounds, the isotype on phones; each falls back to its own, not inverse', () => {
    const PLAIN_ISOTYPE = 'https://cdn.test/isotype.svg'
    expect(getThemeInverseLogo(theme({ logotype_inverse: LOGOTYPE, isotype_inverse: ISOTYPE }))).toBe(LOGOTYPE)
    expect(getThemeInverseLogo(theme({ logotype_inverse: LOGOTYPE, isotype_inverse: ISOTYPE }), { mobile: true })).toBe(ISOTYPE)
    // never the other inverse: the logotype's own is the caller's logotype ('')
    expect(getThemeInverseLogo(theme({ isotype_inverse: ISOTYPE }))).toBe('')
    expect(getThemeInverseLogo(theme({ logotype_inverse: LOGOTYPE, isotype: PLAIN_ISOTYPE }), { mobile: true })).toBe(PLAIN_ISOTYPE)
    expect(getThemeInverseLogo(theme({ logotype_inverse: LOGOTYPE }), { mobile: true })).toBe('')
  })

  it('\'\' when the theme has neither', () => {
    expect(getThemeInverseLogo(theme({}))).toBe('')
    expect(getThemeInverseLogo(theme({ logotype_inverse: '', isotype_inverse: '' }), { mobile: true })).toBe('')
  })
})

describe('headerBrand (implementation notes, Single Restaurant)', () => {
  it('the site\'s own logo wins over the store\'s, even on a single store', () => {
    expect(headerBrand({ logotypeSrc: 'https://cdn.test/logo.png', storeLogo: 'https://cdn.test/store.png', name: 'Acme', singleStore: true }))
      .toEqual({ kind: 'site', logotypeSrc: 'https://cdn.test/logo.png', isotypeSrc: null, logoSrc: 'https://cdn.test/logo.png' })
  })

  it('an isotype alone is still the site\'s own logo', () => {
    expect(headerBrand({ isotypeSrc: 'https://cdn.test/iso.png', singleStore: true }))
      .toEqual({ kind: 'site', logotypeSrc: null, isotypeSrc: 'https://cdn.test/iso.png', logoSrc: 'https://cdn.test/iso.png' })
  })

  it('the store\'s own logo, only on a single store, when the site has none', () => {
    expect(headerBrand({ storeLogo: 'https://cdn.test/store.png', name: 'Acme', singleStore: true }))
      .toEqual({ kind: 'store', storeLogo: 'https://cdn.test/store.png', logoSrc: 'https://cdn.test/store.png' })
  })

  it('ignores the store\'s logo off a single store (Marketplace): the name instead', () => {
    expect(headerBrand({ storeLogo: 'https://cdn.test/store.png', name: 'Acme', singleStore: false }))
      .toEqual({ kind: 'name', name: 'Acme' })
  })

  it('the name as text with neither logo', () => {
    expect(headerBrand({ name: 'Acme', singleStore: true })).toEqual({ kind: 'name', name: 'Acme' })
  })

  it('null with nothing to show at all', () => {
    expect(headerBrand({})).toBeNull()
    expect(headerBrand()).toBeNull()
  })
})

describe('the header\'s persisted Single Restaurant store logo', () => {
  afterEach(() => { window.localStorage.clear() })

  it('round-trips a store\'s logo by slug', () => {
    writeStoredBrandLogo('demo-store', 'https://cdn.test/store.png')
    expect(readStoredBrandLogo('demo-store')).toBe('https://cdn.test/store.png')
  })

  it('clears it when written falsy', () => {
    writeStoredBrandLogo('demo-store', 'https://cdn.test/store.png')
    writeStoredBrandLogo('demo-store', null)
    expect(readStoredBrandLogo('demo-store')).toBeNull()
  })

  it('null without a slug, and keeps each store\'s separate', () => {
    expect(readStoredBrandLogo(null)).toBeNull()
    writeStoredBrandLogo(null, 'https://cdn.test/store.png')
    writeStoredBrandLogo('store-a', 'https://cdn.test/a.png')
    writeStoredBrandLogo('store-b', 'https://cdn.test/b.png')
    expect(readStoredBrandLogo('store-a')).toBe('https://cdn.test/a.png')
    expect(readStoredBrandLogo('store-b')).toBe('https://cdn.test/b.png')
  })
})

describe('the bundled favicon of the host (the PNG fallback of an SVG favicon)', () => {
  it.each(officialHosts)('is the worker\'s on %s, and a PNG', hostname => {
    expect(getFallbackFaviconUrl(hostname)).toBe(getFallbackFaviconPath(hostname))
    expect(getFallbackFaviconUrl(hostname)).toMatch(/\.png$/)
  })

  it.each(nonOfficialHosts)('is none off an Ordering host (%s): a white-label site gets no fallback PNG', hostname => {
    expect(getFallbackFaviconUrl(hostname)).toBe('')
    expect(getFallbackFaviconPath(hostname)).toBe('')
  })
})

describe('getGenericFaviconUrl', () => {
  it('the bundled generic icon, on any host', () => {
    expect(getGenericFaviconUrl()).toBe(GENERIC_FAVICON_PATH)
  })
})

describe('brandRepeatsStore', () => {
  it("the store's own logo repeats the store block when it paints one (storeShowsLogo true/omitted, implementation notes)", () => {
    expect(brandRepeatsStore({ kind: 'store', storeLogo: 'x.png' }, 'Cha Sha')).toBe(true)
    expect(brandRepeatsStore({ kind: 'store', storeLogo: 'x.png' }, 'Cha Sha', true)).toBe(true)
  })
  it("the store's own logo stays shown when the block doesn't paint one (storeShowsLogo false, implementation notes)", () => {
    expect(brandRepeatsStore({ kind: 'store', storeLogo: 'x.png' }, 'Cha Sha', false)).toBe(false)
  })
  it('a name still repeats it regardless of storeShowsLogo', () => {
    expect(brandRepeatsStore({ kind: 'name', name: 'Cha Sha' }, 'Cha Sha', false)).toBe(true)
  })
  it("the site's own logo never does", () => {
    expect(brandRepeatsStore({ kind: 'site', logotypeSrc: 'x.png' }, 'Cha Sha')).toBe(false)
  })
  it("a name repeats it only when equal to the store's, trimmed and case-insensitive", () => {
    expect(brandRepeatsStore({ kind: 'name', name: 'Cha Sha' }, '  cha sha ')).toBe(true)
    expect(brandRepeatsStore({ kind: 'name', name: 'Nabe & Don' }, 'Example Restaurant')).toBe(false)
  })
  it("a name counts as repeating until the store's name is known; no brand never does", () => {
    expect(brandRepeatsStore({ kind: 'name', name: 'Cha Sha' }, null)).toBe(true)
    expect(brandRepeatsStore(null, 'Cha Sha')).toBe(false)
  })
})
