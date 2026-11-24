import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { buildAppTheme, buildThemeValues, isThemeEnvelope, KEPT_WEIGHTS, THEME_DEFAULTS, themeFontLinks, themeFonts } from '../appTheme'
import { THEME_IMAGE_DEFAULTS } from '../bundledImages'
import { buildCompleteValues, buildLocalTheme, envelope } from './fixtures/themeFixtures'
import apiTheme from './fixtures/apiTheme.web45.json'

const local = buildLocalTheme()
const defaultsTheme = buildAppTheme(local, null)

const build = (remote) => {
  let theme
  expect(() => { theme = buildAppTheme(local, remote) }).not.toThrow()
  return theme
}

const withValues = (mutate) => {
  const values = buildCompleteValues()
  mutate(values)
  return envelope(values)
}

describe('buildAppTheme: the shape of the theme', () => {
  it('is only `values`, its CSS view (`css`) and `themeMeta`', () => {
    expect(Object.keys(defaultsTheme).sort()).toEqual(['css', 'themeMeta', 'values'])
    expect(Object.keys(build(apiTheme)).sort()).toEqual(['css', 'themeMeta', 'values'])
  })

  it('carries every section of the defaults', () => {
    expect(Object.keys(defaultsTheme.values).sort()).toEqual(Object.keys(THEME_DEFAULTS).sort())
  })

  it('exposes the envelope metadata', () => {
    expect(build(envelope(buildCompleteValues())).themeMeta).toEqual({
      productType: 'marketplace_website',
      schemaVersion: '26.0',
      preset: { id: 3, version: 2 },
      siteThemeId: 41,
      updatedAt: '2026-10-09 10:00:00'
    })
    expect(defaultsTheme.themeMeta).toEqual({ productType: null, schemaVersion: null, preset: null, siteThemeId: null, updatedAt: null })
  })

  it('works without arguments (src/index.js)', () => {
    const theme = buildAppTheme()
    expect(theme.values.tokens).toEqual(THEME_DEFAULTS.tokens)
    expect(theme.values.images.home_hero).toBe(THEME_IMAGE_DEFAULTS.home_hero)
  })
})

describe('buildAppTheme: without a v2 theme', () => {
  it.each([
    ['nothing', undefined],
    ['a v1 tree', { my_products: { components: {} }, general: { components: {} } }],
    ['another version', { version: 1, values: {} }],
    ['version 2 without values', { version: 2 }],
    ['values: null', { version: 2, values: null }],
    ['values: []', { version: 2, values: [] }],
    ['values as a string', { version: 2, values: 'oops' }]
  ])('%s gives the defaults', (_, remote) => {
    const theme = build(remote)
    expect(theme.values.tokens).toEqual(THEME_DEFAULTS.tokens)
    expect(theme.values.components).toEqual(THEME_DEFAULTS.components)
    expect(theme.themeMeta.siteThemeId).toBeNull()
  })

  it('isThemeEnvelope accepts only an envelope with values', () => {
    expect(isThemeEnvelope(apiTheme)).toBe(true)
    expect(isThemeEnvelope({ version: 2, values: [] })).toBe(false)
    expect(isThemeEnvelope({ my_products: {} })).toBe(false)
  })
})

