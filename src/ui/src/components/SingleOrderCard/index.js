import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import {
  Container,
  Content,
  Price,
  BusinessLogoWrapper,
  ButtonWrapper,
  FavoriteWrapper,
  ReviewWrapper,
  MultiLogosContainer,
  OrderStatusContainer,
  HiddenTitle
} from './styles'
import { BusinessInformation } from '../OrdersOption/styles'
import { OrderEta } from '../OrderDetails/OrderEta'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { SingleOrderCard as SingleOrderCardController } from '~components/components/SingleOrderCard'

import { generalUtilities } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Confirm } from '~ui/src/components/Confirm'
import { ReviewOrder } from '~ui/src/components/ReviewOrder'
import { ReviewProduct } from '~ui/src/components/ReviewProduct'
import { ReviewDriver } from '~ui/src/components/ReviewDriver'

import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { useImageFallback } from '~ui/hooks/useImageFallback'
import { themeVisible } from '~/utils/themeVisibility'
import { CardLink } from '~ui/src/styles/Card'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

const SingleOrderCardUI = (props) => {
  const {
    order,
    isBusinessesPage,
    handleReorder,
    customArray,
    onRedirectPage,
    pastOrders,
    isCustomerMode,
    handleFavoriteOrder,
    isSkeleton,
    isFavorite,
    handleRemoveCart,
    cartState,
    reorderLoading
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ carts }] = useOrder()
  const [{ parsePrice, parseDate, optimizeImage }] = useUtils()
  // the business's logo, the theme's placeholder when it has none or it
  // fails to load (a background image fails silently: an empty box)
  const placeholderLogo = businessLogoPlaceholder(theme)
  const businessLogo = useImageFallback(order?.business?.logo && optimizeImage(order?.business?.logo, 'h_400,c_limit'), optimizeImage(placeholderLogo, 'h_400,c_limit'))
  const [{ configs }] = useConfig()
  const { getOrderStatus, orderTypes } = generalUtilities()
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState({ order: false, product: false, driver: false })
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  const [isOrderReviewed, setIsOrderReviewed] = useState(false)
  const [isProductReviewed, setIsProductReviewed] = useState(false)
  const [isDriverReviewed, setIsDriverReviewed] = useState(false)

  const isCustomOrder = order?.declared_value != null || order?.metafields?.find?.(m => m?.key === 'declared_value')
  const isGiftCardOrder = !order?.business_id && !isCustomOrder

  // opens the order (its checkout for a cart of customArray)
  const openOrder = (order) => {
    if (customArray) {
      onRedirectPage({ page: 'checkout', params: { cartUuid: order.uuid } })
    } else {
      window.sessionStorage.setItem('order-redirect', true)
      order?.cart_group_id
        ? onRedirectPage({ page: 'multi_orders', params: { orderId: order.cart_group_id } })
        : onRedirectPage({ page: 'order_detail', params: { orderId: order.uuid } })
    }
  }

  const closeReviewOrder = () => {
    if (!isProductReviewed) setReviewStatus({ order: false, product: true, driver: false })
    else if (order?.driver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else handleCloseReivew()
  }

  const closeReviewProduct = () => {
    if (order?.driver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else {
      setIsDriverReviewed(true)
      handleCloseReivew()
    }
  }
  const handleOpenReview = () => {
    if (!order?.review && !isOrderReviewed) setReviewStatus({ order: true, product: false, driver: false })
    else if (!isProductReviewed) setReviewStatus({ order: false, product: true, driver: false })
    else if (order?.driver && !order?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else {
      setIsReviewOpen(false)
      return
    }
    setIsReviewOpen(true)
  }

  const handleCloseReivew = () => {
    setReviewStatus({ order: false, product: false, driver: false })
    setIsReviewOpen(false)
  }

  const handleClickReview = (order) => {
    handleOpenReview && handleOpenReview()
  }

  const handleChangeFavorite = (order) => {
    handleFavoriteOrder && handleFavoriteOrder(!order?.favorite)
  }

  const handleClickReorder = (order) => {
    if (carts[`businessId:${order?.business_id}`] && carts[`businessId:${order?.business_id}`]?.products?.length > 0) {
      setConfirm({
        open: true,
        content: t('QUESTION_DELETE_PRODUCTS_FROM_CART', 'Are you sure that you want to delete all products from cart?'),
        handleOnAccept: () => {
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

  // orders.business_logo (on by default)
  const hideBusinessLogo = !themeVisible(theme, 'orders.business_logo')
  const hasAnyBusinessLogo = order?.business?.length > 1
    ? order?.business?.some((business) => business?.logo || placeholderLogo)
    : !!businessLogo
  const hideBusinessName = !themeVisible(theme, 'orders.business_name')
  const hideOrderNumber = !themeVisible(theme, 'orders.order_number')
  // the theme can hide the products' count, the order type and
  // the total (orders.products_count, orders.delivery_type, orders.total)
  const showProductsCount = themeVisible(theme, 'orders.products_count')
  const showDeliveryType = themeVisible(theme, 'orders.delivery_type')
  const showTotal = themeVisible(theme, 'orders.total')
  const hideReviewOrderButton = !themeVisible(theme, 'orders.review_order_button')
  const hideReorderButton = !themeVisible(theme, 'orders.reorder_button')
  const hideFavorite = !themeVisible(theme, 'orders.favorite')
  const hideOrderStatus = !themeVisible(theme, 'orders.order_status')
  const changeIdToExternalId = configs?.change_order_id?.value === '1'
  const showOrderNumber = !hideOrderNumber && !!(order?.id || (changeIdToExternalId && order?.external_id))
  // orders.date shows it on its own
  const showOrderDate = themeVisible(theme, 'orders.date')
  // the card is a box and its title the button that opens the
  // order (a stretched link): the actions inside work apart
  const cardTitle = order?.business?.length > 1 ? `${t('GROUP_ORDER', 'Group Order')} ${t('INVOICE_NO', 'No.')} ${order?.cart_group_id}` : isCustomOrder ? (order?.business?.name || t('CUSTOM_ORDER', 'Custom Order')) : isGiftCardOrder ? t('GIFT_CARD', 'Gift Card') : order?.business?.name
  const cardLink = (content) => (
    <CardLink as='button' $card='order_card' onClick={() => openOrder(order)}>{content}</CardLink>
  )
  const renderFavorite = () => {
    const favoriteProps = {
      className: 'favorite',
      'aria-pressed': !!order?.favorite,
      'aria-label': t('FAVORITE', 'Favorite'),
      onClick: () => handleChangeFavorite(order)
    }
    return isSkeleton
      ? (
        <FavoriteWrapper {...favoriteProps}>
          <Skeleton width={20} height={20} />
        </FavoriteWrapper>
        )
      : (
        <Button {...favoriteProps} favorite bleed iconLine borderInset>
          <Icon name={order?.favorite ? 'heartFilled' : 'heartOutline'} />
        </Button>
        )
  }

  return (
    <>
      <Container
        data-doc-section={isFavorite ? 'favorite-order-card' : 'order-history-card'}
        data-doc-order-id={isFavorite ? order?.id : undefined}
        data-doc-status={isFavorite ? undefined : order?.status}
        id='order-card'
        isFavorite={isFavorite}
        isBusinessesPage={isBusinessesPage}
        isCustomerMode={isCustomerMode}
      >
        <Content isCustomerMode={isCustomerMode}>
          {isSkeleton
            ? (
              <Skeleton width={60} height={60} />
              )
            : (
              <>
                {!isCustomerMode && !hideBusinessLogo && hasAnyBusinessLogo && (
                  <>
                    {order?.business?.length > 1
                      ? (
                        <MultiLogosContainer>
                          {order?.business?.map((business, i) => i < 2 && (business?.logo || placeholderLogo) && (
                            <BusinessLogoWrapper
                              key={business?.id}
                              bgimage={optimizeImage(business?.logo || placeholderLogo, 'h_400,c_limit')}
                              isMulti
                            />
                          ))}
                          {order?.business?.length > 1 && (order?.business?.length - 2) > 0 && (
                            <p>
                              + {order?.business?.length - 2}
                            </p>
                          )}
                        </MultiLogosContainer>
                        )
                      : (
                        <BusinessLogoWrapper bgimage={businessLogo} />
                        )}
                  </>
                )}
              </>
              )}

          <BusinessInformation activeOrders isMultiCart={order?.business?.length > 1}>
            {!hideBusinessName && (
              <>
                <h3 title={isSkeleton ? undefined : cardTitle}>{isSkeleton ? <Skeleton width={120} /> : cardLink(cardTitle)}</h3>
              </>
            )}
            {/* without the business name: the button that opens
                the order, named by its title, hidden */}
            {hideBusinessName && !isSkeleton && cardLink(<HiddenTitle>{cardTitle}</HiddenTitle>)}

            {
              isSkeleton
                ? (
                  <div className='orders-detail'>
                    <Skeleton width={150} />
                  </div>
                  )
                : (
                  <div className='orders-detail'>
                    {(showOrderNumber || showOrderDate) && (
                      <>
                        <p name='order_number' className='order-number'>
                          {showOrderNumber && <span className='order-fact'>{order?.business?.length > 1 ? `${order?.business?.length} ${t('ORDERS', 'orders')}` : (changeIdToExternalId && order?.external_id) || (`${t('ORDER_NUM', 'Order No.')} ${order.id}`)}</span>}
                          {showOrderNumber && showOrderDate && ' • '}
                          {/* past orders in the site's date format
                              (parseDate's default, dates_general_format), the
                              one the active orders' ETA uses */}
                          {showOrderDate && (
                            <span className='order-fact'>
                              {pastOrders
                                ? order?.delivery_datetime_utc
                                  ? parseDate(order?.delivery_datetime_utc)
                                  : null
                                : <OrderEta order={order} />}
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  )
            }

            <OrderStatusContainer>
              {showProductsCount && order?.products?.length > 0 && (
                <p>
                  {order?.products?.length} {order?.products?.length === 1 ? t('PRODUCT', 'Product') : t('PRODUCTS', 'Products')}
                </p>
              )}
              {!hideOrderStatus && (
                <p className={`order-status ${(getOrderStatus(order.status)?.percentage === 100) || !pastOrders ? 'completed' : ''}`}>{isSkeleton ? <Skeleton width={80} /> : getOrderStatus(order.status)?.value}</p>
              )}
              {!pastOrders && showDeliveryType && (
                <p>
                  {orderTypes?.find(type => order?.delivery_type === type?.value)?.text}
                </p>
              )}
            </OrderStatusContainer>
          </BusinessInformation>
          <div className='buttons-wrapper'>
            {pastOrders && !isGiftCardOrder && (
              <ButtonWrapper isCustomerMode={isCustomerMode}>
                {!isOrderReviewed && (!order?.review || (order.driver && !order?.user_review)) && !hideReviewOrderButton && !isCustomerMode && (
                  <Button
                    data-doc-control='order-history-review'
                    /* the card's review piece (order_card.slots.review) */
                    {...slotButtonOptions(theme, 'order_card', 'review', { color: 'secondary' })}
                    /* a labelled action: the slot's shape never drew an icon here (legacy ignored it) */
                    shape='text'
                    className='review'
                    onClick={() => handleClickReview(order)}
                  >
                    {t('REVIEW', 'Review')}
                  </Button>
                )}
                {order.cart && typeof order?.id === 'number' && !hideReorderButton && (
                  <Button
                    data-doc-control='order-history-reorder'
                    /* the card's reorder piece (order_card.slots.reorder) */
                    {...slotButtonOptions(theme, 'order_card', 'reorder', { color: 'secondary' })}
                    /* a labelled action: the slot's shape never drew an icon here (legacy ignored it) */
                    shape='text'
                    className='reorder'
                    onClick={() => handleClickReorder(order)}
                    disabled={reorderLoading || cartState?.loading}
                    loading={reorderLoading || cartState?.loading}
                  >
                    {t('REORDER', 'Reorder')}
                  </Button>
                )}
              </ButtonWrapper>
            )}
            {!isCustomerMode && (
              <Price isBusinessesPage={isBusinessesPage} isFavorite={isFavorite}>
                {
                  !pastOrders && !isFavorite && showTotal && (
                    <span className='total'>
                      {isSkeleton ? <Skeleton width={50} /> : parsePrice(order?.business?.length > 1 ? order?.total : order?.summary?.total || order?.total)}
                    </span>
                  )
                }
                {!order?.business?.length && !hideFavorite && isFavorite && renderFavorite()}
              </Price>
            )}
            {!order?.business?.length && !hideFavorite && !isFavorite && !isCustomerMode && (
              renderFavorite()
            )}
          </div>
        </Content>
      </Container>
      {isReviewOpen && (
        <DialogOverlay
          open={isReviewOpen}
          onClose={handleCloseReivew}
          title={order
            ? t('REVIEW_YOUR_ORDER', 'Review your order')
            : t('LOADING', 'Loading...')}
        >
          <ReviewWrapper>
            {
              reviewStatus?.order
                ? <ReviewOrder order={order} closeReviewOrder={closeReviewOrder} setIsReviewed={setIsOrderReviewed} />
                : (reviewStatus?.product
                    ? <ReviewProduct order={order} closeReviewProduct={closeReviewProduct} setIsProductReviewed={setIsProductReviewed} />
                    : <ReviewDriver order={order} closeReviewDriver={handleCloseReivew} setIsDriverReviewed={setIsDriverReviewed} />)
            }
          </ReviewWrapper>

        </DialogOverlay>
      )}
      <Confirm
        title={t('ORDER', 'Order')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => handleOriginalReorder()}
        onCancel={() => handleOriginalReorder()}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
    </>
  )
}

export const SingleOrderCard = (props) => {
  const singleOrderCardProps = {
    ...props,
    UIComponent: SingleOrderCardUI
  }
  return <SingleOrderCardController {...singleOrderCardProps} />
}
