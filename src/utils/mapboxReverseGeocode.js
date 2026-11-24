/**
 * The address of a point (the device's location) from Mapbox's reverse geocoding (v6), shaped like the
 * address the form gets when a Mapbox suggestion is picked (`retrieveSuggestResult` of the controller):
 * the same fields, so the form saves it the same way. The token is the project's `map_box_token`.
 * Resolves to `null` when Mapbox knows no address there; rejects when the request fails.
 */
export async function reverseGeocodeMapbox ({ lat, lng }, { token, language, signal } = {}) {
  if (!token || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng), types: 'address', limit: '1', access_token: token })
  if (language) params.set('language', language)
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, { signal })
  if (!response.ok) throw new Error(`Mapbox reverse geocoding failed (${response.status})`)
  const feature = (await response.json())?.features?.[0]
  const properties = feature?.properties
  const address = properties?.full_address || properties?.place_formatted
  if (!address) return null
  const context = properties.context || {}
  // the point asked for, not the address's own: the person is there (the pin of the address would differ by meters)
  return {
    location: { lat, lng },
    address,
    country: context.country?.name,
    country_code: context.country?.country_code,
    locality: context.locality?.name,
    region: context.region?.name,
    state: context.region?.name,
    state_code: context.region?.region_code,
    street: context.street?.name,
    mapbox_id: properties.mapbox_id,
    zipcode: context.postcode?.name,
    neighborhood: context.neighborhood?.name,
    street_number: context.address?.address_number,
    city: context.place?.name,
    route: context.street?.name,
    map_data: { library: 'mapbox', place_id: properties.mapbox_id }
  }
}
