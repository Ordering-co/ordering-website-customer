import React, { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { loadStripe } from '@stripe/stripe-js/pure'
import { Elements } from '@stripe/react-stripe-js'

import { ErrorMessage } from './styles'

import { StripeElementsForm as StripeElementsFormController } from '~components/components/StripeElementsForm'
import { useLanguage } from '~components/contexts/LanguageContext'
import { CardForm } from '~ui/src/components/CardForm'
import { StripeMethodForm } from '~ui/src/components/StripeMethodForm'
import { themeFonts } from '~/utils/appTheme'

/**
 * The fonts the card fields use inside Stripe's iframes (the
 * body font of the theme, as the page loads it). Undefined otherwise.
 */
export const stripeElementsOptions = (theme) => {
  const href = theme?.css && themeFonts(theme).body?.href
  if (typeof href !== 'string' || !href.startsWith('https://')) return undefined
  return { fonts: [{ cssSrc: href }] }
}

const StripeElementsFormUI = (props) => {
  const {
    publicKey,
    handleSource,
    businessId,
    requirements,
    onNewCard,
    toSave,
    onCancel,
    paymethod,
    cart,
    handlePlaceOrder,
    methodsPay,
    cartGroup
  } = props
  const [, t] = useLanguage()
  const theme = useTheme()
  const elementsOptions = useMemo(() => stripeElementsOptions(theme), [theme])
  return (
    <>
      {publicKey
        ? (
        <Elements stripe={loadStripe(publicKey)} options={elementsOptions}>
          {methodsPay?.includes(paymethod)
            ? (
            <StripeMethodForm
              cart={cart}
              cartGroup={cartGroup}
              handleSource={handleSource}
              onNewCard={onNewCard}
              toSave={toSave}
              requirements={requirements}
              businessId={businessId}
              handleCancel={onCancel}
              paymethod={paymethod}
              handlePlaceOrder={handlePlaceOrder}
            />
              )
            : (
            <CardForm
              handleSource={handleSource}
              onNewCard={onNewCard}
              toSave={toSave}
              isSplitForm
              requirements={requirements}
              businessId={businessId}
              cardsGateway={props.cardsGateway}
              handleCancel={onCancel}
              businessIds={props.businessIds}
            />
              )}
        </Elements>
          )
        : (
        <ErrorMessage>{t('SOMETHING_WRONG', 'Something is wrong!')}</ErrorMessage>
          )}
    </>
  )
}

export const StripeElementsForm = (props) => {
  const stripeElementsFormProps = {
    ...props,
    UIComponent: StripeElementsFormUI
  }
  return <StripeElementsFormController {...stripeElementsFormProps} />
}
