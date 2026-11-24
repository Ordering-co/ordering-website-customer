import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import { getDateTimeFormats } from '~components/utils/configHelpers'
import { api, business, franchiseStores } from '../../__tests__/landingFixtures'
import { statusLine } from '../../sections/Locations/status'
import { renderLanding } from '../render'

// src/setupTests.js mocks the contexts and a few hooks for the component tests; the server render
// runs on the real ones (it provides them itself).
vi.unmock('~components/contexts/LanguageContext')
vi.unmock('~components/contexts/ConfigContext')
vi.unmock('~components/contexts/SessionContext')
vi.unmock('~components/contexts/ApiContext')
vi.unmock('~components/contexts/OrderContext')
vi.unmock('~components/contexts/UtilsContext')
vi.unmock('~components/contexts/SiteContext')
vi.unmock('~components/contexts/EventContext')
vi.unmock('~ui/hooks/useWindowSize')
vi.unmock('swiper/react')
vi.unmock('~ui/utils')
vi.unmock('react-loading-skeleton')
vi.unmock('~ui-icon')

const envelope = (values) => ({ version: 2, complete: false, product_type: 'marketplace_website', schema_version: '26.0', preset: null, site_theme_id: 41, updated_at: '2026-10-09 10:00:00', values })
const fullWebsiteEnvelope = (mode = 'single_store') => envelope({ site: { experience: 'full_website', mode, business_slug: 'casa-lupita', name: 'Casa Lupita' } })

const landing = {
  business,
  featured: [{ id: 1, name: 'Birria Tacos', price: 14.99, image: 'https://img.test/p1.jpg', slug: 'birria', category_id: 3 }],
  services: { delivery: { enabled: true, time: 30 }, pickup: { enabled: true, time: 15 }, eatin: { enabled: false } },
  reviews: { average: 4.8, count: 212, recent: [{ id: 1, author: 'Laura S.', comment: 'Handmade tortillas and great salsa.', rating: 5, createdAt: '2026-11-01 10:00:00' }] }
}
const args = { envelope: fullWebsiteEnvelope(), landing, api, store: 'casa-lupita' }

