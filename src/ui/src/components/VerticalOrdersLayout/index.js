import React, { useEffect, useState } from 'react'
import { useTheme } from 'styled-components'

import {
  WrappButton,
  ReviewWrapper
} from './styles'
import { OrdersContainer } from '../OrdersOption/styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { ReviewOrder } from '~ui/src/components/ReviewOrder'
import { ReviewProduct } from '~ui/src/components/ReviewProduct'
import { ReviewDriver } from '~ui/src/components/ReviewDriver'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { SingleOrderCard } from '~ui/src/components/SingleOrderCard'
import { slotButtonOptions } from '~/utils/themeGroups'

export const VerticalOrdersLayout = (props) => {
  const {
    orders,
    pagination,
    loadMoreOrders,
    isLoadingMore,
    handleUpdateOrderList,
    setRefreshOrders
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState({ order: false, product: false, driver: false })
  const [isOrderReviewed, setIsOrderReviewed] = useState(false)
  const [isProductReviewed, setIsProductReviewed] = useState(false)
  const [isDriverReviewed, setIsDriverReviewed] = useState(false)
  const [orderSelected, setOrderSelected] = useState({})

  const closeReviewOrder = () => {
    if (!isProductReviewed) setReviewStatus({ order: false, product: true, driver: false })
    else if (orderSelected?.driver && !orderSelected?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else handleCloseReivew()
  }

  const closeReviewProduct = () => {
    if (orderSelected?.driver && !orderSelected?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else {
      setIsDriverReviewed(true)
      handleCloseReivew()
    }
  }
  const handleOpenReview = () => {
    if (!orderSelected?.review && !isOrderReviewed) setReviewStatus({ order: true, product: false, driver: false })
    else if (!isProductReviewed) setReviewStatus({ order: false, product: true, driver: false })
    else if (orderSelected?.driver && !orderSelected?.user_review && !isDriverReviewed) setReviewStatus({ order: false, product: false, driver: true })
    else {
      setIsReviewOpen(false)
      return
    }
    setIsReviewOpen(true)
  }

  const handleCloseReivew = () => {
    setReviewStatus({ order: false, product: false, driver: false })
    setIsReviewOpen(false)
    setRefreshOrders(true)
  }

  const handleClickReview = (order) => {
    handleOpenReview && handleOpenReview()
  }

  useEffect(() => {
    if (!orderSelected?.id) return
    handleClickReview()
  }, [orderSelected])

  return (
    <>
      <OrdersContainer data-doc-section='order-history-cards' id='orders-container'>
        {orders.map(order => (
          <SingleOrderCard
            {...props}
            key={order.id || order.id?.[0]}
            order={order}
            setOrderSelected={setOrderSelected}
          />
        ))}
      </OrdersContainer>
      {pagination.totalPages && pagination.currentPage < pagination.totalPages && (
        <WrappButton>
          <Button
            data-doc-control='order-history-load-more'
            /* the orders page's load_more piece (orders_page.slots.load_more) */
            {...slotButtonOptions(theme, 'orders_page', 'load_more', { color: 'primary', appearance: 'outline' })}
            /* a labelled action: the slot's shape never drew an icon here (legacy ignored it) */
            shape='text'
            disabled={isLoadingMore}
            loading={isLoadingMore}
            onClick={loadMoreOrders}
          >
            {t('LOAD_MORE_ORDERS', 'Load more orders')}
          </Button>
        </WrappButton>
      )}
      {isReviewOpen && (
        <DialogOverlay
          open={isReviewOpen}
          onClose={handleCloseReivew}
          title={orderSelected
            ? (reviewStatus?.order
                ? t('REVIEW_ORDER', 'Review order')
                : (reviewStatus?.product
                    ? t('REVIEW_PRODUCT', 'Review Product')
                    : t('REVIEW_DRIVER', 'Review Driver')))
            : t('LOADING', 'Loading...')}
        >
          <ReviewWrapper>
            {
              reviewStatus?.order
                ? <ReviewOrder order={orderSelected} closeReviewOrder={closeReviewOrder} setIsReviewed={setIsOrderReviewed} handleUpdateOrderList={handleUpdateOrderList} />
                : (reviewStatus?.product
                    ? <ReviewProduct order={orderSelected} closeReviewProduct={closeReviewProduct} setIsProductReviewed={setIsProductReviewed} />
                    : <ReviewDriver order={orderSelected} closeReviewDriver={handleCloseReivew} setIsDriverReviewed={setIsDriverReviewed} />)
            }
          </ReviewWrapper>

        </DialogOverlay>
      )}
    </>
  )
}
