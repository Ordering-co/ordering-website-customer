import React, { useState, useRef, useMemo } from 'react'

import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  ContainerCard,
  WrapperBusinessCard,
  BusinessHero,
  BusinessHeader,
  WrapperBusinessLogo,
  BusinessTags,
  BusinessContent,
  BusinessLogo,
  BusinessInfo,
  BusinessInfoItem,
  BusinessName,
  Medadata,
  Bullet,
  CallCenterInformation,
  CallCenterInformationBullet,
  BusinessLogoWrapper,
  BusinessStarInfo,
  RibbonBox,
  FavoriteWrapper,
  BusinessHeaderClosedContainer,
  OpenAtContainer
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { ToastType, useToast } from '~components/contexts/ToastContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { BusinessController as BusinessSingleCard } from '~components/components/BusinessController'
import { findCurrentLapse, todayLapseRange } from '~/utils/businessTime'
import { Alert } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { Button } from '~ui/src/design-system/components/Button'
import { CardLink } from '~ui/src/styles/Card'
import { themeVisible } from '~/utils/themeVisibility'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeImage, themeSpace, themeValue } from '~/utils/themeTokens'
import { generalUtilities, shape } from '~ui/utils'
import { isLight } from '@orderingco/ordering-theme-engine/colors'
import { Dot } from '~ui/src/design-system/components/Dot'
import { Icon } from '~ui/src/design-system/components/Icon'

import { getUtils } from './utils'

const deliveryTypes = [1, 7]

