import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import { OrderStudentInfo } from '../OrderStudentInfo'
import {
  Container,
  OrderMessagesPane,
  WrapperContainer,
  OrderInfo,
  StatusProgress,
  Map,
  OrderDriver,
  WrapperDriver,
  OrderProducts,
  SkeletonBlockWrapp,
  SkeletonBlock,
  WrapperLeftContainer,
  WrapperRightContainer,
  SkeletonWrapper,
  ReviewWrapper,
  TitleContainer,
  OrderPreferences,
  HeaderTitle,
  MapWrapper,
  ProfessionalWrapper,
  ProfessionalBlock,
  OrderClonnedMessage,
  OrderButtons,
  OrderActionCell,
  DirectionButtonWrapper,
  Divider,
  ReviewsProgressContent,
  OrderPageTitle,
  CompletedProductsList
} from './styles'

import { OrderDetails as OrderDetailsController } from '~components/components/OrderDetails'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useBusiness } from '~components/contexts/BusinessContext'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'

import { OrderEta } from './OrderEta'
import { DeliveryPin } from './DeliveryPin'
import { OrderTrackingLayout } from './layouts/Tracking'
import { OrderBillSection } from './OrderBillSection'
import { OrderRewardsBanner } from './OrderRewardsBanner'
import { ActionsSection } from './ActionsSection'
import { OrderPreferencesSection } from './OrderPreferencesSections'
import { OrderHistory } from './OrderHistory'
import { getUtils } from './utils'
import { REJECTED_STATUSES } from './layouts/Tracking/trackingUtils'
import { useDriverLocationInterpolation } from '../../hooks/useDriverLocationInterpolation'
import { Icon } from '~ui/src/design-system/components/Icon'

/* import { ReviewOrderSimple as ReviewOrder } from '../ReviewOrderSimple' */

import { getGoogleMapImage, generalUtilities } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { Rating } from '~ui/src/design-system/components/Rating'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Confirm } from '~ui/src/components/Confirm'
import { ReviewOrder } from '~ui/src/components/ReviewOrder'
import { ReviewProduct } from '~ui/src/components/ReviewProduct'
import { ReviewDriver } from '~ui/src/components/ReviewDriver'
import { ReviewProfessional } from '~ui/src/components/ReviewProfessional'
import { ProductItemAccordion } from '~ui/src/components/ProductItemAccordion'
import { TaxInformation } from '~ui/src/components/TaxInformation'
import { Messages } from '~ui/src/components/Messages'
import { SendGiftCard } from '~ui/src/components/GiftCard/SendGiftCard'
import { StaticMap } from '~ui/src/components/StaticMap'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { themeColor } from '~/utils/themeColors'
import { businessLogoPlaceholder, themeSpace, themeTextStyle, themeValue } from '~/utils/themeTokens'
import { orderMapMarker, staticMarkerStyle } from '~/utils/mapMarkers'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { applyOrderMapStyles, orderStaticMapStyle } from '~/utils/mapStyle'
import { ORDER_DETAILS } from '~/utils/orderTheme'
import { slotButtonOptions } from '~/utils/themeGroups'
import { usePageSections } from '~ui/hooks/usePageSections'
import { FallbackImage } from '~ui/src/styles/FallbackImage'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { isInsideOverlay } from '~/utils/overlay'
import { AccountInviteOnEnter } from '~ui/src/components/AccountInvite'

// The parts of an active order's summary that are sections of
// pages.order_details, in today's order
const ACTIVE_SUMMARY_KEYS = ['driver', 'products', 'bill', 'address', 'rewards']

