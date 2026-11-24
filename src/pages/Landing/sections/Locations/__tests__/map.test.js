import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { locationsMapSources } from '../map'

const theme = themeWithValues(() => {})
const stores = [
  { id: 1, name: 'A', location: { lat: 29.76, lng: -95.37 }, logo: null },
  { id: 2, name: 'B', location: { lat: 30.09, lng: -95.62 }, logo: null },
  { id: 3, name: 'No point', location: null },
  { id: 4, name: 'Bad point', location: { lat: 'x', lng: null } }
]

describe('locationsMapSources', () => {
  it('Google first: one marker per store with a point and no center, so it frames them all', () => {
    const [google, mapbox] = locationsMapSources(theme, stores, { google_maps_api_key: { value: 'g-key' }, map_box_token: { value: 'pk.t' } })
    expect(google).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap\?size=640x360&scale=2&maptype=roadmap&/)
    expect(google).not.toContain('center=')
    expect(google).not.toContain('zoom=')
    expect(google.match(/markers=/g)).toHaveLength(2)
    expect(google).toContain('%7C29.76,-95.37')
    expect(google).toContain('%7C30.09,-95.62')
    expect(google).toMatch(/&key=g-key$/)
    // Mapbox: the same markers, framed to fit them
    expect(mapbox).toMatch(/^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/streets-v12\/static\/pin-l\+[0-9a-f]{6}\(-95\.37,29\.76\),pin-l\+[0-9a-f]{6}\(-95\.62,30\.09\)\/auto\/640x360@2x\?access_token=pk\.t&padding=/)
  })

  it('every store has the same pin in the theme\'s primary color, whether or not it has a logo; no label', () => {
    const logo = 'https://res.cloudinary.com/demo/image/upload/v1/logo.png' // what used to become its marker
    const [google, mapbox] = locationsMapSources(theme, [
      { id: 1, location: { lat: 1, lng: 2 }, logo },
      { id: 2, location: { lat: 3, lng: 4 }, logo: 'https://img.test/logo.svg' },
      { id: 3, location: { lat: 5, lng: 6 }, logo: null }
    ], { google_maps_api_key: { value: 'k' }, map_box_token: { value: 'pk.t' } })
    expect(google).not.toContain('icon:')
    expect(google).not.toContain('label:')
    const styles = google.split('markers=').slice(1).map((marker) => marker.replace(/&.*$/, '').replace(/%7C[-\d.]+,[-\d.]+$/, ''))
    expect(styles).toHaveLength(3)
    expect(styles[0]).toMatch(/^color:0x[0-9A-F]{6}$/)
    expect(new Set(styles).size).toBe(1)
    // the Mapbox failover draws the same pin for each one
    expect(mapbox).not.toContain('url-')
    expect(new Set(mapbox.match(/pin-l\+[0-9a-f]{6}/g)).size).toBe(1)
    expect(mapbox.match(/pin-l\+/g)).toHaveLength(3)
  })

  it('one store gets a street-level zoom', () => {
    const [google] = locationsMapSources(theme, stores.slice(0, 1), { google_maps_api_key: { value: 'k' } })
    expect(google).toContain('zoom=15')
  })

  it('keys: Mapbox alone, Google alone, the project\'s alternative to Google, none', () => {
    expect(locationsMapSources(theme, stores, { map_box_token: { value: 'pk.t' } })).toHaveLength(1)
    expect(locationsMapSources(theme, stores, { map_box_token: { value: 'pk.t' } })[0]).toContain('api.mapbox.com')
    expect(locationsMapSources(theme, stores, { google_maps_api_key: { value: 'k' } })).toHaveLength(1)
    const alternative = locationsMapSources(theme, stores, { use_alternative_to_google_maps: { value: '1' }, google_maps_api_key: { value: 'k' }, map_box_token: { value: 'pk.t' } })
    expect(alternative).toHaveLength(1)
    expect(alternative[0]).toContain('api.mapbox.com')
    expect(locationsMapSources(theme, stores, {})).toEqual([])
  })

  it('no store with a point, or no stores: no map', () => {
    const keys = { google_maps_api_key: { value: 'k' }, map_box_token: { value: 'pk.t' } }
    expect(locationsMapSources(theme, stores.slice(2), keys)).toEqual([])
    expect(locationsMapSources(theme, [], keys)).toEqual([])
    expect(locationsMapSources(theme, null, keys)).toEqual([])
  })

  it('draws no more than 100 markers', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ id: i, location: { lat: 1 + i / 1000, lng: 2 } }))
    const [google] = locationsMapSources(theme, many, { google_maps_api_key: { value: 'k' } })
    expect(google.match(/markers=/g)).toHaveLength(100)
  })
})