const BusinessControllerUI = (props) => {
  const {
    isSkeleton,
    business,
    getBusinessOffer,
    handleClick,
    orderType,
    isCustomLayout,
    isCustomerMode,
    isBusinessOpen,
    businessWillCloseSoonMinutes,
    onPreorderBusiness,
    firstCard,
    minWidthEnabled,
    businessHeader,
    businessFeatured,
    showFeaturedBadge,
    businessOffers,
    businessLogo,
    businessReviews,
    businessDeliveryPrice,
    businessDeliveryTime,
    businessPickupTime,
    businessDistance,
    handleFavoriteBusiness,
    businessState,
    businessUrlTemplate,
    fromBusinessListing,
    fromBusinessListingSearch,
    isShowMap,
    fromFavoriteList,
    fromMyOrders,
    hideProductList,
    nameAs,
    withLogoAndFavorite
  } = props

  const [configState] = useConfig()
  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ auth }, { login }] = useSession()
  const [{ parsePrice, parseDistance, optimizeImage, parseTime }] = useUtils()
  const [orderState] = useOrder()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const { convertHoursToMinutes, getTypes } = generalUtilities()
  const { getDeliveryIcon } = getUtils()

  const favoriteRef = useRef(null)
  // the cards per row of the listing (components.business_listing_page)
  const businessRows = themeValue(theme, 'business_listing_page', 'base.rows')
  // the parts of the card the theme hides (visibility business_card.*)
  const showBusinessLogo = themeVisible(theme, 'business_card.logo')
  const showBusinessFavorite = themeVisible(theme, 'business_card.favorite')
  const showClosingSoon = themeVisible(theme, 'business_card.closing_soon')
  // the logo beside the name and the favorite are the listing card's; the
  // carousels and the appointments list ask for them too
  // (withLogoAndFavorite) without the listing card's look
  const hasLogoAndFavorite = fromBusinessListing || withLogoAndFavorite
  const hideBusinessLogo = !hasLogoAndFavorite || !showBusinessLogo
  const hideBusinessFee = !themeVisible(theme, 'business_card.fee')
  const hideBusinessTime = !themeVisible(theme, 'business_card.time')
  const hideBusinessDistance = !themeVisible(theme, 'business_card.distance')
  const hideBusinessReviews = !themeVisible(theme, 'business_card.reviews')
  const hideBusinessFavorite = !isShowMap && !fromFavoriteList
  const hideBusinessOffer = !themeVisible(theme, 'business_card.offer')
  // the "Preorder" tag of a closed business (business_card.preorder), apart
  // from the discount (business_card.offer)
  const hideBusinessPreorder = !themeVisible(theme, 'business_card.preorder')
  const hideBusinessHeader = !themeVisible(theme, 'business_card.header')
  const resolvedHeader = businessHeader || business?.header || themeImage(theme, 'placeholder.business_header') || ''
  // Showcase supplies its own setting. Other cards use the shared visibility.
  const showCrown = showFeaturedBadge ?? themeVisible(theme, 'business_card.featured')

  const isBusinessPreorder = onPreorderBusiness && !isBusinessOpen
  // the card is a plain box and its name is the link that opens the business
  // (stretched over the card); the favorite is a button apart
  const hasCardLink = !isSkeleton && !!handleClick && business?.enabled !== false
  const businessUrl = useMemo(() => {
    return businessUrlTemplate?.replace(/:business_slug/g, business?.slug)
  }, [business?.slug, businessUrlTemplate])

  // const handleShowAlert = () => {
  //   setAlertState({ open: true, content: [t('ERROR_ADD_PRODUCT_BUSINESS_CLOSED', 'The Business is closed at the moment')] })
  // }

  const handleBusinessClick = (e) => {
    e.preventDefault()
    if (favoriteRef?.current?.contains(e.target)) return
    if (isBusinessPreorder) onPreorderBusiness(business)
    else handleClick(business)
  }

  const handleChangeFavorite = () => {
    if (auth) {
      handleFavoriteBusiness && handleFavoriteBusiness(!businessState?.business?.favorite)
    } else {
      setModalPageToShow('login')
      setIsModalOpen(true)
    }
  }

  const closeAuthModal = () => {
    setIsModalOpen(false)
    setModalPageToShow(null)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const hasInformationLength = !!business?.idle_drivers_count || !!business?.busy_drivers_count || !!business?.activated_orders

  const findTodayLapse = () => {
    if (business?.today?.enabled) {
      const lapse = findCurrentLapse(business?.today?.lapses, business?.timezone)
      return lapse || business?.today?.lapses?.[0]
    }
  }

  // today's hours of the business (its zone) in the user's local time
  const todayLapseText = () => {
    const lapse = findTodayLapse()
    if (!lapse || !parseTime) return ''
    const { from, to } = todayLapseRange(lapse, business?.timezone)
    return `${parseTime(from.toDate())} - ${parseTime(to.toDate())}`
  }

  return (
    <>
      <ContainerCard
        data-doc-section={fromFavoriteList ? 'favorite-business-card' : undefined}
        data-doc-business-id={fromFavoriteList ? business?.id : undefined}
        data-doc-business-open={fromFavoriteList ? String(Boolean(business?.open)) : undefined}
        isSkeleton={isSkeleton}
        isCustomerMode={isCustomerMode && hasInformationLength}
        fromFavoriteList={fromFavoriteList}
        fromMyOrders={fromMyOrders}
        firstCard={firstCard}
        minWidthEnabled={minWidthEnabled}
        hideProductList={hideProductList}
        fromBusinessListingSearch={fromBusinessListingSearch}
        businessRows={businessRows}
        isShowMap={isShowMap}
        disabled={business?.enabled === false}
        m={props.m}
        // only a card that opens its business answers the hover
        $still={!hasCardLink}
      >
        <WrapperBusinessCard disabled={business?.enabled === false}>
          {!fromFavoriteList && !fromMyOrders && business?.ribbon?.enabled && (
            <RibbonBox
              isShowMap={isShowMap}
              bgColor={business?.ribbon?.color}
              colorText={isLight(business?.ribbon?.color)}
              borderRibbon={isLight(business?.ribbon?.color)}
              isRoundRect={business?.ribbon?.shape === shape?.rectangleRound}
              isCapsule={business?.ribbon?.shape === shape?.capsuleShape}
              title={business?.ribbon?.text}
            >
              {business?.ribbon?.text}
            </RibbonBox>
          )}
          {!fromFavoriteList && !fromMyOrders && (
            <BusinessHero>
              {isSkeleton
                ? (
                <Skeleton height={isCustomerMode ? 100 : 140} />
                  )
                : (
                <BusinessHeader bgimage={!hideBusinessHeader && resolvedHeader ? optimizeImage(resolvedHeader, 'h_400,c_limit') : ''} logo={showBusinessLogo && (businessLogo || business?.logo) ? optimizeImage((businessLogo || business?.logo), 'h_200,c_limit') : ''} name={business?.name} isClosed={!isBusinessOpen} fromBusinessListing={fromBusinessListing} isShowMap={isShowMap}>
                  <BusinessTags hasRibbon={!!business?.ribbon?.enabled}>
                    {(businessFeatured ?? business?.featured) && showCrown &&
                      <span className='crown'>
                        <Icon name="crown" label={showFeaturedBadge ? t('FEATURED', 'Featured') : undefined} />
                      </span>}
                    {(!hideBusinessOffer || !hideBusinessPreorder) && !isCustomLayout && (configState?.configs?.preorder_status_enabled?.value === '1') && (
                      <div className={isShowMap ? 'map-business-tag' : 'business-tag'}>
                        {!hideBusinessOffer && !!getBusinessOffer((businessOffers ?? business?.offers)) && <span>{t('DISCOUNT', 'Discount')}{' '}{getBusinessOffer((businessOffers ?? business?.offers))}</span>}
                        {!hideBusinessPreorder && !isBusinessOpen && <span>{t('PREORDER', 'Preorder')}</span>}
                      </div>
                    )}
                  </BusinessTags>
                  {!isShowMap && (
                    <BusinessHeaderClosedContainer>
                      <div>
                        {showClosingSoon && !!businessWillCloseSoonMinutes && orderState?.options?.moment === null && isBusinessOpen && business?.enabled !== false && (
                          <p className='closing-soon'>{businessWillCloseSoonMinutes} {t('MINUTES_TO_CLOSE', 'minutes to close')}</p>
                        )}
                        {!isBusinessOpen && <p className='closed'>{t('CLOSED', 'Closed')}{business?.enabled === false && `(${t('DISABLED', 'Disabled')})`}</p>}
                      </div>
                      {business?.disabled_reason && business?.enabled === false && (
                        <p className='disabled'>{business?.disabled_reason}</p>
                      )}
                    </BusinessHeaderClosedContainer>
                  )}
                </BusinessHeader>
                  )}
            </BusinessHero>
          )}
          <BusinessContent>
            <BusinessInfo className='info' isCustomerMode={isCustomerMode} $logoRoom={!hideBusinessLogo}>
              <BusinessLogoWrapper hideBusinessLogo={hideBusinessLogo} $hasLogo={!!(isSkeleton || businessLogo || business?.logo)}>
                {!hideBusinessLogo && (isSkeleton || businessLogo || business?.logo) && (
                  <WrapperBusinessLogo isSkeleton={isSkeleton} isCustomerMode={isCustomerMode}>
                    {!isSkeleton
                      ? (
                        <BusinessLogo bgimage={optimizeImage((businessLogo || business?.logo), 'h_200,c_limit')} />
                        )
                      : (
                        <Skeleton height={70} width={70} />
                        )}
                  </WrapperBusinessLogo>
                )}
              </BusinessLogoWrapper>
              <BusinessInfoItem fromMyOrders={fromMyOrders}>
                <div className='name-content'>
                  {business?.name
                    ? (
                        <>
                          <BusinessName
                            title={business?.name}
                            // the heading level under the block's title
                            // (nameAs: h2 under an h1); its look stays h3
                            {...(['h2', 'h3', 'h4'].includes(nameAs) && { as: nameAs })}
                          >
                            {hasCardLink
                              ? (
                                <CardLink
                                  $card='business_card'
                                  {...(!isBusinessPreorder && businessUrl ? { href: businessUrl } : { as: 'button' })}
                                  onClick={handleBusinessClick}
                                >
                                  {business?.name}
                                </CardLink>
                                )
                              : business?.name}
                          </BusinessName>
                          <BusinessStarInfo fromMyOrders={fromMyOrders}>
                            {!hideBusinessReviews && !isShowMap && !fromFavoriteList && !fromBusinessListing && (
                              <>
                                {!isSkeleton
                                  ? (
                                      (businessReviews ?? business?.reviews?.total) > 0 && (
                                        <div className='reviews'>
                                          <Icon name="star" />
                                          <span>{(businessReviews ?? business?.reviews?.total)}</span>
                                        </div>
                                      )
                                    )
                                  : (
                                    <Skeleton width={50} />
                                    )}
                              </>
                            )}
                            {(!hideBusinessFavorite || hasLogoAndFavorite) && showBusinessFavorite && !isCustomerMode && (
                              <FavoriteWrapper
                                ref={favoriteRef}
                                $holdsButton={!isSkeleton}
                              >
                                {!isSkeleton
                                  ? (
                                    <Button
                                      favorite
                                      bleed
                                      aria-pressed={!!businessState?.business?.favorite}
                                      aria-label={t('FAVORITE', 'Favorite')}
                                      onClick={handleChangeFavorite}
                                      data-doc-control={fromFavoriteList ? 'favorite-business-toggle' : undefined}
                                      data-doc-favorite={fromFavoriteList ? String(Boolean(businessState?.business?.favorite)) : undefined}
                                    >
                                      <Icon name={businessState?.business?.favorite ? 'heartFilled' : 'heartOutline'} />
                                    </Button>
                                    )
                                  : (
                                    <Skeleton width={16} height={16} />
                                    )}
                              </FavoriteWrapper>
                            )}
                          </BusinessStarInfo>
                        </>
                      )
                    : (
                      <Skeleton width={100} />
                      )}
                </div>
                {(fromFavoriteList || fromMyOrders || fromBusinessListing) && (
                  <Medadata isSkeleton={isSkeleton} fromBusinessListing={fromBusinessListing} fromFavoriteList={fromFavoriteList} flexStart >
                    {!hideBusinessReviews && !fromMyOrders && (businessReviews ?? business?.reviews?.total) > 0 && (
                      <BusinessStarInfo fromFavoriteList={fromFavoriteList} fromMyOrders={fromMyOrders} fromBusinessListing={fromBusinessListing}>
                        {!isSkeleton
                          ? (
                              <div className='reviews'>
                                <Icon name="star" />
                                <span>{(businessReviews ?? business?.reviews?.total)}</span>
                              </div>
                            )
                          : (
                              <Skeleton width={50} />
                            )}
                      </BusinessStarInfo>
                    )}
                    {(getTypes(business) || business?.description) && (
                      <p className='bullet' title={getTypes(business) || business?.description}>
                        <Bullet><Dot size='md' /></Bullet>
                        {getTypes(business) || business?.description}
                      </p>
                    )}
                  </Medadata>
                )}
                <Medadata
                  isCustomerMode={isCustomerMode}
                  isSkeleton={isSkeleton}
                  flexStart={isShowMap || fromFavoriteList || fromMyOrders}
                  gap={themeSpace(theme, 'sm')}
                  $largeText={!(fromFavoriteList || fromMyOrders || fromBusinessListing)}
                  fromBusinessListing={fromBusinessListing}
                  isShowMap={isShowMap}
                >
                  {!hideBusinessTime && (
                      <>
                        {Object.keys(business).length > 0
                          ? (
                            <p>
                              <Icon name="clock" />
                              {convertHoursToMinutes(deliveryTypes.includes(orderState?.options?.type) ? (businessDeliveryTime ?? business?.delivery_time) : (businessPickupTime ?? business?.pickup_time)) || <Skeleton width={100} />}
                            </p>
                            )
                          : (
                            <Skeleton width={65} />
                            )}
                      </>
                  )}
                  {!hideBusinessFee && deliveryTypes.includes(orderType) && (
                    <>
                      {(businessDeliveryPrice ?? business?.delivery_price) >= 0
                        ? (
                          <p className='business-info-item'>
                            {getDeliveryIcon()}
                            {business && parsePrice((businessDeliveryPrice ?? business?.delivery_price))}
                          </p>
                          )
                        : (
                          <Skeleton width={isCustomerMode ? 70 : 65} />
                          )}
                    </>
                  )}
                  {!hideBusinessDistance && (!deliveryTypes.includes(orderType) || isShowMap || fromBusinessListing) && (
                    <>
                      {(businessDistance ?? business?.distance) >= 0
                        ? (
                          <p className='business-info-item overflow-hidden' title={parseDistance((businessDistance ?? business?.distance))}>
                            {!fromBusinessListing && (
                              <>
                                {isShowMap ? <Bullet><Dot size='xs' /></Bullet> : <Icon name="mapMarker" />}
                              </>
                            )}
                            {parseDistance((businessDistance ?? business?.distance))}
                          </p>
                          )
                        : (
                          <Skeleton width={65} />
                          )}
                    </>
                  )}
                  {isCustomerMode && hasInformationLength && (
                    <CallCenterInformation>
                      {/* the counts are badges of the theme: idle drivers
                          success, busy drivers danger, active orders warning */}
                      {business?.idle_drivers_count > 0 && (
                        <CallCenterInformationBullet $variant='success'>
                          <Icon name="car" />
                          {business?.idle_drivers_count}
                        </CallCenterInformationBullet>
                      )}
                      {business?.busy_drivers_count > 0 && (
                        <CallCenterInformationBullet $variant='danger'>
                          <Icon name="car" />
                          {business?.busy_drivers_count}
                        </CallCenterInformationBullet>
                      )}
                      {business?.activated_orders > 0 && (
                        <CallCenterInformationBullet $variant='warning'>
                          <Icon name="basket" />
                          {business?.activated_orders}
                        </CallCenterInformationBullet>
                      )}
                    </CallCenterInformation>
                  )}
                </Medadata>
                {(fromFavoriteList || fromMyOrders) && !isSkeleton && (
                  <Medadata isSkeleton={isSkeleton} >
                    <OpenAtContainer isClosed={!(business?.open && business?.today?.enabled)}>
                      {!isSkeleton
                        ? (
                          <p title={business?.open && business?.today?.enabled ? `${t('OPEN_AT', 'OPEN AT')} ${todayLapseText()}` : t('STORE_CLOSED', 'Store closed')}>
                            {business?.open && business?.today?.enabled
                              ? `${t('OPEN_AT', 'OPEN AT')} ${todayLapseText()}`
                              : t('STORE_CLOSED', 'Store closed')}
                          </p>
                          )
                        : (
                          <Skeleton width={65} />
                          )}
                    </OpenAtContainer>
                    {!fromMyOrders && (
                      <Button
                        // the size, color and appearance of
                        // components.business_card.slots.cta
                        {...slotButtonOptions(theme, 'business_card', 'cta', { color: 'secondary' })}
                        className='order-now-button'
                        // what the card does, not a control of its own: a
                        // click on it reaches the card's link
                        tabIndex={-1}
                        aria-hidden='true'
                      >
                        {t('ORDER_NOW', 'Order now')}
                      </Button>
                    )}
                  </Medadata>
                )}
              </BusinessInfoItem>
            </BusinessInfo>
          </BusinessContent>
        </WrapperBusinessCard>
      </ContainerCard>
      <Alert
        title={t('BUSINESS_CLOSED', 'Business Closed')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
        closeOnBackdrop={false}
      />
      {isModalOpen && (
        <DialogOverlay
          legacyMaxWidth
          open={isModalOpen}
          onClose={() => closeAuthModal()}
          width='50%'
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              handleSuccessLogin={handleSuccessLogin}
              elementLinkToSignup={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'signup' })
                  } href='#'
                >{t('CREATE_ACCOUNT', 'Create account')}
                </a>
              }
              elementLinkToForgotPassword={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'forgotpassword' })
                  } href='#'
                >{t('RESET_PASSWORD', 'Reset password')}
                </a>
              }
              useLoginByCellphone
              isPopup
            />
          )}
          {modalPageToShow === 'signup' && (
            <SignUpForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={handleSuccessSignup}
              isPopup
              closeModal={() => closeAuthModal()}
            />
          )}
          {modalPageToShow === 'forgotpassword' && (
            <ForgotPasswordForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              isPopup
            />
          )}
        </DialogOverlay>
      )}
    </>
  )
}

export const BusinessController = (props) => {
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const onFavoriteError = () => showToast(ToastType.Error, t('NETWORK_ERROR', 'Network error, please reload the page'))

  const businessControllerProps = {
    ...props,
    onFavoriteError,
    UIComponent: BusinessControllerUI
  }

  return (
    <BusinessSingleCard {...businessControllerProps} />
  )
}