const OrderDetailsUI = (props) => {
  const {
    handleBusinessRedirect,
    handleOrderRedirect,
    googleMapsControls,
    driverLocation,
    messages,
    setMessages,
    readMessages,
    messagesReadList,
    reorderState,
    handleReorder,
    orderTypes,
    handleRemoveCart,
    loyaltyPlansState
  } = props

  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  // pages.order_details: the sections of the three layouts of the order
  const { sections, isVisible } = usePageSections('order_details')
  const [events] = useEvent()
  const [{ parsePrice, parseDate, timeFormat }] = useUtils()
  const [{ carts }] = useOrder()
  const { getStatusPrefix } = generalUtilities()
  const [, { setBusiness }] = useBusiness()
  const { setLocalMoment } = getUtils()

  const [openMessages, setOpenMessages] = useState({ business: false, driver: false })
  const [isOrderReviewed, setIsOrderReviewed] = useState(false)
  const [isProductReviewed, setIsProductReviewed] = useState(false)
  const [isDriverReviewed, setIsDriverReviewed] = useState(false)
  const [isProReviewed, setIsProReviewed] = useState(false)
  const [isGiftCardSent, setIsGiftCardSent] = useState(false)
  const [unreadAlert, setUnreadAlert] = useState({ business: false, driver: false })
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState({ order: false, product: false, driver: false, professional: false })
  const [openTaxModal, setOpenTaxModal] = useState({ open: false, tax: null })
  const [isService, setIsService] = useState(false)
  const [isOrderHistory, setIsOrderHistory] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })

  const { order, loading, businessData, error } = props.order
  // The invitation to create an account (a guest's) waits for the order, and stays once it is there: the
  // account made in it changes the session and the order loads again, which must not take it away.
  const inviteReady = useRef(false)
  if (order?.id && !error) inviteReady.current = true
  const acceptedStatus = [1, 2, 5, 6, 10, 11, 12, 15]
  const completedStatus = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]
  // a finished order that was rejected or canceled (its status badge and
  // icon take the danger look)
  const terminalRejected = REJECTED_STATUSES.includes(parseInt(order?.status, 10))
  const placeSpotTypes = [3, 4, 5]
  const activeStatus = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
  const googleMapsApiKey = configs?.google_maps_api_key?.value
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  const showStarbucksHeader = false
  const changeIdToExternalId = configs?.change_order_id?.value === '1'
  const cateringTypes = [7, 8]
  const deliveryTypes = [1, 7]

  const hideOrderActions = deliveryTypes?.includes(order?.delivery_type)
  const declaredValueMeta = order?.metafields?.find?.(m => m?.key === 'declared_value')
  const rawDeclaredValue = declaredValueMeta ? parseFloat(declaredValueMeta.value) : parseFloat(order?.declared_value)
  const declaredValue = Number.isFinite(rawDeclaredValue) ? rawDeclaredValue : 0
  const isCustomOrder = order?.declared_value != null || declaredValueMeta
  const isGiftCardOrder = !order?.business_id && !isCustomOrder
  const isReservation = order?.delivery_type === 9
  const orderDisplayTotal = (order?.summary?.total ?? order?.total ?? 0) + (isCustomOrder ? declaredValue : 0)
  const hideOrderPrices = Number(orderDisplayTotal) === 0

  const hideDeliveryType = themeHidden(theme, 'confirmation.order.delivery_type')
  const hideDeliveryDate = themeHidden(theme, 'confirmation.order.date') || isReservation
  const hideDeliveryProgress = themeHidden(theme, 'confirmation.order.progress')
  const hideOrderEta = themeHidden(theme, 'confirmation.order.eta')
  const hideCustomerAddress = themeHidden(theme, 'confirmation.customer.address')
  const hideDriverName = themeHidden(theme, 'confirmation.driver.name')
  const hideReviewOrderButton = themeHidden(theme, 'orders.review_order_button')
  // "Order again" (visibility.orders.reorder_button, as on the orders' cards)
  const showReorderButton = themeVisible(theme, 'orders.reorder_button')
  const hideDriverPhoto = themeHidden(theme, 'confirmation.driver.photo')
  // confirmation.driver.phone: the driver's call button (the Tracking layout
  // hides the number with the same key)
  const hideDriverPhone = themeHidden(theme, 'confirmation.driver.phone')

  const validTrackingStatus = [9, 18, 19, 23, 26]
  // The address of the order's type is the customer's on a delivery
  // (confirmation.customer.address hides it), the store's otherwise
  const showOrderTypeAddress = !(hideCustomerAddress && order?.delivery_type === 1)
  const showPickupAddress = !!(isCustomOrder && order?.business?.address)
  // components.order_details (sizes of its pieces)
  const progressSize = themeValue(theme, ORDER_DETAILS, 'base.progress_size')
  const driverAvatarSize = themeValue(theme, ORDER_DETAILS, 'base.driver_avatar_size')
  const finishedDriverAvatarSize = themeValue(theme, ORDER_DETAILS, 'base.finished_driver_avatar_size')
  const ratingSize = themeValue(theme, ORDER_DETAILS, 'base.rating_size')
  // pieces the theme can hide (visibility confirmation.*)
  const showHelp = themeVisible(theme, 'confirmation.order.help')
  const showDirections = themeVisible(theme, 'confirmation.order.directions')
  const showBusinessLogo = themeVisible(theme, 'confirmation.business.logo')
  const showBusinessPhone = themeVisible(theme, 'confirmation.business.phone')
  const showBusinessMessages = themeVisible(theme, 'confirmation.business.messages')
  // the static map marks the business with map.store (T8), in the
  // order_details map_style, requested at the size of its box (map_height)
  const mapHeight = themeValue(theme, ORDER_DETAILS, 'base.map_height')
  const mapConfigs = { zoom: 15, height: mapHeight, marker: staticMarkerStyle(theme, orderMapMarker(theme, 'store', order?.business?.logo)), style: orderStaticMapStyle(theme) }
  // Mapbox static maps are the failover (StaticMap) when Google's fails:
  // 403 by referrer, quota, network. use_alternative_to_google_maps sends
  // it there first; the customer's pin (delivery only) is added only on
  // this side, so Google's own `markers=` stays untouched
  const useAlternativeMap = configs?.use_alternative_to_google_maps?.value === '1'
  const mapboxToken = configs?.map_box_token?.value
  // the live map (driver's GoogleMaps) needs a working Google too; it falls
  // back to the same Mapbox failover as the other maps below
  const googleMapsAvailable = !useAlternativeMap && !!googleMapsApiKey && !googleMapsFailed
  const customerMapMarkers = order?.delivery_type === 1 && order?.customer?.location
    ? [{ location: order.customer.location, style: staticMarkerStyle(theme, orderMapMarker(theme, 'customer')) }]
    : []
  const staticMapSources = [
    (!useAlternativeMap && googleMapsApiKey) ? getGoogleMapImage(order?.business?.location, googleMapsApiKey, mapConfigs) : null,
    mapboxStaticUrl(getGoogleMapImage(order?.business?.location, '', mapConfigs), mapboxToken, { extraMarkers: customerMapMarkers })
  ]

  const isDriverOnWayToCustomer = order?.delivery_position === 1 || order?.delivery_position == null

  const isExternalDriver = !!order?.external_driver_id
  const isReviewableDriver = !!order?.driver && !isExternalDriver
  // the review block (its stars, Review and Order again), else Order again alone
  const showReviewActions = !isOrderReviewed && (!order?.review || (isReviewableDriver && !order?.user_review)) && !hideReviewOrderButton
  const externalDriverAsDriver = order?.external_driver
    ? {
        id: order.external_driver.id,
        name: order.external_driver.name,
        lastname: '',
        photo: order.external_driver.photo,
        cellphone: order.external_driver.phone,
        phone: order.external_driver.phone,
        location: (order.external_driver.latitude != null && order.external_driver.longitude != null)
          ? { lat: Number(order.external_driver.latitude), lng: Number(order.external_driver.longitude) }
          : null
      }
    : null
  const displayDriver = isExternalDriver ? externalDriverAsDriver : order?.driver
  const effectiveDriverLocation = driverLocation || displayDriver?.location
  const isTracking = !!effectiveDriverLocation && validTrackingStatus.includes(parseInt(order?.status))
  // the live map (the driver's GoogleMaps, not StaticMap's failover) still
  // needs the Google key: it is out of scope for the Mapbox failover
  const useLiveMap = !!displayDriver && isTracking
  const driverMarkersRef = useRef(null)

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
    isTracking ? driverLocation : null,
    {
      onPositionUpdate: isTracking ? handleDriverMarkerUpdate : null
    }
  )

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
  }

  const unreadMessages = () => {
    const length = messages?.messages.length
    const unreadLength = order?.unread_count
    const unreadedMessages = messages.messages.slice(length - unreadLength, length)
    const business = unreadedMessages.some(message => message?.can_see?.includes(2))
    const driver = unreadedMessages.some(message => message?.can_see?.includes(4))
    setUnreadAlert({ business, driver })
  }

  // the map.* images of the theme (the driver photo stays in its card)
  const locations = [
    { ...effectiveDriverLocation, icon: orderMapMarker(theme, 'driver') },
    { ...order?.business?.location, icon: orderMapMarker(theme, 'store', order?.business?.logo) },
    { ...order?.customer?.location, icon: orderMapMarker(theme, 'customer') }
  ]

  const handleOpenReview = () => {
    if (!order?.review && !isOrderReviewed) setReviewStatus({ order: true, product: false, driver: false, professional: false })
    else if (!isProductReviewed && order?.customer_id && order?.paymethod_id) setReviewStatus({ order: false, product: true, driver: false, professional: false })
    else if (isReviewableDriver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true, professional: false })
    else if (isService && !isProReviewed) setReviewStatus({ order: false, product: false, driver: false, professional: true })
    else {
      setIsReviewOpen(false)
      return
    }
    setIsReviewOpen(true)
  }

  const handleCloseReivew = () => {
    setReviewStatus({ order: false, product: false, driver: false, professional: false })
    setIsReviewOpen(false)
  }

  const closeReviewOrder = () => {
    if (!isProductReviewed && order?.customer_id && order?.paymethod_id) setReviewStatus({ order: false, product: true, driver: false, professional: false })
    else if (isReviewableDriver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true, professional: false })
    else handleCloseReivew()
  }

  const closeReviewProduct = () => {
    if (isService && !isProReviewed) setReviewStatus({ order: false, product: false, driver: false, professional: true })
    else if (isReviewableDriver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true, professional: false })
    else {
      setIsDriverReviewed(true)
      handleCloseReivew()
    }
  }

  const closeOrderModal = (e) => {
    const outsideModal = !isInsideOverlay(e.target)
    if (outsideModal) {
      const _businessId = 'businessId:' + businessData?.id
      sessionStorage.setItem('adjust-cart-products', _businessId)
      handleBusinessRedirect(businessData?.slug)
    }
  }

  const handleClickReorder = (order) => {
    if (carts[`businessId:${order?.business_id}`] && carts[`businessId:${order?.business_id}`]?.products?.length > 0) {
      setConfirm({
        open: true,
        content: t('QUESTION_DELETE_PRODUCTS_FROM_CART', 'Are you sure that you want to delete all products from cart?'),
        handleOnAccept: async () => {
          handleRemoveCart()
          setConfirm({ ...confirm, open: false })
        }
      })
    } else {
      handleReorder(order.id)
    }
  }

  const handleOriginalReorder = () => {
    setConfirm({ ...confirm, open: false })
    handleReorder(order.id)
  }

  const getProductList = (orderCompleted) => {
    const professionalList = order?.products.reduce((prev, current) => {
      const found = prev.find(item => item.id === current?.calendar_event?.professional?.id)
      if (found || !current?.calendar_event) {
        return prev
      }
      return [...prev, current?.calendar_event?.professional]
    }, [])

    return (
      <>
        {professionalList?.length > 0 && professionalList.map((professional, i) => (
          <ProfessionalBlock key={i}>
            <ProfessionalWrapper>
              {/* components.avatar lg (the name beside it says who it is) */}
              <Avatar variant='photo' src={professional?.photo} size='lg' />
              <p>{professional?.name} {professional?.lastname}</p>
            </ProfessionalWrapper>
            {order?.products.filter(product => product?.calendar_event?.professional?.id === professional?.id).map(product => (
              <ProductItemAccordion
                key={product.id}
                product={product}
                showArrowIcon
                toppingsRemoved={order?.toppings_removed?.[product?.code]}
              />
            ))}
          </ProfessionalBlock>
        ))}
        {order?.products.filter(product => !product?.calendar_event).map(product => (
          <ProductItemAccordion
            key={product.id}
            product={product}
            toppingsRemoved={order?.toppings_removed?.[product?.code]}
            hideQuantitySelector={false}
            isOrderDetails
          />
        ))}
      </>
    )
  }

  const sortedProductList = useMemo(() => getProductList(), [order?.products])

  const actionsSectionProps = {
    order,
    handleBusinessRedirect,
    businessData,
    unreadAlert,
    setOpenMessages,
    readMessages,
    setUnreadAlert
  }

  const driverLocationString = typeof order?.driver?.location?.location === 'string' && order?.driver?.location?.location?.split(',').map((l) => l.replace(/[^-.0-9]/g, ''))
  const parsedLocations = locations.map(location => typeof location?.location === 'string'
    ? {
        ...location,
        lat: parseFloat(location?.location?.split(',')[0].replace(/[^-.0-9]/g, '')),
        lng: parseFloat(location?.location?.split(',')[1].replace(/[^-.0-9]/g, ''))
      }
    : location)
  const liveMapLocation = driverLocationString
    ? { lat: parseFloat(driverLocationString[0]), lng: parseFloat(driverLocationString[1]) }
    : effectiveDriverLocation
  // the live map's Mapbox failover: the driver centered, the store and
  // customer added as extra markers (the same icons the live map uses)
  const liveMapConfigs = { zoom: 15, height: mapHeight, marker: staticMarkerStyle(theme, orderMapMarker(theme, 'driver')), style: orderStaticMapStyle(theme) }
  const liveMapExtraMarkers = [
    { location: order?.business?.location, style: staticMarkerStyle(theme, orderMapMarker(theme, 'store', order?.business?.logo)) },
    ...(order?.customer?.location ? [{ location: order.customer.location, style: staticMarkerStyle(theme, orderMapMarker(theme, 'customer')) }] : [])
  ]
  const liveMapSources = [
    mapboxStaticUrl(getGoogleMapImage(liveMapLocation, '', liveMapConfigs), mapboxToken, { extraMarkers: liveMapExtraMarkers })
  ]

  useEffect(() => {
    if (driverLocation) {
      parsedLocations[0] = {
        ...locations[0],
        ...driverLocation
      }
    }
  }, [driverLocation])

  useEffect(() => {
    unreadMessages()
  }, [messages?.messages])

  useEffect(() => {
    if (messagesReadList?.length) {
      openMessages.business ? setUnreadAlert({ ...unreadAlert, business: false }) : setUnreadAlert({ ...unreadAlert, driver: false })
    }
  }, [messagesReadList])

  useEffect(() => {
    if (reorderState?.error) {
      window.addEventListener('click', closeOrderModal)
      return () => {
        window.removeEventListener('click', closeOrderModal)
      }
    }

    if (!reorderState?.error && reorderState.loading === false && businessData?.id) {
      const _businessId = 'businessId:' + businessData?.id
      const products = carts?.[_businessId]?.products
      const available = products?.every(product => product.valid === true)
      if (available && reorderState?.result?.uuid && (products?.length === order?.products.length)) {
        handleGoToPage({ page: 'checkout', params: { cartUuid: reorderState?.result.uuid } })
      } else {
        sessionStorage.setItem('adjust-cart-products', _businessId)
        products?.length !== order?.products.length && sessionStorage.setItem('already-removed', 'removed')
        handleBusinessRedirect(businessData?.slug)
      }
    }
  }, [reorderState])

  useEffect(() => {
    if (!order) return
    const _isService = order.products.some(product => product.type === 'service')
    setIsService(_isService)
    props.openBChatByParam && setOpenMessages({
      ...openMessages,
      business: !!props.openBChatByParam
    })
  }, [order])

  useEffect(() => {
    if (isGiftCardOrder && isGiftCardSent) {
      window.scrollTo(0, 0)
    }
  }, [isGiftCardOrder, isGiftCardSent])

  useEffect(() => {
    window.scrollTo(0, 0)
    setLocalMoment()
    return () => {
      setBusiness({})
    }
  }, [])

  const isPickup = order?.delivery_type && order?.delivery_type === 2
  const currentOrderStatus = getStatusPrefix({ status: order?.status, isPickup })
  const isReservationPreorder = isReservation && parseInt(order?.status, 10) === 13
  const currentOrderStatusText = isReservationPreorder
    ? t('RESERVATION', 'Reservation')
    : (currentOrderStatus?.value || t('YOUR_ORDER_IS_IN_PROGRESS', 'Your order is in progress'))

  // The parts of the active order's summary that are sections of
  // pages.order_details shared with a finished order (driver, products, bill,
  // address, rewards): the same keys hide them here, in the theme's order of
  // those sections
  const activeSummaryParts = {
    driver: (last) => displayDriver && (
      <>
        <OrderDriver>
          <WrapperDriver>
            {/* components.avatar of components.order_details driver_avatar_size (the name beside it says who it is) */}
            {!hideDriverPhoto && <Avatar variant='photo' endSpace='md' src={displayDriver?.photo} size={driverAvatarSize} />}
            <div className='driver-info'>
              <div className='driver-name-wrapper'>
                {!hideDriverName && (
                  <h2>{displayDriver?.name} {displayDriver?.lastname}</h2>
                )}
              </div>
              <p>{t('YOUR_DRIVER', 'Your driver')}</p>
            </div>
            <ActionsSection
              {...actionsSectionProps}
              actionType='driver'
              showPhone={!hideDriverPhone}
              showMessages={!isExternalDriver}
            />
          </WrapperDriver>
        </OrderDriver>
        {!last && <Divider />}
      </>
    ),
    // the products are one section of the summary
    products: () => !showStarbucksHeader && <CompletedProductsList>{sortedProductList}</CompletedProductsList>,
    bill: () => !hideOrderPrices && (
      <OrderBillSection
        order={order}
        setOpenTaxModal={setOpenTaxModal}
        showOnlyTotals={showStarbucksHeader}
        isGiftCardOrder={isGiftCardOrder}
        isHideTotal
      />
    ),
    address: () => (order?.customer || order?.business) && (showOrderTypeAddress || showPickupAddress) && (
      <OrderPreferences>
        {showPickupAddress && (
          <div className='order-type-address' style={{ marginBottom: themeSpace(theme, 'lg') }}>
            {t('PICKUP_ADDRESS', 'Pickup Address')}
            {order?.business?.name && (
              <div className='order-type'>
                <p>{order.business.name}</p>
              </div>
            )}
            <div className='order-type'>
              <p>{order?.business?.address}</p>
            </div>
          </div>
        )}
        {showOrderTypeAddress && (
          <div className='order-type-address'>
            {t('ORDER_TYPE_ADDRESS', ':ordertype: Address').replace(':ordertype:', orderTypes?.find(type => order?.delivery_type === type?.value)?.text)}
            <div className='order-type'>
              <p>{order[order?.delivery_type === 1 ? 'customer' : 'business']?.address}</p>
            </div>
          </div>
        )}
      </OrderPreferences>
    ),
    rewards: () => <OrderRewardsBanner order={order} loyaltyPlansState={loyaltyPlansState} />
  }
  // the driver stays on top of an active order (it can be hidden, not moved);
  // the other parts follow the theme's order of their sections
  const activeSummaryKeys = [
    ...(isVisible('driver') ? ['driver'] : []),
    ...sections.filter((section) => section.visible && section.key !== 'driver' && ACTIVE_SUMMARY_KEYS.includes(section.key)).map((section) => section.key)
  ]

  // The sections of the active order (pages.order_details, group active):
  // the header with its status, the map (and the directions to the store)
  // and the summary, siblings of the page in the theme's order
  const activeSections = {
    status: () => (
      <OrderInfo>
        <div className='order-progress'>
          <span>{currentOrderStatusText}</span>
          {showHelp && (
            /* help is an icon button of the theme (confirmation.order.help
               hides it) */
            <Button
              type='button'
              {...slotButtonOptions(theme, ORDER_DETAILS, 'help', { shape: 'icon', color: 'neutral', appearance: 'outline', size: 'md' })}
              aria-label={t('HELP', 'Help')}
              onClick={() => handleGoToPage({ page: 'help' })}
            >
              <Icon name='lifeBuoy' aria-hidden='true' />
            </Button>
          )}
        </div>
        {!hideDeliveryDate && (
          <>
            {cateringTypes.includes(order?.delivery_type) && (
              <p className='date'>
                {t('CREATED_AT', 'Created at')}: {parseDate(order?.created_at)}
              </p>
            )}
            <p className='date'>
              {activeStatus.includes(order?.status)
                ? (
                  <>
                    {cateringTypes.includes(order?.delivery_type) ? `${t('PLACED_TO', 'Placed to')}:` : ''} <OrderEta order={order} outputFormat={'dddd, MMMM D YYYY'} />
                  </>
                  )
                : (
                    parseDate(order?.reporting_data?.at[`status:${order.status}`], { outputFormat: `YYYY-MM-DD ${timeFormat}` })
                  )}
            </p>
          </>
        )}
        {!hideDeliveryProgress && !isGiftCardOrder && (
          <>
            {/* components.progress. Only open orders draw it (completed,
                rejected and canceled ones show the summary instead) */}
            <StatusProgress
              size={progressSize}
              value={currentOrderStatus?.percentage ?? 0}
              state={currentOrderStatus?.percentage === 100 ? 'complete' : 'active'}
              aria-label={currentOrderStatusText}
            />
            {parseInt(order?.status) === 23 && !isDriverOnWayToCustomer && (
              <p style={themeTextStyle(theme, 'body', { color: themeColor(theme, 'text'), marginTop: themeSpace(theme, 'sm'), textAlign: 'center' })}>
                {t('DRIVER_ATTENDING_ANOTHER_ORDER', 'Driver is attending another order')}
              </p>
            )}
          </>
        )}
        <TitleContainer>
          {isReservation
            ? (
                parseInt(order?.status) === 0 && (
                <div className='delivery-container'>
                  <p className='types'>{t('WE_ARE_REVIEWING_YOUR_RESERVATION', 'We are reviewing your reservation')}</p>
                </div>
                )
              )
            : (
              <>
                {!hideOrderEta && (
                  <div className='time-container'>
                    <OrderEta order={order} outputFormat={timeFormat} />
                  </div>
                )}
                <div className='delivery-container'>
                  {!hideDeliveryType && (
                    <p className='types'>
                      {isService
                        ? t('SERVICE_AT_HOME', 'Service at home')
                        : `${t('ESTIMATE_ORDER_TYPE_TIME', 'Estimate :ordertype: Time').replace(':ordertype:', orderTypes?.find(type => order?.delivery_type === type?.value)?.text)}`}
                    </p>
                  )}
                </div>
              </>
              )}
          {order?.reservation && order?.delivery_type === 9 && (
            <>
              <p className='date'>{t('RESERVATION_SCHEDULED_TO', 'Reservation scheduled to')}: {parseDate(order?.reservation?.reserve_date, { outputFormat: `YYYY-MM-DD ${timeFormat}` })}</p>
              <p>{order?.reservation?.guests_reservation} {t('GUESTS', 'Guests')}</p>
            </>
          )}
          <ActionsSection
            {...actionsSectionProps}
            actionType='business'
            showPhone={showBusinessPhone}
            showMessages={showBusinessMessages}
          />
        </TitleContainer>
        {!!order?.cloned_order_id && (
          <OrderClonnedMessage>
            <p>{t('ORDER_CLONNED_INFORMATION', 'Your order has been cloned due a missing item, no extra charges will be made, for more information, please contact the store')}</p>
          </OrderClonnedMessage>
        )}
      </OrderInfo>
    ),
    map: () => (
      <WrapperLeftContainer>
        {!showStarbucksHeader && isVisible('map') && (
          useLiveMap
            ? (googleMapsAvailable
                ? (
                <div className='map-container'>
                  <Map style={{ width: '100%' }}>
                    <GoogleMapsMap
                      location={liveMapLocation}
                      locations={parsedLocations}
                      mapControls={googleMapsControls}
                      apiKey={googleMapsApiKey}
                      manualZoom
                      animateDriver
                      onDriverMarkerReady={(markers) => {
                        driverMarkersRef.current = markers
                        applyOrderMapStyles(theme, markers)
                      }}
                    />
                  </Map>
                </div>
                  )
              // Google unavailable (no key, use_alternative_to_google_maps,
              // or useGoogleMapsFailed): the driver's live position stays
              // Google-only, so this falls back to a still Mapbox shot
              // instead of leaving the block empty
                : (
                <StaticMap
                  sources={liveMapSources}
                  id='google-maps-image'
                  alt={t('LOCATION_MAP', 'Location map')}
                  width='100%'
                  height='100%'
                  loading='lazy'
                  wrap={(img) => (
                    <div className='map-container'>
                      <MapWrapper>
                        <Map style={{ width: '100%' }}>{img}</Map>
                      </MapWrapper>
                    </div>
                  )}
                />
                  ))
            : (
              <StaticMap
                sources={staticMapSources}
                id='google-maps-image'
                alt={t('LOCATION_MAP', 'Location map')}
                width='100%'
                height='100%'
                loading='lazy'
                wrap={(img) => (
                  <div className='map-container'>
                    <MapWrapper>
                      <Map style={{ width: '100%' }}>{img}</Map>
                    </MapWrapper>
                  </div>
                )}
              />
              )
        )}
        {!hideOrderActions && showDirections && (
          <DirectionButtonWrapper>
            <Button
              {...slotButtonOptions(theme, ORDER_DETAILS, 'directions', { color: 'primary', appearance: 'outline', size: 'md' })}
              onClick={() => window.open(`http://maps.google.com/?q=${order?.business?.address}`)}
            >
              {t('GET_DIRECTIONS', 'Get Directions')}
            </Button>
          </DirectionButtonWrapper>
        )}

      </WrapperLeftContainer>
    ),
    summary: () => (
      <WrapperRightContainer data-doc-section='order-details-summary'>
        <OrderProducts orderCompleted={isGiftCardOrder}>
          {(order?.student_id || order?.student?.id) && (
            <OrderStudentInfo order={order} />
          )}
          {!hideOrderPrices && (
            <>
              <HeaderTitle>
                <p className='total'>{isCustomOrder ? t('ESTIMATED_TOTAL', 'Estimated Total') : t('TOTAL', 'Total')}</p>
                <p className='total total-summary'>{isCustomOrder ? '~ ' : ''}{parsePrice(isCustomOrder ? (order?.summary?.total ?? order?.total ?? 0) + declaredValue : (order?.summary?.total ?? order?.total ?? 0))}</p>
              </HeaderTitle>
              {isCustomOrder && (
                <HeaderTitle style={{ marginTop: `calc(-1 * ${themeSpace(theme, 'xs')})` }}>
                  <span style={themeTextStyle(theme, 'body', { color: themeColor(theme, 'text_muted') })}>{t('DECLARED_VALUE', 'Declared value')}</span>
                  <span style={themeTextStyle(theme, 'body', { color: themeColor(theme, 'text_muted') })}>{parsePrice(declaredValue)}</span>
                </HeaderTitle>
              )}
              <Divider margin={'10px 0px 10px'} />
            </>
          )}

          {activeSummaryKeys.map((key, index) => (
            <React.Fragment key={key}>{activeSummaryParts[key](index === activeSummaryKeys.length - 1)}</React.Fragment>
          ))}
          {(deliveryTypes?.includes(order?.delivery_type) || order?.comment) && !isGiftCardOrder && showStarbucksHeader && (
            <OrderPreferences>
              <OrderPreferencesSection
                order={order}
                placeSpotTypes={placeSpotTypes}
              />
            </OrderPreferences>
          )}
        </OrderProducts>
      </WrapperRightContainer>
    )
  }

  // The active order's sections in the theme's order. A hidden map leaves
  // its block: the directions to the store stay;
  // without them either (confirmation.order.directions), no block
  const renderActiveSections = () => sections
    .filter((section) => section.group === 'active' && (section.visible || (section.key === 'map' && showDirections)))
    .map(({ key }) => <React.Fragment key={key}>{activeSections[key]()}</React.Fragment>)

  // The sections of a finished order (pages.order_details, group summary)
  const finishedSections = {
    header: () => (
      <OrderInfo className='order-info'>
        <TitleContainer orderCompleted>
          <div className='delivery-container'>
            <div className='business-info'>
              {showBusinessLogo && (order?.business?.logo || businessLogoPlaceholder(theme)) && (
                <div className='business-logo'>
                  {/* a logo that fails to load shows the theme's placeholder
                      (images placeholder.business_logo), never the broken image */}
                  <FallbackImage src={order?.business?.logo} fallback={businessLogoPlaceholder(theme)} alt={order?.business?.name} />
                </div>
              )}
              {/* the receipt's title has no order type: confirmation.order.delivery_type does not hide it */}
              <div className='title-container'>
                <p className='types'>
                  {order?.business?.name || (t('ORDER', 'Order'))} {(changeIdToExternalId && order?.external_id) || `#${order?.id}`}
                </p>
                {!hideDeliveryDate && (
                  <>
                    {cateringTypes.includes(order?.delivery_type) && (
                      <p className='date'>
                        {t('CREATED_AT', 'Created at')}: {parseDate(order?.created_at)}
                      </p>
                    )}
                    <p className='date'>
                      {activeStatus.includes(order?.status)
                        ? (
                          <>
                            {cateringTypes.includes(order?.delivery_type) ? `${t('PLACED_TO', 'Placed to')}:` : ''} <OrderEta order={order} outputFormat={'dddd, MMMM D YYYY'} />
                          </>
                          )
                        : (
                            parseDate(order?.reporting_data?.at[`status:${order.status}`], { outputFormat: `dddd, MMMM D YYYY ${timeFormat}` })
                          )}
                    </p>
                  </>
                )}
                <p
                  className={
                    `order-status ${currentOrderStatus?.percentage === 100 ? 'completed' : ''}${terminalRejected ? ' rejected' : ''}`
                  }
                >
                  {currentOrderStatus?.value}
                </p>
              </div>
            </div>
            {completedStatus.includes(parseInt(order?.status, 10)) && (
              <div className={`completed-icon${terminalRejected ? ' rejected' : ''}`}>
                {/* a rejected or canceled order is not shown with a check */}
                <Icon name={terminalRejected ? 'closeCircle' : 'checkCircleFill'} />
              </div>
            )}
          </div>
          {order?.reservation && order?.delivery_type === 9 && (
            <>
              <p className='date'>{t('RESERVATION_SCHEDULED_TO', 'Reservation scheduled to')}: {parseDate(order?.reservation?.reserve_date, { outputFormat: `YYYY-MM-DD ${timeFormat}` })}</p>
              <p>{order?.reservation?.guests_reservation} {t('GUESTS', 'Guests')}</p>
            </>
          )}
        </TitleContainer>
        {!!order?.cloned_order_id && (
          <OrderClonnedMessage>
            <p>{t('ORDER_CLONNED_INFORMATION', 'Your order has been cloned due a missing item, no extra charges will be made, for more information, please contact the store')}</p>
          </OrderClonnedMessage>
        )}
      </OrderInfo>
    ),
    // the products are one section of the receipt
    products: () => !showStarbucksHeader && <CompletedProductsList>{sortedProductList}</CompletedProductsList>,
    bill: () => !hideOrderPrices && (
      <OrderBillSection
        order={order}
        setOpenTaxModal={setOpenTaxModal}
        showOnlyTotals={showStarbucksHeader}
        isGiftCardOrder={isGiftCardOrder}
        orderCompleted
      />
    ),
    review_actions: () => !isGiftCardOrder && (showReviewActions || showReorderButton) && (
      <OrderButtons>
        {showReviewActions
          ? (
          <>
            {/* a section of the page's h1 (h2) */}
            <h2>{t('REVIEW_YOUR_ORDER', 'Review your order')}</h2>
            <div className='review-container'>
              <ReviewsProgressContent
                onClick={handleOpenReview}
                aria-label={t('REVIEW_YOUR_ORDER', 'Review your order')}
              >
                {/* components.rating, empty (the button is named) */}
                <Rating value={0} size={ratingSize} aria-hidden='true' />
              </ReviewsProgressContent>
              <div className='buttons-container'>
                {/* "Order again" is the main action
                    (primary), "Review" the secondary one (neutral
                    outline) */}
                <OrderActionCell $stretch>
                  <Button
                    data-doc-control='order-review-open'
                    {...slotButtonOptions(theme, ORDER_DETAILS, 'review', { color: 'neutral', appearance: 'outline', size: 'sm' })}
                    onClick={handleOpenReview}
                  >
                    {t('REVIEW', 'Review')}
                  </Button>
                </OrderActionCell>
                {showReorderButton && (
                  <OrderActionCell $stretch>
                    <Button
                      data-doc-control='order-again'
                      {...slotButtonOptions(theme, ORDER_DETAILS, 'reorder', { color: 'primary', size: 'sm' })}
                      onClick={() => handleClickReorder(order)}
                      disabled={reorderState?.loading}
                    >
                      {reorderState?.loading
                        ? t('LOADING', 'Loading...')
                        : t('ORDER_AGAIN', 'Order again')}
                    </Button>
                  </OrderActionCell>
                )}
              </div>
            </div>
          </>
            )
          : (
          <div className='buttons-container one-button'>
            <OrderActionCell>
              <Button
                data-doc-control='order-again'
                {...slotButtonOptions(theme, ORDER_DETAILS, 'reorder', { color: 'primary', size: 'sm' })}
                onClick={() => handleClickReorder(order)}
                disabled={reorderState?.loading}
              >
                {reorderState?.loading
                  ? t('LOADING', 'Loading...')
                  : t('ORDER_AGAIN', 'Order again')}
              </Button>
            </OrderActionCell>
          </div>
            )}
      </OrderButtons>
    ),
    rewards: () => !isGiftCardOrder && <OrderRewardsBanner order={order} loyaltyPlansState={loyaltyPlansState} />,
    address: () => !isGiftCardOrder && (order?.customer || order?.business) && (showOrderTypeAddress || showPickupAddress) && (
      <OrderPreferences orderCompleted>
        {showPickupAddress && (
          <div className='order-type-address' style={{ marginBottom: themeSpace(theme, 'lg') }}>
            {t('PICKUP_ADDRESS', 'Pickup Address')}
            {order?.business?.name && (
              <div className='order-type'>
                <p>{order.business.name}</p>
              </div>
            )}
            <div className='order-type'>
              <p>{order?.business?.address}</p>
            </div>
          </div>
        )}
        {showOrderTypeAddress && (
          <div className='order-type-address'>
            {t('ORDER_TYPE_ADDRESS', ':ordertype: Address').replace(':ordertype:', orderTypes?.find(type => order?.delivery_type === type?.value)?.text)}
            <div className='order-type'>
              <p>{order[order?.delivery_type === 1 ? 'customer' : 'business']?.address}</p>
            </div>
          </div>
        )}
      </OrderPreferences>
    ),
    driver: () => displayDriver && (
      <>
        <OrderDriver orderCompleted>
          <WrapperDriver orderCompleted>
            {/* components.avatar of components.order_details finished_driver_avatar_size (the name beside it says who it is) */}
            {!hideDriverPhoto && <Avatar variant='photo' endSpace='md' src={displayDriver?.photo} size={finishedDriverAvatarSize} />}
            <div className='driver-info'>
              <div className='driver-name-wrapper'>
                {!hideDriverName && (
                  <h2>{displayDriver?.name} {displayDriver?.lastname}</h2>
                )}
              </div>
              <p>{t('YOUR_DRIVER', 'Your driver')}</p>
            </div>
          </WrapperDriver>
        </OrderDriver>
        {isGiftCardOrder && order?.products[0]?.gift_card?.status === 'pending' && !isGiftCardSent && <Divider />}
      </>
    )
  }

  // A finished order in the theme's order: its header is a block of the
  // page; the receipt's sections around it go in the receipt's container
  // (one per run of them, the student's info at the top of the first), so
  // the default order is the markup of always
  const renderFinishedSections = () => {
    const blocks = []
    let run = []
    const flush = () => {
      if (!run.length) return
      const first = !blocks.some((block) => block.key?.startsWith('receipt-'))
      blocks.push(
        <WrapperRightContainer key={`receipt-${blocks.length}`} orderCompleted>
          <OrderProducts orderCompleted>
            {first && (order?.student_id || order?.student?.id) && (
              <OrderStudentInfo order={order} />
            )}
            {run}
          </OrderProducts>
        </WrapperRightContainer>
      )
      run = []
    }
    sections
      .filter((section) => section.group === 'summary' && section.visible)
      .forEach(({ key }) => {
        const node = <React.Fragment key={key}>{finishedSections[key]()}</React.Fragment>
        if (key === 'header') {
          flush()
          blocks.push(node)
        } else {
          run.push(node)
        }
      })
    flush()
    return blocks
  }

  return (
    <Container data-doc-section='order-details' $flush={openMessages.driver || openMessages.business}>
      {!completedStatus.includes(parseInt(order?.status, 10)) && !loading && order && Object.keys(order).length > 0 && !(openMessages.driver || openMessages.business) && (
        <WrapperContainer data-doc-section='order-details-active'>
          {/* the order's number is the page title, above its cards */}
          <OrderPageTitle className='order-id'>{t('ORDER', 'Order')}: {(changeIdToExternalId && order?.external_id) || `#${order?.id}`}</OrderPageTitle>
          <DeliveryPin order={order} />
          {renderActiveSections()}

          {isGiftCardOrder && order?.products[0]?.gift_card?.status === 'pending' && !isGiftCardSent && (
            <SendGiftCard
              giftCardId={order?.products[0]?.gift_card?.id}
              setIsGiftCardSent={setIsGiftCardSent}
            />
          )}
        </WrapperContainer>
      )}

      {completedStatus.includes(parseInt(order?.status, 10)) && !loading && order && Object.keys(order).length > 0 && !(openMessages.driver || openMessages.business) && (
        <WrapperContainer data-doc-section='order-details-terminal' orderCompleted>
          {/* the page title of the account pages, above its blocks */}
          <OrderPageTitle>{t('ORDER_DETAILS', 'Order Details')}</OrderPageTitle>
          {renderFinishedSections()}

          {isGiftCardOrder && order?.products[0]?.gift_card?.status === 'pending' && !isGiftCardSent && (
            <SendGiftCard
              giftCardId={order?.products[0]?.gift_card?.id}
              setIsGiftCardSent={setIsGiftCardSent}
            />
          )}
        </WrapperContainer>
      )}

      {
        (openMessages.driver || openMessages.business) && (
          // the same conversation as the messages page (its header, chat and
          // composer), alone on the page with a close button back to the order
          <OrderMessagesPane data-doc-section='order-messages-pane'>
            <Messages
              orderId={order?.id}
              order={order}
              business={openMessages.business}
              driver={openMessages.driver}
              messages={messages}
              setMessages={setMessages}
              readMessages={readMessages}
              onMessages={setOpenMessages}
              onClose={() => setOpenMessages({ driver: false, business: false })}
              handleChangeOpenMessages={setOpenMessages}
              profileMessages
              standalone
            />
          </OrderMessagesPane>
        )
      }

      {loading && !error && (
        <SkeletonWrapper>
          <>
            <SkeletonBlockWrapp>
              <SkeletonBlock width={90}>
                <Skeleton height={40} width={'80vw'} />
                <Skeleton height={200} width={'80vw'} />
                <Skeleton height={15} />
                <Skeleton height={mapHeight} width={'80vw'} style={{ marginBottom: themeSpace(theme, 'xxxl') }} />
                <Skeleton height={60} width={'80vw'} />
                <Skeleton height={200} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} style={{ marginBottom: themeSpace(theme, 'xxxl') }} />
                <Skeleton height={40} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} />
                <Skeleton height={20} width={'80vw'} style={{ marginBottom: themeSpace(theme, 'xxxl') }} />
              </SkeletonBlock>
            </SkeletonBlockWrapp>
          </>
        </SkeletonWrapper>
      )}

      {/* not over the store chat a link opens with the order: one layer at a time */}
      {inviteReady.current && !props.openBChatByParam && <AccountInviteOnEnter entry='confirmation' />}

      {!loading && error && (
        error.includes('ERROR_ACCESS_EXPIRED')
          ? (
            <NotFoundSource
              headingLevel='h1'
              icon='receipt'
              content={t(error[0], 'Sorry, the order has expired.')}
            />
            )
          : (
            <NotFoundSource
              headingLevel='h1'
              icon='receipt'
              content={t('NOT_FOUND_ORDER', 'Sorry, we couldn\'t find the requested order.')}
              btnTitle={t('ORDERS_REDIRECT', 'Go to Orders')}
              onClickButton={handleOrderRedirect}
            />
            )
      )}
      {
        isReviewOpen && (
          <DialogOverlay
            data-doc-section={reviewStatus.order
              ? 'order-review-business'
              : reviewStatus.product
                ? 'order-review-product'
                : reviewStatus.driver
                  ? 'order-review-driver'
                  : 'order-review-professional'}
            closeOnBackdrop={false}
            open={isReviewOpen}
            onClose={handleCloseReivew}
            title={order
              ? t('REVIEW_YOUR_ORDER', 'Review your order')
              : t('LOADING', 'Loading...')}
          >
            <ReviewWrapper>
              {
                reviewStatus?.order
                  ? (
                      <ReviewOrder
                        order={order}
                        hashKey={props.hashKey}
                        closeReviewOrder={closeReviewOrder}
                        setIsReviewed={setIsOrderReviewed}
                      />
                    )
                  : (reviewStatus?.product
                      ? (
                          <ReviewProduct
                            order={order}
                            hashKey={props.hashKey}
                            closeReviewProduct={closeReviewProduct}
                            setIsProductReviewed={setIsProductReviewed}
                          />
                        )
                      : (reviewStatus?.professional
                          ? (
                              <ReviewProfessional
                                order={order}
                                hashKey={props.hashKey}
                                closeReviewProfessional={handleCloseReivew}
                                setIsProfessionalReviewed={setIsProReviewed}
                                isProfessional
                              />
                            )
                          : (
                              <ReviewDriver
                                order={order}
                                hashKey={props.hashKey}
                                closeReviewDriver={handleCloseReivew}
                                setIsDriverReviewed={setIsDriverReviewed}
                              />
                            )
                        )
                    )
              }
            </ReviewWrapper>

          </DialogOverlay>
        )
      }
      {openTaxModal.open && (
        <DialogOverlay
          legacyMaxWidth
          width='70%'
          open={openTaxModal.open}
          closeOnBackdrop
          title={`${openTaxModal.data?.name || t('INHERIT_FROM_BUSINESS', 'Inherit from business')} ${openTaxModal.data?.rate_type !== 2
            ? `(${typeof openTaxModal.data?.rate === 'number'
              ? `${openTaxModal.data?.rate}%`
              : `${parsePrice(openTaxModal.data?.fixed ?? 0)} + ${openTaxModal.data?.percentage}%`})`
            : ''}
            `}
          onClose={() => setOpenTaxModal({ open: false, tax: null, type: '' })}
        >
          <TaxInformation
            type={openTaxModal.type}
            data={openTaxModal.data}
            products={order?.products}
          />
        </DialogOverlay>
      )}
      {isOrderHistory && (
        <DialogOverlay
          open={isOrderHistory}
          size='xl'
          onClose={() => setIsOrderHistory(false)}
          title={t('DETAILS_OF_ORDER', 'Details of Order_NUMBER_').replace('_NUMBER_', (changeIdToExternalId && order?.external_id) || `# ${order?.id}`)}
        >
          <OrderHistory
            messages={messages}
            order={order}
            handleOpenReview={handleOpenReview}
            onClose={() => setIsOrderHistory(false)}
            enableReview={
              acceptedStatus.includes(parseInt(order?.status, 10)) &&
              (!order?.review || (isReviewableDriver && !order?.user_review)) &&
              (!isOrderReviewed || !isProductReviewed || !isDriverReviewed)
            }
          />
        </DialogOverlay>
      )}
      <Confirm
        data-doc-section='order-again-confirmation'
        title={t('ORDER', 'Order')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => handleOriginalReorder()}
        onCancel={() => handleOriginalReorder()}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
    </Container>
  )
}

