import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'

import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'
import { getGoogleMapImage, generalUtilities } from '~ui/utils'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { StaticMap } from '~ui/src/components/StaticMap'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { isCourierTrackingProject } from '~/utils/trackingOnlyMode'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { staticMarkerStyle } from '~/utils/mapMarkers'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { themeValue } from '~/utils/themeTokens'
import { applyOrderMapStyles, orderStaticMapStyle } from '~/utils/mapStyle'
import { ProgressBar, progressTheme } from '~ui/src/styles/Progress'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { Button } from '~ui/src/design-system/components/Button'
import { slotButtonOptions } from '~/utils/themeGroups'
import { ORDER_TRACKING } from '~/utils/orderTheme'
import { usePageSections } from '~ui/hooks/usePageSections'
import { Icon } from '~ui/src/design-system/components/Icon'
import { useDriverLocationInterpolation } from '../../../../hooks/useDriverLocationInterpolation'
import { OrderEtaRange } from './OrderEtaRange'
import { DeliveryOrderTabs } from './DeliveryOrderTabs'
import { SatisfactionSurvey } from './SatisfactionSurvey'
import { TrackingProductItem } from './TrackingProductItem'
import { DeliveryPin } from '../../DeliveryPin'
import {
  getTrackingStep,
  getTrackingPercentage,
  canShowLiveMap,
  getDriverPlate,
  isRejectedStatus,
  isCompletedStatus,
  isDeliveredStatus,
  isDeliveryOrder,
  getTrackingMarkerIcons,
  getTrackingSurveyImage,
  getOrderEtaRange,
  TRACKING_MAP_STATUSES
} from './trackingUtils'
import {
  Container,
  WrapperContainer,
  HeaderContent,
  StatusBarContainer,
  StageIcon,
  ReviewedText,
  MapWrapper,
  MapBox,
  MapTrackingWrapper,
  MapToggleLane,
  InfoCard,
  SectionTitleContainer,
  PersonRow,
  SkeletonList,
  SkeletonCenter
} from './styles'

const STAGE_POSITIONS = [0, 33.33, 66.66, 100]
// the theme's icons of the stages: preparing, on the way, arrived, delivered
const STAGE_ICON_NAMES = ['store', 'truckDelivery', 'home', 'checkCircleFill']

const parseLocation = (location) => {
  if (!location) return null
  if (typeof location.location === 'string') {
    const [lat, lng] = location.location.split(',').map((value) => parseFloat(value.replace(/[^-.0-9]/g, '')))
    return { ...location, lat, lng }
  }
  return location
}

