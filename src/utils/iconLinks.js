// The site's icon links (favicon, apple-touch-icon) and their `type`. No
// dependencies but imageTransform: the worker (worker/seo.js) imports it too.
import { transformedImageUrl } from './imageTransform.js'

// The formats a favicon may have (product.schema.json images.favicon) and
// their media types. Any other is left without `type`: a browser skips an
// icon whose declared type it does not support, so a wrong one costs the icon.
const ICON_TYPES = {
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon'
}

const DATA_TYPES = {
  'image/png': ICON_TYPES.png,
  'image/svg+xml': ICON_TYPES.svg,
  'image/x-icon': ICON_TYPES.ico,
  'image/vnd.microsoft.icon': ICON_TYPES.ico
}

// A CDN transformation segment that sets the delivered format
// (`…/upload/w_96,f_png/…`, `…/upload/f_auto,q_auto/…`).
const FORMAT_SEGMENT = /\/(?:[a-z]{1,3}_[^/,]+,)*f_([a-z0-9]+)(?:,[a-z]{1,3}_[^/,]+)*\//i

const trimmed = (url) => typeof url === 'string' ? url.trim() : ''

const pathOf = (url) => {
  try {
    return new URL(url, 'https://icon.invalid').pathname
  } catch (_) {
    return url.split(/[?#]/)[0]
  }
}

/** The extension of the file a URL names (lowercase), or ''. */
const extensionOf = (url) => {
  const name = pathOf(url).split('/').pop() || ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/**
 * The media type of the icon a URL serves, for a link's `type`:
 * `image/png`, `image/svg+xml` or `image/x-icon`, or undefined when it cannot
 * be told (another format, no extension, or a CDN transformation such as
 * `f_auto` that picks the format per browser). Undefined means "omit `type`".
 */
export const iconMimeType = (url) => {
  const value = trimmed(url)
  if (!value) return undefined
  if (/^data:/i.test(value)) {
    const match = /^data:([^;,]+)/i.exec(value)
    return match ? DATA_TYPES[match[1].toLowerCase()] : undefined
  }
  const format = FORMAT_SEGMENT.exec(pathOf(value))
  if (format) return ICON_TYPES[format[1].toLowerCase()]
  return ICON_TYPES[extensionOf(value)]
}

/** Whether the file a URL names is an SVG (its extension or data type). */
export const isSvgIcon = (url) => {
  const value = trimmed(url)
  if (/^data:/i.test(value)) return /^data:image\/svg\+xml/i.test(value)
  return !!value && extensionOf(value) === 'svg'
}

// The favicon as the CDN serves it: a 96 px PNG (32 px at 3x), whatever the
// upload is (an ICO, or a PNG the API delivers with `f_auto`, which Safari may
// get as AVIF and not show). An SVG or a URL off the CDN goes as it is.
export const FAVICON_TRANSFORM = 'w_96,h_96,c_fit,f_png'

// iOS takes a 180×180 PNG for the home screen.
export const APPLE_TOUCH_ICON_TRANSFORM = 'w_180,h_180,c_fill,f_png'

// The bundled generic favicon: a neutral square PNG, no letters
// or brand, used when neither the site nor its single-store business has
// anything configured. Shared by the worker and the client, so both point at
// the same file.
export const GENERIC_FAVICON_PATH = '/site-icon.png'

// The business favicon's transforms. The CDN (cloud-assets)
// does not honor `f_png`'s format (it may serve JPEG/AVIF) nor the exact
// pixel size asked for — only that the result is square (c_fill) — so these
// hrefs are used with no declared `type`/`sizes` (see businessFaviconLinks).
const BUSINESS_FAVICON_ICON_TRANSFORM = 'w_96,h_96,c_fill,f_png'
const BUSINESS_FAVICON_TOUCH_TRANSFORM = 'w_180,h_180,c_fill,f_png'

/**
 * The favicon of a single-store site's own business (implementation notes, level b/c
 * of the favicon ladder): the business's logo, else its header, cropped to a
 * square (c_fill) on the CDN when it can be. `{ icon, touchIcon }` (both the
 * same source, two sizes), or null without a usable logo/header. Callers
 * must pass already-presence-checked values (worker: presentImage/seo.js;
 * absent/placeholder images do not reach here).
 */
export const businessFaviconLinks = ({ logo, header } = {}) => {
  const chosen = trimmed(logo) || trimmed(header)
  if (!chosen) return null
  return {
    icon: transformedImageUrl(chosen, BUSINESS_FAVICON_ICON_TRANSFORM) || chosen,
    touchIcon: transformedImageUrl(chosen, BUSINESS_FAVICON_TOUCH_TRANSFORM) || chosen
  }
}

/** The href of the favicon link: the CDN's PNG when it can, else the URL. */
export const faviconHref = (url) => {
  const value = trimmed(url)
  return transformedImageUrl(value, FAVICON_TRANSFORM) || value
}

/**
 * A PNG of the icon at `url`: the CDN's (with `transform`, which must end in
 * `f_png`) when it can serve one, else the URL itself when it is a PNG, else
 * null (an SVG, an ICO or a WebP off the CDN: iOS shows none of them).
 */
export const pngIconUrl = (url, transform = APPLE_TOUCH_ICON_TRANSFORM) => {
  const value = trimmed(url)
  if (!value) return null
  return transformedImageUrl(value, transform) ||
    (iconMimeType(value) === ICON_TYPES.png ? value : null)
}

/**
 * The `rel="icon"` links of a favicon, as attribute objects in document
 * order: the favicon (`id="favicon"`) with its `type` when it can be told
 * (never a guessed one) and, when it is an SVG, a PNG link before it
 * (`id="favicon-fallback"`, `fallbackPng`, the bundled default favicon) for the
 * browsers that do not show SVG favicons (Safari before 26). The PNG declares
 * 32x32 and the SVG `any`, so the browsers that show SVG pick the SVG.
 */
export const faviconLinks = (url, fallbackPng) => {
  const href = faviconHref(url)
  if (!href) return []
  const type = iconMimeType(href)
  const svg = isSvgIcon(href)
  const fallback = trimmed(fallbackPng)
  const links = []
  if (svg && fallback && fallback !== href) {
    links.push({ rel: 'icon', type: ICON_TYPES.png, sizes: '32x32', href: fallback, id: 'favicon-fallback' })
  }
  links.push({
    rel: 'icon',
    ...(type ? { type } : {}),
    sizes: svg ? 'any' : '32x32',
    href,
    id: 'favicon'
  })
  return links
}
