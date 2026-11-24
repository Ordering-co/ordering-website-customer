import { describe, expect, it } from 'vitest'
import { mapboxStaticUrl } from '../mapboxStaticMap'

const TOKEN = 'pk.test-token'
const CLOUDINARY_ICON = 'https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v1/store.png'

describe('mapboxStaticUrl', () => {
  it('center, zoom (one level under Google\'s) and size, a plain pin without a usable marker image', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=40.7,-74&zoom=15&scale=2&maptype=roadmap&markers=color:red%7C40.7,-74&key=k'
    const url = mapboxStaticUrl(google, TOKEN)
    expect(url).toBe(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l(-74,40.7)/-74,40.7,14,0/500x190@2x?access_token=${TOKEN}`)
  })

  it('icon:<url> becomes a url- overlay', () => {
    const google = `https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=40.7,-74&zoom=17&markers=anchor:bottom%7Cicon:${CLOUDINARY_ICON}%7C40.7,-74&key=k`
    const url = mapboxStaticUrl(google, TOKEN)
    expect(url).toContain(`url-${encodeURIComponent(CLOUDINARY_ICON)}(-74,40.7)`)
    expect(url).toContain('/streets-v12/static/')
    expect(url).toContain('-74,40.7,16,0/500x190@2x')
  })

  it('color:0xRRGGBB becomes a pin-l+rrggbb overlay', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=1,2&zoom=15&markers=color:0x2C7BE5%7C1,2&key=k'
    const url = mapboxStaticUrl(google, TOKEN)
    expect(url).toContain('pin-l+2c7be5(2,1)')
  })

  it('a dark style= on the Google URL picks Mapbox\'s dark-v11', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=1,2&zoom=15&markers=color:red%7C1,2&style=feature:all%7Celement:geometry%7Ccolor:0x242f3e&key=k'
    expect(mapboxStaticUrl(google, TOKEN)).toContain('/dark-v11/static/')
  })

  it('more than one marker in total uses the auto viewport and padding, even with a center', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=1,2&zoom=15&markers=color:red%7C1,2&markers=color:blue%7C3,4&key=k'
    const url = mapboxStaticUrl(google, TOKEN)
    expect(url).toContain('/pin-l(2,1),pin-l(4,3)/auto/500x190@2x')
    expect(url).toContain('&padding=57,150,57,150')
  })

  it('extraMarkers add overlays the Google URL does not carry, counting towards auto', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=1,2&zoom=15&markers=color:red%7C1,2&key=k'
    const url = mapboxStaticUrl(google, TOKEN, { extraMarkers: [{ location: { lat: 3, lng: 4 }, style: 'color:0x00FF00' }] })
    expect(url).toContain('pin-l(2,1),pin-l+00ff00(4,3)')
    expect(url).toContain('/auto/500x190@2x')
  })

  it('no center (AddressDetails may omit it) also uses auto', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&scale=2&maptype=roadmap&markers=color:red%7C1,2&key=k'
    expect(mapboxStaticUrl(google, TOKEN)).toContain('/auto/500x190@2x')
  })

  it('null without a token, a string URL, or a usable location', () => {
    const google = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=1,2&zoom=15&markers=color:red%7C1,2&key=k'
    expect(mapboxStaticUrl(google, '')).toBeNull()
    expect(mapboxStaticUrl(google, null)).toBeNull()
    expect(mapboxStaticUrl(null, TOKEN)).toBeNull()
    expect(mapboxStaticUrl(42, TOKEN)).toBeNull()
    expect(mapboxStaticUrl('https://maps.googleapis.com/maps/api/staticmap?size=500x190&key=k', TOKEN)).toBeNull()
    expect(mapboxStaticUrl('https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=nope,nope&key=k', TOKEN)).toBeNull()
  })
})
