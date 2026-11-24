import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  bootPickupRelease,
  isSingleStoreBusiness,
  isSingleStoreOwnPage,
  isSingleStorePathname,
  shortStorePath,
  showsCustomerAddress,
  singleBusinessHomePath,
  singleStoreCarts,
  singleStoreFavorites,
  singleStorePath,
  singleStoreSlug,
  storePickupApplies,
  unaddressedTypesFor
} from '../singleStore'
import { themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'

const siteTheme = (site) => themeWithValues((values) => { values.site = { ...values.site, ...site } })
const singleStoreTheme = (slug = 'mcbonalds') => siteTheme({ mode: 'single_store', business_slug: slug })

// isEntryStore and takeStorePickupStart read module-level state captured at
// import (ENTRY_PATHNAME, the pickup-start latch): each gets a fresh module
// instance, with the pathname set first.
const freshSingleStore = async (pathname) => {
  window.history.pushState({}, '', pathname)
  vi.resetModules()
  return import('../singleStore')
}

describe('singleStoreSlug', () => {
  it('the slug of a single_store site, or the config businessSlug; null when the site lists businesses', () => {
    expect(singleStoreSlug(singleStoreTheme(), {})).toBe('mcbonalds')
    expect(singleStoreSlug(siteTheme({}), { businessSlug: 'salami' })).toBe('salami')
    expect(singleStoreSlug(singleStoreTheme(), { businessSlug: 'salami' })).toBe('mcbonalds')
    // another site mode or a single store without a slug
    expect(singleStoreSlug(siteTheme({ mode: 'franchise', business_slug: 'x' }), {})).toBeNull()
    expect(singleStoreSlug(singleStoreTheme(''), {})).toBeNull()
    expect(singleStoreSlug(siteTheme({}), undefined)).toBeNull()
  })

  it('the v1 path of the site type is not read any more', () => {
    const v1 = themeWithValues((values) => ({ ...values, my_products: { components: { website_theme: { components: { type: 'single_store', business_slug: 'mcbonalds' } } } } }))
    expect(singleStoreSlug(v1, {})).toBeNull()
  })
})

describe('singleStorePath / isSingleStorePathname', () => {
  it('the store in the site business template (the default /store/:business_slug)', () => {
    expect(singleStorePath(undefined, 'mcbonalds')).toBe('/store/mcbonalds')
    expect(singleStorePath({ business_url_template: '/:business_slug' }, 'mcbonalds')).toBe('/mcbonalds')
    expect(singleStorePath({ business_url_template: 'store/:business_slug' }, 'mcbonalds')).toBe('/store/mcbonalds')
    expect(singleStorePath({ business_url_template: '/store?store=:business_slug' }, 'mcbonalds')).toBe('/store?store=mcbonalds')
  })

  it('full website: a store that would take the menu\'s address (/order, or /home that goes to it) goes to /store/<slug>', () => {
    const short = { business_url_template: '/:business_slug' }
    const fullWebsite = true
    expect(singleStorePath(short, 'order', { fullWebsite })).toBe('/store/order')
    expect(singleStorePath(short, 'home', { fullWebsite })).toBe('/store/home')
    expect(singleStorePath({ business_url_template: ':business_slug' }, 'order', { fullWebsite })).toBe('/store/order')
    expect(shortStorePath('order', { fullWebsite })).toBe('/store/order')
    // anything else keeps its address, and without a full website nothing changes
    expect(singleStorePath(short, 'orders', { fullWebsite })).toBe('/orders')
    expect(singleStorePath(undefined, 'order', { fullWebsite })).toBe('/store/order')
    expect(singleStorePath({ business_url_template: '/store?store=:business_slug' }, 'order', { fullWebsite })).toBe('/store?store=order')
    expect(singleStorePath(short, 'order')).toBe('/order')
    expect(singleStorePath(short, 'order', { fullWebsite: false })).toBe('/order')
    expect(shortStorePath('order')).toBe('/order')
  })

  it('where a single business site goes home: the template\'s address, the short one when it has a query, the kiosk or the marketplace', () => {
    const base = { slug: 'order', businessSlug: 'order', direct: true }
    const short = { business_url_template: '/:business_slug' }
    expect(singleBusinessHomePath({ ...base, site: short, fullWebsite: true })).toBe('/store/order')
    expect(singleBusinessHomePath({ ...base, site: { business_url_template: '/store?store=:business_slug' }, fullWebsite: true })).toBe('/store/order')
    expect(singleBusinessHomePath({ ...base, site: short, direct: false, fullWebsite: true })).toBe('/store/order')
    expect(singleBusinessHomePath({ ...base, site: short, fullWebsite: false })).toBe('/order')
    expect(singleBusinessHomePath({ ...base, slug: 'my-store', businessSlug: 'my-store', site: undefined, fullWebsite: true })).toBe('/store/my-store')
    expect(singleBusinessHomePath({ site: undefined, slug: null, businessSlug: 'marketplace', direct: false, fullWebsite: true })).toBe('/marketplace')
  })

  it('the store page at its template path or at the short /<slug>', () => {
    expect(isSingleStorePathname('/store/mcbonalds', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStorePathname('/mcbonalds', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStorePathname('/store', { business_url_template: '/store?store=:business_slug' }, 'mcbonalds')).toBe(true)
    expect(isSingleStorePathname('/search', undefined, 'mcbonalds')).toBe(false)
    expect(isSingleStorePathname('/store/salami', undefined, 'mcbonalds')).toBe(false)
    expect(isSingleStorePathname('/store/mcbonalds', undefined, null)).toBe(false)
  })
})

describe('isSingleStoreOwnPage', () => {
  it('the store\'s own page (its template root or the short /<slug>)', () => {
    expect(isSingleStoreOwnPage('/store/mcbonalds', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStoreOwnPage('/mcbonalds', undefined, 'mcbonalds')).toBe(true)
  })

  it('a deep link under it — category or product, templated or short (/store/:slug/:category/:product, /:slug/:category/:product, /:slug/:category)', () => {
    expect(isSingleStoreOwnPage('/store/mcbonalds/burgers/cheeseburger', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStoreOwnPage('/store/mcbonalds/burgers', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStoreOwnPage('/mcbonalds/burgers/cheeseburger', undefined, 'mcbonalds')).toBe(true)
    expect(isSingleStoreOwnPage('/mcbonalds/burgers', undefined, 'mcbonalds')).toBe(true)
  })

  it('another store\'s page, templated or short, is never this one\'s own', () => {
    expect(isSingleStoreOwnPage('/store/salami', undefined, 'mcbonalds')).toBe(false)
    expect(isSingleStoreOwnPage('/store/salami/burgers', undefined, 'mcbonalds')).toBe(false)
    expect(isSingleStoreOwnPage('/salami/burgers', undefined, 'mcbonalds')).toBe(false)
  })

  it('non-store pages (home, checkout, orders, profile, search…) are never the store\'s own', () => {
    ;['/', '/checkout/abc', '/orders/1', '/profile', '/search'].forEach(pathname => {
      expect(isSingleStoreOwnPage(pathname, undefined, 'mcbonalds')).toBe(false)
    })
  })

  it('without a slug or a pathname, false', () => {
    expect(isSingleStoreOwnPage('/store/mcbonalds', undefined, null)).toBe(false)
    expect(isSingleStoreOwnPage('', undefined, 'mcbonalds')).toBe(false)
  })

  it('a template with the slug in its query has no path to match under (same guard isEntryStore relies on)', () => {
    expect(isSingleStoreOwnPage('/store/salami', { business_url_template: '/store?store=:business_slug' }, 'mcbonalds')).toBe(false)
  })
})

describe('singleStoreCarts', () => {
  const carts = [
    { uuid: 'a', business: { slug: 'mcbonalds' } },
    { uuid: 'b', business: { slug: 'salami' } },
    { uuid: 'c', business_id: 41 }
  ]
  it('only the store\'s carts (by slug, or by the id a config may give); all without a single store', () => {
    expect(singleStoreCarts(carts, 'mcbonalds').map(c => c.uuid)).toEqual(['a'])
    expect(singleStoreCarts(carts, 41).map(c => c.uuid)).toEqual(['c'])
    expect(singleStoreCarts(carts, null)).toBe(carts)
    expect(singleStoreCarts(null, 'mcbonalds')).toBeNull()
  })
})

describe('singleStoreFavorites', () => {
  it('the store, its products (with only its offer) and its orders', () => {
    const businesses = [{ id: 41, slug: 'mcbonalds' }, { id: 37, slug: 'salami' }]
    expect(singleStoreFavorites(businesses, 'business', 'mcbonalds')).toEqual([businesses[0]])

    const products = [
      { id: 1, businesses: [{ id: 41, slug: 'mcbonalds' }, { id: 37, slug: 'salami' }] },
      { id: 2, businesses: [{ id: 37, slug: 'salami' }] },
      { id: 3 }
    ]
    expect(singleStoreFavorites(products, 'product', 'mcbonalds')).toEqual([
      { id: 1, businesses: [{ id: 41, slug: 'mcbonalds' }] }
    ])

    const orders = [{ id: 10, business: { id: 80, slug: 'pizzahut_local' } }, { id: 11, business: { id: 41, slug: 'mcbonalds' } }]
    expect(singleStoreFavorites(orders, 'order', 'mcbonalds').map(o => o.id)).toEqual([11])
  })

  it('without a single store, or for professionals, the list as it is', () => {
    const list = [{ id: 1 }]
    expect(singleStoreFavorites(list, 'business', null)).toBe(list)
    expect(singleStoreFavorites(list, 'professional', 'mcbonalds')).toBe(list)
    expect(singleStoreFavorites(undefined, 'business', 'mcbonalds')).toBeUndefined()
  })

  it('isSingleStoreBusiness matches by slug or id', () => {
    expect(isSingleStoreBusiness({ id: 41, slug: 'mcbonalds' }, 'mcbonalds')).toBe(true)
    expect(isSingleStoreBusiness({ id: 41 }, '41')).toBe(true)
    expect(isSingleStoreBusiness({ id: 37, slug: 'salami' }, 'mcbonalds')).toBe(false)
    expect(isSingleStoreBusiness(null, 'mcbonalds')).toBe(false)
  })
})

describe('full website: the store at /store/order when the menu owns /order', () => {
  const short = { business_url_template: '/:business_slug' }

  it('isSingleStorePathname / isSingleStoreOwnPage use the same resolution as singleStorePath', () => {
    const fullWebsite = true
    expect(isSingleStorePathname('/store/order', short, 'order', { fullWebsite })).toBe(true)
    expect(isSingleStorePathname('/order', short, 'order', { fullWebsite })).toBe(false)
    expect(isSingleStoreOwnPage('/store/order', short, 'order', { fullWebsite })).toBe(true)
    expect(isSingleStoreOwnPage('/store/order/burgers', short, 'order', { fullWebsite })).toBe(true)
    expect(isSingleStoreOwnPage('/order', short, 'order', { fullWebsite })).toBe(false)
    expect(isSingleStoreOwnPage('/order/burgers', short, 'order', { fullWebsite })).toBe(false)
  })

  it('ordering_only keeps /order as the store', () => {
    expect(isSingleStorePathname('/order', short, 'order')).toBe(true)
    expect(isSingleStorePathname('/store/order', short, 'order')).toBe(false)
    expect(isSingleStoreOwnPage('/order/burgers', short, 'order', { fullWebsite: false })).toBe(true)
  })

  it('isEntryStore follows it', async () => {
    const { isEntryStore } = await freshSingleStore('/store/order')
    expect(isEntryStore(short, 'order', { fullWebsite: true })).toBe(true)
    const menu = await freshSingleStore('/order')
    expect(menu.isEntryStore(short, 'order', { fullWebsite: true })).toBe(false)
    expect(menu.isEntryStore(short, 'order')).toBe(true)
  })
})

describe('isEntryStore', () => {
  afterEach(() => { window.history.pushState({}, '', '/') })

  it('the entry pathname is the store\'s own page', async () => {
    const { isEntryStore } = await freshSingleStore('/store/mcbonalds')
    expect(isEntryStore(undefined, 'mcbonalds')).toBe(true)
    expect(isEntryStore(undefined, 'salami')).toBe(false)
  })

  it('a page under the store (a product URL) is still its entry', async () => {
    const { isEntryStore } = await freshSingleStore('/store/mcbonalds/burgers/cheeseburger')
    expect(isEntryStore(undefined, 'mcbonalds')).toBe(true)
  })

  it('the short /<slug> entry, and its pages under it', async () => {
    const { isEntryStore } = await freshSingleStore('/mcbonalds/burgers')
    expect(isEntryStore({ business_url_template: '/:business_slug' }, 'mcbonalds')).toBe(true)
  })

  it('the marketplace home entry is not any store\'s', async () => {
    const { isEntryStore } = await freshSingleStore('/')
    expect(isEntryStore(undefined, 'mcbonalds')).toBe(false)
  })

  it('a template with the slug in its query does not match other stores\' pages by prefix', async () => {
    const { isEntryStore } = await freshSingleStore('/store/salami')
    expect(isEntryStore({ business_url_template: '/store?store=:business_slug' }, 'mcbonalds')).toBe(false)
  })

  it('without a slug, never an entry', async () => {
    const { isEntryStore } = await freshSingleStore('/store/mcbonalds')
    expect(isEntryStore(undefined, null)).toBe(false)
  })
})

describe('entryStoreSlug', () => {
  afterEach(() => { window.history.pushState({}, '', '/') })

  it('the business URL template path itself', async () => {
    const { entryStoreSlug } = await freshSingleStore('/store/mcbonalds')
    expect(entryStoreSlug(undefined)).toBe('mcbonalds')
  })

  it('a page under it (a product URL) still reads the store slug', async () => {
    const { entryStoreSlug } = await freshSingleStore('/store/mcbonalds/burgers/cheeseburger')
    expect(entryStoreSlug(undefined)).toBe('mcbonalds')
  })

  it('another store\'s entry page reads its own slug', async () => {
    const { entryStoreSlug } = await freshSingleStore('/store/salami')
    expect(entryStoreSlug(undefined)).toBe('salami')
  })

  it('a template that carries the slug in its query: null, no path position to read it from', async () => {
    const { entryStoreSlug } = await freshSingleStore('/store/salami')
    expect(entryStoreSlug({ business_url_template: '/store?store=:business_slug' })).toBeNull()
  })

  it('the marketplace home is not any store\'s entry', async () => {
    const { entryStoreSlug } = await freshSingleStore('/')
    expect(entryStoreSlug(undefined)).toBeNull()
  })

  it('a bare /:business_slug template never guesses (ambiguous with every other one-segment route)', async () => {
    const { entryStoreSlug } = await freshSingleStore('/mcbonalds')
    expect(entryStoreSlug({ business_url_template: '/:business_slug' })).toBeNull()
  })
})

describe('isGuestStore', () => {
  afterEach(() => { window.history.pushState({}, '', '/') })

  it('One store: true regardless of the entry page', async () => {
    const { isGuestStore } = await freshSingleStore('/')
    expect(isGuestStore({ singleStore: true, site: undefined, slug: 'mcbonalds' })).toBe(true)
  })

  it('entered directly on the store: true even without a single store site', async () => {
    const { isGuestStore } = await freshSingleStore('/store/mcbonalds')
    expect(isGuestStore({ singleStore: false, site: undefined, slug: 'mcbonalds' })).toBe(true)
  })

  it('another store, or entered from the marketplace home: false', async () => {
    const { isGuestStore } = await freshSingleStore('/store/salami')
    expect(isGuestStore({ singleStore: false, site: undefined, slug: 'mcbonalds' })).toBe(false)
    const home = await freshSingleStore('/')
    expect(home.isGuestStore({ singleStore: false, site: undefined, slug: 'mcbonalds' })).toBe(false)
  })
})

describe('takeStorePickupStart / storePickupStartTaken', () => {
  it('true the first time on the page load, false every time after', async () => {
    const { takeStorePickupStart } = await freshSingleStore('/')
    expect(takeStorePickupStart()).toBe(true)
    expect(takeStorePickupStart()).toBe(false)
    expect(takeStorePickupStart()).toBe(false)
  })

  it('storePickupStartTaken reads the latch without consuming it', async () => {
    const { takeStorePickupStart, storePickupStartTaken } = await freshSingleStore('/')
    expect(storePickupStartTaken()).toBe(false)
    expect(storePickupStartTaken()).toBe(false)
    takeStorePickupStart()
    expect(storePickupStartTaken()).toBe(true)
    expect(storePickupStartTaken()).toBe(true)
  })
})

describe('setStorePickupForcedFrom / takeStorePickupForcedFrom / storePickupForcedFromRecorded', () => {
  it('records the type and store once; null every other time', async () => {
    const { setStorePickupForcedFrom, takeStorePickupForcedFrom } = await freshSingleStore('/')
    expect(takeStorePickupForcedFrom()).toBeNull()
    setStorePickupForcedFrom(1, 'mcbonalds')
    expect(takeStorePickupForcedFrom()).toEqual({ type: 1, slug: 'mcbonalds' })
    expect(takeStorePickupForcedFrom()).toBeNull()
  })

  it('storePickupForcedFromRecorded reads it without consuming it', async () => {
    const { setStorePickupForcedFrom, takeStorePickupForcedFrom, storePickupForcedFromRecorded } = await freshSingleStore('/')
    expect(storePickupForcedFromRecorded()).toBe(false)
    setStorePickupForcedFrom(1, 'mcbonalds')
    expect(storePickupForcedFromRecorded()).toBe(true)
    expect(storePickupForcedFromRecorded()).toBe(true)
    takeStorePickupForcedFrom()
    expect(storePickupForcedFromRecorded()).toBe(false)
  })
})

describe('storePickupLanding', () => {
  it('true only while a forced-from record is waiting and the type has not landed yet', async () => {
    const { setStorePickupForcedFrom, storePickupLanding } = await freshSingleStore('/')
    expect(storePickupLanding(1)).toBe(false) // nothing recorded: never hangs a caller with no force in flight
    setStorePickupForcedFrom(1, 'mcbonalds')
    expect(storePickupLanding(1)).toBe(true) // recorded, type still the old one: keep waiting
    expect(storePickupLanding(2)).toBe(false) // recorded, but the type already landed: stop waiting
  })

  it('also false once the record is taken away (e.g. given up on rejection)', async () => {
    const { setStorePickupForcedFrom, takeStorePickupForcedFrom, storePickupLanding } = await freshSingleStore('/')
    setStorePickupForcedFrom(1, 'mcbonalds')
    takeStorePickupForcedFrom()
    expect(storePickupLanding(1)).toBe(false)
  })
})

describe('bootPickupRelease', () => {
  it('not landing: releases, nothing to give up on', () => {
    expect(bootPickupRelease({ landing: false, settled: false, timedOut: false })).toEqual({ release: true, giveUp: false })
  })

  it('landing, neither settled nor timed out: keeps waiting', () => {
    expect(bootPickupRelease({ landing: true, settled: false, timedOut: false })).toEqual({ release: false, giveUp: false })
  })

  it('landing but settled without the type ever arriving: releases and gives up', () => {
    expect(bootPickupRelease({ landing: true, settled: true, timedOut: false })).toEqual({ release: true, giveUp: true })
  })

  it('landing but timed out: releases and gives up even if it never settled', () => {
    expect(bootPickupRelease({ landing: true, settled: false, timedOut: true })).toEqual({ release: true, giveUp: true })
  })
})

describe('bootPickupStart', () => {
  const configTypes = [1, 2, 3]

  it('skips when it does not apply (not single/entry store, or the project disallows pickup)', async () => {
    const { bootPickupStart } = await freshSingleStore('/')
    expect(bootPickupStart({ singleStore: false, entry: false, configTypes, options: { type: 1 }, slug: 'mcbonalds' })).toEqual({ action: 'skip' })
    const other = await freshSingleStore('/')
    expect(other.bootPickupStart({ singleStore: true, entry: false, configTypes: [1, 3], options: { type: 1 }, slug: 'mcbonalds' })).toEqual({ action: 'skip' })
  })

  it('already pickup: takes the latch, nothing to force', async () => {
    const { bootPickupStart, storePickupStartTaken } = await freshSingleStore('/')
    expect(bootPickupStart({ singleStore: true, entry: false, configTypes, options: { type: 2 }, slug: 'mcbonalds' })).toEqual({ action: 'already' })
    expect(storePickupStartTaken()).toBe(true)
  })

  it('not pickup yet: takes the latch, records the type and store to restore, asks the caller to force it', async () => {
    const { bootPickupStart, takeStorePickupForcedFrom } = await freshSingleStore('/')
    expect(bootPickupStart({ singleStore: true, entry: false, configTypes, options: { type: 1 }, slug: 'mcbonalds' })).toEqual({ action: 'force', from: 1 })
    expect(takeStorePickupForcedFrom()).toEqual({ type: 1, slug: 'mcbonalds' })
  })

  it('the latch already taken (by another caller this page load): skips, never redecides', async () => {
    const { bootPickupStart, takeStorePickupStart } = await freshSingleStore('/')
    takeStorePickupStart()
    expect(bootPickupStart({ singleStore: true, entry: false, configTypes, options: { type: 1 }, slug: 'mcbonalds' })).toEqual({ action: 'skip' })
  })

  it.each([
    ['saved address ID', { address_id: 42 }, {}],
    ['guest address', { address: { location: { lat: 43, lng: -79 } } }, {}],
    ['populated cart', {}, { 'businessId:1': { products: [{ quantity: 1 }] } }]
  ])('keeps the restored order type with a %s and consumes the pickup latch', async (label, options, carts) => {
    const { bootPickupStart, storePickupStartTaken, takeStorePickupForcedFrom } = await freshSingleStore('/')
    expect(bootPickupStart({
      singleStore: true,
      configTypes,
      options: { type: 1, ...options },
      carts,
      slug: 'mcbonalds'
    })).toEqual({ action: 'skip' })
    expect(storePickupStartTaken()).toBe(true)
    expect(takeStorePickupForcedFrom()).toBeNull()
  })
})

describe('storePickupApplies', () => {
  const configTypes = [1, 2, 3]

  it('needs (singleStore or entry) and the project allowing pickup (2)', () => {
    expect(storePickupApplies({ singleStore: true, entry: false, configTypes, business: {} })).toBe(true)
    expect(storePickupApplies({ singleStore: false, entry: true, configTypes, business: {} })).toBe(true)
    expect(storePickupApplies({ singleStore: false, entry: false, configTypes, business: {} })).toBe(false)
    expect(storePickupApplies({ singleStore: true, entry: false, configTypes: [1, 3], business: {} })).toBe(false)
  })

  it('an explicit business.pickup === false disables it; anything else does not', () => {
    expect(storePickupApplies({ singleStore: true, entry: false, configTypes, business: { pickup: false } })).toBe(false)
    expect(storePickupApplies({ singleStore: true, entry: false, configTypes, business: {} })).toBe(true)
    expect(storePickupApplies({ singleStore: true, entry: false, configTypes, business: undefined })).toBe(true)
  })
})

describe('showsCustomerAddress', () => {
  it('only delivery (1) and catering delivery (7) show the customer address', () => {
    expect(showsCustomerAddress(1)).toBe(true)
    expect(showsCustomerAddress(7)).toBe(true)
    expect(showsCustomerAddress(2)).toBe(false)
    expect(showsCustomerAddress(3)).toBe(false)
    expect(showsCustomerAddress(8)).toBe(false)
  })

  it('an unknown or undefined type keeps showing it', () => {
    expect(showsCustomerAddress(undefined)).toBe(true)
    expect(showsCustomerAddress(null)).toBe(true)
  })
})

describe('unaddressedTypesFor', () => {
  it('every order type that never needs the customer address, regardless of orderState', () => {
    const types = unaddressedTypesFor({}, {})
    expect(types).toEqual(expect.arrayContaining([2, 3, 4, 5, 6, 8]))
    expect(types).not.toContain(1)
    expect(types).not.toContain(7)
  })

  it('plus the project\'s configured unaddressed types', () => {
    expect(unaddressedTypesFor({ unaddressed_order_types_allowed: { value: '1|3' } }, {})).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 8])
    )
  })

  it('does not duplicate a type already in both sets', () => {
    const types = unaddressedTypesFor({ unaddressed_order_types_allowed: { value: '1|2' } }, {})
    expect(types.filter(type => type === 2)).toEqual([2])
  })
})
