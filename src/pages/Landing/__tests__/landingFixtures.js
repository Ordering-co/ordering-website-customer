import { vi } from 'vitest'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'

// What the sections' tests share: the API's ordering, a store with realistic data, the public reads
// it is asked for, and the theme of a full website.

export const api = { root: 'https://api.ordering.test/v400/en/demo', appId: 'marketplace-test', appInternalName: 'website' }

const day = (enabled) => ({ enabled, lapses: enabled ? [{ open: { hour: 7, minute: 0 }, close: { hour: 21, minute: 0 } }] : [] })

export const business = {
  id: 5,
  name: 'Casa Lupita',
  slug: 'casa-lupita',
  description: 'Street tacos and bold Mexican plates, made daily',
  about: 'Handmade corn tortillas and slow-cooked birria.\nCasual and welcoming.',
  header: 'https://img.test/header.jpg',
  logo: 'https://img.test/logo.png',
  address: '14277 Kuykendahl Rd, Tomball, TX 77375',
  location: { lat: 30.09, lng: -95.62, zoom: 17 },
  phone: '(281) 555-0142',
  timezone: 'America/Chicago',
  open: true,
  schedule: [day(true), day(true), day(true), day(true), day(true), day(true), day(true)],
  gallery: [
    { id: 1, file: 'https://img.test/g1.jpg' },
    { id: 2, video: 'https://video.test/v.mp4' },
    { id: 3, file: 'https://img.test/g3.jpg' }
  ],
  delivery_time: '00:30',
  pickup_time: '00:15',
  reviews: { total: 4.8, reviews_count: 212, reviews: [] }
}

export const menus = [{ id: 1, delivery: true, pickup: true, eatin: false, enabled: true }]

export const products = [
  { id: 1, name: 'Birria Tacos', price: 14.99, featured: true, images: 'https://img.test/p1.jpg', slug: 'birria', category_id: 3 },
  { id: 2, name: 'Plain Rice', price: 3, featured: false, images: null },
  { id: 3, name: 'Horchata', price: 4.5, featured: true, images: null, slug: 'horchata', category_id: 4 }
]

const review = (id, quality, comment, user = { name: 'Laura', lastname: 'Smith', photo: 'https://img.test/laura.jpg', email: 'laura@example.com' }) => ({
  id, quality, delivery: quality, service: quality, package: quality, comment, created_at: `2026-11-0${id} 10:00:00`, user_id: 70 + id, user
})

export const reviews = [
  review(1, 5, 'Handmade tortillas and great salsa.'),
  review(2, 2, 'Slow service.'),
  review(3, 5, '   '),
  review(4, 4, 'Fast pickup, everything was hot.', { name: 'Daniel', lastname: 'Cruz', photo: null, email: 'd@example.com' }),
  review(5, 5, 'Family favorite every Friday.', { name: 'Ana', lastname: '', photo: null }),
  review(6, 5, 'The horchata is a must.'),
  review(7, 5, 'One too many.')
]

const respond = (body) => ({ ok: true, status: 200, json: async () => body })

/**
 * A fetch that answers the four public reads. `overrides` maps a read ('business', 'menus', 'products',
 * 'reviews') to a value, a function of the URL, or an Error (answered as the API's `{ error: true }`).
 */
export const landingFetch = (overrides = {}) => vi.fn(async (url) => {
  const path = String(url).split('?')[0]
  const read = path.endsWith('/menus') ? 'menus' : path.endsWith('/products') ? 'products' : path.endsWith('/reviews') ? 'reviews' : 'business'
  const defaults = { business, menus, products, reviews }
  let value = read in overrides ? overrides[read] : defaults[read]
  if (typeof value === 'function') value = await value(String(url))
  if (value instanceof Error) return respond({ error: true, result: [value.message] })
  return respond({ error: false, result: value })
})

export const urlsOf = (fetchMock, read) => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.split('?')[0].endsWith(read))

export const fullWebsiteTheme = () => themeWithValues((values) => {
  values.site = { ...values.site, experience: 'full_website' }
  return values
})

// A franchise of three stores (the API's `franchises/{id}/businesses`): Downtown is the first, Casa Lupita is id 5.
// Their schedules differ on purpose (the Locations section reads them): Downtown opens 7:00-21:00 every
// day in Chicago, Tomball has no schedule, Katy opens 7:00-21:00 every day in Tokyo.
const everyDay = (lapse) => Array.from({ length: 7 }, () => ({ enabled: true, lapses: [lapse] }))
const daytime = { open: { hour: 7, minute: 0 }, close: { hour: 21, minute: 0 } }

export const franchiseStores = [
  { id: 2, name: 'Downtown', slug: 'downtown', address: '1 Main St, Houston, TX', location: { lat: 29.76, lng: -95.37 }, phone: '(713) 555-0100', timezone: 'America/Chicago', schedule: everyDay(daytime), logo: 'https://img.test/downtown-logo.png', header: null, open: true },
  { id: 5, name: 'Tomball', slug: 'casa-lupita', address: '14277 Kuykendahl Rd, Tomball, TX 77375', location: { lat: 30.09, lng: -95.62 }, phone: '(281) 555-0142', logo: 'https://img.test/logo.png', header: 'https://img.test/header.jpg', open: true },
  { id: 9, name: 'Katy', slug: 'katy', address: '9 Katy Fwy, Katy, TX', location: { lat: 29.79, lng: -95.82 }, phone: '(832) 555-0190', timezone: 'Asia/Tokyo', schedule: everyDay(daytime), logo: null, header: null, open: false }
]

/**
 * `landingFetch` plus the franchise's stores. `stores`: the list, a function of the URL, or an Error;
 * the public reads of a store answer with the franchise store of that id or slug (`business` of the
 * fixtures for Tomball, which is the main store of the tests), so each store has its own name.
 * Anything else in `overrides` goes to `landingFetch`.
 */
export const franchiseFetch = ({ stores = franchiseStores, ...overrides } = {}) => {
  const landing = landingFetch({
    ...overrides,
    business: overrides.business || ((url) => {
      const key = decodeURIComponent(url.split('?')[0].split('/business/')[1])
      const store = franchiseStores.find((item) => String(item.id) === key || item.slug === key)
      return store ? { ...business, ...store, id: store.id } : business
    })
  })
  return vi.fn(async (url) => {
    if (!String(url).includes('/franchises/')) return landing(url)
    const value = typeof stores === 'function' ? await stores(String(url)) : stores
    if (value instanceof Error) return respond({ error: true, result: [value.message] })
    return respond({ error: false, result: value })
  })
}
