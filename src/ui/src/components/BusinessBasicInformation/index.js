import React, { useState, useEffect, useRef } from 'react'

import {
  BusinessContainer,
  SearchComponentContainer,
  BusinessInfoWrapper
} from './styles'
import { SearchComponent } from './SearchComponent'
import { BusinessInfoComponent } from './BusinessInfoComponent'
import { ClosedBelow, StoreCover, StoreHeader } from './storeHeaderStyles'
import { StoreClosedCard } from '../RenderProductsLayout/StoreClosedCard'
import { DESKTOP_MIN_WIDTH } from '../RenderProductsLayout/storePageTemplate'

import { useUtils } from '~components/contexts/UtilsContext'
import { findCurrentLapse, todayLapseRange } from '~/utils/businessTime'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { usePageSections } from '~ui/hooks/usePageSections'
import { useTheme } from 'styled-components'
import { themeImage } from '~/utils/themeTokens'
import { getSiteLogoUrl, headerBrand } from '~/utils/siteBranding'
import { singleStoreSlug, isSingleStoreBusiness } from '~/utils/singleStore'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import settings from '../../../../config'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { BusinessInformation } from '~ui/src/components/BusinessInformation'
import { BusinessReviews } from '~ui/src/components/BusinessReviews'

const types = ['food', 'laundry', 'alcohol', 'groceries']

