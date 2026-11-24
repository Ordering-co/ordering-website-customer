import { describe, expect, it } from 'vitest'
import {
  MODE_JSON_LD,
  franchiseJsonLd,
  jsonLdScriptTag,
  landingJsonLd,
  organizationJsonLd,
  restaurantJsonLd,
  websiteJsonLd
} from '../../../worker/structuredData.js'
import { business } from '../../pages/Landing/__tests__/landingFixtures.js'

const ORIGIN = 'https://tacos.example.com'
const lapse = (oh, om, ch, cm) => ({ open: { hour: oh, minute: om }, close: { hour: ch, minute: cm } })

// Index 0 = Sunday. Monday has two lapses and Sunday is closed.
const schedule = [
  { enabled: false, lapses: [] },
  { enabled: true, lapses: [lapse(7, 0, 11, 30), lapse(17, 5, 22, 0)] },
  { enabled: true, lapses: [lapse(7, 0, 21, 0)] },
  ...Array.from({ length: 4 }, () => ({ enabled: true, lapses: [lapse(9, 0, 21, 0)] }))
]

const fromTag = (data) => {
  const tag = jsonLdScriptTag(data)
  const match = /^<script type="application\/ld\+json">([\s\S]*)<\/script>$/.exec(tag)
  return JSON.parse(match[1])
}

const hasEmpty = (value) => {
  if (value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0 || value.some(hasEmpty)
  if (value && typeof value === 'object') return Object.values(value).some(hasEmpty)
  return false
}

describe('restaurantJsonLd', () => {
  const data = restaurantJsonLd({ business: { ...business, schedule }, origin: `${ORIGIN}/` })

  it('describes the fixture business as a Restaurant', () => {
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Casa Lupita',
      url: `${ORIGIN}/`,
      image: 'https://img.test/header.jpg',
      logo: 'https://img.test/logo.png',
      description: 'Street tacos and bold Mexican plates, made daily',
      telephone: '(281) 555-0142',
      address: { '@type': 'PostalAddress', streetAddress: '14277 Kuykendahl Rd, Tomball, TX 77375' },
      geo: { '@type': 'GeoCoordinates', latitude: 30.09, longitude: -95.62 },
      hasMenu: `${ORIGIN}/order`
    })
  })

  it('emits one specification per enabled day and lapse, skipping the closed Sunday', () => {
    const specs = data.openingHoursSpecification
    expect(specs).toHaveLength(7)
    expect(specs.some((spec) => spec.dayOfWeek.endsWith('Sunday'))).toBe(false)
    expect(specs.filter((spec) => spec.dayOfWeek === 'https://schema.org/Monday')).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Monday', opens: '07:00', closes: '11:30' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Monday', opens: '17:05', closes: '22:00' }
    ])
    expect(specs.at(-1)).toMatchObject({ dayOfWeek: 'https://schema.org/Saturday', opens: '09:00', closes: '21:00' })
  })

  it('includes the aggregate rating, rounded, and never individual reviews', () => {
    const rated = restaurantJsonLd({ business: { ...business, reviews: { total: 4.76, reviews_count: 212, reviews: [{ comment: 'x', user: { name: 'Laura' } }] } }, origin: ORIGIN })
    expect(rated.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.8, reviewCount: 212, bestRating: 5 })
    expect(JSON.stringify(rated)).not.toMatch(/Laura|"review"/)
  })

  it('falls back to the reviews list length for the count and omits the rating without data', () => {
    const counted = restaurantJsonLd({ business: { ...business, reviews: { total: 4, reviews: [{}, {}] } }, origin: ORIGIN })
    expect(counted.aggregateRating.reviewCount).toBe(2)
    for (const reviews of [{ total: 0, reviews_count: 5 }, { total: 4.5, reviews_count: 0 }, { total: 4.5, reviews: [] }, undefined]) {
      expect(restaurantJsonLd({ business: { ...business, reviews }, origin: ORIGIN })).not.toHaveProperty('aggregateRating')
    }
  })

  it('omits every key without a value', () => {
    const sparse = restaurantJsonLd({
      business: { name: 'Bare', description: '  ', about: '', header: null, logo: '', address: '', phone: '', location: { lat: null, lng: 'x' }, schedule: [], gallery: [] },
      origin: ORIGIN
    })
    expect(sparse).toEqual({ '@context': 'https://schema.org', '@type': 'Restaurant', name: 'Bare', url: `${ORIGIN}/`, hasMenu: `${ORIGIN}/order` })
    expect(hasEmpty(data)).toBe(false)
  })

  it('uses the logo as image, about as description and cellphone as telephone when the first choice is missing', () => {
    const fallback = restaurantJsonLd({ business: { ...business, header: null, description: '', phone: null, cellphone: '555-0100' }, origin: ORIGIN })
    expect(fallback).toMatchObject({ image: 'https://img.test/logo.png', telephone: '555-0100', description: 'Handmade corn tortillas and slow-cooked birria.\nCasual and welcoming.' })
  })

  it('discards images and profiles that are not absolute http(s) URLs', () => {
    const result = restaurantJsonLd({
      business: {
        ...business,
        header: '/relative/header.jpg',
        logo: 'data:image/png;base64,AAAA',
        facebook_profile: 'facebook.com/lupita',
        instagram_profile: 'https://instagram.com/lupita',
        tiktok_profile: 'javascript:alert(1)'
      },
      origin: ORIGIN
    })
    expect(result).not.toHaveProperty('image')
    expect(result).not.toHaveProperty('logo')
    expect(result.sameAs).toEqual(['https://instagram.com/lupita'])
  })

  it('honors a custom menu path and returns null without a name', () => {
    expect(restaurantJsonLd({ business, origin: ORIGIN, menuPath: '/menu' }).hasMenu).toBe(`${ORIGIN}/menu`)
    expect(restaurantJsonLd({ business: { ...business, name: '  ' }, origin: ORIGIN })).toBeNull()
    expect(restaurantJsonLd({})).toBeNull()
  })
})

