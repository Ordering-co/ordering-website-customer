import React from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  CardContainer,
  CardLogo,
  CardInfo
} from './styles'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import { themeImage } from '~/utils/themeTokens'
import { Badge } from '~ui/src/styles/Badge'
import { CardLink } from '~ui/src/styles/Card'

import { Icon } from '~ui/src/design-system/components/Icon'

export const SingleGiftCard = (props) => {
  const {
    card,
    isSkeleton
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [events] = useEvent()
  const { width } = useWindowSize()
  const [{ parsePrice, optimizeImage, parseDate }] = useUtils()

  const giftCardStatusMap = {
    pending: t('PENDING', 'Pending'),
    activated: t('REDEEMED', 'Redeemed'),
    sent: t('SENT', 'Sent')
  }

  const getGiftCardStatus = (status) => {
    return giftCardStatusMap[status] || status
  }

  // the status is a badge of the theme, in the variant of its state
  const giftCardStatusVariant = { pending: 'warning', activated: 'success', sent: 'neutral' }

  // without its own image: the theme's placeholder; requested at twice its
  // displayed size (110px), for dense screens
  const image = !isSkeleton && optimizeImage(card?.order_product?.images || themeImage(theme, 'placeholder.gift_card'), 'h_220,c_limit')

  const handleClickGiftCardOrder = (card) => {
    events.emit('go_to_page', { page: 'order_detail', params: { orderId: card.order_product?.order_id } })
  }

  return (
    <CardContainer className='product-card'>
      {isSkeleton
        ? <Skeleton height={110} width={110} />
        : <CardLogo
            style={image ? { backgroundImage: `url("${image}")` } : undefined}
          />}
      <CardInfo>
        {isSkeleton
          ? <Skeleton height={16} width={100} />
          : (
            /* the card is a box and its title the button that opens its
               order (a stretched link) */
            <h3 className='name' title={card?.order_product?.name}>
              <CardLink as='button' $card='order_card' onClick={() => handleClickGiftCardOrder(card)}>
                {card?.order_product?.name}
              </CardLink>
            </h3>
            )}
        {isSkeleton
          ? <p className='date'><Skeleton width={150} height={14} /></p>
          : <p className='date'>
              {t('ORDER_NUM', 'Order No.')} {card?.order_product?.order_id} {width > 520 && <Icon name="dotSmall" />} {parseDate(card?.created_at)}
            </p>}
        {isSkeleton
          ? <p className='status'><Skeleton width={80} height={14} /></p>
          : (
            <div className='status-container'>
              <span className='price'>{parsePrice(card?.order_product?.price)}</span>
              <Badge className='status' $variant={giftCardStatusVariant[card?.status] || 'neutral'} $size='md'>{getGiftCardStatus(card?.status)}</Badge>
            </div>
            )}
      </CardInfo>
    </CardContainer>
  )
}
