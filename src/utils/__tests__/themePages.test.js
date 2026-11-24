import { describe, expect, it } from 'vitest'
import { schemaEntry, schemaKeys } from '../themeSchema'
import { FULL_WEBSITE_ROUTES, PAGE_ROUTES, isPageSectionVisible, pageFooterVisible, pageForPath, pageSections } from '../themePages'

const DEMO_SECTIONS = [
  { key: 'hero', visible: true, hideable: true, group: null },
  { key: 'a', visible: true, hideable: true, group: 'main' },
  { key: 'pay', visible: true, hideable: false, group: null },
  { key: 'b', visible: true, hideable: true, group: 'main' },
  { key: 'c', visible: false, hideable: true, group: 'main' },
  { key: 'side', visible: true, hideable: true, group: 'aside' },
  { key: 'near', visible: false, hideable: true, group: null }
]

// The demo page in both formats of the schema.
const SCHEMAS = {
  tuples: { pages: { demo: { footer: ['bool', null], sections: ['sections', DEMO_SECTIONS] } } },
  nodes: {
    pages: {
      demo: {
        footer: { $type: 'boolean', $value: null },
        sections: { $type: 'sections', $value: DEMO_SECTIONS }
      }
    }
  }
}

const pagesTheme = (pages, mobilePages) => ({
  values: { pages, platforms: { mobile_web: { pages: mobilePages || {} } } }
})

const keys = (sections) => sections.map((section) => section.key)
const visibleKeys = (sections) => sections.filter((section) => section.visible).map((section) => section.key)

describe.each(Object.entries(SCHEMAS))('pageSections (schema in %s)', (_format, SCHEMA) => {
  it('no page value: the default order and visibility of the schema', () => {
    const sections = pageSections(pagesTheme({}), 'demo', { schema: SCHEMA })
    expect(keys(sections)).toEqual(['hero', 'a', 'pay', 'b', 'c', 'side', 'near'])
    expect(visibleKeys(sections)).toEqual(['hero', 'a', 'pay', 'b', 'side'])
  })

  it('a group reorders inside its own slots; fixed sections stay in place', () => {
    const theme = pagesTheme({ demo: { sections: [{ key: 'c', visible: true }, { key: 'side', visible: true }, { key: 'pay', visible: true }, { key: 'b', visible: true }, { key: 'a', visible: true }, { key: 'hero', visible: true }] } })
    expect(keys(pageSections(theme, 'demo', { schema: SCHEMA }))).toEqual(['hero', 'c', 'pay', 'b', 'a', 'side', 'near'])
  })

  it('hides what the theme hides, never a section that is not hideable', () => {
    const theme = pagesTheme({ demo: { sections: [{ key: 'hero', visible: false }, { key: 'pay', visible: false }, { key: 'c', visible: true }] } })
    expect(visibleKeys(pageSections(theme, 'demo', { schema: SCHEMA }))).toEqual(['a', 'pay', 'b', 'c', 'side'])
  })

  it('unknown and repeated keys are dropped (the first one counts); missing keys keep their default place', () => {
    const theme = pagesTheme({ demo: { sections: [{ key: 'zzz', visible: false }, { key: 'b', visible: true }, { key: 'b', visible: false }] } })
    expect(keys(pageSections(theme, 'demo', { schema: SCHEMA }))).toEqual(['hero', 'a', 'pay', 'b', 'c', 'side', 'near'])
    expect(isPageSectionVisible(theme, 'demo', 'b', { schema: SCHEMA })).toBe(true)
  })

  it('mobile_web: its sections and footer replace the base below the breakpoint', () => {
    const theme = pagesTheme(
      { demo: { footer: true, sections: [{ key: 'a', visible: true }] } },
      { demo: { footer: false, sections: [{ key: 'b', visible: true }, { key: 'a', visible: false }] } }
    )
    expect(visibleKeys(pageSections(theme, 'demo', { schema: SCHEMA, mobile: true }))).toEqual(['hero', 'b', 'pay', 'side'])
    expect(visibleKeys(pageSections(theme, 'demo', { schema: SCHEMA }))).toEqual(['hero', 'a', 'pay', 'b', 'side'])
    expect(pageFooterVisible(theme, 'demo', { mobile: true })).toBe(false)
    expect(pageFooterVisible(theme, 'demo')).toBe(true)
  })

  it('a theme without pages: the schema defaults, whatever v1 paths it carries', () => {
    const v1 = { demo_view: { components: { c: { hidden: false }, near: { hidden: false } } } }
    expect(visibleKeys(pageSections(v1, 'demo', { schema: SCHEMA }))).toEqual(['hero', 'a', 'pay', 'b', 'side'])
    expect(visibleKeys(pageSections(undefined, 'demo', { schema: SCHEMA }))).toEqual(['hero', 'a', 'pay', 'b', 'side'])
    expect(pageFooterVisible({}, 'demo')).toBeNull()
  })

  it('the business page: order_it_again and near_business hidden by default (their default)', () => {
    const shown = (theme, page, key) => isPageSectionVisible(theme, page, key)
    expect(shown({}, 'business', 'order_it_again')).toBe(false)
    expect(shown({}, 'business', 'near_business')).toBe(false)
    expect(shown(pagesTheme({ business: { sections: [{ key: 'order_it_again', visible: true }] } }), 'business', 'order_it_again')).toBe(true)
    ;['search', 'filters', 'highest_rated'].forEach((key) => expect(shown({}, 'business_listing', key)).toBe(true))
    ;['business', 'customer', 'address'].forEach((key) => expect(shown({}, 'checkout', key)).toBe(true))
    expect(shown({}, 'home', 'login_account')).toBe(true)
    expect(shown({}, 'order_details', 'map')).toBe(true)
  })

  it('isPageSectionVisible: unknown pages and sections are visible', () => {
    expect(isPageSectionVisible(pagesTheme({}), 'nope', 'x', { schema: SCHEMA })).toBe(true)
    expect(isPageSectionVisible(pagesTheme({}), 'demo', 'c', { schema: SCHEMA })).toBe(false)
  })

  it('footer: null follows visibility.footer', () => {
    expect(pageFooterVisible(pagesTheme({ demo: { footer: null } }), 'demo')).toBeNull()
  })
})