describe('organizationJsonLd and websiteJsonLd', () => {
  it('build their node and return null without a name', () => {
    expect(organizationJsonLd({ name: 'Acme', origin: ORIGIN, logo: 'https://img.test/l.png', description: ' About ', sameAs: ['https://x.com/acme', '/nope'] })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Acme',
      url: `${ORIGIN}/`,
      logo: 'https://img.test/l.png',
      description: 'About',
      sameAs: ['https://x.com/acme']
    })
    expect(websiteJsonLd({ name: 'Acme', origin: ORIGIN })).toEqual({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Acme', url: `${ORIGIN}/` })
    expect(organizationJsonLd({ origin: ORIGIN })).toBeNull()
    expect(websiteJsonLd({ name: '' })).toBeNull()
  })
})

describe('franchiseJsonLd', () => {
  const branches = [
    { id: 1, name: 'Centro', slug: 'centro', address: 'Calle 1', location: { lat: 1.5, lng: -2.5 }, phone: '111', schedule, logo: 'https://img.test/c.png', header: null },
    { id: 2, name: 'Norte', slug: null, address: '', location: null, phone: null, schedule: null },
    { id: 3, name: '', slug: 'anon' }
  ]

  it('links each branch to the organization through @id', () => {
    const data = franchiseJsonLd({ name: 'Acme Tacos', origin: ORIGIN, logo: 'https://img.test/o.png', businesses: branches })
    const [organization, centro, norte, ...rest] = data['@graph']
    expect(data['@context']).toBe('https://schema.org')
    expect(organization).toMatchObject({ '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'Acme Tacos', logo: 'https://img.test/o.png' })
    expect(centro).toMatchObject({
      '@type': 'Restaurant',
      name: 'Centro',
      url: `${ORIGIN}/centro`,
      image: 'https://img.test/c.png',
      telephone: '111',
      geo: { latitude: 1.5, longitude: -2.5 },
      parentOrganization: { '@id': `${ORIGIN}/#organization` }
    })
    expect(centro.openingHoursSpecification).toHaveLength(7)
    expect(norte).toEqual({ '@type': 'Restaurant', name: 'Norte', parentOrganization: { '@id': `${ORIGIN}/#organization` } })
    expect(rest).toEqual([])
    expect(hasEmpty(data)).toBe(false)
  })

  it('keeps only the organization without named branches and caps branches at 50', () => {
    expect(franchiseJsonLd({ name: 'Acme', origin: ORIGIN, businesses: [] })['@graph']).toHaveLength(1)
    expect(franchiseJsonLd({ name: 'Acme', origin: ORIGIN })['@graph']).toHaveLength(1)
    const many = Array.from({ length: 60 }, (_, i) => ({ name: `B${i}`, slug: `b${i}` }))
    expect(franchiseJsonLd({ name: 'Acme', origin: ORIGIN, businesses: many })['@graph']).toHaveLength(51)
    expect(franchiseJsonLd({ origin: ORIGIN, businesses: many })).toBeNull()
  })
})

describe('landingJsonLd', () => {
  const site = { name: 'Casa Lupita', description: 'Tacos', logo: 'https://img.test/logo.png', origin: ORIGIN }

  it('dispatches single_store to the restaurant', () => {
    expect(landingJsonLd({ ...site, mode: 'single_store', business })).toEqual(restaurantJsonLd({ business, origin: ORIGIN }))
    expect(landingJsonLd({ ...site, mode: 'single_store' })).toBeNull()
  })

  it('dispatches franchise to an organization graph with the site name and logo', () => {
    const data = landingJsonLd({ ...site, mode: 'franchise', franchiseBusinesses: [{ name: 'Centro', slug: 'centro' }] })
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['Organization', 'Restaurant'])
    expect(data['@graph'][0]).toMatchObject({ name: 'Casa Lupita', logo: 'https://img.test/logo.png' })
  })

  it('dispatches marketplace to a WebSite and an Organization', () => {
    const data = landingJsonLd({ ...site, mode: 'marketplace' })
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['WebSite', 'Organization'])
    expect(data['@graph'].every((node) => !('@context' in node))).toBe(true)
    expect(landingJsonLd({ mode: 'marketplace', origin: ORIGIN })).toBeNull()
  })

  it('returns null for an unknown or inherited mode and exposes the extension point', () => {
    expect(landingJsonLd({ ...site, mode: 'kiosk', business })).toBeNull()
    expect(landingJsonLd({ ...site, mode: 'toString' })).toBeNull()
    expect(landingJsonLd()).toBeNull()
    expect(Object.keys(MODE_JSON_LD)).toEqual(['single_store', 'franchise', 'marketplace'])
  })
})

describe('jsonLdScriptTag', () => {
  it('returns an empty string without data', () => {
    expect(jsonLdScriptTag(null)).toBe('')
  })

  it('round-trips every builder as valid JSON', () => {
    const site = { name: 'Casa Lupita', origin: ORIGIN }
    for (const data of [
      restaurantJsonLd({ business: { ...business, schedule }, origin: ORIGIN }),
      organizationJsonLd(site),
      websiteJsonLd(site),
      franchiseJsonLd({ ...site, businesses: [{ name: 'Centro', slug: 'centro' }] }),
      landingJsonLd({ ...site, mode: 'marketplace' })
    ]) {
      expect(fromTag(data)).toEqual(data)
    }
  })

  it('cannot be broken out of with </script>, & or the U+2028/2029 separators', () => {
    const data = restaurantJsonLd({ business: { ...business, name: 'A</script><script>alert(1)</script> & B\u2028C\u2029D' }, origin: ORIGIN })
    const tag = jsonLdScriptTag(data)
    const inner = tag.slice('<script type="application/ld+json">'.length, -'</script>'.length)
    expect(inner).not.toMatch(/[<>&\u2028\u2029]/)
    expect(tag.match(/<\/script>/g)).toHaveLength(1)
    expect(fromTag(data).name).toBe('A</script><script>alert(1)</script> & B\u2028C\u2029D')
  })
})
