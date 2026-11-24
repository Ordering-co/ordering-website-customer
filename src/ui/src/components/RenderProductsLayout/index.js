import React, { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react'
import dayjs from 'dayjs'
import { themeSpace } from '~/utils/themeTokens'
import { useTheme } from 'styled-components'
import { themeVisible } from '~/utils/themeVisibility'
import {
  Title,
  WrappLayout,
  WrapContent,
  BusinessContent,
  BusinessCategoryProductWrapper,
  BusinessCartContainer,
  BusinessCartContent,
  EmptyCart,
  EmptyBtnWrapper,
  EmptyCartMessage,
  EmptyCartTotal,
  ProfessionalFilterWrapper,
  WrapperSearchAbsolute,
  NearBusiness,
  PageBannerWrapper,
  BackButton,
  WrapAllCategories,
  ProductList,
  ProductListWrapper,
  BusinessSections
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useOrder } from '~components/contexts/OrderContext'
import { SearchIconWrapper } from '../BusinessBasicInformation/styles'
import { StudentSelector } from '../StudentSelector'

import { useWindowSize } from '~ui/hooks/useWindowSize'
import { scrollTo } from '~ui/utils'
import { PageBanner } from '~ui/src/components/PageBanner'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Button } from '~ui/src/design-system/components/Button'
import { Cart } from '~ui/src/components/Cart'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { BusinessesListing } from '~ui/src/components/BusinessesListing'
import { ProfessionalFilter } from '~ui/src/components/ProfessionalFilter'
import { OrderItAgain } from '~ui/src/components/OrderItAgain'
import { ProfessionalBusinessFilter } from '~ui/src/components/ProfessionalBusinessFilter'
import { BusinessBasicInformation } from '~ui/src/components/BusinessBasicInformation'
import { BusinessProductsCategories } from '~ui/src/components/BusinessProductsCategories'
import { BusinessProductsList } from '~ui/src/components/BusinessProductsList'
import { SearchProducts } from '~ui/src/components/SearchProducts'
import { BusinessProductsCategories as CategoriesLayoutGroceries } from '~ui/src/components/BusinessProductsCategories/layouts/groceries'
import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { BusinessReviews } from '~ui/src/components/BusinessReviews'
import { CategoriesPopover } from '~ui/src/components/CategoriesPopover'
import { FreeDeliveryProgress } from '~ui/src/components/FreeDeliveryProgress'

import { Icon } from '~ui/src/design-system/components/Icon'
import { EmptyStateArt, EmptyStateIcon } from '~ui/src/components/NotFoundSource'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { scrollMs } from '~/utils/themeMotion'
import { usePageSections } from '~ui/hooks/usePageSections'
import { categoriesMenuIconOf } from '~ui/src/components/BusinessProductsCategories/styles'
import { scrollToCategory } from '~ui/src/components/BusinessProductsCategories/scrollToCategory'
import { storeCartColumn, storePageVariant } from './storePageTemplate'
import { StoreMenu } from './StoreMenu'
import { StoreCartAside } from './StoreCartAside'

