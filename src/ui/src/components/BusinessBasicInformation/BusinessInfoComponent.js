import React, { useEffect, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import { themeVisible } from '~/utils/themeVisibility'
import { themeValue } from '~/utils/themeTokens'

import {
  BusinessActionsBar,
  BusinessActionsGroup,
  HeaderActionCell,
  BusinessDataLine,
  BusinessInfo,
  BusinessInfoContainer,
  BusinessInfoContent,
  BusinessInfoItem,
  RibbonBox,
  SocialList,
  TitleWrapper,
  BusinessContent,
  WrapperBusinessLogo,
  BusinessLogo,
  StoreFavoriteButton
} from './styles'
import { slotButtonOptions } from '~/utils/themeGroups'

import { SocialNetWork } from './SocialNetWork'
import { SearchComponent } from './SearchComponent'
import { StoreIdentity } from './StoreIdentity'

import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSession } from '~components/contexts/SessionContext'
import { useApi } from '~components/contexts/ApiContext'
import { useToast, ToastType } from '~components/contexts/ToastContext'
import { nanoid } from 'nanoid'
import { BusinessReservation } from '~ui/src/components/BusinessReservation'
import { Button } from '~ui/src/design-system/components/Button'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { shape, generalUtilities } from '~ui/utils'
import { isLight } from '@orderingco/ordering-theme-engine/colors'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'

import { Icon } from '~ui/src/design-system/components/Icon'
import { closedStatusLabel, isClosedNow } from '~/utils/businessTime'
import { BusinessStickyHeader } from '~ui/src/components/BusinessStickyHeader'

