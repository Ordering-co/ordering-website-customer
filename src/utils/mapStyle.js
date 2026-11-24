/**
 * The style of the order's map (`components.order_details.base.map_style`,
 * `light` | `dark`): the Google static map of the
 * order details / tracking and the live map of the driver. `light` is
 * Google's own look (nothing is sent); `dark` is Google's standard night
 * style.
 */

// Google's standard night style (Maps JavaScript API, "Styled maps: night mode").
export const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
]

const MAP_STYLES = { dark: DARK_MAP_STYLES }

/** The order map's style name when it is not Google's own (`dark`); null otherwise. */
export const orderMapStyle = (theme) => {
  const style = theme.values.components.order_details.base.map_style
  return MAP_STYLES[style] ? style : null
}

/** The `styles` of a Maps JavaScript map for the order's map, or null (Google's look). */
export const orderMapStyles = (theme) => MAP_STYLES[orderMapStyle(theme)] || null

/**
 * A Maps JavaScript style list as the `style=` parameters of Google Static
 * Maps (`feature:…|element:…|color:0xRRGGBB`, `|` encoded as %7C like the
 * other parameters the app builds), joined with `&`. '' for no styles.
 */
export const staticMapStyleParams = (styles) => {
  if (!Array.isArray(styles)) return ''
  return styles.map(({ featureType, elementType, stylers = [] }) => {
    const rules = stylers.flatMap((styler) => Object.entries(styler).map(([key, value]) =>
      `${key}:${typeof value === 'string' ? value.replace(/^#/, '0x') : value}`
    ))
    const parts = [featureType && `feature:${featureType}`, elementType && `element:${elementType}`, ...rules].filter(Boolean)
    return `style=${parts.join('%7C')}`
  }).join('&')
}

/** The `style=` parameters of the order's static map ('' for Google's look). */
export const orderStaticMapStyle = (theme) => staticMapStyleParams(orderMapStyles(theme))

/**
 * Applies the order map's styles to a live map once the controller hands its
 * markers (`onDriverMarkerReady`: the controller takes no `styles`, so the
 * map is reached through its center marker). No-op without styles.
 */
export const applyOrderMapStyles = (theme, markers) => {
  const styles = orderMapStyles(theme)
  if (!styles) return
  const map = markers?.centerMarker?.getMap?.() || markers?.driverMarker?.getMap?.()
  map?.setOptions?.({ styles })
}