describe('renderLanding (server render of the landing)', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

  it('a one-store site with the store\'s data: the real sections with its text, one h1', () => {
    const { html } = renderLanding(args)
    expect(html).toContain('Casa Lupita')
    expect(html).toContain('Handmade corn tortillas')
    expect(html).toContain('Birria Tacos')
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  })

  it('the CSS is plain: styled-components\' own markers would be adopted (and removed) by the client\'s sheet', () => {
    const { css } = renderLanding(args)
    expect(css.length).toBeGreaterThan(100)
    expect(css).not.toMatch(/data-styled|<style|\/\*!sc\*\//)
  })

  it('a price follows the project\'s configs (parsePrice of the real UtilsProviders)', () => {
    const configs = { format_number_currency: { value: '€' }, currency_position: { value: 'right' }, format_number_decimal_separator: { value: ',' } }
    expect(renderLanding({ ...args, configs }).html).toContain('14,99 €')
  })

  it('the translations: the dictionary\'s text replaces the fallback', () => {
    expect(renderLanding(args).html).toContain('>Featured<')
    // the app's prefix first (WEBSITE_), then the bare key, as the client's t does
    expect(renderLanding({ ...args, dictionary: { WEBSITE_LANDING_FEATURED: 'Destacados' } }).html).toContain('>Destacados<')
    expect(renderLanding({ ...args, dictionary: { LANDING_FEATURED: 'Platos' } }).html).toContain('>Platos<')
  })

  it('without the store\'s data the sections paint their loading state and nothing is requested', () => {
    global.fetch = vi.fn()
    const { html } = renderLanding({ ...args, landing: null })
    expect(html).not.toContain('Birria Tacos')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('a render leaves nothing for the next one: another site\'s data does not leak', () => {
    renderLanding(args)
    const { html } = renderLanding({ ...args, landing: null })
    expect(html).not.toContain('Birria Tacos')
    expect(html).not.toContain('Handmade corn tortillas')
  })

  it('a marketplace paints its own sections, without asking for any store', () => {
    global.fetch = vi.fn()
    const { html } = renderLanding({ envelope: fullWebsiteEnvelope('marketplace'), landing: null, api, store: null })
    expect(html).toContain('<main')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('mobile: the phone\'s width is lent to the render and given back', () => {
    const before = window.innerWidth
    renderLanding({ ...args, mobile: true })
    expect(window.innerWidth).toBe(before)
  })

  it('the theme\'s own: a hidden section paints nothing', () => {
    const hidden = envelope({ site: { experience: 'full_website', mode: 'single_store', business_slug: 'casa-lupita' }, pages: { landing: { footer: null, sections: [{ key: 'featured', visible: false }] } } })
    expect(renderLanding({ ...args, envelope: hidden }).html).not.toContain('Birria Tacos')
  })

  it('the theme\'s font links come with the render: one per stylesheet, the ids App.js uses', () => {
    const { fonts } = renderLanding(args)
    expect(fonts.length).toBeGreaterThan(0)
    fonts.forEach(({ id, href }) => {
      expect(id).toMatch(/-font-styles$/)
      expect(href).toMatch(/^https:\/\/fonts\.googleapis\.com\//)
    })
    expect(new Set(fonts.map(({ href }) => href)).size).toBe(fonts.length)
  })

  it('the hours: the store\'s own zone and clock, as a visitor there sees them (no UTC), with the translated AM/PM', () => {
    const configs = { dates_general_format: { value: 'DD-MM-YYYY hh:mma' } }
    const hours = (extra) => renderLanding({ ...args, configs, ...extra }).html.match(/<dd>([^<]*)<\/dd>/)?.[1]
    expect(hours()).toBe('07:00AM - 09:00PM')
    expect(hours({ dictionary: { PM: 'p. m.', AM: 'a. m.' } })).toBe('07:00a. m. - 09:00p. m.')
    // a store in another zone than the server's reads in its own, wherever the server is
    const tokyo = { ...landing, business: { ...business, timezone: 'Asia/Tokyo' } }
    expect(hours({ landing: tokyo })).toBe('07:00AM - 09:00PM')
    // nothing is left behind: the next client-side format is dayjs's own again
    expect(dayjs('2026-01-01T15:00:00').format('hh:mma')).toBe('03:00pm')
  })
})

describe('renderLanding of a franchise', () => {
  const franchiseEnvelope = (site) => envelope({ site: { experience: 'full_website', mode: 'franchise', franchise_id: 7, main_store: 5, name: 'Lupita Group', ...site } })
  const franchise = { ...landing, business: { ...business, gallery: [{ id: 1, file: 'https://img.test/g1.jpg' }] }, franchiseStores }
  const franchiseArgs = { envelope: franchiseEnvelope(), landing: franchise, api, configs: { dates_general_format: { value: 'YYYY-MM-DD HH:mm' } } }
  // 18:00 UTC: 12:00 in Houston (open, until 21:00), 03:00 the next day in Tokyo (closed, opens at 07:00); 24 h, so the translated AM/PM is not in the way
  const NOW = new Date('2026-11-18T18:00:00Z')

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('the main store\'s sections and the locations, from the seed: nothing is requested, one h1', () => {
    global.fetch = vi.fn()
    const { html } = renderLanding(franchiseArgs)
    // hero, featured, about, gallery and reviews: the main store's (id 5)
    expect(html).toContain('Casa Lupita')
    expect(html).toContain('Birria Tacos')
    expect(html).toContain('Handmade corn tortillas')
    expect(html).toContain('https://img.test/g1.jpg')
    expect(html).toContain('Handmade tortillas and great salsa.')
    // locations: a card per store with its address, and a status line only for those with a schedule
    franchiseStores.forEach((store) => {
      expect(html).toContain(`>${store.name}<`)
      expect(html).toContain(store.address)
    })
    expect(html).toContain('Our locations')
    expect(html.match(/(Open|Closed) · /g)).toHaveLength(2)
    expect(html).toContain('Open · until 21:00')
    expect(html).toContain('Closed · opens 07:00 GMT+9')
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('a main store whose data is not the one the client resolves is not seeded (the hero keeps its loading state); the stores still paint', () => {
    const { html } = renderLanding({ ...franchiseArgs, landing: { ...franchise, business: { ...business, id: 99 } } })
    expect(html).not.toContain('Birria Tacos')
    expect(html).not.toContain('Handmade corn tortillas')
    expect(html).toContain('>Downtown<')
    expect(html).toContain('>Katy<')
  })

  it('the main store the site names wins; without one (or one that is not in the list) the first store is the main', () => {
    const first = { ...franchise, business: { ...business, id: 2, name: 'Downtown Main', about: 'Downtown story', gallery: [] } }
    expect(renderLanding({ ...franchiseArgs, envelope: franchiseEnvelope({ main_store: null }), landing: first }).html).toContain('Downtown story')
    expect(renderLanding({ ...franchiseArgs, envelope: franchiseEnvelope({ main_store: 404 }), landing: first }).html).toContain('Downtown story')
    expect(renderLanding({ ...franchiseArgs, landing: first }).html).not.toContain('Downtown story')
  })

  it('the statuses read as the client prints them: the visitor\'s zone, the stores\' own clocks', () => {
    // the client's statusLine reads the browser's zone; the server is told the same one
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const timeFormat = getDateTimeFormats('YYYY-MM-DD HH:mm').timeFormat
    const client = franchiseStores.map((store) => statusLine(store, { now: Date.now(), timeFormat, t: (_key, fallback) => fallback })?.text).filter(Boolean)
    expect(client).toHaveLength(2)
    const { html } = renderLanding({ ...franchiseArgs, visitorZone: zone })
    const text = html.replace(/<[^>]*>/g, '|')
    client.forEach((status) => expect(text).toContain(`|${status}|`))
  })

  it('a visitor in another zone sees the zone of a store that is not theirs, and only of that one', () => {
    const text = (visitorZone) => renderLanding({ ...franchiseArgs, visitorZone }).html.replace(/<[^>]*>/g, '|')
    const inTokyo = text('Asia/Tokyo')
    expect(inTokyo).toMatch(/\|Open · until 21:00 \S+\|/)
    expect(inTokyo).toMatch(/\|Closed · opens 07:00\|/)
    const inHouston = text('America/Chicago')
    expect(inHouston).toMatch(/\|Open · until 21:00\|/)
    expect(inHouston).toMatch(/\|Closed · opens 07:00 \S+\|/)
  })

  it('without the visitor\'s zone the main store\'s is assumed', () => {
    const text = (extra) => renderLanding({ ...franchiseArgs, ...extra }).html.replace(/<[^>]*>/g, '|')
    expect(text({ visitorZone: undefined })).toBe(text({ visitorZone: 'America/Chicago' }))
  })

  it('an unknown zone is read as getValidTimezone does: the device\'s, not the store\'s', () => {
    const text = (visitorZone) => renderLanding({ ...franchiseArgs, visitorZone }).html.replace(/<[^>]*>/g, '|')
    expect(text('Not/AZone')).toBe(text(Intl.DateTimeFormat().resolvedOptions().timeZone))
  })

  it('a main store that could not be read and no visitor zone: the first store\'s zone, not the process\'s (no label on a store in it)', () => {
    const { html } = renderLanding({ ...franchiseArgs, landing: { ...franchise, business: null } })
    const text = html.replace(/<[^>]*>/g, '|')
    // Downtown (Chicago, the first store) reads with no zone label; Katy (Tokyo) gets its own
    expect(text).toMatch(/\|Open · until 21:00\|/)
    expect(text).toMatch(/\|Closed · opens 07:00 \S+\|/)
  })
})

// The Worker has no `window` (and no location): the render lends one, for a phone and for a desktop.
describe('renderLanding without a window (the Worker)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('window', undefined)
  })
  afterEach(() => vi.unstubAllGlobals())

  const marketplace = (extra) => renderLanding({ envelope: fullWebsiteEnvelope('marketplace'), landing: null, api, store: null, hostname: 'tacos.example.com', ...extra })

  it.each([false, true])('a marketplace (mobile: %s) renders with its h1 and leaves no window behind', (mobile) => {
    const { html } = marketplace({ mobile })
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(typeof window).toBe('undefined')
  })

  it.each([false, true])('a one-store site (mobile: %s) renders too', (mobile) => {
    expect(renderLanding({ ...args, mobile, hostname: 'tacos.example.com' }).html).toContain('Casa Lupita')
  })

  it('siteBranding reads the request\'s host: an Ordering host gets Ordering\'s logo, as in the browser; another does not', () => {
    const ordering = marketplace({ hostname: 'shop.tryordering.com' }).html
    const own = marketplace({ hostname: 'shop.example.com' }).html
    expect(ordering).not.toBe(own)
    expect(ordering.match(/<img/g)?.length ?? 0).toBeGreaterThan(own.match(/<img/g)?.length ?? 0)
  })
})