describe('buildAppTheme: the remote values over the defaults', () => {
  it('takes what the theme sets and keeps the defaults for the rest', () => {
    const theme = build(envelope({ tokens: { color: { primary: '#FF5500' } }, visibility: { footer: false } }, { complete: false }))
    expect(theme.values.tokens.color.primary).toBe('#FF5500')
    expect(theme.values.tokens.color.background).toBe(THEME_DEFAULTS.tokens.color.background)
    expect(theme.values.visibility.footer).toBe(false)
    expect(theme.values.visibility.smart_app_banner).toBe(THEME_DEFAULTS.visibility.smart_app_banner)
    expect(theme.values.components).toEqual(THEME_DEFAULTS.components)
  })

  it('keeps the theme\'s own platforms.mobile_web.visibility over the defaults\' one', () => {
    expect(THEME_DEFAULTS.platforms.mobile_web.visibility['business.header.logo']).toBe(false)
    const theme = build(envelope({ platforms: { mobile_web: { visibility: { 'business.header.logo': true } } } }, { complete: false }))
    expect(theme.values.platforms.mobile_web.visibility['business.header.logo']).toBe(true)
    // the rest of the platform keeps the defaults
    expect(theme.values.platforms.mobile_web.visibility['home.hero.logo']).toBe(THEME_DEFAULTS.platforms.mobile_web.visibility['home.hero.logo'])
    expect(theme.values.platforms.mobile_web.components).toEqual(THEME_DEFAULTS.platforms.mobile_web.components)
    expect(build(envelope({}, { complete: false })).values.platforms.mobile_web.visibility['business.header.logo']).toBe(false)
  })

  it('a partial theme is merged as it comes: what follows a token keeps the default', () => {
    const theme = build(envelope({ tokens: { color: { primary: '#FF5500' } } }, { complete: false }))
    expect(theme.values.components.button.variants.primary.solid.background).toBe(THEME_DEFAULTS.components.button.variants.primary.solid.background)
  })

  it('reads the API answer: its values of the schema win, keys the defaults lack are dropped', () => {
    const theme = build(apiTheme)
    const known = (block, defaults) => Object.fromEntries(Object.entries(block).filter(([key]) => key in defaults))
    expect(theme.values.tokens.color).toEqual({ ...THEME_DEFAULTS.tokens.color, ...known(apiTheme.values.tokens.color, THEME_DEFAULTS.tokens.color) })
    expect(theme.values.tokens.color.accent).toBeUndefined()
    expect(theme.values.tokens.spacing).toBeUndefined()
    expect(theme.values.components.business_listing_hero).toBeUndefined()
    const variants = apiTheme.values.components.button.variants
    expect(theme.values.components.button.variants.accent).toBeUndefined()
    expect(theme.values.components.button.variants.primary).toMatchObject(variants.primary)
    expect(theme.values.visibility).toMatchObject(known(apiTheme.values.visibility, THEME_DEFAULTS.visibility))
  })

  it('takes the site settings of the theme', () => {
    const theme = build(withValues((v) => { v.site = { mode: 'single_store', business_slug: 'pizza' } }))
    expect(theme.values.site.mode).toBe('single_store')
    expect(theme.values.site.business_slug).toBe('pizza')
    expect(theme.values.site.third_party_code).toEqual(THEME_DEFAULTS.site.third_party_code)
  })

  it('keeps the shape of the defaults: a section of the wrong type is ignored', () => {
    const theme = build(withValues((v) => {
      v.tokens.color = 'red'
      v.components = []
      v.visibility = 'nope'
      v.pages.home = 3
    }))
    expect(theme.values.tokens.color).toEqual(THEME_DEFAULTS.tokens.color)
    expect(theme.values.components).toEqual(THEME_DEFAULTS.components)
    expect(theme.values.visibility).toEqual(THEME_DEFAULTS.visibility)
    expect(theme.values.pages.home).toEqual(THEME_DEFAULTS.pages.home)
  })

  it('null replaces a single value (no border, no shadow) but never a section', () => {
    const theme = build(withValues((v) => {
      v.components.card.base.shadow = null
      v.components.input.base.border = null
      v.tokens = null
      v.components.button = null
    }))
    expect(theme.values.components.card.base.shadow).toBeNull()
    expect(theme.values.components.input.base.border).toBeNull()
    expect(theme.values.tokens).toEqual(THEME_DEFAULTS.tokens)
    expect(theme.values.components.button).toEqual(THEME_DEFAULTS.components.button)
  })

  it('a component\'s own text style (custom, not a level of the scale) keeps no default family', () => {
    const theme = build(withValues((values) => {
      values.components.product_card.base.name = { size: 17, line: 1.29, weight: 500 }
      values.components.product_card.base.price = { size: 18, line: 1.33, weight: 700, family: 'inter' }
    }))
    expect(theme.values.components.product_card.base.name).toEqual({ size: 17, line: 1.29, weight: 500 })
    expect(theme.values.components.product_card.base.price).toEqual({ size: 18, line: 1.33, weight: 700, family: 'inter' })
    expect(defaultsTheme.values.components.product_card.base.name.family).toBe(THEME_DEFAULTS.components.product_card.base.name.family)
  })

  it('a list replaces a list ({} sets nothing)', () => {
    const sections = [{ key: THEME_DEFAULTS.pages.home.sections[0].key, visible: false }]
    const theme = build(envelope({ pages: { home: { sections } }, tokens: {} }))
    expect(theme.values.pages.home.sections).toEqual(sections)
    expect(theme.values.tokens).toEqual(THEME_DEFAULTS.tokens)
  })

  it('never changes the defaults', () => {
    const before = JSON.stringify(THEME_DEFAULTS)
    build(withValues((v) => { v.tokens.color.primary = '#000000' }))
    build(envelope({ images: { home_hero: 'https://cdn.test/hero.jpg' } }))
    build(null)
    buildAppTheme({ images: { home_hero: '/other.webp' } })
    expect(JSON.stringify(THEME_DEFAULTS)).toBe(before)
  })
})

