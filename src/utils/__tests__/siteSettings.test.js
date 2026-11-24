import { describe, expect, it } from 'vitest'
import { buildAppTheme } from '../appTheme'
import { schemaKeys } from '../themeSchema'
import { buildLocalTheme, envelope } from './fixtures/themeFixtures'
import { spec } from './fixtures/schemaSpecs'
import {
  footerHtml,
  franchiseId,
  franchiseSlug,
  homeHtml,
  isFranchise,
  isFullWebsite,
  isSingleStore,
  isTrackingOnly,
  menuPath,
  singleStoreSlug,
  siteDescription,
  siteMode,
  siteName,
  siteSetting,
  smartBanner,
  thirdPartyCode
} from '../siteSettings'

// The site's settings as the app reads them: merged over the defaults
const theme = (site) => buildAppTheme(buildLocalTheme(), envelope({ site }, { complete: false }))

describe('site in product.schema.json', () => {
  it('every setting has a known type and its default', () => {
    const leaves = []
    const walk = (path) => schemaKeys(path).forEach((key) => {
      const entry = spec(`${path}.${key}`)
      if (entry) leaves.push([`${path}.${key}`.replace(/^site\./, ''), entry])
      else walk(`${path}.${key}`)
    })
    walk('site')
    expect(leaves.map(([path]) => path)).toEqual([
      'mode', 'experience', 'main_store', 'business_slug', 'franchise_slug', 'franchise_id', 'name', 'description', 'home_html', 'footer_html',
      'third_party_code.head', 'third_party_code.body', 'tracking_only', 'smart_banner.apple_id', 'smart_banner.android_id'
    ])
    leaves.forEach(([path, { type: kind, default: value, options }]) => {
      expect(['option', 'string', 'id', 'html', 'bool'], path).toContain(kind)
      if (kind === 'option') expect(options, path).toContain(value)
      if (kind === 'bool') expect(typeof value, path).toBe('boolean')
      if (kind === 'string' || kind === 'html') expect(value, path).toBe('')
    })
  })
})

describe('siteSetting', () => {
  it('the theme\'s value, else the schema default', () => {
    expect(siteSetting(theme({ name: 'Mc' }), 'name')).toBe('Mc')
    expect(siteSetting(theme({}), 'mode')).toBe('marketplace')
    expect(siteSetting(theme({ third_party_code: { head: '<x>' } }), 'third_party_code.body')).toBe('')
    expect(siteSetting(theme({ franchise_id: null }), 'franchise_id')).toBeNull()
  })

  it('never reads the v1 tree nor legacy', () => {
    const v1 = buildAppTheme(buildLocalTheme(), envelope({
      my_products: { components: { website_settings: { components: { values: { name: 'Old' } } } } },
      third_party_code: { head: '<old>' },
      tracking_settings: { tracking_only: true },
      legacy: { third_party_code: { head: '<old>' } }
    }, { complete: false }))
    expect(siteName(v1)).toBe('')
    expect(thirdPartyCode(v1)).toEqual({ head: '', body: '' })
    expect(isTrackingOnly(v1)).toBe(false)
  })
})

describe('site mode', () => {
  it('siteMode: one of the schema options, else marketplace', () => {
    expect(siteMode(theme({ mode: 'single_store' }))).toBe('single_store')
    expect(siteMode(theme({ mode: 'franchise' }))).toBe('franchise')
    expect(siteMode(theme({ mode: 'kiosk' }))).toBe('marketplace')
    expect(siteMode(theme({}))).toBe('marketplace')
  })

  it('singleStoreSlug / isSingleStore: the single store\'s slug or the config\'s', () => {
    expect(singleStoreSlug(theme({ mode: 'single_store', business_slug: ' mc ' }), {})).toBe('mc')
    expect(singleStoreSlug(theme({ mode: 'marketplace', business_slug: 'mc' }), {})).toBeNull()
    expect(singleStoreSlug(theme({}), { businessSlug: 'salami' })).toBe('salami')
    expect(isSingleStore(theme({ mode: 'single_store', business_slug: '' }), {})).toBe(false)
    expect(isSingleStore(theme({ mode: 'single_store', business_slug: 'mc' }))).toBe(true)
  })

  it('franchiseSlug / isFranchise: the franchise\'s id, else its slug, its business_slug, or the config\'s', () => {
    expect(franchiseSlug(theme({ mode: 'franchise', franchise_slug: 'pizzeria', franchise_id: 100 }), { franchiseSlug: 100 })).toBe(100)
    expect(franchiseSlug(theme({ mode: 'franchise', franchise_slug: 'pizzeria', franchise_id: 100 }), {})).toBe(100)
    expect(franchiseSlug(theme({ mode: 'marketplace', franchise_slug: 'pizzeria', franchise_id: 100 }), {})).toBeNull()
    expect(franchiseSlug(theme({ mode: 'franchise', franchise_slug: 'burgers' }), {})).toBe('burgers')
    expect(franchiseSlug(theme({ mode: 'franchise', franchise_slug: 12 }), {})).toBe(12)
    expect(franchiseSlug(theme({ mode: 'franchise', franchise_slug: '', business_slug: 'b' }), {})).toBe('b')
    expect(franchiseSlug(theme({ mode: 'marketplace', franchise_slug: 'burgers' }), {})).toBeNull()
    expect(franchiseSlug(theme({ mode: 'franchise' }), { franchiseSlug: 7 })).toBe(7)
    expect(isFranchise(theme({}), {})).toBe(false)
    expect(isFranchise(theme({ mode: 'franchise', franchise_slug: 'x' }))).toBe(true)
  })

  it('franchiseId: the id of the franchise, or null', () => {
    expect(franchiseId(theme({ franchise_id: 5 }))).toBe(5)
    expect(franchiseId(theme({ franchise_id: '5' }))).toBe('5')
    expect(franchiseId(theme({ franchise_id: '' }))).toBeNull()
    expect(franchiseId(theme({}))).toBeNull()
  })
})