describe('pages in product.schema.json', () => {
  const pages = schemaKeys('pages')

  it('every page: footer bool|null and a list of unique sections with valid fields', () => {
    expect(pages.length).toBeGreaterThan(0)
    pages.forEach((page) => {
      expect(schemaKeys(['pages', page])).toEqual(['footer', 'sections'])
      expect(schemaEntry(['pages', page, 'footer'])).toMatchObject({ type: 'bool', value: null })
      const sections = schemaEntry(['pages', page, 'sections'])
      expect(sections.type).toBe('sections')
      const list = sections.value
      expect(new Set(list.map((s) => s.key)).size).toBe(list.length)
      list.forEach((section) => {
        expect(section.key).toMatch(/^[a-z][a-z0-9_]*$/)
        expect(typeof section.visible).toBe('boolean')
        expect(typeof section.hideable).toBe('boolean')
        expect(section.group === null || /^[a-z][a-z0-9_]*$/.test(section.group)).toBe(true)
        if (!section.hideable) expect(section.visible).toBe(true)
        expect(Object.keys(section).sort()).toEqual(['group', 'hideable', 'key', 'visible'])
      })
    })
  })

  it('landing (Full Website): a theme without it gets the contract\'s sections and order, the hero fixed', () => {
    const sections = pageSections({}, 'landing')
    expect(keys(sections)).toEqual([
      'hero', 'featured', 'locations', 'about', 'services', 'gallery', 'reviews', 'visit',
      'categories', 'popular_stores', 'how_it_works', 'app', 'partner'
    ])
    expect(visibleKeys(sections)).toEqual(keys(sections))
    const hideable = schemaEntry(['pages', 'landing', 'sections']).value.filter((section) => section.hideable).map((section) => section.key)
    expect(hideable).toEqual(keys(sections).slice(1))
    const hidden = pagesTheme({ landing: { sections: [{ key: 'hero', visible: false }, { key: 'about', visible: false }] } })
    expect(visibleKeys(pageSections(hidden, 'landing'))).not.toContain('about')
    expect(visibleKeys(pageSections(hidden, 'landing'))).toContain('hero')
  })

  it('a group has at least two sections (one alone cannot move)', () => {
    pages.forEach((page) => {
      const counts = {}
      schemaEntry(['pages', page, 'sections']).value.forEach((s) => { if (s.group) counts[s.group] = (counts[s.group] || 0) + 1 })
      Object.values(counts).forEach((count) => expect(count).toBeGreaterThan(1))
    })
  })
})

describe('pageForPath', () => {
  it('maps the routes of App.js to their page', () => {
    expect(pageForPath('/')).toBe('home')
    expect(pageForPath('/home')).toBe('home')
    expect(pageForPath('/search')).toBe('business_listing')
    expect(pageForPath('/checkout/abc')).toBe('checkout')
    expect(pageForPath('/checkout')).toBe('checkout')
    expect(pageForPath('/profile/orders')).toBe('orders')
    expect(pageForPath('/pages/terms')).toBe('cms_page')
    expect(pageForPath('/orders/12')).toBe('order_details')
    expect(pageForPath('/my-store')).toBe('business')
    expect(pageForPath('/my-store/pizzas')).toBe('business')
    expect(pageForPath('/my-store/pizzas/margherita')).toBe('business')
    expect(pageForPath('/a/b/c/d')).toBe('not_found')
  })

  it('with a full website, \'/\' is the landing and \'/order\' and \'/home\' the menu; the rest is as before', () => {
    const full = { fullWebsite: true }
    expect(pageForPath('/', full)).toBe('landing')
    expect(pageForPath('/order', full)).toBe('home')
    expect(pageForPath('/home', full)).toBe('home')
    expect(pageForPath('/search', full)).toBe('business_listing')
    expect(pageForPath('/my-store', full)).toBe('business')
    expect(pageForPath('/a/b/c/d', full)).toBe('not_found')
  })

  it('without a full website, \'/order\' is a business slug and there is no landing', () => {
    expect(pageForPath('/order')).toBe('business')
    expect(pageForPath('/order', { fullWebsite: false })).toBe('business')
    expect(pageForPath('/', { fullWebsite: false })).toBe('home')
  })

  it('every page of PAGE_ROUTES, FULL_WEBSITE_ROUTES and not_found is in the schema, and every schema page has a route', () => {
    const routed = [...new Set(PAGE_ROUTES.concat(FULL_WEBSITE_ROUTES).map(([page]) => page).concat('not_found'))]
    expect(routed.sort()).toEqual([...schemaKeys('pages')].sort())
  })
})
