import React, { useState } from 'react'
import { Container } from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { VerticalGiftCardOrdersLayout } from '../VerticalGiftCardOrdersLayout'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

export const GiftCardOrdersList = (props) => {
  const [, t] = useLanguage()
  const [isEmptyPending, setIsEmptyPending] = useState(false)
  const [isEmptySent, setIsEmptySent] = useState(false)
  const [isEmptyRedeemed, setIsEmptyRedeemed] = useState(false)

  return (
    <Container>
      <VerticalGiftCardOrdersLayout
        title={t('PENDING', 'Pending')}
        defaultStatus='pending'
        setIsEmpty={setIsEmptyPending}
        scrollId='pendingGifts'
      />

      <VerticalGiftCardOrdersLayout
        title={t('SENT', 'Sent')}
        defaultStatus='sent'
        setIsEmpty={setIsEmptySent}
        scrollId='sentGifts'
      />

      <VerticalGiftCardOrdersLayout
        title={t('REDEEMED', 'Redeemed')}
        defaultStatus='activated'
        setIsEmpty={setIsEmptyRedeemed}
        scrollId='redeemedgGifts'
      />

      {isEmptyPending && isEmptySent && isEmptyRedeemed && (
        /* the empty state of the page (a section of its h1), as the
           orders tab's */
        <NotFoundSource
          variant='empty'
          headingLevel='h2'
          icon='receipt'
          content={t('YOU_DONT_HAVE_CARDS', 'You don\'t have cards')}
        />
      )}
    </Container>
  )
}
