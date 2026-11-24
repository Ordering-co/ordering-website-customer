import React, { useId } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  GiftCardsWrapper,
  GiftCardItem,
  AmountBadge
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { PurchaseGiftCard as PurchaseGiftCardController } from '~components/components/GiftCard/PurchaseGiftCard'
import { Button } from '~ui/src/design-system/components/Button'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

import { Icon } from '~ui/src/design-system/components/Icon'

const PurchaseGiftCardUI = (props) => {
  const {
    productsListState,
    handleAccept
  } = props

  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  // each Purchase button is named with its amount ("Purchase $25")
  const idBase = useId()

  return (
    <Container>
      <h2>{t('SELECT_GIFT_CARD', 'Select your gift card')}</h2>
      <GiftCardsWrapper>
        {productsListState.loading && (
          [...Array(4).keys()].map(i => (
            <GiftCardItem key={i}>
              <div className='left-content'>
                <Skeleton width={56} height={24} />
                <Skeleton width={120} height={16} />
              </div>
              <Skeleton width={90} height={36} />
            </GiftCardItem>
          ))
        )}
        {productsListState.products.map(product => {
          const buttonId = `${idBase}-${product.id}-purchase`
          const amountId = `${idBase}-${product.id}-amount`
          return (
            <GiftCardItem key={product.id}>
              <div className='left-content'>
                <AmountBadge $variant='primary' $size='md'>
                  <Icon name="gift" />
                  <span id={amountId}>{parsePrice(product?.price)}</span>
                </AmountBadge>
                <p className='name' title={product?.name}>{product?.name}</p>
              </div>
              <Button
                type='button'
                id={buttonId}
                aria-labelledby={`${buttonId} ${amountId}`}
                onClick={() => handleAccept(product)}
              >
                {t('PURCHASE', 'Purchase')}
              </Button>
            </GiftCardItem>
          )
        })}
        {!productsListState.loading && productsListState.products.length === 0 && (
          <NotFoundSource
            variant='empty'
            headingLevel='h3'
            icon='ticket'
            content={t('NO_GIFT_CARDS_AVAILABLE', 'No gift cards available right now')}
            subtitle={t('NO_GIFT_CARDS_AVAILABLE_DESC', 'Check back later for new options.')}
          />
        )}
      </GiftCardsWrapper>
    </Container>
  )
}

export const PurchaseGiftCard = (props) => {
  const purchaseGiftCardProps = {
    ...props,
    UIComponent: PurchaseGiftCardUI
  }
  return <PurchaseGiftCardController {...purchaseGiftCardProps} />
}