const safeParseReservationEnabledValue = (raw) => {
  const fallback = {}
  if (raw === undefined || raw === null) return fallback
  const str = typeof raw === 'string' ? raw.trim() : String(raw)
  if (str === '') return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// the order type's label of the identity's line (the keys OrderContextUI's own type select uses)
const ORDER_TYPE_LABELS = {
  1: ['DELIVERY', 'Delivery'],
  2: ['PICKUP', 'Pickup'],
  3: ['EAT_IN', 'Eat in'],
  4: ['CURBSIDE', 'Curbside'],
  5: ['DRIVE_THRU', 'Drive thru'],
  7: ['CATERING_DELIVERY', 'Catering Delivery'],
  8: ['CATERING_PICKUP', 'Catering Pickup'],
  9: ['RESERVATION', 'Reservation']
}

// the minutes of a pickup/delivery time ('HH:MM' or 'HH:MM:SS'); 0 for no
// time, none or midnight, so a detail with nothing real to show stays hidden
const toMinutes = (time) => {
  if (!time || time === '00:00:00') return 0
  const [hour, minute] = time.split(':')
  return (parseInt(hour, 10) * 60) + parseInt(minute, 10)
}

export const BusinessInfoComponent = (props) => {
  const {
    loading,
    business,
    isInfoShrunken,
    isCustomerMode,
    setIsPreOrder,
    setIsBusinessReviews,
    categoryState,
    searchValue,
    errorQuantityProducts,
    setOpenSearchProducts,
    handleChangeSortBy,
    sortByValue,
    sortByOptions,
    isCustomLayout,
    currentCart,
    setOpenBusinessInformation,
    handleFavoriteBusiness,
    hideHeaderBanner,
    showStoreSwitcher,
    handleSearchRedirect,
    onBackToList,
    brand,
    // the store page's designs (`menu`, `cover` or `showcase`): the identity they paint instead of the legacy block, with
    // the closed notice in its place and whether it is over the cover
    variant,
    closedCard,
    onCover
  } = props

  const theme = useTheme()
  // the business actions are the header's action slot
  // (business_header.slots.action: md secondary by default, of the search's size)
  const actionProps = slotButtonOptions(theme, 'business_header', 'action', { size: 'md', color: 'secondary' })
  const actionSize = actionProps.size
  const [orderState] = useOrder()
  const [{ auth }, { login }] = useSession()
  const [ordering] = useApi()
  const [, { showToast }] = useToast()
  const [{ parsePrice, parseDistance, optimizeImage, is12Hours }] = useUtils()
  const [{ configs }] = useConfig()
  const [, t] = useLanguage()
  const windowSize = useWindowSize()
  const { convertHoursToMinutes, getTypes } = generalUtilities()
  const [openReservations, setOpenReservations] = useState(false)
  const [modalState, setModalState] = useState({ isOpen: false, page: null })

  // the parts of the header the theme hides (visibility business.header.*)
  const hideHeaderPart = (part) => !themeVisible(theme, `business.header.${part}`)
  const hideTime = hideHeaderPart('time')
  const hideReviews = hideHeaderPart('reviews')
  // the distance to the store, off by default (visibility business.header.distance)
  const hideDistance = hideHeaderPart('distance')
  const hideCity = hideHeaderPart('city')
  const hideLogo = hideHeaderPart('logo')
  const hideFavorite = hideHeaderPart('favorite')
  const hideSocial = hideHeaderPart('social')
  const hideAddress = hideHeaderPart('address')
  const hideDescription = hideHeaderPart('description')
  const hideInfo = hideHeaderPart('info')
  // the closed notice under the name (visibility business.header.closed),
  // with or without a cover
  const showClosed = !loading && !business?.open && !hideHeaderPart('closed')
  const hideFee = hideHeaderPart('fee')
  // the product search button and the sort select (SearchComponent paints
  // neither, and so nothing, when the theme hides both)
  const hideSearchButton = hideHeaderPart('search')
  const hideSort = hideHeaderPart('sort')
  // business.header.logo: one key, hidden on phones by default (its
  // platforms.mobile_web value, applied by the theme below 576px)
  const showLogo = !hideLogo
  // the store's ribbon beside its name, off by default (visibility
  // business.header.ribbon)
  const hideBusinessRibbon = hideHeaderPart('ribbon')
  // the Preorder / "Change schedule" action (visibility business.header.preorder)
  const hidePreorder = hideHeaderPart('preorder')
  const isPreOrderSetting = configs?.preorder_status_enabled?.value === '1'
  const singleBusinessRedirect = window.localStorage.getItem('single_business')
  const businessReservationEnabledConfig = business?.configs?.find(config => config?.key === 'reservation_enabled')
  const reservationEnabledValue = businessReservationEnabledConfig
    ? safeParseReservationEnabledValue(businessReservationEnabledConfig?.value ?? '{}')
    : safeParseReservationEnabledValue(configs?.reservation_enabled?.value ?? '{}')

  const showReservationCta = !loading &&
    orderState?.options?.type === 9 &&
    categoryState?.products?.length !== 0 &&
    reservationEnabledValue === 1

  const handleChangeStoreRedirect = () => {
    window.localStorage.setItem('change_store_redirect', 'true')
    window.localStorage.removeItem('single_business')
    handleSearchRedirect?.()
  }

  const handleChangeFavorite = () => {
    if (auth) {
      handleFavoriteBusiness && handleFavoriteBusiness(!business?.favorite)
    } else {
      setModalState({ isOpen: true, page: 'login' })
    }
  }

  const handleClickReservation = async () => {
    if (!auth) {
      try {
        const guestToken = nanoid()
        const { content: { error, result } } = await ordering.users().save({ guest_token: guestToken })
        if (error) {
          showToast(ToastType.Error, Array.isArray(result) ? result[0] : result)
          return
        }
        login({ user: result, token: result?.session?.access_token })
      } catch (err) {
        showToast(ToastType.Error, err.message)
        return
      }
    }
    setOpenReservations(true)
  }

  const hasAutoOpenedReservation = useRef(false)

  useEffect(() => {
    if (hasAutoOpenedReservation.current || !showReservationCta) return
    hasAutoOpenedReservation.current = true
    setOpenReservations(true)
  }, [showReservationCta])

  const closeAuthModal = () => {
    setModalState({ isOpen: false, page: null })
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalState({ isOpen: true, page })
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const searchComponentProps = {
    setOpenSearchProducts,
    handleChangeSortBy,
    sortByValue,
    sortByOptions
  }

  // the data line: "£1,50 Service fee · 20min Pickup time · 2 mi" (delivery
  // reads delivery_price/delivery_time, pickup reads service_fee/pickup_time);
  // a detail with nothing real to show (0, null or empty) stays hidden
  const isDelivery = orderState?.options?.type === 1
  const feeValue = isDelivery ? business?.delivery_price : business?.service_fee
  const feeLabel = isDelivery ? t('DELIVERY_FEE', 'Delivery fee') : t('SERVICE_FEE', 'Service fee')
  const timeValue = isDelivery ? business?.delivery_time : business?.pickup_time
  const timeLabel = isDelivery ? t('DELIVERY_TIME', 'Delivery time') : t('PICKUP_TIME', 'Pickup time')
  const dataLineItems = [
    !hideFee && feeValue ? { key: 'fee', value: parsePrice(feeValue), label: feeLabel } : null,
    !hideTime && toMinutes(timeValue) ? { key: 'time', value: convertHoursToMinutes(timeValue), label: timeLabel } : null,
    !hideDistance && business?.distance ? { key: 'distance', value: parseDistance(business.distance) } : null
  ].filter(Boolean)
  // business_header.base.details_separators off: the gap alone separates the
  // details, with no "·" between them
  const showDetailsSeparator = themeValue(theme, 'business_header', 'base.details_separators') !== false

  // the store's actions: reviews, change store, Info, Preorder and
  // Reservations (the header's action slot)
  const actionsContent = (
    <>
      {!hideReviews && business?.reviews?.total > 0 && (
        <HeaderActionCell>
          <Button
            {...actionProps}
            data-doc-control='business-reviews'
            onClick={() => setIsBusinessReviews(true)}
            // named by what it opens (its text is only the rating)
            aria-label={`${t('REVIEWS', 'Reviews')}: ${business?.reviews?.total}`}
          >
            <Icon name='starFilled' />
            {business?.reviews?.total}
          </Button>
        </HeaderActionCell>
      )}
      {showStoreSwitcher && (
        <HeaderActionCell>
          <Button
            {...actionProps}
            aria-label={t('CHANGE_STORE', 'Change store')}
            onClick={handleChangeStoreRedirect}
          >
            {/* the base Icon: decorative (the button is named), sized by the theme's level */}
            <Icon name='arrowLeftRight' size='md' />
            {t('CHANGE_STORE', 'Change store')}
          </Button>
        </HeaderActionCell>
      )}
      {!hideInfo && (
        <HeaderActionCell>
          <Button {...actionProps} data-doc-control='business-information' onClick={() => setOpenBusinessInformation(true)}>
            <Icon name="infoCircle" />
            {t('INFO', 'Info')}
          </Button>
        </HeaderActionCell>
      )}
      {isPreOrderSetting && !hidePreorder && (
        <HeaderActionCell>
          <Button {...actionProps} data-doc-control='business-preorder-entry' onClick={() => setIsPreOrder(true)}>{isCustomerMode ? t('CHANGE_SCHEDULE', 'Change schedule') : t('PREORDER', 'Preorder')}</Button>
        </HeaderActionCell>
      )}
      {showReservationCta && (
        <HeaderActionCell>
          <Button size={actionSize} data-doc-control='business-reservation-entry' color='primary' onClick={() => handleClickReservation()}>
            <Icon name="clock" />
            {t('RESERVATIONS', 'Reservations')}
          </Button>
        </HeaderActionCell>
      )}
    </>
  )

  const hasActionsContent = !loading && (
    (!hideReviews && business?.reviews?.total > 0) ||
    showStoreSwitcher ||
    !hideInfo ||
    (isPreOrderSetting && !hidePreorder) ||
    showReservationCta
  )

  const canShowSearch = !loading &&
    (categoryState?.products?.length !== 0 || searchValue) &&
    !errorQuantityProducts &&
    !isInfoShrunken &&
    !business?.professionals?.length &&
    // SearchComponent paints nothing when the theme hides both
    !(hideSearchButton && hideSort)

  // the bar: a loading skeleton while the store loads, then the actions
  // and/or the search; nothing when neither has anything to show
  const showActionsBar = loading || hasActionsContent || canShowSearch
  // a reserved loading slot for the data line only if fee, time or distance
  // could show once loaded (same gate the theme uses, section 2)
  const showDataLineSkeleton = loading && !(hideFee && hideTime && hideDistance)

  const modals = (
    <>
      <DialogOverlay
        title={business?.name}
        open={openReservations}
        onClose={() => setOpenReservations(false)}
      >
        <BusinessReservation
          cart={currentCart}
          business={business}
          isCustomerMode={isCustomerMode}
          scheduleList={business?.schedule}
          setOpenReservations={setOpenReservations}
        />
      </DialogOverlay>
      {modalState.isOpen && (
        <DialogOverlay
          legacyMaxWidth
          open={modalState.isOpen}
          onClose={() => closeAuthModal()}
          width='50%'
        >
          {modalState.page === 'login' && (
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
                >{t('RESET_PASSWORD', 'Reset Password')}
                </a>
              }
              useLoginByCellphone
              isPopup
            />
          )}
          {modalState.page === 'signup' && (
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
          {modalState.page === 'forgotpassword' && (
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

  if (variant) {
    return (
      <>
        <StoreIdentity
          variant={variant}
          onCover={onCover}
          loading={loading}
          business={business}
          brand={brand}
          onBack={onBackToList}
          favorite={!hideFavorite && (
            <StoreFavoriteButton
              pressed={!!business?.favorite}
              onClick={() => handleChangeFavorite(!business?.favorite)}
            />
          )}
          status={isClosedNow(business, orderState?.options?.moment) ? (hideHeaderPart('closed') ? null : 'closed') : 'open'}
          statusLabel={variant === 'cover' && closedStatusLabel(business, t, { is12Hours })}
          address={variant === 'cover' && !hideAddress && business?.address}
          orderTypeLabel={variant !== 'cover' && ORDER_TYPE_LABELS[orderState?.options?.type] && t(...ORDER_TYPE_LABELS[orderState.options.type])}
          info={!hideInfo && (
            <Button appearance={onCover ? 'plain' : 'link'} size='sm' data-doc-control='business-information' onClick={() => setOpenBusinessInformation(true)}>
              {t('INFO', 'Info')}
            </Button>
          )}
          actions={!loading && (
            (!hideReviews && business?.reviews?.total > 0) || showStoreSwitcher || showReservationCta
          ) && (
            <>
              {!hideReviews && business?.reviews?.total > 0 && (
                <Button {...actionProps} data-doc-control='business-reviews' onClick={() => setIsBusinessReviews(true)} aria-label={`${t('REVIEWS', 'Reviews')}: ${business?.reviews?.total}`}>
                  <Icon name='starFilled' />
                  {business?.reviews?.total}
                </Button>
              )}
              {showStoreSwitcher && (
                <Button {...actionProps} aria-label={t('CHANGE_STORE', 'Change store')} onClick={handleChangeStoreRedirect}>
                  <Icon name='arrowLeftRight' size='md' />
                  {t('CHANGE_STORE', 'Change store')}
                </Button>
              )}
              {showReservationCta && (
                <Button size={actionSize} data-doc-control='business-reservation-entry' color='primary' onClick={() => handleClickReservation()}>
                  <Icon name='clock' />
                  {t('RESERVATIONS', 'Reservations')}
                </Button>
              )}
            </>
          )}
          closedCard={closedCard}
        />
        {modals}
      </>
    )
  }

  return (
    <BusinessInfoContainer isFlexEnd={windowSize.width >= 768} $hideHeaderBanner={hideHeaderBanner}>
      <BusinessInfoContent>
        <BusinessInfo className='info'>
          {showLogo && business?.logo && (
            <BusinessContent>
              <WrapperBusinessLogo>
                {!loading && (
                  <BusinessLogo bgimage={optimizeImage(business?.logo, 'h_200,c_limit')} />
                )}
              </WrapperBusinessLogo>
            </BusinessContent>
          )}
          <BusinessInfoItem isInfoShrunken={isInfoShrunken}>
            {!loading && (
              <BusinessStickyHeader name={business?.name} onBack={onBackToList} brand={brand} />
            )}
            {!loading
              ? (
                <TitleWrapper isCustomLayout={isCustomLayout} disableLeftSpace={singleBusinessRedirect}>
                  <div className='title-wrapper-left'>
                    <h1 className='bold' id='business_name' title={business?.name}>{business?.name}</h1>
                    {!hideFavorite && (
                      <StoreFavoriteButton
                        pressed={!!business?.favorite}
                        onClick={() => handleChangeFavorite(!business?.favorite)}
                      />
                    )}
                  </div>
                </TitleWrapper>
                )
              : (
                <Skeleton width={isCustomerMode ? 100 : 150} height={isCustomerMode ? 35 : 'auto'} />
                )}
            {showClosed && <p className='closed'>{closedStatusLabel(business, t, { is12Hours, showTimezone: true })}</p>}
            {!loading && !hideSocial && (
              <SocialList>
                {business?.facebook_profile && (
                  <SocialNetWork url={business?.facebook_profile} icon={<Icon name="facebook" aria-hidden='true' />} label='Facebook' />
                )}
                {business?.instagram_profile && (
                  <SocialNetWork url={business?.instagram_profile} icon={<Icon name="instagram" aria-hidden='true' />} label='Instagram' />
                )}
                {business?.tiktok_profile && (
                  <SocialNetWork url={business?.tiktok_profile} icon={<Icon name="tiktok" aria-hidden='true' />} label='TikTok' />
                )}
                {business?.pinterest_profile && (
                  <SocialNetWork url={business?.pinterest_profile} icon={<Icon name="pinterest" aria-hidden='true' />} label='Pinterest' />
                )}
                {business?.whatsapp_number && (
                  <SocialNetWork url={business?.whatsapp_number} icon={<Icon name="whatsapp" aria-hidden='true' />} label='WhatsApp' />
                )}
                {business?.snapchat_profile && (
                  <SocialNetWork url={business?.snapchat_profile} icon={<Icon name="snapchat" aria-hidden='true' />} label='Snapchat' />
                )}
              </SocialList>
            )}
            {!loading && !hideBusinessRibbon && business?.ribbon?.enabled && (
              <RibbonBox
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
            {!hideCity && business?.city?.name && (
              !loading
                ? (
                  <p className='type'>{business?.city?.name}</p>
                  )
                : (
                  <Skeleton width={isCustomerMode ? 100 : 150} />
                  )
            )}
            {
              !loading
                ? (
                    !hideAddress && business?.address && (
                    <div><span className='address'>{business?.address}</span></div>
                    )
                  )
                : (
                  <Skeleton width={isCustomerMode ? 100 : 150} />
                  )
            }
            {
              !loading
                ? (
                    !hideDescription && (getTypes(business) || business?.description || business?.seo_description) && (
                    <div><span className='description'>{getTypes(business) || business?.description || business?.seo_description}</span></div>
                    )
                  )
                : (
                  <Skeleton width={isCustomerMode ? 100 : 150} />
                  )
            }
            {showDataLineSkeleton && (
              <BusinessDataLine data-testid='business-data-line'>
                <Skeleton width={isCustomerMode ? 100 : 150} />
              </BusinessDataLine>
            )}
            {!loading && dataLineItems.length > 0 && (
              <BusinessDataLine data-testid='business-data-line'>
                {dataLineItems.map((item, i) => (
                  <React.Fragment key={item.key}>
                    {i > 0 && showDetailsSeparator && <span className='sep'>·</span>}
                    <span><strong>{item.value}</strong>{item.label ? ` ${item.label}` : null}</span>
                  </React.Fragment>
                ))}
              </BusinessDataLine>
            )}
          </BusinessInfoItem>
        </BusinessInfo>
        {showActionsBar && (
          <BusinessActionsBar data-testid='business-actions-bar'>
            <BusinessActionsGroup>
              {!loading ? actionsContent : <Skeleton width={isCustomerMode ? 100 : 150} />}
            </BusinessActionsGroup>
            {canShowSearch && <SearchComponent {...searchComponentProps} inline />}
          </BusinessActionsBar>
        )}
      </BusinessInfoContent>
      {modals}
    </BusinessInfoContainer>
  )
}
