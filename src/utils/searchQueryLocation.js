export const parseSearchQueryLocation = (search) => {
  if (!search) return null

  const params = new URLSearchParams(search)
  const lat = parseFloat(params.get('lat'))
  const lng = parseFloat(params.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null

  return { lat, lng }
}

export const formatSearchQueryLocation = (location) => {
  if (!location) return null

  const lat = parseFloat(location.lat)
  const lng = parseFloat(location.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null

  return { lat, lng }
}

// the point a list of businesses is asked for: the order's address, else the
// project's default location (configs), else null
export const searchPoint = (addressLocation, configs) => formatSearchQueryLocation(addressLocation) || formatSearchQueryLocation({
  lat: configs?.location_default_latitude?.value,
  lng: configs?.location_default_longitude?.value
})

// "lat,lng" for the list that asks the API for distances (favorite businesses):
// the order's address when it has coordinates, else the project's default
// location (configs), else 0,0. The API answers 400 «The Location field is
// required» to a list of businesses without one and takes any
// point, so the request always carries one; with 0,0 the distances mean
// nothing (see hasFavoritesLocation).
export const favoritesLocation = (addressLocation, configs) => {
  const point = searchPoint(addressLocation, configs)
  return point ? `${point.lat},${point.lng}` : '0,0'
}

// whether favoritesLocation is a real point, so the distances it gives are real
export const hasFavoritesLocation = (addressLocation, configs) => !!searchPoint(addressLocation, configs)

export const hasValidSearchLocation = (location) => !!formatSearchQueryLocation(location)

export const appendLocationToSearch = (existingSearch, location) => {
  const formatted = formatSearchQueryLocation(location)
  if (!formatted) return existingSearch || ''

  const params = new URLSearchParams((existingSearch || '').replace(/^\?/, ''))
  params.set('lat', String(formatted.lat))
  params.set('lng', String(formatted.lng))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const resolveSearchQuery = (existingSearch, orderLocation, fallbackLocation) => {
  const normalizedExisting = (existingSearch || '').replace(/^\?/, '')
  if (formatSearchQueryLocation(orderLocation)) {
    return normalizedExisting ? `?${normalizedExisting}` : ''
  }
  return appendLocationToSearch(existingSearch, fallbackLocation || orderLocation)
}

// A city-search link can select an order type before the listing queries it.
export const applySearchOrderType = ({ search, activeType, allowedTypes, changeType }) => {
  const type = Number(new URLSearchParams(search).get('order_type'))
  const allowed = allowedTypes?.split('|').map(Number) ?? []
  if (type && type !== activeType && allowed.includes(type)) return changeType(type)
}

export const stripLocationSearchParams = (search) => {
  const params = new URLSearchParams((search || '').replace(/^\?/, ''))
  params.delete('lat')
  params.delete('lng')
  params.delete('order_type')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
