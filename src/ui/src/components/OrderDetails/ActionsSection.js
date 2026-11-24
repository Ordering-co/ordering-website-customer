import React from 'react'
import { ActionsBlock, OrderActionCell } from './styles'

import { Icon } from '~ui/src/design-system/components/Icon'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'

export const ActionsSection = (props) => {
  const {
    actionType,
    order,
    handleBusinessRedirect,
    businessData,
    unreadAlert,
    setOpenMessages,
    readMessages,
    setUnreadAlert,
    showPhone,
    showMessages
  } = props

  const [, t] = useLanguage()

  const phoneEntity = order?.[actionType] || (actionType === 'driver' ? order?.external_driver : null)
  const phoneNumber = phoneEntity?.phone || phoneEntity?.cellphone
  const showPhoneButton = !!(showPhone && phoneEntity && phoneNumber)

  const handleOpenMessages = (data) => {
    setOpenMessages(data)
    readMessages()
    if (order?.unread_count > 0) {
      data.business
        ? setUnreadAlert({ ...unreadAlert, business: false })
        : setUnreadAlert({ ...unreadAlert, driver: false })
    }
    window.scrollTo(0, 0)
  }

  const openStore = () => handleBusinessRedirect(businessData?.slug)
  const openMessages = () => handleOpenMessages({ driver: actionType === 'driver', business: actionType === 'business' })
  const callPhone = () => window.open(`tel:${phoneNumber}`)

  // The icon-only actions (store, messages, phone) are icon buttons of the
  // theme (neutral outline, md), labelled for assistive tech
  const actionProps = { type: 'button', shape: 'icon', color: 'neutral', appearance: 'outline', size: 'md' }
  return (
    <ActionsBlock actionType={actionType}>
      {actionType === 'business' && (
        <OrderActionCell>
          <Button
            {...actionProps}
            aria-label={t('GO_TO_STORE', 'Go to store')}
            onClick={openStore}
          >
            <Icon name='store' aria-hidden='true' />
          </Button>
        </OrderActionCell>
      )}
      {showMessages && (
        <OrderActionCell>
          <Button
            {...actionProps}
            data-doc-control={`order-message-${actionType}`}
            aria-label={t('MESSAGES', 'Messages')}
            onClick={openMessages}
          >
            <Icon name='message' aria-hidden='true' />
          </Button>
        </OrderActionCell>
      )}
      {showPhoneButton && (
        <OrderActionCell>
          <Button
            {...actionProps}
            aria-label={actionType === 'driver' ? t('CALL_DRIVER', 'Call driver') : t('PHONE', 'Phone')}
            onClick={callPhone}
          >
            <Icon name='phone' aria-hidden='true' />
          </Button>
        </OrderActionCell>
      )}
    </ActionsBlock>
  )
}
