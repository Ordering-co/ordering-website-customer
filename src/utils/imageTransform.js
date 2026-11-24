// Transformations of a theme image on its CDN. No dependencies: the worker
// (worker/seo.js) imports it too.

const TRANSFORMABLE_HOSTS = ['res.cloudinary.com', 'cloud-assets.orderingplus.com']

// Cloudinary transformation parameters a leading path segment may carry
// (`f_auto,q_auto,h_2000,c_limit` added by the theme API, for instance).
const TRANSFORM_PARAMS = new Set(['a', 'ar', 'b', 'bo', 'c', 'co', 'd', 'dpr', 'e', 'f', 'fl', 'g', 'h', 'l', 'o', 'q', 'r', 't', 'u', 'w', 'x', 'y', 'z'])

const isTransformSegment = (segment) => !!segment && segment.split(',').every((part) => {
  const match = /^([a-z]+)_[^/]+$/.exec(part)
  return !!match && TRANSFORM_PARAMS.has(match[1])
})

/**
 * The URL of an image with `transform` (e.g. `w_64,h_64,c_fit,f_png`) in
 * place of the transformations it already has, or null when it cannot be
 * transformed: not https on Cloudinary / cloud-assets, an SVG, no `/upload/`
 * segment, or a URL with `?`, `#`, `&`, `|` or spaces.
 */
export const transformedImageUrl = (url, transform) => {
  const value = typeof url === 'string' && url.trim() ? url.trim() : null
  if (!value || !transform || /[?#&|\s]/.test(value)) return null
  let parsed
  try {
    parsed = new URL(value)
  } catch (_) {
    return null
  }
  if (parsed.protocol !== 'https:' || !TRANSFORMABLE_HOSTS.includes(parsed.hostname)) return null
  if (/\.svg$/i.test(parsed.pathname)) return null
  const marker = '/upload/'
  const at = parsed.pathname.indexOf(marker)
  if (at < 0) return null
  const head = parsed.pathname.slice(0, at + marker.length)
  const segments = parsed.pathname.slice(at + marker.length).split('/')
  while (segments.length > 1 && isTransformSegment(segments[0])) segments.shift()
  return `${parsed.origin}${head}${transform}/${segments.join('/')}`
}
