import React, { useState, useEffect, useCallback, useRef, useId } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import {
  BusinessListingSearchContainer,
  FiltersContainer,
  Filters,
  FiltersInner,
  FiltersResultContainer,
  SortContainer,
  SortDirection,
  BusinessList,
  ProductsList,
  BusinessInfo,
  Metadata,
  BulletMark,
  BusinessInfoItem,
  SingleBusinessSearch,
  BusinessProductsListContainer,
  BusinessListWrapper,
  ListingTitle,
  BusinessProductsListWrapper,
  NotFoundWrapper,
  BusinessName,
  BusinessLogo,
  BrandContainer,
  BrandListWrapper,
  BrandItem,
  NoResult,
  PriceFilterWrapper,
  PriceFilterListWrapper,
  PreviouslyOrderedContainer,
  SearchBarContainer,
  BusinessBanner,
  HightestRatedWrapper,
  ButtonContainer,
  ResultsAction,
  ResetLink,
  MapWrap,
  MapWrapper,
  LoadMoreWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSession } from '~components/contexts/SessionContext'
import { BusinessSearchList } from '~components/components/BusinessSearchList'
import { useConfig } from '~components/contexts/ConfigContext'

import { SearchBar } from '~ui/src/components/SearchBar'
import { BusinessController } from '~ui/src/components/BusinessController'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { BusinessTypeFilter } from '~ui/src/components/BusinessTypeFilter'
import { MyOrders } from '~ui/src/components/MyOrders'
import { generalUtilities, removeQueryToUrl } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Choice } from '~ui/src/design-system/components/Choice'
import { RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { usePageSections } from '~ui/hooks/usePageSections'
import { slotButtonOptions } from '~/utils/themeGroups'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'
import { PageBanner } from '~ui/src/components/PageBanner'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { dockOrderContextBar } from '~ui/src/components/Header/orderContextPlacement'
import { HighestRated } from '~ui/src/components/HighestRated'
import { OrderProgress } from '~ui/src/components/OrderProgress'
import { Locations } from '~ui/src/components/Locations'

import { MaxSectionItem } from './MaxSectionItem'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Dot } from '~ui/src/design-system/components/Dot'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { businessLogoPlaceholder, themeSpace } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'

const PIXELS_TO_SCROLL = 300

