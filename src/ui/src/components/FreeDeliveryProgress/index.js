import React from 'react'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { ProgressBar } from '~ui/src/styles/Progress'

import {
  Amounts,
  Content,
  Message,
  ProgressDetails,
  Wrapper
} from './styles'

export const FreeDeliveryProgress = ({
  status = 'hidden',
  minimum,
  currentAmount,
  remainingAmount,
  progressPercent,
  variant = 'full'
}) => {
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()

  // Whether it shows is its callers' (visibility cart.free_delivery_progress
  // in the cart's places, pages.business free_delivery_banner for the store's
  // banner)
  if (status === 'hidden') return null

  if (status === 'awareness') {
    const minimumText = parsePrice(minimum)
    const message = t('FREE_DELIVERY_MINIMUM', 'Free delivery on orders :amount+')
      .replace(':amount', minimumText)

    return (
      <Wrapper data-variant={variant}>
        <Message>{message}</Message>
      </Wrapper>
    )
  }

  if (status === 'unlocked') {
    return (
      <Wrapper data-variant={variant} $unlocked role='status' aria-live='polite'>
        <Message>{t('FREE_DELIVERY_UNLOCKED', 'Free delivery unlocked')}</Message>
      </Wrapper>
    )
  }

  if (status === 'unconfirmed') {
    return (
      <Wrapper data-variant={variant} role='status' aria-live='polite'>
        <Message>{t('FREE_DELIVERY_NOT_APPLIED', 'Free delivery has not been applied to this cart yet')}</Message>
      </Wrapper>
    )
  }

  if (status !== 'progress') return null

  const remainingText = parsePrice(remainingAmount)
  const message = t('ADD_AMOUNT_FOR_FREE_DELIVERY', 'Add :amount for free delivery')
    .replace(':amount', remainingText)

  return (
    <Wrapper data-variant={variant}>
      <Content>
        <ProgressDetails>
          <Message>{message}</Message>
          <Amounts>{parsePrice(currentAmount)} / {parsePrice(minimum)}</Amounts>
        </ProgressDetails>
        {/* components.progress, in its default state */}
        <ProgressBar size='sm' value={progressPercent} aria-label={message} />
      </Content>
    </Wrapper>
  )
}
