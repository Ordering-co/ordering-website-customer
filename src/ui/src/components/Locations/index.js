import React, { useState, useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { ThemeProvider, useTheme } from 'styled-components'
import { useConfig } from '~components/contexts/ConfigContext'
import { LocationsMap } from '~components/components/LocationsMap'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { getGoogleMapImage } from '~ui/utils'
import { StaticMap } from '~ui/src/components/StaticMap'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { businessesMapFallback, orderMapMarker, staticMapMarker } from '~/utils/mapMarkers'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import {
  WrapperMap,
  ContainerCard,
  WrapperBusinessCard,
  BusinessHero,
  BusinessContent,
  BusinessInfo,
  BusinessName
} from './styles'

const hasValidCoordinates = (location) =>
  Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))

// shortcut: a hard cap on markers, not a measured URL length; Mapbox Static
// Images has a request-length limit, raise this only after hitting it for real
const STATIC_MAP_MAX_MARKERS = 20
// no theme height here (WrapperMap is 100% of its parent); its one real
// caller (BusinessListingSearch) wraps it at 500px
const STATIC_MAP_HEIGHT = 500

export const Locations = (props) => {
  const {
    businessList,
    userLocation,
    onBusinessClick,
    selectedBusiness,
    forceCenter,
    listenLocations
  } = props

  const [infoWindow, setInfoWindow] = useState(null)
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const [{ parsePrice, optimizeImage }] = useUtils()
  const [, t] = useLanguage()
  const googleMapsApiKey = configs?.google_maps_api_key?.value
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  const useAlternativeMap = configs?.use_alternative_to_google_maps?.value === '1'
  const mapboxToken = configs?.map_box_token?.value
  const googleMapsWorking = !useAlternativeMap && !!googleMapsApiKey && !googleMapsFailed

  // the business logo wins and map.store is the fallback (§2.M)
  const fallbackIcon = businessesMapFallback(theme)

  const locations = businessList?.filter((business) => hasValidCoordinates(business?.location))?.map(business => ({
    ...business,
    lat: Number(business.location.lat),
    lng: Number(business.location.lng),
    icon: optimizeImage(business?.logo, 'r_max') || fallbackIcon,
    // a markup of its own (outside the app's tree): it takes the theme here
    markerPopup: renderToString(
      <ThemeProvider theme={theme}>
        <ContainerCard className='business-map-card'>
          <WrapperBusinessCard>
            <BusinessHero>
              <BusinessName className='business-name-map'>{business?.name}</BusinessName>
              <BusinessContent>
                {business?.phone && (
                  <BusinessInfo className='business-tel-map'>
                    <div>
                      <span className='bold'>{t('PHONE_NUMBER', 'Phone number')}: </span>
                      <a href={`tel:${business?.phone}`}>
                        {business?.phone}
                      </a>
                    </div>

                  </BusinessInfo>
                )}
                {business?.address && (
                  <BusinessInfo>
                    <div><span className='bold'>{t('ADDRESS', 'Address')}: </span>{business?.address}</div>
                  </BusinessInfo>
                )}
                {business?.delivery_price > 0 && (
                  <BusinessInfo>
                    <div><span className='bold'>{t('DELIVERY_FEE', 'Delivery fee')}: </span>{parsePrice((business?.delivery_price))}</div>
                  </BusinessInfo>
                )}
                {business?.service_fee > 0 && (
                  <BusinessInfo>
                    <div><span className='bold'>{t('PICKUP_FEE', 'Pickup fee')}: </span>{parsePrice((business?.service_fee))}</div>
                  </BusinessInfo>
                )}
              </BusinessContent>
            </BusinessHero>
          </WrapperBusinessCard>
        </ContainerCard>
      </ThemeProvider>
    ),
    onBusinessCustomClick: () => onBusinessClick(business)
  }))

  useEffect(() => {
    if (selectedBusiness) {
      const selectedLocation = locations?.find(loc => loc.id === selectedBusiness.id)
      if (selectedLocation) {
        setInfoWindow({
          location: selectedLocation,
          content: selectedLocation.markerPopup
        })
      }
    } else {
      setInfoWindow(null)
    }
  }, [selectedBusiness])

  const googleMapsControls = {
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    scaleControl: false,
    cameraControl: false
  }

  // Mapbox failover: the user and every business as markers (viewport auto,
  // capped at STATIC_MAP_MAX_MARKERS). No click/popup interaction on a still image.
  const staticMapMarkers = [
    staticMapMarker(theme, userLocation, orderMapMarker(theme, 'customer')),
    ...(locations || []).map((location) => staticMapMarker(theme, location, location?.icon))
  ].filter(Boolean).slice(0, STATIC_MAP_MAX_MARKERS)
  const staticMapSources = [
    mapboxStaticUrl(getGoogleMapImage(null, '', { height: STATIC_MAP_HEIGHT }), mapboxToken, { extraMarkers: staticMapMarkers })
  ]

  // the box goes with the map: no provider left leaves nothing, not an empty box
  const wrap = (map) => <WrapperMap>{map}</WrapperMap>

  return googleMapsWorking
    ? wrap(
      <LocationsMap
        apiKey={googleMapsApiKey}
        location={userLocation}
        locations={locations}
        mapControls={googleMapsControls}
        activeInfoWindow={infoWindow}
        forceCenter={forceCenter}
        listenLocations={listenLocations}
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
