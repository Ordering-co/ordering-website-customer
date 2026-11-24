import React, { useEffect, useRef } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { WrapperLeftContainer, WrapperRightContainer, Container } from '../MultiCheckout/styles'
import { LoadingStatus, SkeletonColumn, SkeletonGroup } from './styles'
import { MultiCartCreate } from '~components/components/MultiCartCreate'
import { getEligibleCartUuids } from '~components/components/MultiCartCreate/getEligibleCartUuids'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Button } from '~ui/src/design-system/components/Button'

/**
 * Whether the order has a cart the multi cart can be made of: the ones the
 * controller (MultiCartCreate) sends, valid, not pending and of a business.
 */
export const hasMultiCartCarts = (carts) =>
  getEligibleCartUuids(carts).length > 0

const MultiCartUI = (props) => {
  const { groupCreationFailed, onRedirectPage, onRetryRefresh, retryingRefresh, retryRefreshFailed } = props
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const goToBusinesses = () => onRedirectPage?.({ page: 'search' })
  const recoveryHeading = useRef(null)
  const showRecovery = Boolean(groupCreationFailed || onRetryRefresh)

  useEffect(() => {
    if (showRecovery) recoveryHeading.current?.focus()
  }, [showRecovery])

  if (onRetryRefresh) {
    return (
      <NotFoundSource
        headingLevel='h1'
        headingRef={recoveryHeading}
        content={t('CART_REFRESH_RESPONSE_ERROR', 'We couldn’t refresh your carts. Check your cart before placing your order.')}
        statusMessage={retryRefreshFailed ? t('CART_REFRESH_RETRY_ERROR', 'We still couldn’t refresh your carts.') : ''}
      >
        <Button appearance='outline' size='md' loading={retryingRefresh} onClick={onRetryRefresh}>
          {t('CHECKOUT_TRY_AGAIN', 'Try again')}
        </Button>
      </NotFoundSource>
    )
  }

  if (groupCreationFailed) {
    return (
      <NotFoundSource
        headingLevel='h1'
        headingRef={recoveryHeading}
        content={t('MULTI_CART_CREATE_ERROR', 'We couldn’t prepare your carts for checkout.')}
        btnTitle={t('SEARCH_REDIRECT', 'Go to Businesses')}
        onClickButton={goToBusinesses}
      />
    )
  }

  // nothing to prepare: the empty state of the multi checkout
  if (!orderState?.loading && !hasMultiCartCarts(orderState?.carts)) {
    return (
      <NotFoundSource
        headingLevel='h1'
        variant='empty'
        icon='bag'
        content={t('NO_CARTS_YET', "You don't have any carts yet")}
        subtitle={t('NO_CARTS_YET_DESC', 'Add items from a business to start an order.')}
        btnTitle={t('SEARCH_REDIRECT', 'Go to Businesses')}
        onClickButton={goToBusinesses}
      />
    )
  }

  // the shape of the multi checkout it leads to, while its carts are grouped
  return (
    <Container data-doc-section='multi-cart-preparation' data-doc-state='loading' aria-busy='true'>
      <LoadingStatus role='status'>{t('LOADING', 'Loading')}</LoadingStatus>
      <WrapperLeftContainer data-doc-section='multi-cart-preparation-primary'>
        {/* skeleton heights: the rough shape of the page */}
        <SkeletonColumn>
          <SkeletonGroup>
            <Skeleton height={30} />
            <Skeleton height={100} />
          </SkeletonGroup>
          <SkeletonGroup>
            <Skeleton height={25} />
            <Skeleton height={50} />
          </SkeletonGroup>
          <SkeletonGroup>
            <Skeleton height={25} />
            <Skeleton height={50} />
          </SkeletonGroup>
          <SkeletonGroup>
            <Skeleton height={25} />
            <Skeleton height={25} />
          </SkeletonGroup>
        </SkeletonColumn>
      </WrapperLeftContainer>
      <WrapperRightContainer data-doc-section='multi-cart-preparation-summary'>
        <SkeletonColumn>
          <SkeletonGroup>
            <Skeleton height={25} />
            <Skeleton height={50} />
          </SkeletonGroup>
          <SkeletonGroup>
            <Skeleton height={25} />
            <Skeleton height={60} />
            <Skeleton height={80} />
          </SkeletonGroup>
          <SkeletonGroup>
            <Skeleton height={25} />
          </SkeletonGroup>
        </SkeletonColumn>
      </WrapperRightContainer>
    </Container>
  )
}

export const MultiCart = (props) => {
  const mulcartProps = {
    ...props,
    recoverMalformedRefresh: true,
    UIComponent: MultiCartUI
  }
  return <MultiCartCreate {...mulcartProps} />
}
