import React from 'react'
import { useTheme } from 'styled-components'
import { WrapperMap } from './styles'

import { BusinessesMap as BusinessesMapController } from '~components/components/BusinessesMap'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { getGoogleMapImage } from '~ui/utils'
import { StaticMap } from '~ui/src/components/StaticMap'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { businessesMapFallback, orderMapMarker, staticMapMarker } from '~/utils/mapMarkers'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'

// shortcut: a hard cap on markers, not a measured URL length; Mapbox Static
// Images has a request-length limit, raise this only after hitting it for real
const STATIC_MAP_MAX_MARKERS = 20
// the height asked of the static map: the box is 7:5 (styles.js) and the image covers it
const STATIC_MAP_HEIGHT = 250

const BusinessesMapUI = (props) => {
  const {
    userLocation,
    businessLocations,
    onBusinessClick,
    setErrors
  } = props

  const [configState] = useConfig()
  const [orderState] = useOrder()
  const [, t] = useLanguage()
  const theme = useTheme()
  const googleMapsApiKey = configState?.configs?.google_maps_api_key?.value
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  const useAlternativeMap = configState?.configs?.use_alternative_to_google_maps?.value === '1'
  const mapboxToken = configState?.configs?.map_box_token?.value
  const googleMapsWorking = !useAlternativeMap && !!googleMapsApiKey && !googleMapsFailed
  // a business without logo shows map.store, not Google's pin (§2.M)
  const fallbackIcon = businessesMapFallback(theme)

  const googleMapsControls = {
    defaultZoom: 15,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: 'roadmap', // 'roadmap', 'satellite', 'hybrid', 'terrain'
    mapTypeControl: false,
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'satellite']
    },
    isMarkerDraggable: true
  }

  // Mapbox failover: the user and every business as markers (viewport auto,
  // capped at STATIC_MAP_MAX_MARKERS). No click interaction on a still image.
  const staticMapMarkers = [
    staticMapMarker(theme, userLocation, orderMapMarker(theme, 'customer')),
    ...(businessLocations || []).map((location) => staticMapMarker(theme, location, location?.icon || fallbackIcon))
  ].filter(Boolean).slice(0, STATIC_MAP_MAX_MARKERS)
  const staticMapSources = [
    mapboxStaticUrl(getGoogleMapImage(null, '', { height: STATIC_MAP_HEIGHT }), mapboxToken, { extraMarkers: staticMapMarkers })
  ]

  // the box goes with the map: no provider left leaves nothing, not an empty box
  const wrap = (map) => (
    <WrapperMap data-doc-section='businesses-map' data-doc-state={orderState.loading ? 'loading' : 'ready'} disabled={orderState.loading}>
      {map}
    </WrapperMap>
  )

  return googleMapsWorking
    ? wrap(
      <GoogleMapsMap
        apiKey={googleMapsApiKey}
        location={userLocation}
        locations={businessLocations}
        mapControls={googleMapsControls}
        maxLimitLocation={parseInt(configState?.configs?.meters_to_change_address?.value)}
        businessMap
        onBusinessClick={onBusinessClick}
        setErrors={setErrors}
        fallbackIcon={fallbackIcon}
      />
    )
    : (
      <StaticMap
        sources={staticMapSources}
        alt={t('LOCATION_MAP', 'Location map')}
        loading='lazy'
        wrap={wrap}
      />
      )
}

export const BusinessesMap = (props) => {
  const businessMapController = {
    ...props,
    UIComponent: BusinessesMapUI
  }
  return <BusinessesMapController {...businessMapController} />
}
