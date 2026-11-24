import React, { useState, useEffect, useCallback } from 'react'
import {
  BusinessListContainer,
  WrapperSearch,
  MainSections,
  FilterWrapper,
  FilterPart,
  PriceFilterListWrapper,
  PreorderAndBusinessWrapper,
  PreorderWrapper,
  PreorderContent,
  AddressWrapper,
  AddressHeader,
  AddressChangeLink,
  AddressContent,
  OrderTypeWrapper,
  MomentWrapper,
  SelectWrapper,
  BusinessList,
  EmptyStateWrapper,
  BusinessListWrapper,
  HightestRatedWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useTheme } from 'styled-components'
import { themeMedia } from '~/utils/themeTokens'
import { useOrder } from '~components/contexts/OrderContext'
import { useSession } from '~components/contexts/SessionContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { getMaxPreorderDays } from '~components/utils/configHelpers'
import { BusinessList as BusinessListController } from '~components/components/BusinessList'

import { MomentControl } from '~ui/src/components/MomentControl'
import { HighestRated } from '~ui/src/components/HighestRated'
import { SearchBar } from '~ui/src/components/SearchBar'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'
import { BusinessTypeFilter } from '~ui/src/components/BusinessTypeFilter'
import { priceList } from '~ui/utils'
import { Chip } from '~ui/src/design-system/components/Chip'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { AddressList } from '~ui/src/components/AddressList'
import { AddressForm } from '~ui/src/components/AddressForm'
import { BusinessController } from '~ui/src/components/BusinessController'
import { OrderTypeSelectorHeader } from '~ui/src/components/OrderTypeSelectorHeader'
import { OrderProgress } from '~ui/src/components/OrderProgress'
import { CustomOrderBanner } from '~ui/src/components/CustomOrderBanner'
import { CustomOrderModal } from '~ui/src/components/CustomOrderModal'
import { PageBanner } from '~ui/src/components/PageBanner'
import { usePageSections } from '~ui/hooks/usePageSections'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'

const PIXELS_TO_SCROLL = 300

