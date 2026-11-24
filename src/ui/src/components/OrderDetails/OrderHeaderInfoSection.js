import React from 'react'
import { HeaderInfo } from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'

export const OrderHeaderInfoSection = (props) => {
  const {
    isService
  } = props

  const [, t] = useLanguage()

  return (
    <HeaderInfo>
      <h1>{isService ? t('SERVICES', 'Services') : t('ORDER_MESSAGE_RECEIVED', 'Your order has been received')}</h1>
      <p>{!isService && t('ORDER_MESSAGE_HEADER_TEXT', 'Once business accepts your order, we will send you an email, thank you!')}</p>
    </HeaderInfo>
  )
}
