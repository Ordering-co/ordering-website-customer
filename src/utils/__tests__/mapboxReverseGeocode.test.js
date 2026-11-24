import { afterEach, describe, expect, it, vi } from 'vitest'
import { reverseGeocodeMapbox } from '../mapboxReverseGeocode'

const feature = {
  properties: {
    mapbox_id: 'dXJuOm1ieGFkcjox',
    full_address: '3535 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada',
    context: {
      address: { address_number: '3535' },
      street: { name: 'Odyssey Drive' },
      postcode: { name: 'L5M 7Z7' },
      place: { name: 'Mississauga' },
      region: { name: 'Ontario', region_code: 'ON' },
      country: { name: 'Canada', country_code: 'CA' }
    }
  }
}
const respond = (body, ok = true, status = 200) => vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, status, json: async () => body })

afterEach(() => vi.restoreAllMocks())

describe('reverseGeocodeMapbox', () => {
  it('asks for the one address at the point and returns it shaped like a picked suggestion, at the point asked', async () => {
    const fetch = respond({ features: [feature] })
    const address = await reverseGeocodeMapbox({ lat: 43.5, lng: -79.7 }, { token: 'tk', language: 'en' })
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.mapbox.com/search/geocode/v6/reverse')
    expect(Object.fromEntries(url.searchParams)).toEqual({ latitude: '43.5', longitude: '-79.7', types: 'address', limit: '1', access_token: 'tk', language: 'en' })
    expect(address).toMatchObject({
      address: feature.properties.full_address,
      location: { lat: 43.5, lng: -79.7 },
      zipcode: 'L5M 7Z7',
      city: 'Mississauga',
      state_code: 'ON',
      country_code: 'CA',
      street_number: '3535',
      map_data: { library: 'mapbox', place_id: 'dXJuOm1ieGFkcjox' }
    })
  })

  it('is null when Mapbox knows no address there, or there is no token or point', async () => {
    respond({ features: [] })
    expect(await reverseGeocodeMapbox({ lat: 1, lng: 2 }, { token: 'tk' })).toBeNull()
    expect(await reverseGeocodeMapbox({ lat: 1, lng: 2 }, {})).toBeNull()
    expect(await reverseGeocodeMapbox({ lat: NaN, lng: 2 }, { token: 'tk' })).toBeNull()
  })

  it('rejects when the request fails', async () => {
    respond({}, false, 401)
    await expect(reverseGeocodeMapbox({ lat: 1, lng: 2 }, { token: 'tk' })).rejects.toThrow('401')
  })
})