const BusinessListingUI = (props) => {
  const {
    handleChangeBusinessType,
    priceLevelSelected,
    handleChangePriceLevel,
    businessesList,
    paginationProps,
    searchValue,
    getBusinesses,
    isCustomLayout,
    isCustomerMode,
    onBusinessClick,
    handleChangeSearch,
    handleBusinessClick,
    businessTypeSelected,
    handleUpdateBusinessList,
    onRedirectPage
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [orderState] = useOrder()
  const [{ auth }] = useSession()
  const [configState] = useConfig()
  // The page's sections (pages.business_listing): the ones of its main group
  // (order progress, custom order banner, categories, search, filters,
  // promotion banners, highest rated and featured) in the theme's order and
  // visibility, before the appointments' panel (the order context: address,
  // moment and service type, always shown) and all the businesses
  const { sections, render } = usePageSections('business_listing')

  const configTypes = configState?.configs?.order_types_allowed?.value.split('|').map(value => Number(value)) || []

  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [isPreorder, setIsPreorder] = useState(false)
  const [preorderBusiness, setPreorderBusiness] = useState(null)
  const [showCustomOrder, setShowCustomOrder] = useState(false)
  const customOrderEnabled = auth && configState?.configs?.custom_order_enabled?.value === '1'
  const hasAddress = Boolean(orderState?.options?.address?.address)
  const hasBusinesses = businessesList.businesses.length > 0
  // The categories (the service types) and the filters (the price levels)
  // side by side, a line between them, while the theme keeps them together
  const mainKeys = sections.filter((section) => section.visible && section.group === 'main').map((section) => section.key)
  const categoriesAt = mainKeys.indexOf('categories')
  const filtersAt = mainKeys.indexOf('filters')
  const filtersTogether = categoriesAt >= 0 && filtersAt >= 0 && Math.abs(categoriesAt - filtersAt) === 1

  const limitDays = getMaxPreorderDays(configState?.configs, orderState?.options?.type)

  const currentDate = new Date()
  const time = limitDays > 1
    ? currentDate.getTime() + ((limitDays - 1) * 24 * 60 * 60 * 1000)
    : limitDays === 1 ? currentDate.getTime() : currentDate.getTime() + (6 * 24 * 60 * 60 * 1000)

  currentDate.setTime(time)
  currentDate.setHours(23)
  currentDate.setMinutes(59)

  // the request failed and nothing is listed: its own state, never the API's raw text
  const loadFailed = !businessesList.loading && businessesList.error?.length > 0 && businessesList.businesses.length === 0

  const handleClickAddress = () => {
    setModalIsOpen(true)
  }

  const handleClosePreorder = () => {
    setIsPreorder(false)
    setPreorderBusiness(null)
  }

  useEffect(() => {
    if (preorderBusiness) setIsPreorder(true)
  }, [preorderBusiness])

  const handleScroll = useCallback(() => {
    const innerHeightScrolltop = window.innerHeight + document.documentElement?.scrollTop + PIXELS_TO_SCROLL
    const badScrollPosition = innerHeightScrolltop < document.documentElement?.offsetHeight
    const hasMore = !(paginationProps.totalPages === paginationProps.currentPage)
    if (badScrollPosition || businessesList.loading || businessesList.error?.length > 0 || !hasMore) return
    getBusinesses()
  }, [businessesList.loading, paginationProps])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (!businessesList?.businesses?.length) return
    const ids = [...favoriteIds]
    businessesList.businesses.forEach(business => {
      if (business?.favorite) {
        ids.push(business.id)
      }
    })
    setFavoriteIds([...new Set(ids)])
  }, [businessesList?.businesses?.length])

  const searchSection = (
    <WrapperSearch>
      <SearchBar
        lazyLoad
        search={searchValue}
        onSearch={handleChangeSearch}
        placeholder={t('SEARCH_BUSINESSES', 'Search Businesses')}
        handleCustomEnter={term => configState?.configs?.advanced_business_search_enabled?.value === '1' && onRedirectPage({ page: 'business_search' })}
      />
      {configState?.configs?.advanced_business_search_enabled?.value === '1' && (
        <Button
          type='button'
          shape='icon'
          color='primary'
          appearance='ghost'
          size='md'
          aria-label={t('FILTERS', 'Filters')}
          onClick={() => onRedirectPage({ page: 'business_search' })}
        >
          <Icon name='filter' aria-hidden='true' />
        </Button>
      )}
    </WrapperSearch>
  )

  const filterParts = {
    categories: () => (
      <>
        <h2>{t('POPULAR_SERVICES', 'Popular services')}</h2>
        <BusinessTypeFilter
          businessTypes={props.businessTypes}
          defaultBusinessType={props.defaultBusinessType}
          handleChangeBusinessType={handleChangeBusinessType}
          isAppoint
        />
      </>
    ),
    filters: () => (
      <>
        <h2>{t('PRICE', 'Price')}</h2>
        <PriceFilterListWrapper>
          {priceList.map((price, i) => (
            <Chip
              key={i}
              selected={priceLevelSelected === price?.level}
              onClick={() => handleChangePriceLevel(price?.level)}
            >
              {price.content}
              {(priceLevelSelected === price?.level) && <Icon name="closeX" />}
            </Chip>
          ))}
        </PriceFilterListWrapper>
      </>
    )
  }

  // One row of filters: `keys` in the theme's order
  const filtersRow = (keys) => (
    <FilterWrapper data-doc-section='appointments-filters'>
      {keys.map((key, i) => (
        <FilterPart key={key} $divided={i < keys.length - 1} $afterDivider={i > 0}>
          {filterParts[key]()}
        </FilterPart>
      ))}
    </FilterWrapper>
  )
  // categories and filters: together in the place of the first of the two
  const filterSection = (key) => {
    if (!filtersTogether) return filtersRow([key])
    const first = categoriesAt < filtersAt ? 'categories' : 'filters'
    return key === first ? filtersRow(categoriesAt < filtersAt ? ['categories', 'filters'] : ['filters', 'categories']) : null
  }

  const carousel = (featured) => hasBusinesses && !props.franchiseId && (
    <HightestRatedWrapper>
      <HighestRated
        {...(featured
          ? { scrollId: 'featured', isFeatured: true, title: t('TOP_BUSINESSES', 'Top Businesses'), description: t('TOP_BUSINESSES_DESCRIPTION', 'Sponsored') }
          : { initialOrderByValue: 'rating' })}
        titleAs='h2'
        propsToFetch={props.propsToFetch}
        handleClickAddress={handleClickAddress}
        onBusinessClick={onBusinessClick}
        isCustomerMode={isCustomerMode}
        favoriteIds={favoriteIds}
        initialBuisnessType={businessTypeSelected}
        initialPricelevel={priceLevelSelected}
        setFavoriteIds={setFavoriteIds}
        disabledCities
        businessUrlTemplate={props.businessUrlTemplate}
      />
    </HightestRatedWrapper>
  )

  // The sections of the main group, each one with its own conditions
  const mainSections = {
    order_progress: () => !isCustomerMode && (
      <OrderProgress franchiseId={props.franchiseId} />
    ),
    custom_order_banner: () => customOrderEnabled && !businessTypeSelected && (
      <CustomOrderBanner onCustomOrderClick={() => setShowCustomOrder(true)} maxHeight={themeMedia(theme, '3xl')} />
    ),
    categories: () => filterSection('categories'),
    search: () => searchSection,
    filters: () => filterSection('filters'),
    promo_banners: () => !businessTypeSelected && (
      <PageBanner
        position='web_business_listing'
        isCustomerMode={isCustomerMode}
        isHorizontal
      />
    ),
    highest_rated: () => carousel(false),
    featured: () => carousel(true)
  }

  return (
    <>
      <BusinessListContainer
        data-doc-section='appointments-list'
        data-doc-state={businessesList.loading ? 'loading' : businessesList.error ? 'error' : businessesList.businesses.length > 0 ? 'results' : 'empty'}
      >
        <h1>{t('SELECT_BUSINESS', 'Select a business')}</h1>
        <MainSections>
          {render(mainSections, { group: 'main' })}
        </MainSections>
        <PreorderAndBusinessWrapper>
          <PreorderWrapper>
            <PreorderContent>
              <h2>{t('AVAILABLE_APPOINTMENTS', 'Available appointments')}</h2>
              <AddressWrapper>
                <AddressHeader>
                  <h3>{t('ADDRESS', 'Address')}</h3>
                  <AddressChangeLink onClick={() => setModalIsOpen(true)}>{t('CHANGE', 'Change')}</AddressChangeLink>
                </AddressHeader>
                <AddressContent>
                  <Icon name="house" />
                  <span>{orderState.options?.address?.address}</span>
                </AddressContent>
              </AddressWrapper>
              <MomentWrapper>
                <MomentControl
                  isAppoint
                  maxDate={currentDate}
                />
              </MomentWrapper>
              <OrderTypeWrapper>
                <h3>{t('SERVICE_TYPE', 'Service type')}</h3>
                <SelectWrapper>
                  <OrderTypeSelectorHeader
                    configTypes={!configState?.loading && configTypes?.length > 0 ? configTypes : null}
                    defaultValue={!(!configState?.loading && configTypes?.length > 0) && 1}
                  />
                </SelectWrapper>
              </OrderTypeWrapper>
            </PreorderContent>
          </PreorderWrapper>
          <BusinessListWrapper>
            <h2>{t('ALL_BUSINESSES', 'All businesses')}</h2>
            <BusinessList>
              {
                !businessesList.loading && !loadFailed && businessesList.businesses.length === 0 && (
                  <EmptyStateWrapper>
                    <NotFoundSource
                      variant='empty'
                      icon='shop'
                      content={hasAddress
                        ? t('NO_BUSINESSES_AVAILABLE', 'No businesses available at this address')
                        : t('ADD_ADDRESS_TO_SEE_BUSINESSES', 'Add your address to see businesses near you')}
                      subtitle={hasAddress
                        ? t('NO_BUSINESSES_AVAILABLE_DESC', 'Try changing your address or filters.')
                        : t('ADD_ADDRESS_TO_SEE_BUSINESSES_DESC', "We'll show you the places that deliver to you.")}
                    >
                      <Button
                        appearance='outline'
                        onClick={() => handleClickAddress()}
                      >
                        {hasAddress
                          ? t('CHANGE_ADDRESS', 'Change address')
                          : t('ADD_ADDRESS', 'Add address')}
                      </Button>
                    </NotFoundSource>
                  </EmptyStateWrapper>
                )
              }
              {
                businessesList.businesses?.map((business) => (
                  <BusinessController
                    key={business.id}
                    className='card'
                    business={business}
                    isBusinessOpen={business.open}
                    handleCustomClick={handleBusinessClick}
                    orderType={orderState?.options?.type}
                    isCustomLayout={isCustomLayout}
                    isCustomerMode={isCustomerMode}
                    onPreorderBusiness={setPreorderBusiness}
                    businessHeader={business?.header}
                    businessFeatured={business?.featured}
                    businessOffers={business?.offers}
                    businessLogo={business?.logo}
                    businessReviews={business?.reviews?.total}
                    businessDeliveryPrice={business?.delivery_price}
                    businessDeliveryTime={business?.delivery_time}
                    businessPickupTime={business?.pickup_time}
                    businessDistance={business?.distance}
                    handleUpdateBusinessList={handleUpdateBusinessList}
                    favoriteIds={favoriteIds}
                    setFavoriteIds={setFavoriteIds}
                    // the card's logo and favorite (business_card.logo /
                    // .favorite), as the listing's cards
                    withLogoAndFavorite
                  />
                ))
              }
              {businessesList.loading && (
                [...Array(paginationProps?.nextPageItems > 4 ? paginationProps.nextPageItems : 8).keys()].map(i => (
                  <BusinessController
                    key={i}
                    className='card'
                    business={{}}
                    isSkeleton
                    withLogoAndFavorite
                    orderType={orderState?.options?.type}
                  />
                ))
              )}
              {loadFailed && (
                <EmptyStateWrapper data-doc-state='error'>
                  <NotFoundSource
                    variant='notFound'
                    icon='shop'
                    content={t('BUSINESSES_LOAD_ERROR', 'We couldn’t load the businesses')}
                    btnTitle={t('RETRY', 'Retry')}
                    onClickButton={() => getBusinesses()}
                  />
                </EmptyStateWrapper>
              )}
            </BusinessList>
          </BusinessListWrapper>

        </PreorderAndBusinessWrapper>
      </BusinessListContainer>
      {modalIsOpen && (
        <DialogOverlay
          size='lg'
          open={modalIsOpen}
          onClose={() => setModalIsOpen(false)}
        >
          {
            auth
              ? (
                <AddressList
                  isModal
                  changeOrderAddressWithDefault
                  // userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
                  onCancel={() => setModalIsOpen(false)}
                />
                )
              : (
                  <AddressForm
                    useValidationFileds
                    address={orderState?.options?.address || {}}
                    onCancel={() => setModalIsOpen(false)}
                    onSaveAddress={() => setModalIsOpen(false)}
                  />
                )
          }
        </DialogOverlay>
      )}
      {isPreorder && (
        <DialogOverlay
          open={isPreorder}
          size='xl'
          onClose={() => handleClosePreorder()}
        >
          <BusinessPreorder
            business={preorderBusiness}
            handleClick={handleBusinessClick}
            showButton
          />
        </DialogOverlay>
      )}
      {customOrderEnabled && (
        <CustomOrderModal
          open={showCustomOrder}
          onClose={() => setShowCustomOrder(false)}
        />
      )}
    </>
  )
}

export const AppointmentsBusinessListing = (props) => {
  const businessListingProps = {
    ...props,
    UIComponent: BusinessListingUI
  }
  return <BusinessListController {...businessListingProps} />
}
