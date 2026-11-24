import React, { useEffect } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { GiftCardOrdersList as GiftCardOrdersListController } from '~components/components/GiftCard/GiftCardOrdersList'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { SingleGiftCard } from '../SingleGiftCard'

import {
  ProductsListContainer,
  WrappButton,
  LoadMoreWidth,
  SingleGiftCardWrapper
} from './styles'

import { Button } from '~ui/src/design-system/components/Button'

const VerticalGiftCardOrdersLayoutUI = (props) => {
  const {
    giftCards,
    paginationProps,
    loadMoreOrders,
    title,
    setIsEmpty
  } = props

  const [, t] = useLanguage()

  useEffect(() => {
    if (giftCards.loading) return
    if (giftCards.list?.length === 0) setIsEmpty(true)
  }, [giftCards])

  return (
    <ProductsListContainer>
      {/* the title stays while the next page loads (the scroll stays put) */}
      {giftCards.list?.length > 0
        ? <h2>{title}</h2>
        : giftCards.loading && <Skeleton width={100} height={24} />}
      {giftCards.list.map(card => (
        <SingleGiftCardWrapper key={card.id}>
          <SingleGiftCard
            card={card}
          />
        </SingleGiftCardWrapper>
      ))}
      {giftCards.loading && (
        [...Array(10).keys()].map(i => (
          <SingleGiftCardWrapper key={i}>
            <SingleGiftCard
              isSkeleton
            />
          </SingleGiftCardWrapper>
        ))
      )}
      {paginationProps.totalPages && paginationProps.currentPage < paginationProps.totalPages && (
        <WrappButton>
          <LoadMoreWidth>
            <Button
              appearance='outline'
              fullWidth
              loading={!!giftCards.loading}
              onClick={loadMoreOrders}
            >
              {t('LOAD_MORE_ORDERS', 'Load more orders')}
            </Button>
          </LoadMoreWidth>
        </WrappButton>
      )}
    </ProductsListContainer>
  )
}

export const VerticalGiftCardOrdersLayout = (props) => {
  const giftCardsProps = {
    ...props,
    UIComponent: VerticalGiftCardOrdersLayoutUI
  }
  return <GiftCardOrdersListController {...giftCardsProps} />
}