describe('buildAppTheme: images', () => {
  it('an empty image is the local one, or the bundle\'s, or \'\'', () => {
    const theme = build(envelope({ images: { home_hero: '', 'empty.sessions': '  ' } }))
    expect(theme.values.images.home_hero).toBe(local.images.home_hero)
    expect(theme.values.images['signup.business_approved']).toBe(THEME_IMAGE_DEFAULTS['signup.business_approved'])
    expect(theme.values.images['empty.sessions']).toBe('')
    expect(theme.values.images.logotype).toBe('')
  })

  it('the URL of the theme always wins', () => {
    const theme = build(envelope({ images: { home_hero: 'https://cdn.test/hero.jpg', logotype: 'https://cdn.test/logo.png' } }))
    expect(theme.values.images.home_hero).toBe('https://cdn.test/hero.jpg')
    expect(theme.values.images.logotype).toBe('https://cdn.test/logo.png')
  })

  it('a value that is not a URL is empty', () => {
    const theme = build(envelope({ images: { home_hero: 123, logotype: null } }))
    expect(theme.values.images.home_hero).toBe(local.images.home_hero)
    expect(theme.values.images.logotype).toBe('')
  })

  it('has no bundled default for the logos, the favicon or map.store', () => {
    ;['logotype', 'isotype', 'logotype_inverse', 'isotype_inverse', 'favicon', 'map.store'].forEach((key) => {
      expect(THEME_IMAGE_DEFAULTS[key]).toBeUndefined()
    })
    Object.keys(THEME_IMAGE_DEFAULTS).forEach((key) => expect(key in THEME_DEFAULTS.images, key).toBe(true))
  })

  it('buildThemeValues fills every image key', () => {
    const values = buildThemeValues(null, {})
    expect(Object.keys(values.images)).toEqual(Object.keys(THEME_DEFAULTS.images))
  })
})

