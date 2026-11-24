/**
 * Mapbox Static Images API equivalent of a Google Static Maps URL — the
 * failover StaticMap (~ui/src/components/StaticMap) falls back to when
 * Google's static map fails to load (403 by referrer, quota, network).
 * Pure: only rewrites the URL, no network call.
 */

const splitMarkerParts = (raw) => (typeof raw === 'string' ? raw.split(/\||%7C/i) : [])

// icon:<url> -> a custom pin at full size; color:0xRRGGBB -> a colored pin;
// else Mapbox's default large pin (`pin-l`), mirroring staticMarkerStyle's
// own fallback (src/utils/mapMarkers.js)
const markerOverlay = (parts, lng, lat) => {
  const icon = parts.find((part) => part.startsWith('icon:'))
  if (icon) return `url-${encodeURIComponent(icon.slice('icon:'.length))}(${lng},${lat})`
  const color = parts.find((part) => /^color:(0x)?[0-9a-f]{6}$/i.test(part))
  if (color) return `pin-l+${color.replace(/^color:(0x)?/i, '').toLowerCase()}(${lng},${lat})`
  return `pin-l(${lng},${lat})`
}

// A Google `markers=` value (icon/color/label parts, `|`-joined and
// %7C-encoded like the app builds them, ending in `lat,lng`) as a Mapbox
// overlay, or null when its location is not numeric
const overlayFromGoogleMarker = (raw) => {
  const parts = splitMarkerParts(raw)
  const location = parts.pop()
  const [lat, lng] = (location || '').split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return markerOverlay(parts, lng, lat)
}

// An extra marker ({ location: {lat,lng}, style }) as a Mapbox overlay,
// `style` being what staticMarkerStyle returns (no location in it)
const overlayFromExtraMarker = ({ location, style } = {}) => {
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return markerOverlay(splitMarkerParts(style), lng, lat)
}

/**
 * `googleStaticUrl` (built by getGoogleMapImage / themedStaticMapUrl,
 * ~ui/utils and ~/utils/mapMarkers) as the equivalent Mapbox Static Images
 * URL. `extraMarkers` ([{ location: {lat,lng}, style }]) are markers the
 * Google URL does not carry (e.g. the customer's on OrderDetails/Tracking,
 * added only on the Mapbox side so Google's own `markers=` stays
 * untouched). null without a token, a usable URL or a usable location.
 */
export const mapboxStaticUrl = (googleStaticUrl, token, { extraMarkers = [] } = {}) => {
  if (!token || typeof googleStaticUrl !== 'string') return null
  const [, query] = googleStaticUrl.split('?')
  if (!query) return null
  const params = query.split('&')
  const get = (key) => params.find((param) => param.startsWith(`${key}=`))?.slice(key.length + 1)

  const size = get('size') || '500x190'
  const markerOverlays = params
    .filter((param) => param.startsWith('markers='))
    .map((param) => overlayFromGoogleMarker(param.slice('markers='.length)))
  const overlays = [...markerOverlays, ...extraMarkers.map(overlayFromExtraMarker)].filter(Boolean)

  const centerParam = get('center')
  const [centerLat, centerLng] = centerParam ? centerParam.split(',').map(Number) : [NaN, NaN]
  const hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLng)
  if (!hasCenter && !overlays.length) return null

  // the theme's dark map style (src/utils/mapStyle.js) sends `style=`
  // parameters to Google; Mapbox's own dark style stands in for them
  const style = query.includes('style=') ? 'dark-v11' : 'streets-v12'
  // Mapbox tiles are 512px (Google's are 256px): one zoom level down
  const zoomParam = get('zoom')
  const mapboxZoom = Math.max(0, (zoomParam != null ? Number(zoomParam) : 17) - 1)
  // several markers, or no center to frame on, need the viewport fit instead
  const useAuto = !hasCenter || overlays.length > 1
  const viewport = useAuto ? 'auto' : `${centerLng},${centerLat},${mapboxZoom},0`
  const overlayPath = overlays.length ? `${overlays.join(',')}/` : ''
  // the boxes show it with `object-fit: cover`, which crops its top and
  // bottom on wide screens and its sides on phones: 30% a side keeps every
  // pin inside the part that stays visible
  const [w, h] = size.split('x').map(Number)
  const padY = Math.round((h || 0) * 0.3)
  const padX = Math.round((w || 0) * 0.3)
  const padding = useAuto ? `&padding=${padY},${padX},${padY},${padX}` : ''

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlayPath}${viewport}/${size}@2x?access_token=${token}${padding}`
}