export const OrderTrackingLayout = (props) => {
  const {
    driverLocation,
    googleMapsControls,
    handleOrderRedirect,
    hashKey
  } = props
  const { order, loading, error } = props.order

  const [ordering] = useApi()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ parseDate, timeFormat }] = useUtils()
  const { getStatusPrefix } = generalUtilities()
  const theme = useTheme()
  // pages.order_details, group tracking: the blocks under the header
  const { isVisible, render: renderSections } = usePageSections('order_details')
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const driverMarkersRef = useRef(null)

  const status = parseInt(order?.status, 10)
  const isRejected = isRejectedStatus(status)
  const isCompleted = isCompletedStatus(status)
  const isDelivered = isDeliveredStatus(status)
  const isDelivery = isDeliveryOrder(order?.delivery_type)
  const isPickup = order?.delivery_type === 2
  const step = getTrackingStep(status)
  const googleMapsApiKey = configs?.google_maps_api_key?.value
  const hourFormat = timeFormat || 'hh:mm A'

  const hideProgress = themeHidden(theme, 'confirmation.order.progress')
  const hideOrderEta = themeHidden(theme, 'confirmation.order.eta')
  // the estimate needs delivery_datetime_utc (getOrderEtaRange)
  const hasEta = !!getOrderEtaRange(order)
  const hideDriverName = themeHidden(theme, 'confirmation.driver.name')
  const hideDriverPhoto = themeHidden(theme, 'confirmation.driver.photo')
  const hideDriverPhone = themeHidden(theme, 'confirmation.driver.phone')
  const hideCustomerPhoto = themeHidden(theme, 'confirmation.customer.photo')
  const hideCustomerEmail = themeHidden(theme, 'confirmation.customer.email')
  const hideCustomerPhone = themeHidden(theme, 'confirmation.customer.phone')
  const hideCustomerAddress = themeHidden(theme, 'confirmation.customer.address')
  const hideReviews = themeHidden(theme, 'orders.review_order_button')

  const externalDriver = order?.external_driver
    ? {
        name: order.external_driver.name,
        lastname: '',
        photo: order.external_driver.photo,
        phone: order.external_driver.phone,
        location: (order.external_driver.latitude != null && order.external_driver.longitude != null)
          ? { lat: Number(order.external_driver.latitude), lng: Number(order.external_driver.longitude) }
          : null
      }
    : null
  const driver = order?.external_driver_id ? externalDriver : order?.driver
  const driverPhone = driver?.cellphone || driver?.phone
  // confirmation.driver.plate hides the plate
  const driverPlate = themeVisible(theme, 'confirmation.driver.plate') ? getDriverPlate(driver) : null
  const effectiveDriverLocation = driverLocation || driver?.location
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  // Mapbox static maps are StaticMap's failover when Google's fails: no key,
  // gm_authFailure, the script erroring, or a timeout. use_alternative_to_google_maps
  // sends it there first; the customer's pin (delivery only) is added only on this side
  const useAlternativeMap = configs?.use_alternative_to_google_maps?.value === '1'
  const mapboxToken = configs?.map_box_token?.value
  const googleMapsAvailable = !useAlternativeMap && !!googleMapsApiKey && !googleMapsFailed
  // whether the order is in a status/driver-location state the live map
  // would track, Google or not
  const canTrackDriver = !isRejected && canShowLiveMap(order, effectiveDriverLocation)
  const showLiveMap = canTrackDriver && googleMapsAvailable
  // Google unavailable while still trackable: the live map's own Mapbox
  // failover (driver centered, store and customer as extra markers) instead
  // of leaving the block empty
  const showLiveMapFallback = canTrackDriver && !googleMapsAvailable
  const markerIcons = getTrackingMarkerIcons(theme, order)
  const trackingMapConfigs = { zoom: 15, height: themeValue(theme, ORDER_TRACKING, 'base.map_height'), marker: staticMarkerStyle(theme, markerIcons.business), style: orderStaticMapStyle(theme) }
  const customerMapMarkers = order?.delivery_type === 1 && order?.customer?.location
    ? [{ location: order.customer.location, style: staticMarkerStyle(theme, markerIcons.customer) }]
    : []
  const staticMapSources = [
    (!useAlternativeMap && googleMapsApiKey) ? getGoogleMapImage(order?.business?.location, googleMapsApiKey, trackingMapConfigs) : null,
    mapboxStaticUrl(getGoogleMapImage(order?.business?.location, '', trackingMapConfigs), mapboxToken, { extraMarkers: customerMapMarkers })
  ]
  const showStaticMap = !showLiveMap && !isRejected && !isCompleted && staticMapSources.some(Boolean) && isVisible('map') &&
    !!order?.business?.location && !TRACKING_MAP_STATUSES.includes(status)
  // the live map's own failover: the driver centered, the store and
  // customer added as extra markers (the icons the live map itself uses)
  const liveMapConfigs = { zoom: 15, height: themeValue(theme, ORDER_TRACKING, 'base.map_height'), marker: staticMarkerStyle(theme, markerIcons.driver), style: orderStaticMapStyle(theme) }
  const liveMapExtraMarkers = [
    { location: order?.business?.location, style: staticMarkerStyle(theme, markerIcons.business) },
    ...(order?.customer?.location ? [{ location: order.customer.location, style: staticMarkerStyle(theme, markerIcons.customer) }] : [])
  ]
  const liveMapFallbackSources = [
    mapboxStaticUrl(getGoogleMapImage(parseLocation(effectiveDriverLocation), '', liveMapConfigs), mapboxToken, { extraMarkers: liveMapExtraMarkers })
  ]
  const showDeliveryProgress = isDelivery && !isRejected
  const showSurvey = !isRejected && !hideReviews && isDelivered
  const showTabs = isDelivery && !isRejected && !isCompleted
  const surveyImage = getTrackingSurveyImage(theme, order)
  const isCourierTracking = isCourierTrackingProject(ordering?.project)
  // components.order_tracking photo_size (the people's photos)
  const photoSize = themeValue(theme, ORDER_TRACKING, 'base.photo_size')

  const stageTexts = [
    t('TRACKING_STAGE_PREPARING', 'We are preparing your order'),
    t('TRACKING_STAGE_ON_THE_WAY', 'On the way to your address'),
    t('TRACKING_STAGE_ARRIVED', 'Your order has arrived'),
    t('TRACKING_STAGE_DELIVERED', 'We have delivered your order')
  ]
  const legacyStatus = getStatusPrefix({ status, isPickup })
  const percentage = showDeliveryProgress ? getTrackingPercentage(step) : (legacyStatus?.percentage ?? 0)
  const statusText = showDeliveryProgress ? stageTexts[step] : legacyStatus?.value
  const deliveredAt = order?.reporting_data?.at?.[`status:${order?.status}`]

  const locations = [
    parseLocation({ ...effectiveDriverLocation, icon: markerIcons.driver }),
    parseLocation({ ...order?.business?.location, icon: markerIcons.business }),
    parseLocation({ ...order?.customer?.location, icon: markerIcons.customer })
  ]

  const pricedProducts = useMemo(
    () => isCourierTracking
      ? (order?.products || [])
      : (order?.products || []).filter(product => Number(product?.price) > 0),
    [order?.products, isCourierTracking]
  )
  const productList = useMemo(() => pricedProducts.map(product => (
    <TrackingProductItem
      key={product.id}
      product={product}
      toppingsRemoved={order?.toppings_removed?.[product?.code]}
      hidePrice={isCourierTracking}
    />
  )), [pricedProducts, order?.toppings_removed, isCourierTracking])

  const handleDriverMarkerUpdate = useCallback((position) => {
    if (driverMarkersRef.current && window.google?.maps) {
      const newPos = new window.google.maps.LatLng(position.lat, position.lng)
      if (driverMarkersRef.current.centerMarker) {
        driverMarkersRef.current.centerMarker.setPosition(newPos)
      }
      if (driverMarkersRef.current.driverMarker) {
        driverMarkersRef.current.driverMarker.setPosition(newPos)
      }
    }
  }, [])

  useDriverLocationInterpolation(
    showLiveMap ? driverLocation : null,
    { onPositionUpdate: showLiveMap ? handleDriverMarkerUpdate : null }
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!isMapExpanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMapExpanded])

  // the map's resize after a toggle: cleared on unmount (a timer that fires after the teardown finds no window)
  const resizeTimers = useRef(new Set())
  useEffect(() => {
    const timers = resizeTimers.current
    return () => timers.forEach(clearTimeout)
  }, [])

  const toggleMapExpanded = () => {
    setIsMapExpanded((expanded) => !expanded)
    const timer = setTimeout(() => {
      resizeTimers.current.delete(timer)
      window.dispatchEvent(new Event('resize'))
    }, 150)
    resizeTimers.current.add(timer)
  }

  if (loading && !error) {
    // the placeholders of the status, the bar, the delivery time and the map
    // as tall as theirs (components.order_tracking, components.progress md)
    // (a line of a text style: its size times its line ratio, in px)
    const lineOf = (path) => {
      const { size, line } = themeValue(theme, ORDER_TRACKING, path)
      return Math.round(size * line * 100) / 100
    }
    return (
      <Container data-doc-section='order-tracking-loading'>
        <WrapperContainer>
          <SkeletonList>
            <SkeletonCenter>
              <Skeleton height={lineOf('base.status_text')} width={260} />
            </SkeletonCenter>
            <Skeleton height={progressTheme(theme).height} />
            <Skeleton height={lineOf('base.eta_text')} width={220} />
            <Skeleton height={themeValue(theme, ORDER_TRACKING, 'base.map_height')} />
            <Skeleton height={120} />
          </SkeletonList>
        </WrapperContainer>
      </Container>
    )
  }

  if (!loading && error) {
    const isExpired = error.includes('ERROR_ACCESS_EXPIRED')
    return (
      <Container data-doc-section='order-tracking-error'>
        <WrapperContainer>
          {isExpired
            ? (
              <NotFoundSource
                headingLevel='h1'
                icon='receipt'
                content={t('ERROR_ACCESS_EXPIRED', 'Sorry, the order has expired.')}
              />
              )
            : (
              <NotFoundSource
                headingLevel='h1'
                icon='receipt'
                content={t('NOT_FOUND_ORDER', 'Sorry, we couldn\'t find the requested order.')}
                btnTitle={t('GO_TO_HOME', 'Go to home')}
                onClickButton={handleOrderRedirect}
              />
              )}
        </WrapperContainer>
      </Container>
    )
  }

  if (!order || Object.keys(order).length === 0) return null

  return (
    <Container data-doc-section='order-tracking'>
      <WrapperContainer>
        <HeaderContent>
          {isRejected && (
            <h1 className='order-status' data-doc-section='order-tracking-canceled'>{t('ORDER_CANCELED', 'Order canceled')}</h1>
          )}
          {!isRejected && statusText && (
            <h1 className='order-status' data-doc-section='order-tracking-status'>{statusText}</h1>
          )}

          {!isRejected && !hideProgress && (
            <StatusBarContainer percentage={percentage} data-doc-section='order-tracking-stages'>
              {/* components.progress under the stage icons */}
              <ProgressBar
                size='md'
                value={percentage}
                state={percentage === 100 ? 'complete' : 'active'}
                aria-label={statusText || t('ORDER_IN_PROGRESS', 'Order in progress')}
              />
              {STAGE_POSITIONS.map((position, index) => (
                <StageIcon
                  key={position}
                  position={position}
                  active={showDeliveryProgress ? step >= index : (index === 3 ? percentage === 100 : percentage >= position)}
                >
                  {/* an icon of the theme, no image */}
                  <Icon name={STAGE_ICON_NAMES[index]} />
                </StageIcon>
              ))}
            </StatusBarContainer>
          )}

          {showDeliveryProgress && (isCompleted || (!hideOrderEta && hasEta)) && (
            <p className='eta-range' data-doc-section='order-tracking-eta'>
              {isCompleted
                ? (
                  <>
                    {t('DELIVERED_AT', 'Delivered at')}:{' '}
                    <b>{deliveredAt ? parseDate(deliveredAt, { outputFormat: hourFormat }) : ''}</b>
                  </>
                  )
                : (
                  <>
                    {t('ESTIMATED_DELIVERY', 'Estimated delivery')}:{' '}
                    <b><OrderEtaRange order={order} outputFormat={hourFormat} /></b>
                  </>
                  )}
            </p>
          )}

          {!isCompleted && (
            <DeliveryPin order={order} className='delivery-pin' />
          )}

          {isRejected && (
            <ReviewedText>
              <p>{t('ORDER_HAS_BEEN_CANCELED', 'This order has been canceled')}</p>
            </ReviewedText>
          )}

          {showSurvey && (
            <SatisfactionSurvey order={order} hashKey={hashKey} image={surveyImage} />
          )}

          {showStaticMap && (
            <StaticMap
              sources={staticMapSources}
              id='google-maps-image'
              alt={t('LOCATION_MAP', 'Location map')}
              loading='lazy'
              wrap={(img) => (
                <MapWrapper data-doc-section='order-tracking-static-map'>
                  <MapBox>{img}</MapBox>
                </MapWrapper>
              )}
            />
          )}
        </HeaderContent>

        {renderSections({
          live_map: () => showLiveMap
            ? (
              <MapTrackingWrapper expanded={isMapExpanded} data-doc-section='order-tracking-map'>
                <MapBox>
                  <GoogleMapsMap
                    location={parseLocation(effectiveDriverLocation)}
                    locations={locations}
                    mapControls={googleMapsControls}
                    apiKey={googleMapsApiKey}
                    manualZoom
                    animateDriver
                    onDriverMarkerReady={(markers) => {
                      driverMarkersRef.current = markers
                      applyOrderMapStyles(theme, markers)
                    }}
                  />
                </MapBox>
                <MapToggleLane expanded={isMapExpanded}>
                  <Button
                    layout='row'
                    iconSize='content'
                    borderInset
                    fullWidth
                    {...slotButtonOptions(theme, ORDER_TRACKING, isMapExpanded ? 'map_toggle_expanded' : 'map_toggle', { color: 'neutral' })}
                    onClick={toggleMapExpanded}
                    data-doc-control='order-tracking-map-toggle'
                  >
                    <Icon name={isMapExpanded ? 'fullscreenExit' : 'fullscreen'} />
                    <span>{isMapExpanded ? t('MINIMIZE_MAP', 'Minimize map') : t('MAXIMIZE_MAP', 'Maximize map')}</span>
                  </Button>
                </MapToggleLane>
              </MapTrackingWrapper>
              )
            // a still image cannot track or expand, so the toggle is left out
            : showLiveMapFallback && (
              <StaticMap
                sources={liveMapFallbackSources}
                id='google-maps-image'
                alt={t('LOCATION_MAP', 'Location map')}
                loading='lazy'
                wrap={(img) => (
                  <MapTrackingWrapper data-doc-section='order-tracking-map'>
                    <MapBox>{img}</MapBox>
                  </MapTrackingWrapper>
                )}
              />
            ),
          tabs: () => showTabs && (
            <DeliveryOrderTabs
              order={order}
              productList={productList}
              productsCount={pricedProducts.length}
              hideCustomerAddress={hideCustomerAddress}
              hideCustomerPhone={hideCustomerPhone}
              hideDriverName={hideDriverName}
              hideDriverPhone={hideDriverPhone}
              isCourierTracking={isCourierTracking}
            />
          ),
          customer_card: () => !isDelivery && order.customer && (
            <InfoCard data-doc-section='order-tracking-customer'>
              <PersonRow>
                {/* components.avatar of components.order_tracking photo_size (the name beside it says who it is) */}
                {!hideCustomerPhoto && order.customer.photo && <Avatar variant='photo' src={order.customer.photo} size={photoSize} />}
                <div>
                  <p>{order.customer.name} {order.customer.lastname}</p>
                  {!hideCustomerEmail && order.customer.email && <p>{order.customer.email}</p>}
                  {!hideCustomerPhone && (order.customer.cellphone || order.customer.phone) && (
                    <p>{order.customer.cellphone || order.customer.phone}</p>
                  )}
                  {!hideCustomerAddress && order.customer.address && <p>{order.customer.address}</p>}
                </div>
              </PersonRow>
            </InfoCard>
          ),
          driver_card: () => !isDelivery && driver && !isRejected && (
            <InfoCard data-doc-section='order-tracking-driver'>
              <SectionTitleContainer>
                <h2>{t('DRIVER', 'Driver')}</h2>
              </SectionTitleContainer>
              <PersonRow>
                {/* components.avatar of photo_size, the user icon without a photo */}
                {!hideDriverPhoto && <Avatar variant='photo' src={driver.photo} size={photoSize} />}
                <div>
                  {!hideDriverName && <h3>{driver.name} {driver.lastname}</h3>}
                  {!hideDriverPhone && driverPhone && <p>{driverPhone}</p>}
                  {driverPlate && <p>{t('DRIVER_PLATE', 'Plate')}: {driverPlate}</p>}
                </div>
              </PersonRow>
            </InfoCard>
          )
        }, { group: 'tracking' })}
      </WrapperContainer>
    </Container>
  )
}
