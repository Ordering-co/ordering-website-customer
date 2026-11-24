// JSON-LD (schema.org) for the marketing page `/` of a Full Website. Pure: it runs in the
// Cloudflare Worker, so no window/document/React. Never emits individual reviews or reviewer data.
import { escapeJsonForScript, presentImage } from './seo.js'

const MAX_FRANCHISE_BRANCHES = 50
// `business.schedule` of the API: index 0 = Sunday … 6 = Saturday (the format `userWeeklySchedule`
// in src/utils/businessTime.js reads, indexing `schedule[dayjs().day()]`).
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)
const isAbsoluteUrl = (value) => typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim())
const image = (value) => {
  const present = presentImage(value)
  return present && isAbsoluteUrl(present) ? present : undefined
}
const base = (origin) => (typeof origin === 'string' && origin.trim() ? origin.trim().replace(/\/+$/, '') : '')

// Drops every key without a value (null, '', empty array) and any object left with only `@type`.
const prune = (value) => {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((item) => item !== undefined)
    return items.length ? items : undefined
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      const pruned = prune(item)
      if (pruned !== undefined) out[key] = pruned
    }
    return Object.keys(out).every((key) => key === '@type' || key === '@context') ? undefined : out
  }
  if (value === null || value === undefined || value === '') return undefined
  return value
}

const hhmm = (time) => {
  const hour = Number(time?.hour)
  const minute = Number(time?.minute ?? 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const openingHours = (schedule) => {
  if (!Array.isArray(schedule)) return []
  const specs = []
  DAYS.forEach((day, index) => {
    const entry = schedule[index]
    if (!entry?.enabled || !Array.isArray(entry.lapses)) return
    for (const lapse of entry.lapses) {
      const opens = hhmm(lapse?.open)
      const closes = hhmm(lapse?.close)
      if (opens && closes) {
        specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${day}`, opens, closes })
      }
    }
  })
  return specs
}

const aggregateRating = (reviews) => {
  const total = Number(reviews?.total)
  const count = Number(reviews?.reviews_count ?? (Array.isArray(reviews?.reviews) ? reviews.reviews.length : 0))
  if (!(count > 0) || !(total > 0)) return undefined
  return { '@type': 'AggregateRating', ratingValue: Math.round(total * 10) / 10, reviewCount: count, bestRating: 5 }
}

const sameAsOf = (links) => {
  const urls = (Array.isArray(links) ? links : []).filter(isAbsoluteUrl).map((url) => url.trim())
  return urls.length ? urls : undefined
}

// The Restaurant node (no @context) from whatever the business carries; shared by the single store
// and the franchise branches (whose list has no description, ratings or socials).
const restaurantNode = (business, { url, hasMenu } = {}) => {
  const name = text(business?.name)
  if (!name) return null
  const { lat, lng } = business.location || {}
  return {
    '@type': 'Restaurant',
    name,
    url,
    image: image(business.header) || image(business.logo),
    logo: image(business.logo),
    description: text(business.description) || text(business.about),
    telephone: text(business.phone) || text(business.cellphone),
    address: { '@type': 'PostalAddress', streetAddress: text(business.address) },
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } : undefined,
    openingHoursSpecification: openingHours(business.schedule),
    aggregateRating: aggregateRating(business.reviews),
    hasMenu,
    sameAs: sameAsOf([business.facebook_profile, business.instagram_profile, business.tiktok_profile])
  }
}

const withContext = (node) => (node ? prune({ '@context': 'https://schema.org', ...node }) ?? null : null)

export const restaurantJsonLd = ({ business, origin, menuPath = '/order' } = {}) => {
  const root = base(origin)
  return withContext(restaurantNode(business, {
    url: root ? `${root}/` : undefined,
    hasMenu: root ? `${root}${menuPath}` : undefined
  }))
}

const organizationNode = ({ name, origin, logo, description, sameAs } = {}) => {
  const orgName = text(name)
  if (!orgName) return null
  const root = base(origin)
  return { '@type': 'Organization', name: orgName, url: root ? `${root}/` : undefined, logo: image(logo), description: text(description), sameAs: sameAsOf(sameAs) }
}

export const organizationJsonLd = (args) => withContext(organizationNode(args))

export const websiteJsonLd = ({ name, origin, description } = {}) => {
  const siteName = text(name)
  if (!siteName) return null
  const root = base(origin)
  return withContext({ '@type': 'WebSite', name: siteName, url: root ? `${root}/` : undefined, description: text(description) })
}

export const franchiseJsonLd = ({ name, origin, logo, businesses } = {}) => {
  const root = base(origin)
  const organization = organizationNode({ name, origin, logo })
  if (!organization) return null
  const orgId = `${root}/#organization`
  const branches = (Array.isArray(businesses) ? businesses : [])
    .map((branch) => {
      const slug = text(branch?.slug)
      const node = restaurantNode(branch, { url: root && slug ? `${root}/${encodeURIComponent(slug)}` : undefined })
      return node && { ...node, parentOrganization: { '@id': orgId } }
    })
    .filter(Boolean)
    .slice(0, MAX_FRANCHISE_BRANCHES)
  return prune({ '@context': 'https://schema.org', '@graph': [{ ...organization, '@id': orgId }, ...branches] })
}

const marketplaceJsonLd = ({ name, description, logo, origin }) => {
  const graph = [websiteJsonLd({ name, origin, description }), organizationJsonLd({ name, origin, logo, description })]
    .filter(Boolean)
    .map(({ '@context': _context, ...node }) => node)
  return graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null
}

// Extension point: one builder per `site.mode`; add a mode by adding a function here.
export const MODE_JSON_LD = {
  single_store: ({ business, origin }) => restaurantJsonLd({ business, origin }),
  franchise: ({ name, origin, logo, franchiseBusinesses }) => franchiseJsonLd({ name, origin, logo, businesses: franchiseBusinesses }),
  marketplace: marketplaceJsonLd
}

export const landingJsonLd = (args = {}) => {
  const build = Object.hasOwn(MODE_JSON_LD, args.mode) ? MODE_JSON_LD[args.mode] : null
  return build ? build(args) ?? null : null
}

// escapeJsonForScript only escapes `<`; also neutralise `>`, `&` and the line separators U+2028/2029.
export const jsonLdScriptTag = (data) => {
  if (!data) return ''
  const json = escapeJsonForScript(data)
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `<script type="application/ld+json">${json}</script>`
}
