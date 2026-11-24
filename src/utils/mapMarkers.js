import { themeColor, withAlpha } from './themeColors'
import { themeImage } from './themeTokens'
import { BUNDLED_IMAGES } from './bundledImages'
import { transformedImageUrl } from './imageTransform'

/**
 * Map markers of the theme (`images['map.driver' | 'map.store' |
 * 'map.customer']`, docs/theme-v2/imagenes-tamanos.md §2.M, T7 and T8).
 *
 * - One-order maps (order details, tracking-only, custom order): the theme
 *   wins. The driver and customer markers never use the API photo; the store
 *   uses `map.store`, then the business logo, then the bundled default.
 * - Maps of several businesses (BusinessesMap): the business logo wins and
 *   `map.store` is the fallback. (The marketing page's Locations map draws
 *   one uniform primary-color pin for every store instead.)
 * - Static maps (Google Static Maps): only a public PNG of at most 64×64, so
 *   a Cloudinary / cloud-assets image is transformed to it; any other URL
 *   (another host, an SVG, a bundled asset) falls back to Google's default
 *   marker in the primary color of the theme.
 *
 */

// T7 (40×40, square, anchored at the bottom center, contained) cannot be set
// from here: the submodule controllers force the size of every marker
// (GoogleMaps 35×35, LocationsMap 30×30) and take no size or anchor prop.
// Google's default anchor is already the bottom center.

// T8: Google Static Maps takes custom icons of at most 4096 px² (64×64).
export const STATIC_MARKER_TRANSFORM = 'w_64,h_64,c_fit,f_png'

const filled = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

/**
 * The marker image of a one-order map. The driver's and the customer's are
 * the theme's (`map.driver`, `map.customer`: their bundled default fills an
 * empty one, src/utils/bundledImages.js THEME_IMAGE_DEFAULTS). The store's has
 * no default in the theme, so the business logo comes between them
 * (`map.store` → `businessLogo` → the bundled one).
 */
export const orderMapMarker = (theme, role, businessLogo) => {
  if (role !== 'store') return themeImage(theme, `map.${role}`)
  return themeImage(theme, 'map.store') || filled(businessLogo) || BUNDLED_IMAGES.map.store
}

/**
 * The fallback marker of a map of several businesses, used when
 * a business has no logo (`map.store` → bundle).
 */
export const businessesMapFallback = (theme) => themeImage(theme, 'map.store') || BUNDLED_IMAGES.map.store

/**
 * The 64×64 PNG of an image for Google Static Maps, or null when Google
 * cannot use it: not https on Cloudinary / cloud-assets, an SVG, or a URL
 * that would break the `markers` parameter.
 */
export const staticMarkerIconUrl = (url) => transformedImageUrl(url, STATIC_MARKER_TRANSFORM)

/**
 * A CSS color (a hex, rgb() or rgba(), as the theme's) as a Static Maps
 * color (`0xRRGGBB`, its alpha left out), or null.
 */
export const staticMapColor = (color) => {
  if (!filled(color)) return null
  // (withAlpha reads it as `rgba(r,g,b,1)`)
  const channels = withAlpha(color, 1, '').match(/\d+/g)
  if (!channels) return null
  return `0x${channels.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * The style of a Static Maps marker (the part of `markers=`
 * before the location, `|`-joined and %7C-encoded like the URLs the app
 * builds). The image as a 64×64 PNG anchored at its bottom center, or
 * Google's marker in the primary color (keeping `label`, if any).
 */
export const staticMarkerStyle = (theme, imageUrl, label) => {
  const icon = staticMarkerIconUrl(imageUrl)
  if (icon) return `anchor:bottom%7Cicon:${icon}`
  const color = staticMapColor(themeColor(theme, 'primary'))
  const parts = [label && `label:${label}`, color && `color:${color}`].filter(Boolean)
  return parts.join('%7C')
}

/**
 * `{ lat, lng }` (userLocation, or a business/driver location already
 * normalized to numbers) as a Mapbox extra marker (mapboxStaticUrl's
 * `extraMarkers`), or null without a usable location. The many-markers maps
 * (BusinessesMap) build their Mapbox failover from these.
 */
export const staticMapMarker = (theme, location, icon) => {
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { location: { lat, lng }, style: staticMarkerStyle(theme, icon) }
}

/**
 * `googleMapsUrl` (a Static Maps URL built by the AddressDetails
 * controller: the customer first, then one marker per business) with the
 * markers of the theme. `businessIcons[i]` is the image of business `i`;
 * `customerOnly` treats every marker as the customer. Returns the URL as is
 * when it has no markers.
 */
export const themedStaticMapUrl = (theme, googleMapsUrl, { customerIcon, businessIcons = [], customerOnly } = {}) => {
  if (typeof googleMapsUrl !== 'string') return googleMapsUrl
  const [base, query] = googleMapsUrl.split('?')
  if (!query) return googleMapsUrl
  const params = query.split('&')
  const markers = params.filter((param) => param.startsWith('markers='))
  if (!markers.length) return googleMapsUrl
  const rest = params.filter((param) => param && !param.startsWith('markers='))
  const themed = markers.map((param, index) => {
    const raw = param.slice('markers='.length)
    let decoded = raw
    try {
      decoded = decodeURIComponent(raw)
    } catch (_) {}
    const parts = decoded.split(/\||%7C/i)
    const location = parts[parts.length - 1]
    const isCustomer = customerOnly || index === 0
    const label = /^label:(.+)$/.exec(parts.find((part) => part.startsWith('label:')) || '')?.[1]
    const style = isCustomer
      ? staticMarkerStyle(theme, customerIcon)
      : staticMarkerStyle(theme, businessIcons[index - 1], label)
    return `markers=${style ? `${style}%7C` : ''}${location}`
  })
  return `${base}?${[...rest, ...themed].join('&')}`
}
