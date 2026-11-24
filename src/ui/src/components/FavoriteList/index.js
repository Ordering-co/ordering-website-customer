import React, { useState, useEffect, useMemo } from 'react'
import { useTheme } from 'styled-components'

import {
  Container,
  FavoriteListWrapper,
  ReadMoreCard,
  FavoriteListing,
  SingleBusinessOffer,
  BusinessLogo,
  BusinessInfo,
  FavPopupView,
  FavPopupSubtitle,
  BusinessOffers,
  Image,
  ProductsListing
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useSite } from '~components/contexts/SiteContext'
import { useEvent } from '~components/contexts/EventContext'
import { FavoriteList as FavoriteListController } from '~components/components/FavoriteList'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Button } from '~ui/src/design-system/components/Button'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { checkSiteUrl, generalUtilities } from '~ui/utils'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { BusinessController } from '~ui/src/components/BusinessController'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'
import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { SingleOrderCard } from '~ui/src/components/SingleOrderCard'
import { SingleProfessionalCard } from '~ui/src/components/SingleProfessionalCard'
import { themeImage, themeMedia, businessLogoPlaceholder } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { singleStoreFavorites, singleStoreSlug } from '~/utils/singleStore'
import { isInsideOverlay } from '~/utils/overlay'
import settings from '../../../../config'