export const OrderDetails = (props) => {
  const [, t] = useLanguage()
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const orderDetailsProps = {
    ...props,
    userCustomerId: userCustomer?.id,
    googleMapsControls: {
      defaultZoom: 15,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeId: 'roadmap', // 'roadmap', 'satellite', 'hybrid', 'terrain'
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'satellite']
      }
    },
    orderTypes: props.orderTypes || [
      {
        value: 1,
        text: t('DELIVERY', 'Delivery')
      },
      {
        value: 2,
        text: t('PICKUP', 'Pickup')
      },
      {
        value: 3,
        text: t('EAT_IN', 'Eat in')
      },
      {
        value: 4,
        text: t('CURBSIDE', 'Curbside')
      },
      {
        value: 5,
        text: t('DRIVE_THRU', 'Drive thru')
      },
      {
        value: 7,
        text: t('CATERING_DELIVERY', 'Catering Delivery')
      },
      {
        value: 8,
        text: t('CATERING_PICKUP', 'Catering Pickup')
      },
      {
        value: 9,
        text: t('RESERVATION', 'Reservation')
      }
    ],
    disableMessages: props.isTrackingOnly || props.disableMessages,
    UIComponent: props.isTrackingOnly ? OrderTrackingLayout : OrderDetailsUI
  }

  return (
    <OrderDetailsController {...orderDetailsProps} />
  )
}