export const BusinessListingSearchUI = (props) => {
  const {
    businessesSearchList,
    onBusinessClick,
    handleChangeFilters,
    filters,
    handleChangeTermValue,
    termValue,
    paginationProps,
    handleSearchbusinessAndProducts,
    brandList,
    onRedirectPage,
    onProductRedirect,
    handleUpdateBusinessList,
    handleUpdateProducts,
    businessUrlTemplate,
    isShowMap,
    customLocation
  } = props

  const [orderState] = useOrder()
  const [, t] = useLanguage()
  const theme = useTheme()
  const [curProduct, setCurProduct] = useState({ business: null, product: null })
  const sortDirectionId = useId()
  const [openFilter, setOpenFilter] = useState(false)
  // The page h1: Top Businesses when it shows, otherwise the listing title
  const [isTopBusinessesVisible, setIsTopBusinessesVisible] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)
  const [{ parsePrice, optimizeImage, parseDistance }] = useUtils()
  const [{ auth }] = useSession()
  const { width } = useWindowSize()
  const [{ configs }] = useConfig()
  const { convertHoursToMinutes } = generalUtilities()
  // The page's sections (pages.business_search): the order progress, the
  // filter chips, the promotion banners, the highest rated and featured
  // carousels, the previous orders and the products under each business
  // (each one in its place of the list)
  const { isVisible, render } = usePageSections('business_search')
  const showFilters = isVisible('filters')
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [isTypingSearch, setIsTypingSearch] = useState(false)
  const [inputTerm, setInputTerm] = useState(termValue || '')
  const [isResettingSearch, setIsResettingSearch] = useState(false)
  const isFetchingRef = useRef(false)
  // the next page is loading: the list stays on screen, its skeletons after it
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const defaultLocation = {
    lat: configs?.location_default_latitude?.value ? Number(configs?.location_default_latitude?.value) : 40.7744146,
    lng: configs?.location_default_longitude?.value ? Number(configs?.location_default_longitude?.value) : -73.9678064
  }

  const showInfoWindowOnMap = false
  // the products under each business (a search of 3+ letters, no map), unless
  // the theme hides them: then the businesses are a grid, as without a search
  const hideProductList = isShowMap || !(termValue?.length > 2) || !isVisible('products')
  // the logo of each business of the product results (visibility
  // product_search.logo)
  const showProductSearchLogo = themeVisible(theme, 'product_search.logo')
  // the fee, time and distance of each business of the product results
  // follow the business card's keys
  const hideBusinessFee = themeHidden(theme, 'business_card.fee')
  const hideBusinessTime = themeHidden(theme, 'business_card.time')
  const hideBusinessDistance = themeHidden(theme, 'business_card.distance')
  const placeholderLogo = businessLogoPlaceholder(theme)
  // the product modal's width, as in the store (product_modal.base.width)
  const productModalWidth = getThemeCss(theme, 'product_modal').base.width
  const maxDeliveryFeeOptions = [1, 2, 5, 'default']
  const currency = configs.format_number_currency?.value
  const maxDistanceOptions = configs?.distance_unit?.value === 'km' ? [1000, 2000, 5000, 'default'] : [1609, 3218, 8046, 'default']
  const maxTimeOptions = [5, 15, 30, 'default']
  const sortItems = [
    { text: t('PICKED_FOR_YOU', 'Picked for you (default)'), value: 'distance' },
    { text: t('DELIVERY_TIME', 'Delivery time'), value: 'delivery_time' },
    { text: t('PICKUP_TIME', 'Pickup time'), value: 'pickup_time' }
  ]

  const priceList = [
    { level: '1', content: `${currency}` },
    { level: '2', content: `${Array(2).fill(currency).join('')}` },
    { level: '3', content: `${Array(3).fill(currency).join('')}` },
    { level: '4', content: `${Array(4).fill(currency).join('')}` },
    { level: '5', content: `${Array(5).fill(currency).join('')}` }
  ]

  const filterOptionsEnabled = configs?.filter_search_options?.value?.split('|') || []

  const isInitialSearchLoading = inputTerm.length < 3 && (businessesSearchList.loading || isResettingSearch)
  const isSearchTermLoading = inputTerm.length >= 3 && (businessesSearchList.loading || isTypingSearch)
  const showSkeleton = (isInitialSearchLoading || isSearchTermLoading) && !isLoadingMore
  const showBusinessList = !showSkeleton && businessesSearchList.businesses?.length > 0
  const noResults = !showSkeleton && !businessesSearchList.lengthError && businessesSearchList?.businesses?.length === 0
  const currentCart = Object.values(orderState?.carts).find(cart => cart?.business?.slug === curProduct?.business?.slug) ?? {}
  // the page's h1 is the listing's title (or its empty state), unless Top
  // Businesses shows: then it is that carousel's title and these are h2
  const listingHeading = isTopBusinessesVisible ? 'h2' : 'h1'
  // the filter chips one tokens.space.sm apart (AutoScroll takes a number)
  const chipRowGap = parseFloat(themeSpace(theme, 'sm'))

  const handleScroll = useCallback(() => {
    const isLargeScreen = width >= 993
    const container = (isShowMap && isLargeScreen) ? document.querySelector('.business-list-container') : window

    const innerHeightScrolltop = ((isShowMap && isLargeScreen) ? container?.clientHeight : window.innerHeight) +
      ((isShowMap && isLargeScreen) ? container?.scrollTop : document.documentElement?.scrollTop) + PIXELS_TO_SCROLL

    const badScrollPosition = innerHeightScrolltop < ((isShowMap && isLargeScreen) ? container?.scrollHeight : document.documentElement?.offsetHeight)
    const hasMore = !(paginationProps?.totalPages === paginationProps?.currentPage)

    if (badScrollPosition || businessesSearchList?.loading || isFetchingRef.current || businessesSearchList.error?.length > 0 || !hasMore) return
    handleLoadMore()
  }, [businessesSearchList.loading, paginationProps, isShowMap, width, termValue])

  useEffect(() => {
    if (!isTypingSearch && !isResettingSearch) {
      setInputTerm(termValue || '')
    }
  }, [termValue, isTypingSearch, isResettingSearch])

  useEffect(() => {
    if (!businessesSearchList.loading) {
      isFetchingRef.current = false
      setIsLoadingMore(false)
      setIsTypingSearch(false)
      setIsResettingSearch(false)
    }
  }, [businessesSearchList.loading])

  const handleSearchTermChange = (val) => {
    const normalizedVal = val || ''
    const hadMinSearchTerm = termValue?.length >= 3
    setInputTerm(normalizedVal)
    if (normalizedVal.length >= 3) {
      setIsResettingSearch(false)
      setIsTypingSearch(true)
    } else if (hadMinSearchTerm) {
      setIsResettingSearch(true)
      setIsTypingSearch(true)
    } else {
      setIsTypingSearch(false)
      setIsResettingSearch(false)
    }
    handleChangeTermValue(normalizedVal)
  }

  const handleLoadMore = () => {
    if (businessesSearchList?.loading || isFetchingRef.current) return
    isFetchingRef.current = true
    setIsLoadingMore(true)
    handleSearchbusinessAndProducts(false, {}, termValue)
  }

  const handleBusinessClick = (business) => {
    setSelectedBusiness(business)
    if (business?.location) {
      setMapCenter({
        lat: typeof business.location.lat === 'string'
          ? parseFloat(business.location.lat)
          : business.location.lat,
        lng: typeof business.location.lng === 'string'
          ? parseFloat(business.location.lng)
          : business.location.lng
      })
    }
  }

  const handleChangeBrandFilter = (brandId) => {
    let franchiseIds = [...filters?.franchise_ids]
    if (filters?.franchise_ids?.includes(brandId)) franchiseIds = filters?.franchise_ids?.filter(item => item !== brandId)
    else franchiseIds.push(brandId)
    handleChangeFilters && handleChangeFilters('franchise_ids', franchiseIds)
  }

  const handleChangePriceRange = (value) => {
    if (value === filters?.price_level) handleChangeFilters('price_level', null)
    else handleChangeFilters('price_level', value)
  }

  const onProductClick = (product, business) => {
    setCurProduct({ business, product })
  }

  const handleRedirectToCart = (product, code) => {
    setCurProduct({ business: null, product: null })
    onBusinessClick(curProduct?.business)
  }

  const closeModalProductForm = () => {
    setCurProduct({ business: null, product: null })
  }

  useEffect(() => {
    const isLargeScreen = width >= 993
    const container = (isShowMap && isLargeScreen) ? document.querySelector('.business-list-container') : window
    container?.addEventListener('scroll', handleScroll)
    return () => container?.removeEventListener('scroll', handleScroll)
  }, [handleScroll, isShowMap, width])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const openFilterParam = searchParams.get('openFilter')
    if (openFilterParam) {
      setActiveFilter(openFilterParam)
      setOpenFilter(true)
      removeQueryToUrl(['openFilter'])
    }
  }, [])

  const handleOpenFilter = (filterType) => {
    setActiveFilter(filterType)
    setOpenFilter(true)
  }

  const handleCloseFilter = () => {
    setActiveFilter(null)
    setOpenFilter(false)
  }

  const filterResetActions = {
    sort: () => handleChangeFilters('orderBy', null),
    price_range: () => handleChangeFilters('price_level', null),
    brands: () => handleChangeFilters('franchise_ids', []),
    max_delivery_fee: () => handleChangeFilters('max_delivery_price', null),
    max_delivery_time: () => handleChangeFilters('max_eta', null),
    max_distance: () => handleChangeFilters('max_distance', null),
    business_types: () => handleChangeFilters('business_types', [])
  }

  const handleResetActiveFilter = () => {
    filterResetActions[activeFilter]?.()
    handleCloseFilter()
  }

  const hasActiveFilters = useCallback(() => {
    const hasSearchTerm = termValue?.length > 2
    const hasOtherFilters = Object.keys(filters).some(key => {
      const value = filters[key]
      return value !== null &&
             value !== undefined &&
             value !== '' &&
             (Array.isArray(value) ? value.length > 0 : true) &&
             key !== 'orderBy'
    })
    return hasSearchTerm || hasOtherFilters
  }, [filters, termValue])

  const filtersComponent = (fromModal = false) => {
    return (
      <Filters data-doc-section='business-search-filters' fullWidth={!isShowMap} fromModal={fromModal}>
        <FiltersInner>
          <AutoScroll scrollId={`businessSearchFilters-${fromModal ? 'modal' : 'main'}`} gap={chipRowGap}>
        {filterOptionsEnabled.includes('price_range') && (
          <Chip
            data-doc-control='business-filter-price-range'
            data-doc-state={filters?.price_level ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('price_range')}
            selected={!!filters?.price_level}
          >
            {t('PRICE', 'Price')}
          </Chip>
        )}
        {filterOptionsEnabled.includes('brands') && (
          <Chip
            data-doc-control='business-filter-brands'
            data-doc-state={filters?.franchise_ids?.length > 0 ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('brands')}
            selected={filters?.franchise_ids?.length > 0}
          >
            {t('BRANDS', 'Brands')}
          </Chip>
        )}
        {orderState?.options?.type === 1 && filterOptionsEnabled.includes('max_delivery_fee') && (
          <Chip
            data-doc-control='business-filter-delivery-fee'
            data-doc-state={filters?.max_delivery_price ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('max_delivery_fee')}
            selected={!!filters?.max_delivery_price}
          >
            {t('DELIVERY_FEE', 'Delivery fee')}
          </Chip>
        )}
        {[1, 2].includes(orderState?.options?.type) && filterOptionsEnabled.includes('max_delivery_time') && (
          <Chip
            data-doc-control='business-filter-fulfillment-time'
            data-doc-state={filters?.max_eta ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('max_delivery_time')}
            selected={!!filters?.max_eta}
          >
            {orderState?.options?.type === 1 ? t('MAX_DELIVERY_TIME', 'Max delivery time') : t('MAX_PICKUP_TIME', 'Max pickup time')}
          </Chip>
        )}
        {filterOptionsEnabled.includes('max_distance') && (
          <Chip
            data-doc-control='business-filter-distance'
            data-doc-state={filters?.max_distance ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('max_distance')}
            selected={!!filters?.max_distance}
          >
            {t('MAX_DISTANCE', 'Max distance')}
          </Chip>
        )}
        {filterOptionsEnabled.includes('business_categories') && (
          <Chip
            data-doc-control='business-filter-categories'
            data-doc-state={filters?.business_types?.length > 0 ? 'active' : 'inactive'}
            onClick={() => handleOpenFilter('business_types')}
            selected={filters?.business_types?.length > 0}
          >
            {t('CATEGORIES', 'Categories')}
          </Chip>
        )}
          </AutoScroll>
        </FiltersInner>
      </Filters>
    )
  }

  return (
    <BusinessListingSearchContainer
      data-doc-section='business-search'
      data-doc-state={isShowMap ? 'map' : showSkeleton ? 'loading' : noResults ? 'empty' : 'results'}
      isShowMap={isShowMap}
    >
      {dockOrderContextBar(width, theme, orderState?.options?.type) && (
        <BusinessBanner>
          <OrderContextUI isBusinessList isDocked />
        </BusinessBanner>
      )}
      {!isShowMap && isVisible('order_progress') && (
        <OrderProgress
          franchiseId={props.franchiseId}
        />
      )}
      {!isShowMap && (
        <SearchBarContainer data-doc-control='business-search-term'>
          {showFilters && filtersComponent()}
          <SearchBar
            lazyLoad
            starbucksStyle
            isCustomLayout
            forceFocus
            placeholder={t('SEARCH', 'Search')}
            onSearch={handleSearchTermChange}
            onSearchStart={(val) => {
              const normalizedVal = val || ''
              const hadMinSearchTerm = termValue?.length >= 3
              setInputTerm(normalizedVal)
              if (normalizedVal.length >= 3) {
                setIsResettingSearch(false)
                setIsTypingSearch(true)
              } else if (hadMinSearchTerm) {
                setIsResettingSearch(true)
                setIsTypingSearch(true)
              } else {
                setIsResettingSearch(false)
                setIsTypingSearch(false)
              }
            }}
            search={termValue}
          />
        </SearchBarContainer>
      )}
      {/* the promotion banners and the carousels, in the theme's order (not
          with the map; a franchise has no carousels) */}
      {!isShowMap && render({
        promo_banners: () => (
          <PageBanner
            position='web_business_listing'
            isHorizontal
          />
        ),
        highest_rated: () => !props.franchiseId && (
          <HightestRatedWrapper>
            <HighestRated
              propsToFetch={props.propsToFetch}
              initialOrderByValue='rating'
              onBusinessClick={onBusinessClick}
              disabledCities
              businessUrlTemplate={businessUrlTemplate}
            />
          </HightestRatedWrapper>
        ),
        featured: () => !props.franchiseId && (
          <HightestRatedWrapper>
            <HighestRated
              scrollId='featured'
              title={t('TOP_BUSINESSES', 'Top Businesses')}
              titleAs='h1'
              onVisibleChange={setIsTopBusinessesVisible}
              description={t('TOP_BUSINESSES_DESCRIPTION', 'Sponsored')}
              propsToFetch={props.propsToFetch}
              isFeatured
              onBusinessClick={onBusinessClick}
              disabledCities
              businessUrlTemplate={businessUrlTemplate}
            />
          </HightestRatedWrapper>
        )
      })}
      <FiltersContainer>
        <FiltersResultContainer fullWidth={!isShowMap}>
          {!isShowMap && auth && !(termValue?.length > 0) && isVisible('previous_orders') && (
            <PreviouslyOrderedContainer>
              <MyOrders
                isFromBusinessListingSearch
                hideOrders
                businessesSearchList={businessesSearchList}
                onRedirectPage={onRedirectPage}
                onProductRedirect={onProductRedirect}
                onBusinessClick={onBusinessClick}
                businessUrlTemplate={businessUrlTemplate}
              />
            </PreviouslyOrderedContainer>
          )}
          <BusinessListWrapper
            className="business-list-container"
            fullWidth={!isShowMap || (!businessesSearchList.loading && businessesSearchList.businesses?.length === 0)}
            isShowMap={isShowMap}
            hideProductList={hideProductList}
          >
            {isShowMap && showFilters && (
              <SearchBarContainer data-doc-control='business-search-term'>
                {filtersComponent()}
              </SearchBarContainer>
            )}
            {(showBusinessList || showSkeleton) && !isShowMap && (
              <ListingTitle as={listingHeading} $level={listingHeading}>
                {hasActiveFilters()
                  ? (
                      <>
                        {/* while it loads, the count is a placeholder */}
                        {showSkeleton ? <Skeleton width={30} inline /> : (paginationProps?.totalItems ?? businessesSearchList.businesses.length)} {t('RESULTS', 'Results')}
                      </>
                    )
                  // the same text (key) as the list's title in /search
                  : t('ALL_BUSINESSES', 'All Businesses')}
              </ListingTitle>
            )}
            <BusinessList data-doc-section='business-search-results' noResults={noResults} hideProductList={hideProductList}>
              {
                noResults && (
                  <NotFoundWrapper data-doc-state='empty'>
                    <NotFoundSource
                      variant='empty'
                      icon='search'
                      // the page's only content: its h1 (h2 under Top Businesses)
                      headingLevel={listingHeading}
                      content={t('NO_BUSINESSES_AVAILABLE', 'No businesses available at this address')}
                      subtitle={t('NO_BUSINESSES_AVAILABLE_DESC', 'Try changing your address or filters.')}
                    />
                  </NotFoundWrapper>
                )
              }
              {showBusinessList && (
                <>
                  {businessesSearchList.businesses.map((business, i) => (
                    <BusinessController
                      fromBusinessListingSearch
                      key={business.id}
                      isShowMap={isShowMap}
                      fromBusinessListing
                      className='card'
                      business={business}
                      isBusinessOpen={business.open}
                      handleCustomClick={onBusinessClick}
                      orderType={orderState?.options?.type}
                      handleUpdateBusinessList={handleUpdateBusinessList}
                      businessUrlTemplate={businessUrlTemplate}
                      hideProductList={hideProductList}
                      // the cards' names one level under the
                      // listing's title (the page's h1)
                      nameAs={isTopBusinessesVisible ? 'h3' : 'h2'}
                    />
                  ))}
                  {!hideProductList && !businessesSearchList.loading && paginationProps?.totalPages && paginationProps?.currentPage < paginationProps?.totalPages && (
                    <LoadMoreWrapper>
                      <Button
                        className='load-orders'
                        appearance='outline'
                        size='md'
                        onClick={handleLoadMore}
                      >
                        {t('LOAD_MORE_BUSINESS', 'Load more business')}
                      </Button>
                    </LoadMoreWrapper>
                  )}
                </>
              )}
              {(showSkeleton || isLoadingMore) && (
                [...Array(3).keys()].map(i => (
                  <BusinessController
                    key={`skeleton-${i}`}
                    fromBusinessListingSearch
                    className='card'
                    business={{}}
                    isSkeleton
                    isShowMap={isShowMap}
                    orderType={orderState?.options?.type}
                    firstCard={i === 0 && width > 681}
                    hideProductList={hideProductList}
                  />
                ))
              )}
            </BusinessList>
          </BusinessListWrapper>
          {isShowMap && (!businessesSearchList.loading || isLoadingMore) && (
            <MapWrap data-doc-section='business-search-map'>
              <MapWrapper id='map-canvas'>
                <Locations
                  businessList={businessesSearchList?.businesses || []}
                  userLocation={mapCenter || orderState?.options?.address?.location || customLocation || defaultLocation}
                  onBusinessClick={showInfoWindowOnMap ? handleBusinessClick : onBusinessClick}
                  selectedBusiness={selectedBusiness}
                  forceCenter={mapCenter !== null}
                  listenLocations
                />
              </MapWrapper>
            </MapWrap>
          )}
          {!hideProductList && (
            <ProductsList>
              {businessesSearchList.businesses?.map(business => {
                const hasProducts = business?.categories?.some(category => category?.products?.length > 0)
                return (
                <SingleBusinessSearch key={`card-${business?.id}`}>
                  <BusinessInfo>
                    {showProductSearchLogo && (business?.logo || placeholderLogo) && (
                      <BusinessLogo bgimage={optimizeImage(business?.logo || placeholderLogo, 'h_200,c_limit')} />
                    )}
                    <BusinessInfoItem>
                      {/* a section of the page under its h1 (the look of
                          product_search's name) */}
                      <BusinessName as='h2' title={business?.name}>{business?.name}</BusinessName>
                      <Metadata>
                        {orderState?.options?.type === 1 && !hideBusinessFee && (
                          <p>
                            <span>{t('DELIVERY_FEE', 'Delivery fee')}</span>
                            {business && parsePrice(business?.delivery_price)}
                          </p>
                        )}
                        {!hideBusinessTime && (
                          <p className='bullet'>
                            <BulletMark><Dot size='xs' /></BulletMark>
                            {convertHoursToMinutes(orderState?.options?.type === 1 ? business?.delivery_time : business?.pickup_time)}
                          </p>
                        )}
                        {!hideBusinessDistance && (
                          <p className='bullet'>
                            <BulletMark><Dot size='xs' /></BulletMark>
                            {parseDistance(business?.distance)}
                          </p>
                        )}
                      </Metadata>
                    </BusinessInfoItem>
                    <Button
                      onClick={() => onBusinessClick(business)}
                      {...slotButtonOptions(theme, 'product_search', 'go_to_store', { color: 'neutral', size: 'md' })}
                    >
                      {t('GO_TO_THE_STORE', 'Go to the store')}
                    </Button>
                  </BusinessInfo>
                  {hasProducts && (
                    <BusinessProductsListWrapper>
                      <BusinessProductsListContainer>
                        <AutoScroll scrollId={`products-${business?.id}`}>
                          {business?.categories?.map(category => category?.products?.map(product => (
                            <SingleProductCard
                              key={product?.id}
                              isSoldOut={(product.inventoried && !product.quantity)}
                              product={product}
                              businessId={business?.id}
                              onProductClick={(product) => onProductClick(product, business)}
                              handleUpdateProducts={(productId, changes) => handleUpdateProducts(productId, category?.id, business?.id, changes)}
                            />
                          )))}
                        </AutoScroll>
                      </BusinessProductsListContainer>
                    </BusinessProductsListWrapper>
                  )}
                </SingleBusinessSearch>
                )
              })}
              {(showSkeleton || isLoadingMore) && businessesSearchList?.loading && (
                [...Array(3)].map((item, i) => (
                  <SingleBusinessSearch key={`skeleton:${i}`}>
                    <BusinessInfo>
                      {showProductSearchLogo && (
                        <BusinessLogo isSkeleton>
                          <Skeleton />
                        </BusinessLogo>
                      )}
                      <BusinessInfoItem>
                        <BusinessName>
                          <Skeleton width={50} />
                        </BusinessName>
                        <Metadata>
                          <Skeleton width={65} />
                          <Skeleton width={65} />
                          <Skeleton width={65} />
                        </Metadata>
                      </BusinessInfoItem>
                    </BusinessInfo>
                    <BusinessProductsListWrapper>
                      <BusinessProductsListContainer>
                        {[...Array(3)].map((item, j) => (
                          <SingleProductCard
                            key={`skeleton-card:${j}-${i}`}
                            isSkeleton
                          />
                        ))}
                      </BusinessProductsListContainer>
                    </BusinessProductsListWrapper>
                  </SingleBusinessSearch>
                ))
              )}
            </ProductsList>
          )}
        </FiltersResultContainer>
      </FiltersContainer>
      {!!curProduct?.product && (
        <ProductModal
          dataDocSection='business-search-product-dialog'
          width={props?.useKioskApp ? `min(80%, ${productModalWidth})` : productModalWidth}
          open={!!curProduct?.product}
          onClose={() => closeModalProductForm()}
        >
          {(!!curProduct?.product) && (
            <ProductForm
              businessSlug={curProduct?.business?.slug}
              useKioskApp={props?.useKioskApp}
              product={curProduct?.product}
              businessId={curProduct?.business?.id}
              categoryId={curProduct?.product?.category_id}
              productId={curProduct?.product?.id}
              onSave={handleRedirectToCart}
              handleUpdateProducts={(productId, changes) => handleUpdateProducts(productId, curProduct?.product?.category_id, curProduct?.business?.id, changes)}
              productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === curProduct?.product?.id ? Cproduct?.quantity : 0) }, 0) || 0}
            />
          )}
        </ProductModal>
      )}
      {openFilter && (
        <DialogOverlay
          size='md'
          data-doc-section='business-search-filter-dialog'
          open={openFilter}
          onClose={handleCloseFilter}
          title={activeFilter === 'max_delivery_time'
            ? (orderState?.options?.type === 1 ? t('MAX_DELIVERY_TIME', 'Max delivery time') : t('MAX_PICKUP_TIME', 'Max pickup time'))
            : activeFilter === 'max_delivery_fee' ? t('DELIVERY_FEE', 'Delivery fee') : t(activeFilter?.toUpperCase(), activeFilter?.replace('_', ' '))}
          /* the modal's own padding and title (components.modal) */
        >
          {activeFilter === 'sort' && (
            // a single choice list: the order is the selection, and choosing the current one again reverses it
            <>
              <RadioGroup
                render={<SortContainer style={{ display: 'flex', flexDirection: 'column', gap: getThemeCss(theme, 'choice').base.gap }} />}
                aria-label={t('SORT_BY', 'Sort By')}
                value={sortItems.find(item => filters?.orderBy?.includes(item?.value))?.value ?? ''}
                onValueChange={(value) => handleChangeFilters('orderBy', value)}
              >
                {sortItems?.filter(item => !(orderState?.options?.type === 1 && item?.value === 'pickup_time') && !(orderState?.options?.type === 2 && item?.value === 'delivery_time'))?.map(item => {
                  const selected = !!filters?.orderBy?.includes(item?.value)
                  return (
                    <Choice
                      key={item?.value}
                      value={item?.value}
                      onClick={() => selected && handleChangeFilters('orderBy', item?.value)}
                      // the arrow is for the eye: the direction is the description of the active option
                      aria-describedby={selected ? sortDirectionId : undefined}
                      title={(
                        <>
                          {item?.text}
                          {selected && (
                            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineStart: themeSpace(theme, 'sm') }}>
                              <Icon name={filters?.orderBy?.includes('-') ? 'arrowUp' : 'arrowDown'} aria-hidden='true' />
                            </span>
                          )}
                        </>
                      )}
                    />
                  )
                })}
              </RadioGroup>
              <SortDirection id={sortDirectionId}>
                {filters?.orderBy?.includes('-') ? t('SORT_ORDER_DESCENDING', 'Descending order') : t('SORT_ORDER_ASCENDING', 'Ascending order')}
              </SortDirection>
            </>
          )}
          {activeFilter === 'brands' && (
            <BrandContainer>
              <BrandListWrapper>
                {brandList?.loading && (
                  <>
                    {[...Array(5).keys()].map(index => (
                      <BrandItem key={index}>
                        <Skeleton width={120} height={15} />
                        <Skeleton width={16} height={16} />
                      </BrandItem>
                    ))}
                  </>
                )}
                {!brandList?.loading && (
                  // a multiple choice list: a Choice of the design system for each brand
                  <div style={{ display: 'flex', flexDirection: 'column', gap: getThemeCss(theme, 'choice').base.gap }}>
                    {brandList?.brands.map((brand, i) => brand?.enabled && (
                      <Choice
                        key={i}
                        type='check'
                        title={brand?.name}
                        checked={!!filters?.franchise_ids?.includes(brand?.id)}
                        onCheckedChange={() => handleChangeBrandFilter(brand?.id)}
                      />
                    ))}
                  </div>
                )}
                {!brandList?.loading && ((brandList?.brands?.filter(brand => brand?.enabled))?.length === 0) && (
                  <NoResult>{t('NO_RESULTS_FOUND', 'Sorry, no results found')}</NoResult>
                )}
              </BrandListWrapper>
            </BrandContainer>
          )}
          {activeFilter === 'price_range' && (
            <PriceFilterWrapper>
              <PriceFilterListWrapper>
                {priceList.map((price, i) => (
                  <Chip
                    key={i}
                    selected={filters?.price_level === price?.level}
                    onClick={() => handleChangePriceRange(price?.level)}
                  >
                    {price.content}
                    {(filters?.price_level === price?.level) && <Icon name="closeX" />}
                  </Chip>
                ))}
              </PriceFilterListWrapper>
            </PriceFilterWrapper>
          )}
          {activeFilter === 'max_delivery_fee' && (
            <MaxSectionItem
              description={t('DELIVERY_FEE_DESCRIPTION', 'Delivery fees vary of each restaurant based on your location and other factors.')}
              options={maxDeliveryFeeOptions}
              filter='max_delivery_price'
              filters={filters}
              handleChangeFilters={handleChangeFilters}
            />
          )}
          {activeFilter === 'max_delivery_time' && (
            <MaxSectionItem
              options={maxTimeOptions}
              filter='max_eta'
              filters={filters}
              handleChangeFilters={handleChangeFilters}
            />
          )}
          {activeFilter === 'max_distance' && (
            <MaxSectionItem
              options={maxDistanceOptions}
              filter='max_distance'
              filters={filters}
              handleChangeFilters={handleChangeFilters}
            />
          )}
          {activeFilter === 'business_types' && (
            <BusinessTypeFilter
              isSearchMode
              filters={filters}
              handleChangeFilters={handleChangeFilters}
            />
          )}
          <ButtonContainer>
            <ResultsAction>
              <Button size='lg' fullWidth onClick={handleCloseFilter}>
                {t('VIEW_RESULTS', 'View Results')}
              </Button>
            </ResultsAction>
            <ResetLink onClick={handleResetActiveFilter}>
              {t('RESET', 'Reset')}
            </ResetLink>
          </ButtonContainer>
        </DialogOverlay>
      )}
    </BusinessListingSearchContainer>
  )
}

export const BusinessListingSearch = (props) => {
  const BusinessListSearch = {
    ...props,
    UIComponent: BusinessListingSearchUI,
    paginationSettings: { initialPage: 1, pageSize: 25, controlType: 'infinity' }
  }
  return <BusinessSearchList {...BusinessListSearch} />
}