export const RenderProductsLayout = (props) => {
  const {
    errors,
    isError,
    isLoading,
    business,
    categoryId,
    searchValue,
    sortByValue,
    currentCart,
    freeDeliveryProgress,
    businessState,
    sortByOptions,
    categoryState,
    categorySelected,
    openCategories,
    openBusinessInformation,
    isCartOnProductsList,
    handleChangeSortBy,
    errorQuantityProducts,
    handler,
    onClickCategory,
    featuredProducts,
    onProductClick,
    onProductAdd,
    handleSearchRedirect,
    handleChangeSearch,
    setOpenBusinessInformation,
    handleCartOpen,
    isCustomLayout,
    useKioskApp,
    setSubcategoriesSelected,
    subcategoriesSelected,
    isLazy,
    handleUpdateProducts,
    handleChangeProfessionalSelected,
    professionalSelected,
    onBusinessClick,
    handleChangePriceFilterValues,
    priceFilterValues,
    handleUpdateProfessionals,
    isCustomerMode,
    handleCustomProductBannerClick,
    productLoading,
    setProductLoading,
    openAlertErrorStatus
  } = props

  const sortedCategories = useMemo(() => {
    const cats = business?.categories ? [...business.categories] : []
    if (business?.vertical === 'school') {
      const todayDow = dayjs().day()
      const upcomingDiff = (prepDay) => {
        if (prepDay === null || prepDay === undefined || prepDay === '') return null
        return (Number(prepDay) - todayDow + 7) % 7
      }
      return cats.sort((a, b) => {
        const aDiff = upcomingDiff(a?.preparation_day_of_week)
        const bDiff = upcomingDiff(b?.preparation_day_of_week)
        if (aDiff !== null && bDiff !== null) return (aDiff - bDiff) || ((a.rank || 0) - (b.rank || 0))
        if (aDiff !== null) return -1
        if (bDiff !== null) return 1
        return (a.rank || 0) - (b.rank || 0)
      })
    }
    return cats.sort((a, b) => (a.rank || 0) - (b.rank || 0))
  }, [business?.categories, business?.vertical])

  const theme = useTheme()
  // The categories' menu: the icon of category_tabs.base.menu_icon, none
  // when visibility business.categories.menu hides the menu
  const categoriesMenuIcon = categoriesMenuIconOf(theme)
  // The sections of the business page (pages.business): which ones show and
  // in which order (only those of the `main` group move)
  const { isVisible, render: renderSections } = usePageSections('business')
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [orderState] = useOrder()
  const windowSize = useWindowSize()
  const [isCartModal, setisCartModal] = useState(false)
  const [openSearchProducts, setOpenSearchProducts] = useState(false)
  const menuLayoutRef = useRef(null)
  const searchTriggerRef = useRef(null)
  const openSearch = (open, trigger) => {
    if (open) searchTriggerRef.current = trigger
    setOpenSearchProducts(open)
  }
  const closeSearch = () => {
    handleChangeSearch?.('')
    setOpenSearchProducts(false)
    if (!useKioskApp) window.scroll({ top: window.scrollY - 1, left: 0 })
  }
  const restoreSearchFocus = () => {
    const trigger = searchTriggerRef.current
    if (trigger?.isConnected && trigger.getClientRects().length) return trigger
    return Array.from(menuLayoutRef.current?.querySelectorAll('[data-doc-control=business-product-search-open]') ?? [])
      .find((button) => button.getClientRects().length) ?? false
  }
  const [categoryClicked, setCategoryClicked] = useState(false)
  const categoryPopoverId = useId()
  const [openPopover, setOpenPopover] = useState(false)
  const backToAllRef = useRef(null)
  const getSelectionFocus = useCallback(() => backToAllRef.current, [])
  const closePopover = useCallback(() => setOpenPopover(false), [])

  // The store's template (components.store_page.base.template): the direct menu (`menu`), the classic (`cover`) or
  // the visual showcase (`showcase`) paint the header and the menu; the kiosk stays as it is whatever the theme says
  const variant = storePageVariant(theme, { useKioskApp })
  const showCartOnProductList = false
  const hasProductCart = currentCart?.products?.length > 0
  // hidden by default (pages.business near_business)
  const showNearBusiness = isVisible('near_business')
  // The progress to free delivery in the cart's places (the empty cart's
  // notices here): visibility cart.free_delivery_progress. The store's banner
  // is only its section (free_delivery_banner).
  const showCartFreeDelivery = themeVisible(theme, 'cart.free_delivery_progress')

  // A category chosen in the bar's Categories menu does what its tab does (BusinessProductsCategories'
  // handleChangeCategory): go to its section under the fixed bars once the menu is out of the way (a sheet locks
  // the page's scroll while it closes). Only what has no section (a subcategory) or a store that loads its
  // products by category filters the menu, with its way back.
  const pickFromMenu = (category) => {
    const section = document.getElementById(`category${category?.id}`)
    if (business?.lazy_load_products_recommended || !section) {
      onClickCategory(category)
      setCategoryClicked(true)
      return
    }
    // a link to a product of a category keeps the page where it is, as the tab does
    if (window.location.search.includes('category') && window.location.search.includes('product')) return
    const goWhenClosed = (frames = 120) => requestAnimationFrame(() => {
      const panel = document.getElementById(categoryPopoverId)
      if (panel && getComputedStyle(panel).visibility !== 'hidden' && frames > 0) return goWhenClosed(frames - 1)
      scrollToCategory(section.querySelector('.category-title') || section, theme)
    })
    goWhenClosed()
  }

  const CategoriesPopoverUI = ({ onSelect } = {}) => <CategoriesLayoutGroceries
    isPopover
    onPopoverSelect={onSelect}
    categories={[
      ...sortedCategories
    ]}
    categorySelected={categorySelected}
    onClickCategory={pickFromMenu}
    featured={featuredProducts}
    openBusinessInformation={openBusinessInformation}
    openCategories={openCategories}
    business={business}
    currentCart={currentCart}
    setCategoryClicked={() => {}}
  />

  // the menu's props, the same in both templates
  const productsListProps = {
    categories: [
      { id: null, name: t('ALL', 'All') },
      /* { id: 'featured', name: t('FEATURED', 'Featured') }, */
      ...sortedCategories
    ],
    isLazy,
    category: categorySelected,
    categoryState,
    useKioskApp,
    businessId: business?.id,
    errors,
    onProductClick,
    handleSearchRedirect,
    searchValue,
    isCartOnProductsList,
    handleClearSearch: handleChangeSearch,
    hideSearchEmpty: openSearchProducts,
    errorQuantityProducts,
    business,
    currentCart,
    setSubcategoriesSelected,
    subcategoriesSelected,
    onClickCategory,
    handleUpdateProducts,
    professionalSelected,
    handleChangeProfessionalSelected
  }

  // "Go to all categories": the way back from a category filtered (the same in both templates)
  const backToAll = (
    <BackButton>
      <Button
        ref={backToAllRef}
        color='primary'
        onClick={() => {
          setCategoryClicked(false)
          onClickCategory({ id: null, name: t('ALL', 'All') })
        }}
      >
        <Icon name="arrowLeft" />
        {t('GO_TO_ALL_CATEGORIES', 'Go to all categories')}
      </Button>
    </BackButton>
  )

  // The professionals' filters above the menu (the same in both templates)
  const professionalFilters = business?.professionals?.length > 0 && !useKioskApp && (
    <>
      <ProfessionalBusinessFilter
        sortByOptions={sortByOptions}
        handleChangeSortBy={handleChangeSortBy}
        sortByValue={sortByValue}
        handleChangeSearch={handleChangeSearch}
        business={business}
        handleChangePriceFilterValues={handleChangePriceFilterValues}
        priceFilterValues={priceFilterValues}
      />
      <ProfessionalFilterWrapper data-doc-section='business-professionals'>
        <ProfessionalFilter
          professionals={business?.professionals}
          businessTimezone={business?.timezone}
          professionalSelected={professionalSelected}
          handleChangeProfessionalSelected={handleChangeProfessionalSelected}
          handleUpdateProfessionals={handleUpdateProfessionals}
          cart={currentCart}
          openAlertErrorStatus={openAlertErrorStatus}
        />
      </ProfessionalFilterWrapper>
    </>
  )

  const handleTogglePopover = () => {
    setOpenPopover(!openPopover)
  }

  const handleSaveProduct = () => {
    if (windowSize.width < 993) {
      return
    }
    const productContainer = document.getElementsByClassName('bp-list')[0]
    scrollTo(productContainer, 500, scrollMs(theme))
  }

  useEffect(() => {
    handleSaveProduct()
  }, [categorySelected])

  // A category picked from the list (the popover, the groceries list): its
  // title under the fixed bars on a phone, else the block of the categories;
  // the same when going back to all of them. Not on the first render: nothing
  // was picked yet.
  const pickedBefore = useRef(false)
  useEffect(() => {
    if (!pickedBefore.current) {
      pickedBefore.current = true
      return
    }
    if (windowSize.width < 993 && categoryClicked) {
      scrollToCategory(document.getElementsByClassName('category-title')[0], theme)
    } else {
      scrollToCategory(document.getElementById('wrapper-categories'), theme)
    }
  }, [categoryClicked])

  return (
    <>
      {/* A new order moment reloads the menu. Keep the open search portal in
          place so it stays below any product opened from its results. */}
      {!!business?.id && (
        <SearchProducts
          {...props}
          open={openSearchProducts}
          coveredByProduct={props.openProduct}
          business={business}
          finalFocus={restoreSearchFocus}
          onClose={closeSearch}
        />
      )}
      {!isLoading && business?.id && (
        <WrappLayout ref={menuLayoutRef} isCartOnProductsList={isCartOnProductsList}>
          {((showNearBusiness && !useKioskApp) || props.forceShowNearBusiness) && !isCustomerMode && !isCustomLayout && (
            <NearBusiness>
              <BusinessesListing
                logosLayout
                propsToFetch={['id', 'logo', 'location', 'timezone', 'schedule', 'open', 'slug']}
                cityId={businessState?.business?.city_id}
                onBusinessClick={onBusinessClick}
                actualSlug={businessState?.business?.slug}
              />
            </NearBusiness>
          )}
          <div className='bp-list'>
            {!useKioskApp && (
              <BusinessBasicInformation
                {...props}
                businessState={businessState}
                setOpenBusinessInformation={setOpenBusinessInformation}
                openBusinessInformation={openBusinessInformation}
                handleChangeSearch={handleChangeSearch}
                searchValue={searchValue}
                setOpenSearchProducts={openSearch}
                sortByOptions={sortByOptions}
                handleChangeSortBy={handleChangeSortBy}
                categoryState={categoryState}
                errorQuantityProducts={errorQuantityProducts}
                sortByValue={sortByValue}
                categoryClicked={categoryClicked}
                categorySelected={categorySelected}
                setCategoryClicked={setCategoryClicked}
                variant={variant}
              />
            )}
            {/* the sections between the business and its menu, in the theme's
                order (pages.business, group main), apart by the same space in
                any order */}
            <BusinessSections $designs={!!variant}>
            {renderSections({
              free_delivery_banner: () => !useKioskApp && !hasProductCart && freeDeliveryProgress?.status === 'awareness' && (
              <FreeDeliveryProgress {...freeDeliveryProgress} variant='full' />
              ),
              student_selector: () => businessState?.business?.vertical === 'school' && (
              <StudentSelector business={businessState?.business} />
              ),
              offers_banner: () => businessState?.business?.id && (
              <PageBannerWrapper>
                <PageBanner
                  title={t('OFFERS', 'Offers')}
                  position='web_business_page'
                  businessId={businessState?.business?.id}
                  isCustomerMode={isCustomerMode}
                  handleCustomProductBannerClick={handleCustomProductBannerClick}
                  business={businessState?.business}
                />
              </PageBannerWrapper>
              ),
              order_it_again: () => !business?.loading && business?.previously_products?.length > 0 && (
              <OrderItAgain
                onProductClick={onProductClick}
                productList={business?.previously_products}
                businessId={business?.id}
                isHideDescription
              />
              ),
              featured_products: () => !variant && !business?.loading && featuredProducts && categoryState?.products?.find(product => product.featured) && (
              <WrapAllCategories id='categoryfeatured'>
                {/* a section of the page (h2), the business name is its h1 */}
                <h2>{t('FEATURED_ITEMS', 'Featured Items')}</h2>
                <ProductListWrapper>
                  <ProductList>
                    <AutoScroll scrollId='featured'>
                      {categoryState.products?.map((product, i) => product.featured && (
                        <SingleProductCard
                          key={i}
                          isSoldOut={(product.inventoried && !product.quantity)}
                          product={product}
                          useKioskApp={useKioskApp}
                          businessId={business?.id}
                          onProductClick={onProductClick}
                          isCartOnProductsList={isCartOnProductsList}
                          handleUpdateProducts={handleUpdateProducts}
                          productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                          isFeatured
                        />
                      ))}
                      {isLazy && !categoryState?.loading && categoryState?.products?.filter(product => product.featured)?.length > 9 && (
                        <SingleProductCard
                          useCustomFunctionality
                          onCustomClick={() => onClickCategory({ id: 'featured', name: t('FEATURED', 'Featured') })}
                          isCartOnProductsList={isCartOnProductsList}
                          handleUpdateProducts={handleUpdateProducts}
                          customText={t('MORE', 'More')}
                        />
                      )}
                    </AutoScroll>
                  </ProductList>
                </ProductListWrapper>
              </WrapAllCategories>
              ),
              reviews: () => business?.reviews?.reviews.length > 0 && (
              <BusinessReviews
                businessId={business?.id}
                reviews={business?.reviews?.reviews}
                businessName={business?.name}
                stars={business?.reviews?.total}
                totalReviews={business?.reviews?.total}
              />
              )
            }, { group: 'main' })}
            </BusinessSections>
            {variant && (
              <StoreMenu
                variant={variant}
                categories={sortedCategories}
                business={business}
                currentCart={currentCart}
                featured={featuredProducts}
                categoryState={categoryState}
                categorySelected={categorySelected}
                isLazy={isLazy}
                isFiltered={!!categorySelected?.id}
                searchValue={searchValue}
                handleChangeSearch={handleChangeSearch}
                onClickCategory={onClickCategory}
                onProductClick={onProductClick}
                onProductAdd={onProductAdd || onProductClick}
                handleUpdateProducts={handleUpdateProducts}
                handleSearchRedirect={handleSearchRedirect}
                before={professionalFilters}
                back={backToAll}
                cart={storeCartColumn(theme) && (
                  <StoreCartAside
                    currentCart={currentCart}
                    business={business}
                    freeDeliveryProgress={freeDeliveryProgress}
                    handleCartOpen={handleCartOpen}
                    isCartOnProductsList={isCartOnProductsList}
                    productLoading={productLoading}
                    setProductLoading={setProductLoading}
                  />
                )}
              />
            )}
            {!variant && (
              <BusinessContent isCustomLayout={isCustomLayout || useKioskApp} id='wrapper-categories'>
                <BusinessCategoryProductWrapper showCartOnProductList={showCartOnProductList}>
                  {professionalFilters}
                  <CategoriesPopover
                    id={categoryPopoverId}
                    CategoriesPopoverUI={CategoriesPopoverUI}
                    open={openPopover}
                    onClose={closePopover}
                    getSelectionFocus={getSelectionFocus}
                  />
                  <div style={{ position: 'relative' }}>
                    {!(business?.categories?.length === 0 && !categoryId) && !categorySelected?.id && (
                      <BusinessProductsCategories
                        categories={[
                          ...(categoriesMenuIcon ? [{ id: -1, name: <Icon {...categoriesMenuIcon} />, isList: true }] : []),
                          /* { id: 'featured', name: t('FEATURED', 'Featured') }, */
                          ...sortedCategories
                        ]}
                        categorySelected={categorySelected}
                        onClickCategory={onClickCategory}
                        handleTogglePopover={handleTogglePopover}
                        categoryPopoverOpen={openPopover}
                        categoryPopoverId={categoryPopoverId}
                        featured={featuredProducts}
                        useKioskApp={useKioskApp}
                        openBusinessInformation={openBusinessInformation}
                        business={business}
                        currentCart={currentCart}
                        wContainerStyle={useKioskApp && 'calc(100% - 50px)'}
                        isProfessional={business?.professionals?.length > 0 && !useKioskApp}
                      />
                    )}
                    {!(business?.categories?.length === 0 && !categoryId) && categorySelected?.id && backToAll}
                    {useKioskApp && (
                      <WrapperSearchAbsolute id='WrapperSearchAbsolute'>
                        {themeVisible(theme, 'business.header.search') && (
                          <SearchIconWrapper
                            onClick={(event) => openSearch(true, event.currentTarget)}
                            aria-label={t('SEARCH_PRODUCTS', 'Search Products')}
                            data-doc-control='business-product-search-open'
                          >
                            <Icon name="search" aria-hidden='true' />
                          </SearchIconWrapper>
                        )}
                      </WrapperSearchAbsolute>
                    )}
                  </div>
                  <WrapContent id='businessProductList' categoryClicked={categoryClicked}>
                    <BusinessProductsList {...productsListProps} />
                  </WrapContent>
                </BusinessCategoryProductWrapper>
                {(windowSize.width >= 1000 && windowSize.height >= 600) && showCartOnProductList && (
                  <BusinessCartContainer isProfessional={business?.professionals?.length > 0 && !useKioskApp}>
                    <BusinessCartContent maxHeight={window.innerHeight - 100}>
                      {currentCart?.products?.length > 0 || (currentCart?.reservation && orderState?.options?.type === 9)
                        ? (
                          <>
                            <Title>{t('YOUR_CART', 'Your cart')}</Title>
                            <Cart
                              isStore
                              isCustomMode
                              isForceOpenCart
                              forceHideCheckoutButton
                              useKioskApp={useKioskApp}
                              cart={currentCart}
                              freeDeliveryProgress={freeDeliveryProgress}
                              isCartPending={currentCart?.status === 2}
                              isProducts={currentCart.products.length}
                              isCartOnProductsList={isCartOnProductsList}
                              handleCartOpen={handleCartOpen}
                              businessConfigs={business?.configs}
                              productLoading={productLoading}
                              setProductLoading={setProductLoading}
                              showUpsellingInBusinessInfo
                              showDiscountInCart
                            />
                          </>
                          )
                        : (
                        <EmptyCart>
                          <div className='empty-content'>
                            {/* the image and box of the empty states (empty.not_found), else the cart icon */}
                            <EmptyStateArt>
                              <EmptyStateIcon name='bag' />
                            </EmptyStateArt>
                            <p>{t('ADD_PRODUCTS_IN_YOUR_CART', 'Add products in your cart')}</p>
                          </div>
                          {showCartFreeDelivery && freeDeliveryProgress?.status === 'awareness' && (
                            <FreeDeliveryProgress {...freeDeliveryProgress} variant='full' />
                          )}
                          <EmptyBtnWrapper>
                            <EmptyCartTotal>{parsePrice(0)}</EmptyCartTotal>
                            <EmptyCartMessage role='status'>{t('EMPTY_CART', 'Empty cart')}</EmptyCartMessage>
                          </EmptyBtnWrapper>
                        </EmptyCart>
                          )}
                    </BusinessCartContent>
                  </BusinessCartContainer>
                )}
              </BusinessContent>
            )}
          </div>
        </WrappLayout>
      )}

      {isLoading && !isError && (
        <>
          {!isCustomLayout && !useKioskApp && (
            <BusinessBasicInformation
              isSkeleton
              handler={handler}
              businessState={{ business: {}, loading: true }}
              openBusinessInformation={openBusinessInformation}
              variant={variant}
            />
          )}
          {variant && (
            <StoreMenu isSkeleton variant={variant} categories={[]} />
          )}
          {!variant && (
          <BusinessContent isCustomLayout={isCustomLayout || useKioskApp} id='wrapper-categories'>
            <BusinessCategoryProductWrapper showCartOnProductList={showCartOnProductList}>
              <div style={{ position: 'relative' }}>
                <BusinessProductsCategories
                  isSkeleton
                  categories={[]}
                  openBusinessInformation={openBusinessInformation}
                  isCustomerMode={isCustomerMode}
                />
              </div>
            </BusinessCategoryProductWrapper>
          </BusinessContent>
          )}
          {!variant && (categoryClicked || windowSize.width >= 993) && (
            <WrapContent>
              <BusinessProductsList
                categories={[]}
                useKioskApp={useKioskApp}
                category={categorySelected}
                categoryState={categoryState}
                isBusinessLoading={isLoading}
                handleUpdateProducts={handleUpdateProducts}
                errorQuantityProducts={errorQuantityProducts}
              />
            </WrapContent>
          )}
        </>
      )}
      {isCartModal && (
        <DialogOverlay
          legacyMaxWidth
          width='40%'
          open={isCartModal}
          onClose={() => setisCartModal(false)}
        >
          <BusinessCartContent isModal>
            <ModalHeading as={Title} style={{ textAlign: 'center', marginTop: themeSpace(theme, 'xs') }}>{t('YOUR_CART', 'Your cart')}</ModalHeading>
            {currentCart?.products?.length > 0
              ? (
              <>
                {/* how and when */}
                <OrderContextUI isCart />
                <Cart
                  isStore
                  isCustomMode
                  isForceOpenCart
                  cart={currentCart}
                  freeDeliveryProgress={freeDeliveryProgress}
                  useKioskApp={useKioskApp}
                  isCartPending={currentCart?.status === 2}
                  isProducts={currentCart.products.length}
                  isCartOnProductsList={isCartOnProductsList}
                  handleCartOpen={handleCartOpen}
                  onClickCheckout={() => setisCartModal(false)}
                  businessConfigs={business?.configs}
                  productLoading={productLoading}
                  setProductLoading={setProductLoading}
                  showUpsellingInBusinessInfo
                  showDiscountInCart
                />
              </>
                )
              : (
              <EmptyCart>
                <div className='empty-content'>
                  {/* the image and box of the empty states (empty.not_found), else the cart icon */}
                  <EmptyStateArt>
                    <EmptyStateIcon name='bag' />
                  </EmptyStateArt>
                  <p>{t('ADD_PRODUCTS_IN_YOUR_CART', 'Add products in your cart')}</p>
                </div>
                {showCartFreeDelivery && freeDeliveryProgress?.status === 'awareness' && (
                  <FreeDeliveryProgress {...freeDeliveryProgress} variant='full' />
                )}
                <EmptyBtnWrapper>
                  <EmptyCartTotal>{parsePrice(0)}</EmptyCartTotal>
                  <EmptyCartMessage role='status'>{t('EMPTY_CART', 'Empty cart')}</EmptyCartMessage>
                </EmptyBtnWrapper>
              </EmptyCart>
                )}
          </BusinessCartContent>
        </DialogOverlay>
      )}
    </>
  )
}