const FavoriteListUI = (props) => {
  const {
    favoriteList,
    handleUpdateFavoriteList,
    pagination,
    getFavoriteList,
    isBusiness,
    isProduct,
    isOrder,
    isProfessional,
    handleReorder,
    reorderState
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [events] = useEvent()
  const [{ site }] = useSite()
  const { width } = useWindowSize()
  const { getOrderStatus } = generalUtilities()
  const theme = useTheme()

  const businessUrlTemplate = checkSiteUrl(site?.business_url_template, '/store/:business_slug')
  const productUrlTemplate = checkSiteUrl(site?.product_url_template, '/store/:business_slug?category=:category_id&product=:product_id')

  const openProductModal = true
  const [isPreorder, setIsPreorder] = useState(false)
  const [preorderBusiness, setPreorderBusiness] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [favProduct, setFavProduct] = useState(null)
  // a product without a photo shows the theme's placeholder, unless the theme
  // hides it (visibility product.dummy_image); a business without a logo, its
  // placeholder
  const hideProductDummy = themeHidden(theme, 'product.dummy_image')
  const favProductImage = favProduct?.images || (!hideProductDummy ? themeImage(theme, 'placeholder.product') : null)
  const businessLogoOf = (business) => business?.logo || businessLogoPlaceholder(theme)

  const pastOrders = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

  const handleClickBusiness = (business) => {
    if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
      events.emit('go_to_page', { page: 'business', params: { business_slug: business.slug } })
    } else {
      events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${business.slug}` })
    }
  }

  const handleClosePreorder = () => {
    setIsPreorder(false)
    setPreorderBusiness(null)
  }

  const onRedirectPage = (data) => {
    events.emit('go_to_page', data)
  }

  const handleOpenProduct = (business) => {
    const slug = business.slug
    const categoryId = favProduct?.category?.id
    const productId = favProduct?.id

    if (!categoryId && !productId) {
      if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
        events.emit('go_to_page', { page: 'business', params: { business_slug: slug } })
      } else {
        events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${slug}` })
      }
      return
    }
    if (productUrlTemplate === '/store/:business_slug/:category_slug/:product_slug' || productUrlTemplate === '/:business_slug/:category_slug/:product_slug') {
      return events.emit('go_to_page', {
        page: 'product',
        params: {
          business_slug: slug,
          category_slug: categoryId,
          product_slug: productId
        }
      })
    }
    if (productUrlTemplate.includes('/store/:category_slug/:product_slug')) {
      const businessParameter = businessUrlTemplate.replace('/store?', '').replace('=:business_slug', '')
      return events.emit('go_to_page', {
        page: 'product',
        params: {
          category_slug: categoryId,
          product_slug: productId
        },
        search: `?${businessParameter}=${slug}`
      })
    }
    if (productUrlTemplate.includes('/store/:business_slug') && productUrlTemplate.includes('category_id')) {
      const ids = productUrlTemplate.split('?')[1].split('&')
      const categoryParameter = ids[0].replace('=:category_id', '')
      const productParameter = ids[1].replace('=:product_id', '')
      return events.emit('go_to_page', {
        page: 'product',
        params: {
          business_slug: slug
        },
        search: `?${categoryParameter}=${categoryId}&${productParameter}=${productId}`
      })
    }
    if (productUrlTemplate.includes('/:business_slug') && !productUrlTemplate.includes('store')) {
      const ids = productUrlTemplate.split('?')[1].split('&')
      const categoryParameter = ids[0].replace('=:category_id', '')
      const productParameter = ids[1].replace('=:product_id', '')
      return events.emit('go_to_page', {
        page: 'product',
        params: {
          business_slug: slug
        },
        search: `?${categoryParameter}=${categoryId}&${productParameter}=${productId}`
      })
    }
  }

  const onProductClick = (product) => {
    setOpenModal(true)
    setFavProduct(product)
  }

  const closeOrderModal = (e) => {
    const outsideModal = !isInsideOverlay(e.target)
    if (outsideModal) {
      const _businessId = 'businessId:' + reorderState?.result?.business_id
      sessionStorage.setItem('adjust-cart-products', _businessId)
      onRedirectPage && onRedirectPage({ page: 'business', params: { store: reorderState?.result?.business?.slug } })
    }
  }

  useEffect(() => {
    if (preorderBusiness) setIsPreorder(true)
  }, [preorderBusiness])

  const emptyStateCopy = isProduct
    ? {
        title: t('NO_FAVORITE_PRODUCTS_YET', "You haven't saved any favorite products yet"),
        subtitle: t('NO_FAVORITE_PRODUCTS_YET_DESC', 'Browse stores and tap the heart icon to save products here.')
      }
    : isOrder
      ? {
          title: t('NO_FAVORITE_ORDERS_YET', "You haven't saved any favorite orders yet"),
          subtitle: t('NO_FAVORITE_ORDERS_YET_DESC', 'Your saved orders will appear here for easy reordering.')
        }
      : isProfessional
        ? {
            title: t('NO_FAVORITE_PROFESSIONALS_YET', "You haven't saved any favorite professionals yet"),
            subtitle: t('NO_FAVORITE_PROFESSIONALS_YET_DESC', 'Professionals you favorite will show up in this list.')
          }
        : {
            title: t('NO_FAVORITE_BUSINESSES_YET', "You haven't saved any favorite businesses yet"),
            subtitle: t('NO_FAVORITE_BUSINESSES_YET_DESC', 'Browse businesses and tap the heart icon to save them here.')
          }

  useEffect(() => {
    if (!isOrder) return
    if (reorderState?.error) {
      window.addEventListener('click', closeOrderModal)
      return () => {
        window.removeEventListener('click', closeOrderModal)
      }
    }

    if (!reorderState?.error && reorderState?.loading === false && reorderState?.result?.business_id) {
      const _businessId = 'businessId:' + reorderState?.result?.business_id
      const cartProducts = orderState?.carts?.[_businessId]?.products
      const available = cartProducts.every(product => product.valid === true)
      const orderProducts = favoriteList?.favorites.find(order => order?.id === reorderState?.result?.orderId)?.products

      if (available && reorderState?.result?.uuid && (cartProducts?.length === orderProducts?.length)) {
        onRedirectPage && onRedirectPage({ page: 'checkout', params: { cartUuid: reorderState?.result.uuid } })
      } else {
        sessionStorage.setItem('adjust-cart-products', _businessId)
        cartProducts?.length !== orderProducts?.length && sessionStorage.setItem('already-removed', 'removed')
        onRedirectPage && onRedirectPage({ page: 'business', params: { store: reorderState?.result?.business?.slug } })
      }
    }
  }, [reorderState])

  // the request failed and nothing is listed: a state of its own, never the API's raw text
  const loadFailed = !favoriteList?.loading && favoriteList?.error?.length > 0 && favoriteList?.favorites.length === 0

  return (
    <>
      <Container
        data-doc-section='favorites-list'
        data-doc-kind={isBusiness ? 'businesses' : isProduct ? 'products' : isOrder ? 'orders' : 'professionals'}
        data-doc-state={favoriteList?.loading ? 'loading' : favoriteList?.error ? 'error' : favoriteList?.favorites?.length ? 'results' : 'empty'}
      >
        {loadFailed && (
          <NotFoundSource
            headingLevel='h2'
            variant='notFound'
            icon='heartBs'
            content={t('FAVORITES_LOAD_ERROR', 'We couldn’t load your favorites')}
            btnTitle={t('RETRY', 'Retry')}
            onClickButton={() => getFavoriteList(1)}
          />
        )}
        {
          !favoriteList?.loading && !loadFailed && favoriteList?.favorites.length === 0 && (
            <NotFoundSource
              headingLevel='h2'
              variant='empty'
              icon='heartBs'
              content={emptyStateCopy.title}
              subtitle={emptyStateCopy.subtitle}
            />
          )
        }
        {isProduct && (
          <>
            <ProductsListing>
              {
                favoriteList?.favorites?.map((product, i) => (
                  <SingleProductCard
                    key={`${product.id}_${i}`}
                    isSoldOut={product.inventoried && !product.quantity}
                    product={product}
                    onProductClick={() => openProductModal ? onProductClick(product) : product?.businesses?.length > 0 && handleOpenProduct(product?.businesses[0])}
                    handleUpdateProducts={handleUpdateFavoriteList}
                    isFavorite
                  />
                ))
              }
              {favoriteList?.loading && (
                [...Array(5).keys()].map(i => (
                  <SingleProductCard
                    key={`skeleton:${i}`}
                    isSkeleton
                    isFavorite
                  />
                ))
              )}
            </ ProductsListing>
          </>
        )}
        {/* the favorites stay on screen while the next page loads (its
            skeletons go after them): the scroll stays where it is */}
        <FavoriteListWrapper isLoading={!(favoriteList?.favorites?.length > 0)}>
          <FavoriteListing isOrder={isOrder}>
              {isBusiness && (
                <>
                  {favoriteList?.favorites?.map((business, i) => (
                    <BusinessController
                      key={business.id}
                      className='card'
                      business={props.hideDistance ? { ...business, distance: undefined } : business}
                      isBusinessOpen={business.open}
                      handleCustomClick={handleClickBusiness}
                      orderType={orderState?.options?.type}
                      onPreorderBusiness={setPreorderBusiness}
                      businessHeader={business?.header}
                      businessFeatured={business?.featured}
                      businessOffers={business?.offers}
                      businessLogo={business?.logo}
                      businessReviews={business?.reviews?.total}
                      businessDeliveryPrice={business?.delivery_price}
                      businessDeliveryTime={business?.delivery_time}
                      businessPickupTime={business?.pickup_time}
                      businessDistance={props.hideDistance ? undefined : business?.distance}
                      handleUpdateBusinessList={handleUpdateFavoriteList}
                      firstCard={i === 0 && width > 681}
                      fromFavoriteList
                    />
                  ))}
                  {favoriteList?.loading && (
                    [...Array(5).keys()].map(i => (
                      <BusinessController
                        key={i}
                        className='card'
                        business={{}}
                        isSkeleton
                        orderType={orderState?.options?.type}
                        fromFavoriteList
                      />
                    ))
                  )}
                </>
              )}
              {isOrder && (
                <>
                  {
                    favoriteList?.favorites?.map((order, i) => (
                      <SingleOrderCard
                        key={`${order?.id}_${i}`}
                        order={order}
                        onRedirectPage={onRedirectPage}
                        getOrderStatus={getOrderStatus}
                        pastOrders={pastOrders.includes(order?.status)}
                        handleReorder={handleReorder}
                        handleUpdateOrderList={handleUpdateFavoriteList}
                        isFavorite
                      />
                    ))
                  }
                  {favoriteList?.loading && (
                    [...Array(5).keys()].map(i => (
                      <SingleOrderCard
                        key={i}
                        isSkeleton
                        order={{}}
                        onRedirectPage={onRedirectPage}
                        getOrderStatus={getOrderStatus}
                        handleReorder={handleReorder}
                        isFavorite
                      />
                    ))
                  )}
                </>
              )}
              {isProfessional && (
                <>
                  {
                    favoriteList?.favorites?.map((professional, i) => (
                      <SingleProfessionalCard
                        key={i}
                        professional={professional}
                        handleUpdateProfessionals={handleUpdateFavoriteList}
                      />
                    ))
                  }
                  {favoriteList?.loading && (
                    [...Array(5).keys()].map(i => (
                      <SingleProfessionalCard
                        key={i}
                        professional={{}}
                        isSkeleton
                      />
                    ))
                  )}
                </>
              )}
              {!favoriteList?.loading && pagination?.totalPages && pagination?.currentPage < pagination?.totalPages && (
                <ReadMoreCard>
                  <Button
                    color='primary'
                    appearance='outline'
                    size='md'
                    onClick={() => getFavoriteList(pagination?.currentPage + 1)}
                  >
                    {t('LOAD_MORE_ITEMS', 'Load more items')}
                  </Button>
                </ReadMoreCard>
              )}
          </FavoriteListing>
        </FavoriteListWrapper>
      </Container>
      {isPreorder && (
        <DialogOverlay
          open={isPreorder}
          size='xl'
          onClose={() => handleClosePreorder()}
        >
          <BusinessPreorder
            business={preorderBusiness}
            handleClick={handleClickBusiness}
            showButton
          />
        </DialogOverlay>
      )}
      {openModal && (
        <DialogOverlay
          open={openModal}
          onClose={() => setOpenModal(false)}
        >
          <FavPopupView>
            {favProductImage && (
              <Image>
                {/* the product's photo is named by the product; the dummy says nothing (decorative) */}
                <img src={favProductImage} alt={favProduct?.images ? (favProduct?.name || '') : ''} width={themeMedia(theme, 'xl')} height={themeMedia(theme, 'xl')} loading='lazy' />
              </Image>
            )}
            <ModalHeading as='h3'>
              {favProduct?.name}
            </ModalHeading>
            <FavPopupSubtitle>
              {favProduct?.businesses && favProduct?.businesses?.length > 1
                ? t('AVAILABLE_BUSINESSES_FOR_PRODUCT', 'Available businesses for this product')
                : favProduct?.businesses && favProduct?.businesses?.length === 1
                  ? t('AVAILABLE_BUSINESSE_FOR_PRODUCT', 'Available business for this product')
                  : t('NOT_AVAILABLE_BUSINESSE', 'Business is not available for this product')
              }
            </FavPopupSubtitle>
            <BusinessOffers>
              {favProduct?.businesses?.map(business => {
                const logo = businessLogoOf(business)
                return (
                  <SingleBusinessOffer key={business.id}>
                    {logo && <BusinessLogo bgimage={logo} />}
                    <BusinessInfo>
                      <p>{business.name}</p>
                      <Button
                        onClick={() => handleOpenProduct(business)}
                        color='primary'
                        size='md'
                      >
                        {t('GO_TO_BUSINESSS', 'Go to business')}
                      </Button>
                    </BusinessInfo>
                  </SingleBusinessOffer>
                )
              })}
            </BusinessOffers>
          </FavPopupView>
        </DialogOverlay>
      )}
    </>
  )
}

// A single store site lists only the store's favorites: a favorite of another
// store of the project led to a store the site does not show (its routes all
// open the single store)
const StoreFavoriteListUI = (props) => {
  const theme = useTheme()
  const slug = singleStoreSlug(theme, settings)
  const kind = props.isBusiness ? 'business' : props.isProduct ? 'product' : props.isOrder ? 'order' : 'professional'
  const favoriteList = useMemo(() => {
    const favorites = singleStoreFavorites(props.favoriteList?.favorites, kind, slug)
    return favorites === props.favoriteList?.favorites ? props.favoriteList : { ...props.favoriteList, favorites }
  }, [props.favoriteList, kind, slug])
  return <FavoriteListUI {...props} favoriteList={favoriteList} />
}

export const FavoriteList = (props) => {
  const favoriteListProps = {
    ...props,
    enableLoadingAtRender: true,
    UIComponent: StoreFavoriteListUI
  }
  return <FavoriteListController {...favoriteListProps} />
}