export const BusinessBasicInformation = (props) => {
  const {
    isSkeleton,
    businessState,
    setOpenBusinessInformation,
    openBusinessInformation,
    searchValue,
    sortByOptions,
    sortByValue,
    handleChangeSortBy,
    categoryState,
    errorQuantityProducts,
    isCustomerMode,
    isCustomLayout,
    handleAddReservation,
    handleFavoriteBusiness,
    currentCart,
    showStoreSwitcher,
    handleSearchRedirect,
    onBackToList,
    // the Preorder modal lives in BusinessProductsListing, which the business
    // reload doesn't remount, unlike this component
    setIsPreOrder,
    setOpenSearchProducts,
    // the store page's design (`menu`, `cover` or `showcase`, storePageVariant): its own cover and identity
    variant
  } = props
  const { business, loading } = businessState

  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ optimizeImage }] = useUtils()
  const windowSize = useWindowSize()
  const [isBusinessReviews, setIsBusinessReviews] = useState(false)
  const isNameFixedRef = useRef(false)
  const [events] = useEvent()

  // Single Restaurant: the store block, communicating with the
  // header (a different tree) over the event bus. Only here, never in
  // Marketplace: this component also renders a store's page there, but
  // `singleStoreSlug` is null, so neither event has any effect on it.
  const singleStoreBusinessSlug = singleStoreSlug(theme, settings)
  const isSingleStore = !!singleStoreBusinessSlug
  // the business this page has loaded, live — only when it really is the
  // single store (never a stale logo from a business prop mid-navigation)
  const isOwnStore = isSingleStore && isSingleStoreBusiness(business, singleStoreBusinessSlug)
  const liveStoreLogo = (isOwnStore && business?.logo) || null
  // its name, for the header to tell whether its brand repeats this block's
  const liveStoreName = (isOwnStore && business?.name) || null

  useEffect(() => {
    if (!isSingleStore) return
    events.emit('single_store_logo', liveStoreLogo)
  }, [isSingleStore, liveStoreLogo])

  useEffect(() => {
    if (!isSingleStore || !liveStoreName) return
    events.emit('single_store_name', liveStoreName)
  }, [isSingleStore, liveStoreName])

  // The brand BusinessStickyHeader shows once fixed (same rule as the
  // header's, implementation notes): its own logo image, else this store's; "name as
  // today" (null) with neither, or off Single Restaurant (Marketplace keeps
  // its sticky header exactly as before — no logo, ever).
  const brand = isSingleStore
    ? headerBrand({
      logotypeSrc: getSiteLogoUrl(themeImage(theme, 'logotype'), BUNDLED_IMAGES.logos.logotype),
      storeLogo: liveStoreLogo,
      singleStore: isSingleStore
    })
    : null

  // Whether the store block is in view: hides the header's own (bigger)
  // brand while it is, shown small in BusinessStickyHeader once scrolled
  // past (handleScroll below). `false` on unmount restores the header's
  // brand when leaving the store's page.
  const blockRef = useRef(null)
  useEffect(() => {
    if (!isSingleStore) return
    const node = blockRef.current
    // unsupported (or this component failed before the ref ever attached):
    // the header's own fallback would show the brand anyway after ~1500ms,
    // but there is no reason to wait when we already know there is no
    // observer to report back
    if (!node || typeof window === 'undefined' || !window.IntersectionObserver) {
      events.emit('single_store_in_view', false)
      return
    }
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => events.emit('single_store_in_view', entry.isIntersecting))
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      events.emit('single_store_in_view', false)
    }
  }, [isSingleStore])

  const isInfoShrunken = false
  // the store's cover: the page's section business_header (pages.business)
  const { isVisible } = usePageSections('business')
  const hideHeader = !isVisible('business_header')
  const showHeaderBanner = !hideHeader && (
    isInfoShrunken || !!business?.header || (loading && !business?.id)
  )
  const hideHeaderBanner = hideHeader || (!loading && !business?.header)

  const businessInfoComponentProps = {
    loading,
    business,
    isInfoShrunken,
    hideHeaderBanner,
    isCustomerMode,
    setIsPreOrder,
    setIsBusinessReviews,
    setOpenBusinessInformation,
    categoryState,
    searchValue,
    errorQuantityProducts,
    setOpenSearchProducts,
    handleChangeSortBy,
    sortByValue,
    sortByOptions,
    isCustomLayout,
    handleAddReservation,
    handleFavoriteBusiness,
    currentCart,
    showStoreSwitcher,
    handleSearchRedirect,
    onBackToList,
    brand
  }

  const getBusinessType = () => {
    if (Object.keys(business).length <= 0) return t('GENERAL', 'General')
    const _types = []
    types.forEach(type => business[type] && _types.push(
      t(`BUSINESS_TYPE_${type?.replace(/\s/g, '_')?.toUpperCase()}`, type)
    ))
    return _types.join(', ')
  }

  useEffect(() => {
    if (businessState?.loading) return
    let timeout = null
    const timezone = businessState?.business?.timezone
    const now = Date.now()
    let lapse = null
    if (businessState?.business?.today?.enabled) {
      lapse = findCurrentLapse(businessState?.business?.today?.lapses, timezone, now)
    }
    if (lapse) {
      // the instant the open lapse closes (business zone, DST included)
      const { to } = todayLapseRange(lapse, timezone, now)
      const timeToClose = to.valueOf() - now
      timeout = setTimeout(() => {
        setIsPreOrder && setIsPreOrder(true)
      }, timeToClose)
    }
    return () => {
      timeout && clearTimeout(timeout)
    }
  }, [businessState?.business])

  const handleScroll = () => {
    const searchElement = document.getElementById('search-component-disabled')
    if (searchElement) {
      const limit = window.scrollY >= searchElement?.offsetTop && window.scrollY > 0
      if (limit) {
        const classAdded = searchElement.classList.contains('fixed-search')
        !classAdded && searchElement.classList.add('fixed-search')
      } else {
        searchElement && searchElement.classList.remove('fixed-search')
      }
    }
    // Past the business name, the bar with the name is fixed on top (with
    // the back arrow, BusinessStickyHeader); the name itself stays in its
    // place.
    const businessNameElement = document.getElementById('business_name')
    const businessNameBar = document.getElementById('business_name_bar')
    if (businessNameElement && businessNameBar) {
      const isFixed = isNameFixedRef.current
      const limit = window.scrollY >= businessNameElement.offsetTop - 15 && window.scrollY > 0
      if (limit && !isFixed) {
        isNameFixedRef.current = true
        businessNameBar.classList.add('fixed-name')
      } else if (!limit && isFixed) {
        isNameFixedRef.current = false
        businessNameBar.classList.remove('fixed-name')
      }
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      const businessNameBar = document.getElementById('business_name_bar')
      const searchElement = document.getElementById('search-component-disabled')

      businessNameBar?.classList.remove('fixed-name')
      searchElement?.classList.remove('fixed-search')
      isNameFixedRef.current = false
    }
  }, [windowSize?.width])

  useEffect(() => {
    window.scroll({
      top: window.scrollY - 1,
      left: 0
    })
  }, [sortByValue])

  // The store page's designs (the direct menu, the classic and the visual showcase): a cover (the store's photo, if
  // it has one) and the identity with the closed notice. The showcase has the identity over its cover; its notice is over
  // it too from the desktop cut and under it before.
  const cover = showHeaderBanner && (!!business?.header || isSkeleton)
  const desktop = windowSize.width >= DESKTOP_MIN_WIDTH
  const closedCard = variant && <StoreClosedCard business={business} loading={loading} onSchedule={setIsPreOrder && (() => setIsPreOrder(true))} />
  const designHeader = variant && (
    <StoreHeader ref={blockRef} data-doc-section='business-menu-header' data-doc-variant={variant}>
      {(variant === 'menu' || variant === 'cover') && cover && (
        <StoreCover $variant={variant} $image={business?.header} $closed={!loading && !business?.open} />
      )}
      {(variant === 'menu' || variant === 'cover') && (
        <BusinessInfoComponent {...businessInfoComponentProps} variant={variant} closedCard={closedCard} />
      )}
      {variant === 'showcase' && (cover
        ? (
          <>
            <StoreCover $variant='showcase' $image={business?.header}>
              <BusinessInfoComponent {...businessInfoComponentProps} variant='showcase' onCover closedCard={desktop ? closedCard : null} />
            </StoreCover>
            {!desktop && <ClosedBelow>{closedCard}</ClosedBelow>}
          </>
          )
        : <BusinessInfoComponent {...businessInfoComponentProps} variant='showcase' closedCard={closedCard} />)}
    </StoreHeader>
  )

  return (
    <>
      {designHeader}
      {!variant && <BusinessInfoWrapper ref={blockRef} data-doc-section='business-menu-header'>
        {showHeaderBanner && (
          <BusinessContainer bgimage={business?.header} isSkeleton={isSkeleton} id='container' isClosed={!business?.open}>
            {(isInfoShrunken) && (
              <BusinessInfoComponent {...businessInfoComponentProps} />
            )}
            {!loading && (
              <>
                {isInfoShrunken && (
                  <SearchComponentContainer>
                    <SearchComponent
                      setOpenSearchProducts={setOpenSearchProducts}
                      handleChangeSortBy={handleChangeSortBy}
                      sortByValue={sortByValue}
                      sortByOptions={sortByOptions}
                    />
                  </SearchComponentContainer>
                )}
              </>
            )}
          </BusinessContainer>
        )}
        {(!isInfoShrunken) && (
          <BusinessInfoComponent {...businessInfoComponentProps} />
        )}
      </BusinessInfoWrapper>}
      {openBusinessInformation && (
        <DialogOverlay
          legacyMaxWidth
          width='70%'
          open={openBusinessInformation}
          onClose={setOpenBusinessInformation}
          data-doc-section='business-information-dialog'
        >
          <BusinessInformation
            business={business}
            getBusinessType={getBusinessType}
            optimizeImage={optimizeImage}
          />
        </DialogOverlay>
      )}
      {isBusinessReviews && (
        <DialogOverlay
          size='sm'
          open={isBusinessReviews}
          data-doc-section='business-reviews-dialog'
          onClose={() => setIsBusinessReviews(false)}
        >
          <BusinessReviews
            businessId={business.id}
            reviews={business.reviews?.reviews}
            businessName={business.name}
            stars={business.reviews?.total}
            isColumnMode
          />
        </DialogOverlay>
      )}
    </>
  )
}
