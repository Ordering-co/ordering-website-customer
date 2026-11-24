import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import {
  DeliveryPinContainer,
  DeliveryPinLabel,
  DeliveryPinValue,
  DeliveryPinHelp
} from './styles'

export const DeliveryPin = (props) => {
  const { order, className } = props
  const [, t] = useLanguage()

  if (!order?.delivery_pin || order?.delivery_pin_status !== 'requested') return null

  return (
    <DeliveryPinContainer className={className} data-testid='delivery-pin'>
      <DeliveryPinLabel>{t('DELIVERY_PIN', 'Delivery PIN')}</DeliveryPinLabel>
      <DeliveryPinValue>{String(order.delivery_pin)}</DeliveryPinValue>
      <DeliveryPinHelp>{t('DELIVERY_PIN_HELP', 'Give this code to the driver when you receive your order')}</DeliveryPinHelp>
    </DeliveryPinContainer>
  )
}