describe('texts and code of the site', () => {
  it('siteName / siteDescription: trimmed, \'\' when blank', () => {
    expect(siteName(theme({ name: '  Mc  ' }))).toBe('Mc')
    expect(siteDescription(theme({ description: 'Burgers' }))).toBe('Burgers')
    expect(siteName(theme({ name: 3 }))).toBe('')
    expect(siteDescription(theme({}))).toBe('')
  })

  it('homeHtml / footerHtml: the HTML as it is, \'\' when blank', () => {
    expect(homeHtml(theme({ home_html: ' <p>Hi</p>\n' }))).toBe(' <p>Hi</p>\n')
    expect(footerHtml(theme({ footer_html: '   ' }))).toBe('')
    expect(footerHtml(theme({}))).toBe('')
  })

  it('thirdPartyCode: head and body', () => {
    expect(thirdPartyCode(theme({ third_party_code: { head: '<script>a</script>', body: '<noscript>b</noscript>' } })))
      .toEqual({ head: '<script>a</script>', body: '<noscript>b</noscript>' })
    expect(thirdPartyCode(theme({ third_party_code: { body: '<b>' } }))).toEqual({ head: '', body: '<b>' })
  })

  it('isTrackingOnly: true, false by default', () => {
    expect(isTrackingOnly(theme({ tracking_only: true }))).toBe(true)
    ;[false, 1, '1', 'true', 0, '', 'yes'].forEach((value) => expect(isTrackingOnly(theme({ tracking_only: value }))).toBe(false))
    expect(isTrackingOnly(theme({}))).toBe(false)
  })

  it('isFullWebsite: only full_website, never with tracking_only; ordering_only by default', () => {
    expect(isFullWebsite(theme({ experience: 'full_website' }))).toBe(true)
    expect(isFullWebsite(theme({ experience: 'ordering_only' }))).toBe(false)
    expect(isFullWebsite(theme({ experience: 'full_website', tracking_only: true }))).toBe(false)
    expect(isFullWebsite(theme({ experience: 'landing' }))).toBe(false)
    const unsaved = theme({})
    expect(siteSetting(unsaved, 'experience')).toBe('ordering_only')
    expect(isFullWebsite(unsaved)).toBe(false)
    expect(siteSetting(unsaved, 'main_store')).toBeNull()
  })

  it('menuPath: \'/order\' with a full website, else \'/\' (also with tracking_only)', () => {
    expect(menuPath(theme({ experience: 'ordering_only' }), {})).toBe('/')
    expect(menuPath(theme({}), {})).toBe('/')
    expect(menuPath(theme({ experience: 'full_website' }), {})).toBe('/order')
    expect(menuPath(theme({ experience: 'full_website', tracking_only: true }), {})).toBe('/')
  })

  it('smartBanner: a valid store id, the site\'s else the config\'s; \'\' otherwise', () => {
    // the site's overrides the config's, even when both are valid
    expect(smartBanner(theme({ smart_banner: { apple_id: '123456', android_id: 'com.mc' } }), { store_apple_id: '123459', store_android_id: 'com.other' }))
      .toEqual({ appleId: '123456', androidId: 'com.mc' })
    // no site id: falls back to a valid config id
    expect(smartBanner(theme({ smart_banner: { apple_id: '' } }), { store_apple_id: '123459', store_android_id: 'com.x' }))
      .toEqual({ appleId: '123459', androidId: 'com.x' })
    // config.json's "0" placeholder is never valid
    expect(smartBanner(theme({}), { store_apple_id: '0', store_android_id: '0' })).toEqual({ appleId: '', androidId: '' })
    // blank
    expect(smartBanner(theme({}), {})).toEqual({ appleId: '', androidId: '' })
    expect(smartBanner(theme({}), { store_apple_id: '  ', store_android_id: '  ' })).toEqual({ appleId: '', androidId: '' })
    // invalid shape, site or config: too short / no package-style dot
    expect(smartBanner(theme({ smart_banner: { apple_id: '12' } }), {})).toEqual({ appleId: '', androidId: '' })
    expect(smartBanner(theme({}), { store_apple_id: '12', store_android_id: 'nodotid' })).toEqual({ appleId: '', androidId: '' })
  })
})
