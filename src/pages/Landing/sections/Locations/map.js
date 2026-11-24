import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { staticMarkerStyle } from '~/utils/mapMarkers'

const SIZE = { w: 640, h: 360 }
// shortcut: the first 100 stores with a point; a Static Maps URL has a limit (16384 characters), and
// 100 markers of one color fit in it. Raise it with a map of live markers instead.
const MAX_MARKERS = 100
const SINGLE_ZOOM = 15

const point = (store) => {
  const lat = Number(store?.location?.lat)
  const lng = Number(store?.location?.lng)
  return store?.location && store.location.lat != null && store.location.lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null
}

/**
 * The still images of a map with every store that has a point, best first: Google Static Maps (several
 * `markers` and no `center`, so it frames all of them; one store gets a street-level zoom), then
 * Mapbox's equivalent. The keys are the site's configs, as in Visit: no Google key (or the project
 * uses an alternative to Google Maps) leaves Mapbox, and no Mapbox token leaves Google; none of
 * them, or no store with a point, gives [] and the section draws no map. Every marker is the same pin in
 * the theme's primary color (src/utils/mapMarkers.js), never a store's logo: a 64×64 logo next to a big
 * pin made the stores look unlike each other. No letters either: the cards carry no matching badge, and
 * the Mapbox failover does not draw labels.
 * @param {object} theme
 * @param {Array} stores `useFranchiseStores().data`
 * @param {object} configs the site's configs (use_alternative_to_google_maps, google_maps_api_key, map_box_token)
 * @returns {string[]} the `StaticMap` sources
 */
export const locationsMapSources = (theme, stores, configs) => {
  const style = staticMarkerStyle(theme)
  const markers = (stores || [])
    .map((store) => ({ at: point(store), style }))
    .filter((marker) => marker.at)
    .slice(0, MAX_MARKERS)
  if (!markers.length) return []

  const googleKey = configs?.use_alternative_to_google_maps?.value === '1' ? null : configs?.google_maps_api_key?.value
  // Visit's `getGoogleMapImage` frames one point; this one has no center and a marker per store
  const url = (key) => [
    `https://maps.googleapis.com/maps/api/staticmap?size=${SIZE.w}x${SIZE.h}`,
    markers.length === 1 ? `zoom=${SINGLE_ZOOM}` : null,
    'scale=2&maptype=roadmap',
    ...markers.map(({ at, style }) => `markers=${style ? `${style}%7C` : ''}${at}`),
    `key=${key}`
  ].filter(Boolean).join('&')

  return [
    googleKey ? url(googleKey) : null,
    mapboxStaticUrl(url(''), configs?.map_box_token?.value)
  ].filter(Boolean)
}
