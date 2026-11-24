import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Filters, FiltersInner } from '../../../BusinessListingSearch/styles'
import { resolveSearchQuery } from '../../../../../../utils/searchQueryLocation'

import {
  BusinessContainer,
  BusinessList,
  WrapperSearch,
  CityAction,
  BusinessesTitle,
  HightestRatedWrapper,
  SearchContainer,
  BusinessLogo,
  BusinessLogosContainer,
  BusinessBanner,
  BusinessLogosWrapper,
  AddressFormWrapper,
  Title,
  TypesContainer,
  TypesWrapper,
  AdditionalTypesContainer,
  FiltersContainer,
  FiltersSearch,
  SheetFilterShortcuts,
  SheetFilterCell,
  SearchRedirectArea,
  EmptyStateWrapper,
  AllBusinessesSection,
  ShowcaseGroups,
  ShowcaseHero,
  HiddenTitle,
  GroupDescription
} from './styles'
import { businessListingLayout, groupShowcase } from './listingLayout'

import { useOrder } from '~components/contexts/OrderContext'
import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { BusinessList as BusinessListController } from '~components/components/BusinessList'

import { OrdersSection } from './OrdersSection'

import { useWindowSize } from '~ui/hooks/useWindowSize'
import { usePageSections } from '~ui/hooks/usePageSections'
import { Chip } from '~ui/src/design-system/components/Chip'
import { createSheetHandle, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~ui/src/design-system/components/Sheet'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Alert } from '~ui/src/components/Confirm'
import { SearchBar } from '~ui/src/components/SearchBar'
import { getCateringValues } from '~ui/utils'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { BusinessTypes } from '~ui/src/components/BusinessTypes'
import { BusinessController } from '~ui/src/components/BusinessController'
import { BusinessesMap } from '~ui/src/components/BusinessesMap'
import { HighestRated } from '~ui/src/components/HighestRated'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'
import { PageBanner } from '~ui/src/components/PageBanner'
import { CitiesControl } from '~ui/src/components/CitiesControl'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { dockOrderContextBar } from '~ui/src/components/Header/orderContextPlacement'
import { AddressList } from '~ui/src/components/AddressList'
import { AddressForm } from '~ui/src/components/AddressForm'
import { OrderProgress } from '~ui/src/components/OrderProgress'
import { CustomOrderBanner } from '~ui/src/components/CustomOrderBanner'
import { CustomOrderModal } from '~ui/src/components/CustomOrderModal'
import { Icon } from '~ui/src/design-system/components/Icon'
import { TabsAction, TabsNavigation } from '~ui/src/design-system/components/Tabs'
import { Button as PieceButton } from '~ui/src/design-system/components/Button'
import { businessLogoPlaceholder, themeMedia, themeSpace, themeValue } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'

const PIXELS_TO_SCROLL = 300
const DESKTOP_FILTER_SHEET_WIDTH = 1024

const listingFilters = (configs, orderType, t) => {
  const enabled = configs?.filter_search_options?.value?.split('|') || []
  return [
    { key: 'price_range', label: t('PRICE', 'Price') },
    { key: 'brands', label: t('BRANDS', 'Brands') },
    orderType === 1 && { key: 'max_delivery_fee', label: t('DELIVERY_FEE', 'Delivery fee') },
    [1, 2].includes(orderType) && {
      key: 'max_delivery_time',
      label: orderType === 1 ? t('MAX_DELIVERY_TIME', 'Max delivery time') : t('MAX_PICKUP_TIME', 'Max pickup time')
    },
    { key: 'max_distance', label: t('MAX_DISTANCE', 'Max distance') },
    { key: 'business_categories', target: 'business_types', label: t('CATEGORIES', 'Categories') }
  ].filter((filter) => filter && enabled.includes(filter.key))
}

const InlineFilters = ({ filters, onPick }) => {
  const theme = useTheme()
  return (
    <Filters fullWidth>
      <FiltersInner>
        <AutoScroll scrollId='visualFilters' gap={parseFloat(themeSpace(theme, 'sm'))}>
          {filters.map(({ key, target = key, label }) => (
            <Chip key={key} onClick={() => onPick(target)}>{label}</Chip>
          ))}
        </AutoScroll>
      </FiltersInner>
    </Filters>
  )
}

const BusinessesListingUI = (props) => {
  const {
    businessesList,
    paginationProps,
    searchValue,
    getBusinesses,
    isCustomLayout,
    isCustomerMode,
    onRedirectPage,
    handleChangeSearch,
    handleChangeBusinessType,
    handleBusinessClick,
    onBusinessClick,
    handleUpdateBusinessList,
    getCities,
    citiesState,
    logosLayout,
    actualSlug,
    orderTypes,
    businessUrlTemplate,
    businessTypeSelected,
    customLocation
  } = props
  const allOrderTypes = [1, 2, 3, 4, 5]
  const pickupTypes = [2, 3, 4, 5]
  const [, t] = useLanguage()
  const [orderState, { changeCityFilter, changeType }] = useOrder()
  const [{ auth }] = useSession()
  const [{ configs }] = useConfig()
  const windowSize = useWindowSize()
  const theme = useTheme()
  const [modals, setModals] = useState({ listOpen: false, formOpen: false, citiesOpen: false })
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [activeMap, setActiveMap] = useState(false)
  // The page h1: Top Businesses when it shows, otherwise All Businesses
  const [mapErrors, setMapErrors] = useState('')
  const [isPreorder, setIsPreorder] = useState(false)
  const [preorderBusiness, setPreorderBusiness] = useState(null)
  const [isPickupSelected, setIsPickupSelected] = useState(pickupTypes.includes(orderState?.options?.type))
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const [favoriteIds, setFavoriteIds] = useState([])
  const [showCustomOrder, setShowCustomOrder] = useState(false)
  const customOrderEnabled = auth && configs?.custom_order_enabled?.value === '1'
  // a place to list from: the address, or the location of the query (`?lat=&lng=`) and
  // the one of the order without a street
  const hasAddress = Boolean(orderState?.options?.address?.address || orderState?.options?.address?.location || customLocation)
  // the city choice beside the search (business_listing.cities): a button
  // with the chosen city that opens the cities' modal. The cities are the
  // controller's (it loads them for pickup orders)
  const hideCities = !themeVisible(theme, 'business_listing.cities')
  // The page's sections (pages.business_listing): their order and which ones
  // show
  const { sections, isVisible, render } = usePageSections('business_listing')
  const hideSearch = !isVisible('search')
  // the filter chips
  const showFilters = isVisible('filters')
  // the featured carousel is its own section
  const showFeatured = isVisible('featured')
  const showcase = !isCustomerMode && businessListingLayout(theme) === 'showcase'
  const closedLast = !isCustomerMode && themeValue(theme, 'business_listing_page', 'base.closed_stores') === 'last'
  const filtersInSheet = !isCustomerMode && themeValue(theme, 'business_listing_page', 'base.filters') === 'sheet'
  const filterOptions = listingFilters(configs, orderState?.options?.type, t)
  const hasFilterSheet = showFilters && filtersInSheet && filterOptions.length > 0
  const filterTrigger = useRef(null)
  const [filterSheetHandle] = useState(createSheetHandle)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  useEffect(() => {
    if (!hasFilterSheet) setFilterSheetOpen(false)
  }, [hasFilterSheet])
  const showFeaturedBadge = showcase ? themeValue(theme, 'business_listing_page', 'base.showcase_featured_badge') : undefined
  const businesses = (businessesList.businesses || []).filter(Boolean)
  const { hero, open: openBusinesses, later: laterBusinesses } = groupShowcase(
    businesses,
    { withHero: showcase && !props.franchiseId && !businessTypeSelected && showFeatured }
  )
  const hideSearchSection = hideCities && hideSearch
  const isWideSearch = windowSize.width > 1200
  // Above 1200px the search sits beside the filter chips: the row shows in
  // the place of the first of the two in the theme's order
  const firstSearchOrFilters = sections.find((section) => section.visible && ['search', 'filters'].includes(section.key))?.key
  const [carouselsShown, setCarouselsShown] = useState({ highest_rated: false, featured: false })
  const handleCarouselShown = (key) => (shown) => setCarouselsShown((prev) => (prev[key] === shown ? prev : { ...prev, [key]: shown }))
  // The page h1: the first carousel the theme paints with businesses
  // (highest rated or featured), otherwise All Businesses
  // (in showcase the hero is the featured section, so it owns the h1 when it shows: it paints
  // above the groups and the page's headings read in order)
  const h1Owner = sections.find((section) => section.visible && (carouselsShown[section.key] || (section.key === 'featured' && showcase && hero)))?.key || 'all_businesses'
  const headingOf = (key) => (h1Owner === key ? 'h1' : 'h2')
  const businessesIds = businessesList.businesses &&
    businessesList.businesses?.filter(Boolean).map(business => business.id)
  const cateringTypeString = orderState?.options?.type === 7
    ? 'catering_delivery'
    : orderState?.options?.type === 8
      ? 'catering_pickup'
      : null
  const configTypes = configs?.order_types_allowed?.value.split('|').filter(value => (allOrderTypes.includes(Number(value)))).map(value => Number(value)) || []
  const cateringValues = preorderBusiness?.configs && getCateringValues(cateringTypeString, preorderBusiness?.configs)
  const advancedSearchDisabled = false
  const handleScroll = useCallback(() => {
    const innerHeightScrolltop = window.innerHeight + document.documentElement?.scrollTop + PIXELS_TO_SCROLL
    const badScrollPosition = innerHeightScrolltop < document.documentElement?.offsetHeight
    const hasMore = !(paginationProps.totalPages === paginationProps.currentPage)
    if (badScrollPosition || businessesList.loading || businessesList.error || !hasMore) return
    getBusinesses()
  }, [businessesList, paginationProps])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const handleClickAddress = (e) => {
    if (auth) {
      setModals({ ...modals, listOpen: true })
    } else {
      setModals({ ...modals, formOpen: true })
    }
  }

  const toggleMap = () => {
    setActiveMap(!activeMap)
  }

  const handleCloseAlerts = () => {
    setAlertState({ open: false, content: [] })
    setMapErrors('')
  }

  const handleMapErrors = (errKey) => {
    setAlertState({
      open: true,
      content: [t(errKey, mapErrors[errKey])]
    })
  }

  useEffect(() => {
    if (mapErrors) {
      handleMapErrors(mapErrors)
      setActiveMap(false)
    }
  }, [mapErrors])

  const getCustomArray = (list) => {
    const isArray = Array.isArray(list)
    return isArray ? list : Object.values(list)
  }

  const handleClosePreorder = () => {
    setIsPreorder(false)
    setPreorderBusiness(null)
  }

  const handleOpenCities = () => {
    if (!citiesState?.cities?.length) {
      getCities()
    }
    setModals({ ...modals, citiesOpen: true })
  }

  const handleChangeCity = (cityId) => {
    changeCityFilter(cityId === orderState?.options?.city_id ? null : cityId)
  }

  const handleChangeType = async (value) => {
    if (!orderState?.loading) {
      await changeType(value)
      if (value === 1) {
        setIsPickupSelected(false)
      }
    }
  }

  const handleChangeToPickup = () => {
    const firstEnabledPickupType = orderTypes.find(type => configTypes?.includes(type.value) && type.value !== 1)?.value
    handleChangeType(firstEnabledPickupType)
    setIsPickupSelected(true)
  }

  const handleAdvancedSearchRedirect = (event) => {
    event?.preventDefault?.()
    if (advancedSearchDisabled) return
    redirectToBusinessSearch()
  }

  const redirectToBusinessSearch = (search = '') => {
    const orderLocation = orderState?.options?.address?.location
    onRedirectPage({
      page: 'business_search',
      search: resolveSearchQuery(search, orderLocation, customLocation)
    })
  }

  useEffect(() => {
    if (preorderBusiness) setIsPreorder(true)
  }, [preorderBusiness])

  useEffect(() => {
    setActiveMap(false)
    if (!businessesList?.businesses?.length) return
    if (props.franchiseId) {
      const skipRedirect = window.localStorage.getItem('change_store_redirect') === 'true'
      if (skipRedirect) {
        window.localStorage.removeItem('change_store_redirect')
        window.localStorage.removeItem('single_business')
      } else {
        const target = businessesList.businesses.find(b => b?.open) || businessesList.businesses[0]
        onBusinessClick(target)
        window.localStorage.setItem('single_business', true)
        return
      }
    }
    if (businessesList?.businesses?.length === 1 && configs?.activate_single_store_automatically?.value === '1') {
      onBusinessClick(businessesList?.businesses[0])
      window.localStorage.setItem('single_business', true)
      return
    }
    window.localStorage.removeItem('single_business')
    const ids = [...favoriteIds]
    businessesList.businesses.forEach(business => {
      if (business?.favorite) {
        ids.push(business.id)
      }
    })
    setFavoriteIds([...new Set(ids)])
  }, [businessesList?.businesses?.length])

  useEffect(() => {
    if (!citiesState?.cities?.length || !orderState?.options?.city_id) return
    const selectedCity = citiesState?.cities?.find(city => city?.id === orderState?.options?.city_id)
    if (!selectedCity || !selectedCity?.enabled) changeCityFilter(null)
  }, [citiesState, orderState?.options?.city_id])

  useEffect(() => {
    if (pickupTypes.includes(orderState?.options?.type) && isCustomerMode) {
      setIsPickupSelected(true)
    }
  }, [orderState?.options?.type])

  const OrderTypesComponent = () => {
    return (
      <>
        {orderTypes && (configTypes ? orderTypes.filter(type => configTypes?.includes(type.value) && type.value !== 1) : orderTypes).map((item, i) => (
          <Chip
            key={item.value}
            onClick={() => handleChangeType(item.value)}
            selected={orderState?.options?.type === item?.value}
            disabled={orderState?.loading}
            className={orderState?.options?.type !== item?.value ? 'activated' : ''}
          >
            {item.text}
          </Chip>
        ))}
      </>
    )
  }

  if (logosLayout) {
    // the same box as the logo tile: its skeleton keeps the final size
    const logoSize = themeMedia(theme, 'xs')
    return (
      <BusinessLogosWrapper>
        <BusinessLogosContainer>
          <AutoScroll scrollId='businessLogos'>
            {businessesList?.loading
              ? <>
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
                <Skeleton height={logoSize} width={logoSize} style={{ marginRight: 15 }} />
              </>
              : <>
                {businessesList.businesses
                  ?.filter(business => business?.open)
                  ?.map(business => {
                    const logo = business?.logo || businessLogoPlaceholder(theme)
                    return (
                      <BusinessLogo
                        key={business?.id}
                        aria-label={business?.name}
                        aria-current={actualSlug === business?.slug ? 'page' : undefined}
                        isActive={actualSlug === business?.slug}
                        bgimage={logo}
                        onClick={() => onBusinessClick(business)}
                      >
                        {!logo && business?.name}
                      </BusinessLogo>
                    )
                  })}
              </>}
          </AutoScroll>
        </BusinessLogosContainer>
      </BusinessLogosWrapper>
    )
  }

  const searchBar = (
    <SearchBar
      lazyLoad
      search={searchValue}
      isCustomLayout={isCustomLayout}
      starbucksStyle
      placeholder={t('SEARCH_TITLE', 'Search')}
      onSearch={handleChangeSearch}
      handleCustomEnter={!advancedSearchDisabled
        ? handleAdvancedSearchRedirect
        : null}
    />
  )

  const openFilter = (target) => redirectToBusinessSearch(`?openFilter=${target}`)
  const filterLabel = t('FILTERS', 'Filters')

  // The filter chips and, above 1200px, the search beside them
  const filtersRow = () => {
    const withSearch = !isCustomerMode && !hideSearch && isWideSearch
    if (!showFilters && !withSearch) return null
    return (
      <FiltersContainer data-doc-section='business-list-filters'>
        {showFilters && (
          <div className='filters-scroll'>
            {filtersInSheet
              ? hasFilterSheet && (
                <SheetTrigger handle={filterSheetHandle} render={<PieceButton ref={filterTrigger} appearance='outline' color='neutral' />}>
                  <Icon name='filter' aria-hidden='true' />
                  {filterLabel}
                </SheetTrigger>
              )
              : <InlineFilters filters={filterOptions} onPick={openFilter} />}
          </div>
        )}
        {withSearch && (
          <FiltersSearch>
            <SearchRedirectArea>
              {searchBar}
            </SearchRedirectArea>
          </FiltersSearch>
        )}
      </FiltersContainer>
    )
  }

  // The delivery / pickup choice and the previous orders of the call center
  // mode (not sections of the theme)
  const customerModeBlocks = (
    <>
      {(userCustomer && orderState?.options?.address?.address && isCustomerMode) && (
        <>
          {(configTypes.includes(1) || configTypes.some(type => pickupTypes.includes(type))) && (
            <Title>{t('DELIVERY_TYPE', 'Delivery Type')}</Title>
          )}
          <TypesContainer>
            <TabsNavigation tone='primary' width='content'>
              {configTypes.includes(1) && (
                <TabsAction
                  onClick={() => handleChangeType(1)}
                  disabled={orderState?.loading}
                  active={!isPickupSelected}
                  icon={<Icon name='truckDelivery' />}
                >
                  {t('DELIVERY', 'Delivery')}
                </TabsAction>
              )}
              {configTypes.some(type => pickupTypes.includes(type)) && (
                <TabsAction
                  disabled={orderState?.loading}
                  active={isPickupSelected}
                  onClick={() => handleChangeToPickup()}
                  icon={<Icon name='shoppingBag' />}
                >
                  {t('PICKUP', 'Pickup')}
                </TabsAction>
              )}
            </TabsNavigation>
          </TypesContainer>
          {isPickupSelected && (
            <TypesWrapper>
              <p>{t('WHAT_PICKUP_YOU_NEED', 'What kind of pickup do you need?')}</p>
              <AdditionalTypesContainer>
                <OrderTypesComponent />
              </AdditionalTypesContainer>
            </TypesWrapper>
          )}
        </>
      )}
      {isCustomerMode && !businessesList.loading && !businessTypeSelected && (
        <OrdersSection
          titleContent={t('PREVIOUS_ORDERS', 'Previous orders')}
          onRedirectPage={onRedirectPage}
          businessesIds={businessesIds}
          getCustomArray={getCustomArray}
          businessesList={businessesList}
          isCustomerMode={isCustomerMode}
          userCustomer={userCustomer}
          disableSkeletons
        />
      )}
    </>
  )

  // A store's card, the same in the grid, in the groups of the showcase and in its hero
  const renderBusiness = (business, nameAs) => (
    <BusinessController
      key={business.id}
      fromBusinessListing
      className='card'
      business={business}
      isBusinessOpen={business.open && business?.enabled !== false}
      handleCustomClick={handleBusinessClick}
      orderType={orderState?.options?.type}
      isCustomLayout={isCustomLayout}
      isCustomerMode={isCustomerMode}
      onPreorderBusiness={setPreorderBusiness}
      businessHeader={business?.header}
      businessFeatured={business?.featured}
      showFeaturedBadge={showFeaturedBadge}
      businessOffers={business?.offers}
      businessLogo={business?.logo}
      businessReviews={business?.reviews?.total}
      businessDeliveryPrice={business?.delivery_price}
      businessDeliveryTime={business?.delivery_time}
      businessPickupTime={business?.pickup_time}
      businessDistance={business?.distance}
      handleUpdateBusinessList={handleUpdateBusinessList}
      favoriteIds={favoriteIds}
      businessUrlTemplate={businessUrlTemplate}
      setFavoriteIds={setFavoriteIds}
      nameAs={nameAs}
    />
  )

  // The cards' name one level under the title of their list
  const underLevel = (level) => (level === 'h1' ? 'h2' : 'h3')
  const isListLoading = businessesList.loading || !businessesList?.fetched

  // What takes the place of the list when there is nothing to list: no stores here, or the
  // request failed (`error` is the API's, or `true` when it did not answer)
  const listProblem = (level) => {
    if (businessesList.loading) return null
    if (businessesList.error) {
      return (
        <EmptyStateWrapper data-doc-state='error'>
          <NotFoundSource
            icon='shop'
            headingLevel={underLevel(level)}
            content={t('BUSINESSES_COULD_NOT_LOAD', "We couldn't load the stores")}
          >
            <PieceButton appearance='outline' onClick={() => getBusinesses(businessesList.businesses.length === 0)}>
              {t('RETRY', 'Retry')}
            </PieceButton>
          </NotFoundSource>
        </EmptyStateWrapper>
      )
    }
    if (businessesList.businesses.length === 0 && businessesList?.fetched) {
      return (
        <EmptyStateWrapper data-doc-state='empty' data-resume-recover='businesses'>
          <NotFoundSource
            variant='empty'
            icon='shop'
            // one level under the list's title
            headingLevel={underLevel(level)}
            content={hasAddress
              ? t('NO_BUSINESSES_AVAILABLE', 'No businesses available at this address')
              : t('ADD_ADDRESS_TO_SEE_BUSINESSES', 'Add your address to see businesses near you')}
            subtitle={hasAddress
              ? t('NO_BUSINESSES_AVAILABLE_DESC', 'Try changing your address or filters.')
              : t('ADD_ADDRESS_TO_SEE_BUSINESSES_DESC', "We'll show you the places that deliver to you.")}
          >
            <PieceButton appearance='outline' onClick={() => handleClickAddress()}>
              {hasAddress
                ? t('CHANGE_ADDRESS', 'Change address')
                : t('ADD_ADDRESS', 'Add address')}
            </PieceButton>
          </NotFoundSource>
        </EmptyStateWrapper>
      )
    }
    return null
  }

  const skeletonCards = () => [...Array(paginationProps?.nextPageItems > 4 ? paginationProps.nextPageItems : 8).keys()].map(i => (
    <BusinessController
      key={i}
      className='card'
      business={{}}
      isSkeleton
      orderType={orderState?.options?.type}
    />
  ))

  // The showcase's groups, in the order they paint: "Open now" while there is something to
  // show or more to load (the next pages may bring open stores), "Order for later" after it,
  // and "All Businesses" alone when there is nothing yet (empty list or error)
  const showcaseGroups = !closedLast
    ? [{ key: 'all', title: t('ALL_BUSINESSES', 'All Businesses'), items: businesses.filter((business) => business !== hero) }]
    : [
        (openBusinesses.length > 0 || (isListLoading && !businessesList.businesses?.length)) && { key: 'open', title: t('OPEN_NOW', 'Open now'), items: openBusinesses },
        laterBusinesses.length > 0 && {
          key: 'later',
          title: t('ORDER_FOR_LATER', 'Order for later'),
          description: t('ORDER_FOR_LATER_DESC', 'Closed right now. Schedule your order for when they open.'),
          items: laterBusinesses
        }
      ].filter(Boolean)
  if (showcaseGroups.length === 0) showcaseGroups.push({ key: 'all', title: t('ALL_BUSINESSES', 'All Businesses'), items: [] })

  // The sections of the main group, each one with its own conditions
  const mainSections = {
    order_progress: () => !isCustomerMode && (
      <OrderProgress
        franchiseId={props.franchiseId}
        userCustomerId={userCustomer?.id}
        asDashboard={isCustomerMode}
        isCustomerMode={isCustomerMode}
      />
    ),
    custom_order_banner: () => customOrderEnabled && !businessTypeSelected && (
      <CustomOrderBanner onCustomOrderClick={() => setShowCustomOrder(true)} maxHeight={themeMedia(theme, '3xl')} />
    ),
    categories: () => (
      <BusinessTypes
        defaultLayout={showcase ? 'tiles' : undefined}
        images={props.images}
        businessTypes={props.businessTypes}
        defaultBusinessType={props.defaultBusinessType}
        handleChangeBusinessType={handleChangeBusinessType}
      />
    ),
    search: () => (
      <>
        {!isCustomerMode && !hideSearchSection && (
          <>
            <WrapperSearch data-doc-control='business-list-search' isCustomLayout={isCustomLayout} isCustomerMode={isCustomerMode} $hasMobileSearch={!hideSearch}>
              {!hideSearch && !isWideSearch && (
                <SearchRedirectArea>
                  {searchBar}
                </SearchRedirectArea>
              )}
              {!hideCities && citiesState?.cities?.length > 0 && (
                <CityAction>
                  <PieceButton color='primary' fullWidth onClick={handleOpenCities}>
                    {citiesState?.cities?.find(city => city?.id === orderState?.options?.city_id)?.name || t('SELECT_A_CITY', 'Select a city')}
                  </PieceButton>
                </CityAction>
              )}
              {isCustomLayout && (
                <PieceButton
                  type='button'
                  className='icon-action'
                  shape='icon'
                  color='primary'
                  appearance='ghost'
                  size='md'
                  data-doc-control='business-list-map-toggle'
                  aria-label={t('SHOW_MAP', 'Show map')}
                  aria-pressed={!!activeMap}
                  onClick={toggleMap}
                >
                  <Icon name='map' aria-hidden='true' />
                </PieceButton>
              )}
            </WrapperSearch>
            {activeMap && (
              <BusinessesMap
                businessList={businessesList.businesses}
                userLocation={orderState?.options?.address?.location}
                setErrors={setMapErrors}
              />
            )}
          </>
        )}
        {isWideSearch && firstSearchOrFilters === 'search' && filtersRow()}
      </>
    ),
    filters: () => (!isWideSearch || firstSearchOrFilters === 'filters') && filtersRow(),
    promo_banners: () => !businessTypeSelected && (
      <PageBanner
        position='web_business_listing'
        isCustomerMode={isCustomerMode}
        isHorizontal
      />
    ),
    highest_rated: () => !props.franchiseId && !businessTypeSelected && (
      <HightestRatedWrapper>
        <HighestRated
          propsToFetch={props.propsToFetch}
          initialOrderByValue='rating'
          titleAs={headingOf('highest_rated')}
          onVisibleChange={handleCarouselShown('highest_rated')}
          handleClickAddress={handleClickAddress}
          onBusinessClick={onBusinessClick}
          isCustomerMode={isCustomerMode}
          favoriteIds={favoriteIds}
          setFavoriteIds={setFavoriteIds}
          disabledCities
          businessUrlTemplate={businessUrlTemplate}
        />
      </HightestRatedWrapper>
    ),
    featured: () => {
      if (props.franchiseId || businessTypeSelected || !showFeatured) return false
      // showcase: the first featured store that is open, across the page (nothing without one)
      // its title, the featured carousel's, is for assistive technology only: the hero has no title in sight
      if (showcase) {
        return hero && (
          <ShowcaseHero>
            <HiddenTitle as={headingOf('featured')}>{t('TOP_BUSINESSES', 'Top Businesses')}</HiddenTitle>
            {renderBusiness(hero, underLevel(headingOf('featured')))}
          </ShowcaseHero>
        )
      }
      return (
        <HightestRatedWrapper>
          <HighestRated
            scrollId='featured'
            title={t('TOP_BUSINESSES', 'Top Businesses')}
            titleAs={headingOf('featured')}
            onVisibleChange={handleCarouselShown('featured')}
            description={t('TOP_BUSINESSES_DESCRIPTION', 'Sponsored')}
            propsToFetch={props.propsToFetch}
            isFeatured
            handleClickAddress={handleClickAddress}
            onBusinessClick={onBusinessClick}
            isCustomerMode={isCustomerMode}
            favoriteIds={favoriteIds}
            setFavoriteIds={setFavoriteIds}
            disabledCities
            businessUrlTemplate={businessUrlTemplate}
          />
        </HightestRatedWrapper>
      )
    }
  }

  const listing = (
    <BusinessContainer
      data-doc-section='businesses-list'
      data-doc-state={(businessesList.loading || !businessesList?.fetched) ? 'loading' : businessesList.error ? 'error' : businessesList?.businesses?.length > 0 ? 'results' : 'empty'}
    >
      {dockOrderContextBar(windowSize.width, theme, orderState?.options?.type) && (
        <BusinessBanner>
          <OrderContextUI isBusinessList isDocked />
        </BusinessBanner>
      )}
      {render(mainSections, { group: 'main' })}
      {/* the call center blocks after the page's sections */}
      {customerModeBlocks}
      {isCustomerMode && (
        <SearchContainer>
          {isCustomLayout && (
            <BusinessesTitle as='h2' $level='h2' isCustomerMode={isCustomerMode}>
              {isCustomerMode ? t('SELECT_THE_BUSINESS', 'Select the business') : t('BUSINESSES', 'businesses')}
            </BusinessesTitle>
          )}
          <WrapperSearch data-doc-control='business-list-search' isCustomLayout={isCustomLayout} isCustomerMode={isCustomerMode}>
            <SearchBar
              lazyLoad
              search={searchValue}
              isCustomLayout={isCustomLayout}
              placeholder={t('SEARCH_TITLE', 'Search')}
              onSearch={handleChangeSearch}
            />
            {configs?.advanced_business_search_enabled?.value === '1' && (
              <PieceButton
                type='button'
                className='icon-action'
                shape='icon'
                color='primary'
                appearance='ghost'
                size='md'
                data-doc-control='business-search-open-filters'
                aria-label={t('FILTERS', 'Filters')}
                onClick={() => redirectToBusinessSearch()}
              >
                <Icon name='filter' aria-hidden='true' />
              </PieceButton>
            )}
            {isCustomLayout && (
              <PieceButton
                type='button'
                className='icon-action'
                shape='icon'
                color='primary'
                appearance='ghost'
                size='md'
                data-doc-control='business-list-map-toggle'
                aria-label={t('SHOW_MAP', 'Show map')}
                aria-pressed={!!activeMap}
                onClick={toggleMap}
              >
                <Icon name='map' aria-hidden='true' />
              </PieceButton>
            )}
            {!hideCities && citiesState?.cities?.length > 0 && (
              <PieceButton color='primary' onClick={handleOpenCities}>
                {citiesState?.cities?.find(city => city?.id === orderState?.options?.city_id)?.name || t('SELECT_A_CITY', 'Select a city')}
              </PieceButton>
            )}
          </WrapperSearch>
        </SearchContainer>
      )}
      {isCustomerMode && activeMap && (
        <BusinessesMap
          businessList={businessesList.businesses}
          userLocation={orderState?.options?.address?.location}
          setErrors={setMapErrors}
        />
      )}
      <AllBusinessesSection>
        {(!isCustomLayout && isCustomerMode && businessesList?.businesses?.length > 0) && (
          <BusinessesTitle as='h2' $level='h2'>
            {t('BUSINESSES', 'Businesses')}
          </BusinessesTitle>
        )}
        {showcase
          ? (
            <ShowcaseGroups data-doc-section='business-list-results'>
              {showcaseGroups.map((group, index) => {
                // the first group takes the page's h1 when All Businesses has it
                const level = index === 0 ? headingOf('all_businesses') : 'h2'
                return (
                  <div key={group.key}>
                    <BusinessesTitle as={level} $level={level}>
                      {group.title}
                    </BusinessesTitle>
                    {group.description && <GroupDescription>{group.description}</GroupDescription>}
                    <BusinessList>
                      {group.items.map((business) => renderBusiness(business, underLevel(level)))}
                      {index === showcaseGroups.length - 1 && isListLoading && skeletonCards()}
                      {index === showcaseGroups.length - 1 && listProblem(level)}
                    </BusinessList>
                  </div>
                )
              })}
            </ShowcaseGroups>
            )
          : (
            <>
              <BusinessesTitle as={headingOf('all_businesses')} $level={headingOf('all_businesses')}>
                {t('ALL_BUSINESSES', 'All Businesses')}
              </BusinessesTitle>
              <BusinessList data-doc-section='business-list-results'>
                {(closedLast ? [...openBusinesses, ...laterBusinesses] : businesses).map((business) => renderBusiness(business, underLevel(headingOf('all_businesses'))))}
                {listProblem(headingOf('all_businesses'))}
                {isListLoading && skeletonCards()}
              </BusinessList>
            </>
            )}
      </AllBusinessesSection>
      {isPreorder && (
        <DialogOverlay
          data-doc-section='business-preorder-dialog'
          open={isPreorder}
          size='xl'
          onClose={() => handleClosePreorder()}
        >
          <BusinessPreorder
            business={preorderBusiness}
            handleClick={handleBusinessClick}
            showButton
            cateringPreorder={!!cateringTypeString}
            {...cateringValues}
          />
        </DialogOverlay>
      )}
      {modals.citiesOpen && (
        // CitiesControl draws its own title row, close and padding (flush, no close of the dialog's)
        <DialogOverlay
          legacyMaxWidth
          open={modals.citiesOpen}
          width='70%'
          onClose={() => setModals({ ...modals, citiesOpen: false })}
          flush
          showCloseButton={false}
          aria-label={t('SELECT_A_STORE', 'Select a store')}
        >
          <CitiesControl
            cities={citiesState?.cities}
            handleChangeCity={handleChangeCity}
            onClose={() => setModals({ ...modals, citiesOpen: false })}
          />
        </DialogOverlay>
      )}
      {(modals.formOpen || modals.listOpen) && (
        <DialogOverlay
          legacyMaxWidth
          {...(!auth && { title: t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?') })}
          open={modals.formOpen || modals.listOpen}
          width='70%'
          onClose={() => setModals({ ...modals, formOpen: false, listOpen: false })}
        >
          {modals.listOpen
            ? (
              <AddressList
                isModal
                changeOrderAddressWithDefault
                userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
                onCancel={() => setModals({ ...modals, listOpen: false })}
                isCustomerMode={isCustomerMode}
              />
              )
            : (
              <AddressFormWrapper>
                <AddressForm
                  useValidationFileds
                  address={orderState?.options?.address || {}}
                  onCancel={() => setModals({ ...modals, formOpen: false })}
                  onSaveAddress={() => setModals({ ...modals, formOpen: false })}
                  isCustomerMode={isCustomerMode}
                />
              </AddressFormWrapper>
              )}
        </DialogOverlay>
      )}

      <Alert
        title={!mapErrors ? t('SEARCH', 'Search') : t('BUSINESSES_MAP', 'Businesses Map')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => handleCloseAlerts()}
        onAccept={() => handleCloseAlerts()}
        closeOnBackdrop={false}
      />
      {customOrderEnabled && (
        <CustomOrderModal
          open={showCustomOrder}
          onClose={() => setShowCustomOrder(false)}
        />
      )}
    </BusinessContainer>
  )

  const sheetSide = windowSize.width < DESKTOP_FILTER_SHEET_WIDTH ? 'bottom' : theme.rtl ? 'left' : 'right'
  // The detached trigger can move between sections. Keep the filter root
  // beside the listing so other dialogs and cards retain their own lifecycles.
  return (
    <>
      {listing}
      <Sheet handle={filterSheetHandle} open={hasFilterSheet && filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side={sheetSide} finalFocus={filterTrigger} dir={theme.rtl ? 'rtl' : 'ltr'} aria-describedby={undefined}>
          <SheetHeader><SheetTitle>{filterLabel}</SheetTitle></SheetHeader>
          <SheetFilterShortcuts>
            {filterOptions.map(({ key, target = key, label }) => (
              <SheetFilterCell key={key}>
                <Chip onClick={() => openFilter(target)}>{label}</Chip>
              </SheetFilterCell>
            ))}
          </SheetFilterShortcuts>
        </SheetContent>
      </Sheet>
    </>
  )
}

export const OriginalBusinessesListing = (props) => {
  const [, t] = useLanguage()
  const businessListingProps = {
    ...props,
    UIComponent: BusinessesListingUI,
    paginationSettings: { initialPage: 1, pageSize: 25, controlType: 'infinity' },
    orderTypes: props.orderTypes || [
      {
        value: 1,
        text: t('DELIVERY', 'Delivery'),
        description: t('ORDERTYPE_DESCRIPTION_DELIVERY', 'We bring your order to your door')
      },
      {
        value: 2,
        text: t('PICKUP', 'Pickup'),
        description: t('ORDERTYPE_DESCRIPTION_PICKUP', 'Order ahead and pick it up at the store')
      },
      {
        value: 3,
        text: t('EAT_IN', 'Eat in'),
        description: t('ORDERTYPE_DESCRIPTION_EATIN', 'Order ahead and enjoy it at the restaurant')
      },
      {
        value: 4,
        text: t('CURBSIDE', 'Curbside'),
        description: t('ORDERTYPE_DESCRIPTION_CURBSIDE', 'We bring your order out to your car')
      },
      {
        value: 5,
        text: t('DRIVE_THRU', 'Drive thru'),
        description: t('ORDERTYPE_DESCRIPTION_DRIVETHRU', 'Pick up your order without leaving your car')
      }
    ]
  }
  return <BusinessListController {...businessListingProps} />
}
