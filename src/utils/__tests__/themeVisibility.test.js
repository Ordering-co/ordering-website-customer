import { describe, expect, it } from 'vitest'
import { schemaEntry, schemaKeys } from '../themeSchema'
import { platformOfWidth, themeForPlatform, themeForWidth, themeHidden, themeVisible } from '../themeVisibility'
import { buildAppTheme } from '../appTheme'
import { envelope } from './fixtures/themeFixtures'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

// The defaults with `visibility` over their visibility
const theme = (visibility) => themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, ...visibility } }))

describe('themeVisible', () => {
  it('the theme decides with its boolean', () => {
    expect(themeVisible(theme({ footer: false }), 'footer')).toBe(false)
    expect(themeVisible(theme({ 'messages.quick_messages': true }), 'messages.quick_messages')).toBe(true)
  })

  it('without its own value: the schema default', () => {
    expect(themeVisible(theme({}), 'footer')).toBe(true)
    expect(themeVisible(theme({}), 'messages.quick_messages')).toBe(false)
    expect(themeVisible(theme({}), 'business.reviews.customer_comments')).toBe(false)
  })

  it('the total next to the Add button is shown by default', () => {
    expect(themeVisible(theme({}), 'product.add_price')).toBe(true)
    expect(themeHidden(theme({}), 'product.add_price')).toBe(false)
  })

  it('a key the schema does not know is shown', () => {
    expect(themeVisible(theme({}), 'no.such_key')).toBe(true)
  })
})

describe('the phone layer (platforms.mobile_web.visibility below 576px)', () => {
  // business.header.logo: shown, hidden on phones by default (its node's
  // co.ordering.platforms); home.hero.logo: the other way round
  const appTheme = (values) => buildAppTheme(undefined, envelope(values, { complete: false }))

  it('a key with a mobile_web default: its default below 576px, its own value from 576px', () => {
    const theme = appTheme({})
    expect(themeVisible(themeForWidth(theme, 375), 'business.header.logo')).toBe(false)
    expect(themeVisible(themeForWidth(theme, 575), 'business.header.logo')).toBe(false)
    expect(themeVisible(themeForWidth(theme, 576), 'business.header.logo')).toBe(true)
    expect(themeVisible(themeForWidth(theme, 1280), 'business.header.logo')).toBe(true)
    expect(themeVisible(themeForWidth(theme, 375), 'home.hero.logo')).toBe(true)
    expect(themeVisible(themeForWidth(theme, 1280), 'home.hero.logo')).toBe(false)
    // a key without one: the same on every screen
    expect(themeVisible(themeForWidth(theme, 375), 'footer')).toBe(true)
  })

  it('the theme\'s override on phones wins, and its value on wide screens stays there', () => {
    const theme = appTheme({
      visibility: { 'business.header.logo': false, footer: false },
      platforms: { mobile_web: { visibility: { 'business.header.logo': true } } }
    })
    expect(themeVisible(themeForWidth(theme, 375), 'business.header.logo')).toBe(true)
    expect(themeVisible(themeForWidth(theme, 1280), 'business.header.logo')).toBe(false)
    // a phone without its own value for the key follows the key
    expect(themeVisible(themeForWidth(theme, 375), 'footer')).toBe(false)
  })

  it('platformOfWidth and themeForPlatform', () => {
    expect(platformOfWidth(375)).toBe('mobile_web')
    expect(platformOfWidth(576)).toBeNull()
    expect(platformOfWidth(undefined)).toBeNull()
    const theme = { values: {} }
    // wide screens keep the very theme; the phone's is a copy, made once
    expect(themeForPlatform(theme, null)).toBe(theme)
    const phone = themeForPlatform(theme, 'mobile_web')
    expect(phone).toEqual({ values: {}, platform: 'mobile_web' })
    expect(themeForPlatform(phone, 'mobile_web')).toBe(phone)
    expect(themeForPlatform(phone, null).platform).toBeNull()
    expect(themeForPlatform(undefined, 'mobile_web')).toBeUndefined()
  })
})

describe('themeHidden', () => {
  it('the opposite of themeVisible', () => {
    expect(themeHidden(theme({ 'product.dummy_image': true }), 'product.dummy_image')).toBe(false)
    expect(themeHidden(theme({ 'product.dummy_image': false }), 'product.dummy_image')).toBe(true)
    expect(themeHidden(theme({}), 'messages.quick_messages')).toBe(true)
  })
})

describe('visibility in product.schema.json', () => {
  it('every key is a bool with a boolean default', () => {
    const keys = schemaKeys('visibility')
    expect(keys.length).toBeGreaterThan(0)
    keys.forEach((key) => {
      expect(key).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/)
      const entry = schemaEntry(['visibility', key])
      expect(entry.type, key).toBe('bool')
      expect(typeof entry.value, key).toBe('boolean')
    })
  })

  it('images: an image with a text default, its formats and hints', () => {
    const keys = schemaKeys('images')
    expect(keys.length).toBeGreaterThan(0)
    keys.forEach((key) => {
      const entry = schemaEntry(['images', key])
      expect(entry.type, key).toBe('image')
      expect(typeof entry.value, key).toBe('string')
      expect(entry.formats == null || Array.isArray(entry.formats), key).toBe(true)
      expect(entry.hints && typeof entry.hints, key).toBe('object')
    })
  })

  it('no v1 block', () => {
    expect(schemaKeys('')).not.toContain('v1')
  })
})
