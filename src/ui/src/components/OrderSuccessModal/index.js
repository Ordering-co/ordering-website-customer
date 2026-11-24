import React, { useEffect } from 'react'
import { useTheme } from 'styled-components'
import {
  Container,
  Title,
  OrderContent,
  OrderItem
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { getHourMin, getIconCard } from '~ui/utils'
import { FallbackImage } from '~ui/src/styles/FallbackImage'
import { businessLogoPlaceholder } from '~/utils/themeTokens'

import { Icon } from '~ui/src/design-system/components/Icon'

export const OrderSuccessModal = (props) => {
  const {
    cart,
    cardData,
    businessData,
    isCheckOut,
    isOrderDetail
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [OrderState] = useOrder()

  const businessAddress = () => {
    if (isCheckOut && businessData) {
      return businessData?.address
    }

    if (isOrderDetail) {
      return JSON.parse(window.localStorage.getItem('business-address'))
    }

    return JSON.parse(window.localStorage.getItem('user-customer'))
  }

  const parseDeliveryTime = () => {
    let hour = 0
    let min = 0
    if (OrderState?.options?.type === 1 && cart) {
      if (cart?.business?.delivery_time) {
        hour = (cart?.business?.delivery_time).split(':')[0]
        min = (cart?.business?.delivery_time).split(':')[1]
      }
    }

    if (OrderState?.options?.type === 2 && cart) {
      if (cart?.business?.pickup_time) {
        hour = (cart?.business?.pickup_time).split(':')[0]
        min = (cart?.business?.pickup_time).split(':')[1]
      }
    }
    return getHourMin(hour, min)
  }

  const getProducts = () => {
    if (cart && cart?.products.length > 0) {
      return cart?.products.length
    }
    return 1
  }

  useEffect(() => {
    if (businessData?.address) {
      localStorage.setItem('business-address', JSON.stringify(businessData?.address))
    }
  }, [businessData?.address])

  return (
    <Container>
      <Title>
        {isCheckOut
          ? <h2>{t('WE_ARE_CREATING_YOUR_ORDER', 'We are creating your order!')}</h2>
          : <h2>{t('WE_SUCCESSFULLY_CREATED', 'Order successfully created!')}</h2>}
      </Title>
      <OrderContent>
        <OrderItem>
          <span className='item-icon'><Icon name="locationMarker" className='location-icon' /></span>
          <span className='item-text'>{businessAddress()}</span>
        </OrderItem>
        {isCheckOut && cart && OrderState?.options?.type && (OrderState?.options?.type === 1 || OrderState?.options?.type === 2) && (
          <OrderItem>
            <span className='item-icon'><Icon name="clock" className='clock-icon' /></span>
            <span className='item-text'>
              <span>
                {OrderState?.options?.type === 1
                  ? <>{t('DELIVERY_TIME', 'Delivery Time')}</>
                  : <>{t('PICK_UP', 'Pick Time')}</>}
              </span>
              <span>{parseDeliveryTime()}</span>
            </span>
          </OrderItem>
        )}
        {isCheckOut && cardData && cardData?.card && (
          <PaymentOptions card={cardData?.card} />
        )}
        {isCheckOut && (
          <OrderItem>
            {(businessData?.logo || businessLogoPlaceholder(theme)) && (
              <span className='item-icon business-logo'>
                {/* a logo that fails to load: the theme's placeholder */}
                <FallbackImage src={businessData?.logo} fallback={businessLogoPlaceholder(theme)} alt='' />
              </span>
            )}
            <span className='item-text'>
              <span>{businessData?.name}</span>
              <span>{getProducts()} {getProducts() === 1 ? t('PRODUCT', 'Product') : t('PRODUCTS', 'Products')}</span>
            </span>
          </OrderItem>
        )}
      </OrderContent>
    </Container>
  )
}

export const PaymentOptions = (props) => {
  const {
    card
  } = props
  const [, t] = useLanguage()

  return (
    <>
      <OrderItem>
        <span className='item-icon card-icon'>
          {/* the brand's image (it was printed as its URL) */}
          <img
            src={getIconCard(card?.brand)}
            alt={card?.brand || t('CARD', 'Card')}
            width='24'
            height='20'
          />
        </span>
        <span className='item-text'>
          XXXX-XXXX-XXXX-{card?.last4}
        </span>
      </OrderItem>
    </>
  )
}
