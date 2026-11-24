import { describe, expect, it, vi } from 'vitest'
import { defaultTheme, themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'
import {
  DARK_MAP_STYLES,
  applyOrderMapStyles,
  orderMapStyle,
  orderMapStyles,
  orderStaticMapStyle,
  staticMapStyleParams
} from '../mapStyle'

const withMapStyle = (style) => themeWithValues((values) => {
  values.components.order_details.base.map_style = style
  return values
})

describe('order map style (order_details.base.map_style)', () => {
  it('light (the default), v1 and an unknown value: Google\'s own look', () => {
    expect(orderMapStyle(themeWithValues())).toBeNull()
    expect(orderMapStyle(withMapStyle('sepia'))).toBeNull()
    expect(orderMapStyles(themeWithValues())).toBeNull()
    expect(orderStaticMapStyle(themeWithValues())).toBe('')
  })

  it('dark: Google\'s night style', () => {
    const theme = withMapStyle('dark')
    expect(orderMapStyle(theme)).toBe('dark')
    expect(orderMapStyles(theme)).toBe(DARK_MAP_STYLES)
  })

  it('static maps: one style= parameter per rule, colors as 0xRRGGBB', () => {
    const params = staticMapStyleParams([
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }, { visibility: 'on' }] }
    ])
    expect(params).toBe('style=element:geometry%7Ccolor:0x242f3e&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0xf3d19c%7Cvisibility:on')
    expect(staticMapStyleParams(null)).toBe('')
    expect(orderStaticMapStyle(withMapStyle('dark')).split('&')).toHaveLength(DARK_MAP_STYLES.length)
  })

  it('getGoogleMapImage appends the style before the key, and nothing without it', async () => {
    // ~ui/utils is mocked by the test setup
    const { getGoogleMapImage } = await vi.importActual('~ui/utils')
    const location = { lat: 1, lng: 2 }
    const dark = getGoogleMapImage(location, 'KEY', { zoom: 15, style: orderStaticMapStyle(withMapStyle('dark')) })
    expect(dark).toContain('&style=element:geometry%7Ccolor:0x242f3e&')
    expect(dark.endsWith('&key=KEY')).toBe(true)
    const light = getGoogleMapImage(location, 'KEY', { zoom: 15, style: '' })
    expect(light).not.toContain('style=')
    expect(getGoogleMapImage(location, 'KEY', { zoom: 15 })).toBe(light)
  })

  it('live map: the styles reach the map through its markers, only for dark', () => {
    const setOptions = vi.fn()
    const markers = { centerMarker: { getMap: () => ({ setOptions }) } }
    applyOrderMapStyles(themeWithValues(), markers)
    applyOrderMapStyles(defaultTheme, markers)
    expect(setOptions).not.toHaveBeenCalled()
    applyOrderMapStyles(withMapStyle('dark'), markers)
    expect(setOptions).toHaveBeenCalledWith({ styles: DARK_MAP_STYLES })
    expect(() => applyOrderMapStyles(withMapStyle('dark'), null)).not.toThrow()
  })
})