describe('themeFonts', () => {
  const href = (axis) => `https://fonts.googleapis.com/css2?family=${axis}&display=swap`
  const { tokens } = THEME_DEFAULTS
  // The fonts of the defaults with `mutate` applied to their values
  const fontsOf = (mutate) => themeFonts(buildAppTheme(local, withValues(mutate)))

  it('loads both roles with every weight the page paints with them', () => {
    const fonts = themeFonts(defaultsTheme)
    expect(fonts.body.name).toBe('Archivo')
    expect(fonts.heading.name).toBe('Montserrat')
    // The levels' weights, the component texts' and the ones CSS blocks keep.
    expect(fonts.body.weights).toEqual(expect.arrayContaining([tokens.typography.body.weight, tokens.typography.label.weight, ...KEPT_WEIGHTS.body]))
    expect(fonts.heading.weights).toEqual(expect.arrayContaining([tokens.typography.h1.weight, ...KEPT_WEIGHTS.heading]))
  })

  it('asks a variable family for one span (the default theme)', () => {
    const fonts = themeFonts(defaultsTheme)
    expect(fonts.body.href).toBe(href('Archivo:wght@300..800'))
    expect(fonts.heading.href).toBe(href('Montserrat:wght@100..800'))
  })

  it('matches the preloads of index.html', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8')
    const preloads = [...html.matchAll(/<link rel="preload" as="style" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
    const fonts = themeFonts(defaultsTheme)
    expect(preloads.sort()).toEqual([fonts.body.href, fonts.heading.href].sort())
  })

  it('is built once per theme', () => {
    expect(themeFonts(defaultsTheme)).toBe(themeFonts(defaultsTheme))
  })

  it('themeFontLinks: the links App.js appends (in themeFonts\' order), a stylesheet once when two roles share it', () => {
    const fonts = themeFonts(defaultsTheme)
    expect(themeFontLinks(defaultsTheme)).toEqual(Object.entries(fonts).map(([role, font]) => ({ id: `${role}-font-styles`, name: font.name, href: font.href })))
    expect(themeFontLinks(defaultsTheme)).toHaveLength(2)
    const shared = buildAppTheme(local, withValues((values) => { values.tokens.font = { heading: 'lato', body: 'lato' } }))
    expect(Object.values(themeFonts(shared)).map(({ href }) => href)[0]).toBe(Object.values(themeFonts(shared)).map(({ href }) => href)[1])
    expect(themeFontLinks(shared)).toHaveLength(1)
  })

  it('takes the weights of the component texts painted with the font', () => {
    const lato = fontsOf((values) => {
      values.tokens.font = { heading: 'lato', body: 'archivo' }
      values.tokens.typography.h1 = { ...values.tokens.typography.h1, weight: 400, family: 'lato' }
      // its own family; the font of its card's role (heading); another font
      values.components.banner.base.title = { size: 20, line: 1.3, weight: 900, family: 'lato' }
      values.components.product_card.base.font_role = 'heading'
      values.components.product_card.base.name = { size: 12, line: 1.33, weight: 100 }
      values.components.chip.base.text = { size: 12, line: 1.33, weight: 200, family: 'inter' }
    }).heading
    expect(lato.weights).toEqual(expect.arrayContaining([100, 900]))
    expect(lato.weights).not.toContain(200)
    // Lato is static: one weight per file, each listed.
    expect(lato.href).toBe(href(`Lato:wght@${lato.weights.join(';')}`))
  })

  it('asks only for weights the family has: the nearest of each weight', () => {
    // Lato has 100 300 400 700 900: a label of 600 asks for 700, not a 600 Google does not serve.
    const lato = fontsOf((values) => { values.tokens.font = { heading: 'montserrat', body: 'lato' } }).body
    // The kept 500 → 400, 600 → 700, 800 → 900 (a tie from 600 up: the heavier).
    expect(lato.weights).toEqual([300, 400, 700, 900])
    expect(lato.weights).not.toContain(600)
    expect(lato.href).toBe(href('Lato:wght@300;400;700;900'))
    // Open Sans (300–800) has no 900; Playfair Display (400–900) has no 300.
    expect(fontsOf((values) => {
      values.tokens.font.body = 'open_sans'
      values.tokens.typography.body = { ...values.tokens.typography.body, weight: 900, family: 'open_sans' }
    }).body.href).toBe(href('Open+Sans:wght@300..800'))
    expect(fontsOf((values) => {
      values.tokens.font.heading = 'playfair_display'
      values.tokens.typography.h1 = { ...values.tokens.typography.h1, weight: 300, family: 'playfair_display' }
    }).heading.href).toBe(href('Playfair+Display:wght@400..800'))
  })

  it('gives one href with every weight when both roles share the family', () => {
    const fonts = fontsOf((values) => {
      values.tokens.font = { heading: 'montserrat', body: 'montserrat' }
      values.tokens.typography.h1 = { ...values.tokens.typography.h1, weight: 900 }
    })
    expect(fonts.body.href).toBe(fonts.heading.href)
    expect(fonts.body.weights).toEqual([100, 300, 400, 500, 600, 700, 800, 900])
    expect(fonts.body.href).toBe(href('Montserrat:wght@100..900'))
  })
})
