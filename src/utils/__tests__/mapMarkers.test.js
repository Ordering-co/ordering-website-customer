import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '../bundledImages'
import {
  businessesMapFallback,
  orderMapMarker,
  staticMapColor,
  staticMapMarker,
  staticMarkerIconUrl,
  staticMarkerStyle,
  themedStaticMapUrl
} from '../mapMarkers'

// the bundled markers (128×128): map.driver and map.customer are the
// theme's defaults; map.store is not, so the business logo comes first
const bundle = BUNDLED_IMAGES.map
const themedWith = (images = {}) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
const CLOUDINARY = 'https://res.cloudinary.com/acme/image/upload/f_auto,q_auto,h_2000,c_limit/v17/markers/moto.png'
const CLOUD_ASSETS = 'https://cloud-assets.orderingplus.com/image/upload/projectcnew/abc/store.webp'

describe('orderMapMarker (maps of one order)', () => {
  it('the theme image, then the bundled 128×128 default', () => {
    const theme = themedWith({ 'map.driver': 'https://cdn.test/theme-moto.png', 'map.customer': ' ' })
    expect(orderMapMarker(theme, 'driver')).toBe('https://cdn.test/theme-moto.png')
    expect(orderMapMarker(theme, 'customer')).toBe(bundle.customer)
  })

  it('store: theme → business logo → bundle', () => {
    expect(orderMapMarker(themedWith({ 'map.store': 'https://cdn.test/theme-store.png' }), 'store', '/logo.png')).toBe('https://cdn.test/theme-store.png')
    expect(orderMapMarker(themedWith(), 'store', '/logo.png')).toBe('/logo.png')
    expect(orderMapMarker(themedWith(), 'store', '')).toBe(bundle.store)
  })

  it('the logo never replaces the driver or the customer', () => {
    expect(orderMapMarker(themedWith(), 'driver', '/logo.png')).toBe(bundle.driver)
  })
})

describe('businessesMapFallback (maps of several businesses)', () => {
  it('map.store, then the bundle', () => {
    expect(businessesMapFallback(themedWith())).toBe(bundle.store)
    expect(businessesMapFallback(themedWith({ 'map.store': 'https://cdn.test/theme-store.png' }))).toBe('https://cdn.test/theme-store.png')
  })
})

describe('staticMarkerIconUrl (Google Static Maps, T8)', () => {
  it('Cloudinary: replaces the served transformations with a 64×64 PNG', () => {
    expect(staticMarkerIconUrl(CLOUDINARY)).toBe('https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v17/markers/moto.png')
  })

  it('cloud-assets: keeps the folders of the public id', () => {
    expect(staticMarkerIconUrl(CLOUD_ASSETS)).toBe('https://cloud-assets.orderingplus.com/image/upload/w_64,h_64,c_fit,f_png/projectcnew/abc/store.webp')
  })

  it('a folder that only looks like a transformation stays', () => {
    expect(staticMarkerIconUrl('https://res.cloudinary.com/acme/image/upload/my_folder/pin.png'))
      .toBe('https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/my_folder/pin.png')
  })

  it('null for another host, an SVG, a bundled asset, http, a query or no upload path', () => {
    expect(staticMarkerIconUrl('https://example.com/pin.png')).toBeNull()
    expect(staticMarkerIconUrl('/assets/map-pin-abc.svg')).toBeNull()
    expect(staticMarkerIconUrl('data:image/png;base64,AAAA')).toBeNull()
    expect(staticMarkerIconUrl('https://res.cloudinary.com/acme/raw/pin.png')).toBeNull()
    expect(staticMarkerIconUrl(null)).toBeNull()
  })
})

describe('staticMapColor', () => {
  it('a CSS color as 0xRRGGBB, null otherwise', () => {
    expect(staticMapColor('#2c7be5')).toBe('0x2C7BE5')
    expect(staticMapColor('#fff')).toBe('0xFFFFFF')
    expect(staticMapColor('rgb(1, 2, 3)')).toBe('0x010203')
    expect(staticMapColor('nope')).toBeNull()
    expect(staticMapColor('')).toBeNull()
  })
})

describe('staticMarkerStyle', () => {
  it('the image as a PNG anchored at its bottom center', () => {
    expect(staticMarkerStyle(themedWith(), CLOUDINARY))
      .toBe('anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v17/markers/moto.png')
  })

  it('Google marker in the primary color (with its label) when the image cannot be used', () => {
    const theme = themedWith()
    const primary = staticMapColor(theme.values.tokens.color.primary)
    expect(staticMarkerStyle(theme, '/bundle-pin.svg')).toBe(`color:${primary}`)
    expect(staticMarkerStyle(theme, null, 'S')).toBe(`label:S%7Ccolor:${primary}`)
  })
})

describe('staticMapMarker (BusinessesMap, Locations: many-markers Mapbox failover)', () => {
  it('a usable location as a Mapbox extraMarker; null otherwise', () => {
    const theme = themedWith()
    expect(staticMapMarker(theme, { lat: '1.5', lng: '2.5' }, CLOUDINARY)).toEqual({
      location: { lat: 1.5, lng: 2.5 },
      style: staticMarkerStyle(theme, CLOUDINARY)
    })
    expect(staticMapMarker(theme, { lat: 'nope', lng: 2 }, CLOUDINARY)).toBeNull()
    expect(staticMapMarker(theme, null, CLOUDINARY)).toBeNull()
  })
})

describe('themedStaticMapUrl (AddressDetails)', () => {
  const single = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&scale=2&maptype=roadmap&markers=color:red%7C1,2&markers=label:S%7Ccolor:0xFF0000%7C3,4&key=k'
  const multi = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&scale=2&maptype=roadmap&markers=icon:%7Ccolor:red%7C1,2&markers=label:A%7Ccolor:red%7C3,4&markers=label:B%7Ccolor:red%7C5,6&key=k'

  it('map.customer for the customer and the store image for the business', () => {
    const url = themedStaticMapUrl(themedWith(), single, { customerIcon: CLOUDINARY, businessIcons: [CLOUD_ASSETS] })
    expect(url).toBe(
      'https://maps.googleapis.com/maps/api/staticmap?size=500x190&scale=2&maptype=roadmap&key=k' +
      '&markers=anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v17/markers/moto.png%7C1,2' +
      '&markers=anchor:bottom%7Cicon:https://cloud-assets.orderingplus.com/image/upload/w_64,h_64,c_fit,f_png/projectcnew/abc/store.webp%7C3,4'
    )
  })

  it('primary color markers, each business keeping its letter, without usable images', () => {
    const theme = themedWith()
    const primary = staticMapColor(theme.values.tokens.color.primary)
    const url = themedStaticMapUrl(theme, multi, { customerIcon: '/bundle-pin.svg', businessIcons: [CLOUDINARY, '/bundle-store.jpg'] })
    expect(url).toContain(`&markers=color:${primary}%7C1,2`)
    expect(url).toContain('&markers=anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v17/markers/moto.png%7C3,4')
    expect(url).toContain(`&markers=label:B%7Ccolor:${primary}%7C5,6`)
    expect(url).not.toContain('color:red')
  })

  it('customerOnly marks every marker as the customer; no URL stays null', () => {
    const theme = themedWith()
    const url = themedStaticMapUrl(theme, single, { customerIcon: CLOUDINARY, customerOnly: true })
    expect(url.match(/icon:https:\/\/res\.cloudinary\.com\/acme/g)).toHaveLength(2)
    expect(themedStaticMapUrl(theme, null)).toBeNull()
  })
})
