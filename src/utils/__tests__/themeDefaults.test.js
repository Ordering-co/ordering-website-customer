import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileRuntime, serializeRuntime } from '@orderingco/ordering-theme-engine'
import { SCHEMA, schemaDefault, schemaEntry, schemaKeys } from '../themeSchema'
import { THEME_DEFAULTS as defaults } from '../appTheme'

const ALIAS = /^\{[a-z_]+\.[a-z0-9_]+\}$/
const ROLE = /^\{(main|on|ink|subtle|pressed)\}$/

const strings = (node, path = '', out = []) => {
  if (typeof node === 'string') out.push([path, node])
  else if (node && typeof node === 'object') Object.entries(node).forEach(([key, value]) => strings(value, `${path}.${key}`, out))
  return out
}

describe('src/theme.compiled.json', () => {
  it('is what `pnpm theme:compile` makes of product.schema.json (run it after changing the schema)', () => {
    const schema = JSON.parse(readFileSync(resolve(__dirname, '../../../product.schema.json'), 'utf8'))
    const file = readFileSync(resolve(__dirname, '../../theme.compiled.json'), 'utf8')
    expect(file).toBe(serializeRuntime(compileRuntime(schema)))
  })

  it('carries the schema\'s product and version (what the web sends as product_type and theme_schema_version)', () => {
    const compiled = JSON.parse(readFileSync(resolve(__dirname, '../../theme.compiled.json'), 'utf8'))
    expect(compiled.product_type).toBe('marketplace_website')
    expect(compiled.product_type).toBe(SCHEMA.product_type)
    expect(compiled.version).toBe(SCHEMA.version)
  })
})

describe('the defaults (THEME_DEFAULTS)', () => {
  it('has every section of the schema the web reads, and modes empty as api-core serves it', () => {
    expect(Object.keys(defaults)).toEqual(['tokens', 'components', 'visibility', 'images', 'pages', 'modes', 'platforms', 'site'])
    expect(defaults.modes).toEqual({})
    expect(Object.keys(defaults.components).sort()).toEqual([...schemaKeys('components')].sort())
    expect(Object.keys(defaults.visibility)).toEqual(schemaKeys('visibility'))
    expect(Object.keys(defaults.images)).toEqual(schemaKeys('images'))
    Object.values(defaults.visibility).forEach((value) => expect(typeof value).toBe('boolean'))
    Object.values(defaults.images).forEach((value) => expect(typeof value).toBe('string'))
  })

  it('a visibility key\'s platform default (co.ordering.platforms) is served at platforms.<platform>.visibility, as api-core does', () => {
    expect(schemaEntry('visibility.business.header.logo').platforms).toEqual({ mobile_web: false })
    expect(defaults.visibility['business.header.logo']).toBe(true)
    expect(defaults.platforms.mobile_web.visibility['business.header.logo']).toBe(false)
    expect(defaults.visibility['home.hero.logo']).toBe(false)
    expect(defaults.platforms.mobile_web.visibility['home.hero.logo']).toBe(true)
    // only the keys that say one
    const declared = schemaKeys('visibility').filter((key) => schemaEntry(['visibility', key]).platforms?.mobile_web !== undefined)
    expect(Object.keys(defaults.platforms.mobile_web.visibility).sort()).toEqual(declared.sort())
  })

  it('resolves every alias of the components, and every role outside the button appearances (kept as the API serves them)', () => {
    const left = strings(defaults.components).concat(strings(defaults.platforms))
      .filter(([path, value]) => ALIAS.test(value) || (ROLE.test(value) && !path.startsWith('.button.appearances.')))
    expect(left).toEqual([])
  })

  it('gives each typography the family of its role', () => {
    expect(defaults.tokens.typography.h1.family).toBe(defaults.tokens.font.heading)
    expect(defaults.tokens.typography.body.family).toBe(defaults.tokens.font.body)
  })

  it('paints the button in every color and appearance', () => {
    const { button } = defaults.components
    schemaKeys('components.button.colors').forEach((color) => {
      expect(Object.keys(button.variants[color]).sort()).toEqual([...schemaKeys('components.button.appearances')].sort())
      expect(button.colors[color].ink).toBeTruthy()
      expect(button.colors[color].pressed).toMatch(/^#[0-9A-F]{6}$/)
    })
    expect(button.variants.primary.solid.background).toBe(defaults.tokens.color.primary)
  })

  it('applies the theme-wide rounding, shadow size and border width of the schema', () => {
    const border = { radius: schemaDefault('tokens.border_style.radius'), width: schemaDefault('tokens.border_style.width') }
    const shadow = { size: schemaDefault('tokens.shadow_style.size') }
    if (border.radius && !['none', 'full'].includes(border.radius)) {
      expect(defaults.components.modal.base.radius).toBe(defaults.tokens.radius[border.radius])
    }
    if (shadow.size) expect(defaults.components.card.base.shadow).toEqual(defaults.tokens.shadow[shadow.size])
    if (border.width === 'none') expect(defaults.components.card.base.border).toBeNull()
  })

  it('takes the defaults of the site settings', () => {
    expect(defaults.site.mode).toBe(schemaDefault('site.mode'))
    expect(defaults.site.third_party_code).toEqual({ head: '', body: '' })
  })
})
