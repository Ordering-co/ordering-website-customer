import React, { useCallback, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Container, ActionSlot, PaymentSquareContainer, Notice } from './styles'

import { PaymentOptionSquare as PaymentOptionSquareController } from '~components/components/PaymentOptionSquare'
import { useLanguage } from '~components/contexts/LanguageContext'
import { OrderContext, useOrder } from '~components/contexts/OrderContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~ui/src/design-system/components/Tabs'
import { Alert } from '~ui/src/components/Confirm'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { Button } from '~ui/src/design-system/components/Button'

const PaymentOptionSquareUI = (props) => {
  const {
    paymentMethods,
    methodSelected,
    handleChangeMethodSelected,
    isLoading,
    isLoadingMethod,
    alertState,
    setAlertState,
    isLoadingPlace,
    pendingConfirm,
    retryConfirm,
    reconcileNotice
  } = props

  const [, t] = useLanguage()
  // Square binds its click on these buttons by id, outside React: only a natively disabled button
  // answers no click, also from Enter or Space (`pointer-events` does not stop the keyboard)
  const blocked = isLoadingMethod || isLoadingPlace
  // implementation notesthe bank payment went through and only its confirmation failed: it is asked again, not paid again
  const bankBlocked = blocked || pendingConfirm

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  return (
    <PaymentSquareContainer>
      {isLoading && (
        [...Array(3).keys()].map(i => (
          <div key={i}>
            <Skeleton height={50} />
          </div>
        ))
      )}
      {!isLoading && (
        <Tabs
          value={methodSelected || null}
          onValueChange={handleChangeMethodSelected}
          style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <TabsList activateOnFocus={false} aria-label={t('PAYMENT_METHODS', 'Payment methods')}>
            {paymentMethods.map(method => (
              <TabsTrigger key={method.value} value={method.value}>
                {method.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {isLoadingMethod && methodSelected && (
            [...Array(3).keys()].map(i => (
              <div key={i}>
                <Skeleton height={50} />
              </div>
            ))
          )}
          <TabsContent value={methodSelected}>
            <Container>
              {methodSelected === 'card_payments' && (
                <>
                  <div id='card-container' />
                  <ActionSlot $isLoading={blocked}>
                    <Button color='primary' size='md' fullWidth id='card-button' type='button' disabled={blocked}>{t('ACCEPT', 'Accept')}</Button>
                  </ActionSlot>
                </>
              )}
              {methodSelected === 'ach_bank_transfer' && (
                <ActionSlot $isLoading={blocked}>
                  <Button color='primary' size='md' fullWidth id='ach-button' type='button' disabled={bankBlocked}>{t('PAY_WITH_BANK_ACCOUNT', 'Pay with Bank Account')}</Button>
                </ActionSlot>
              )}
              {methodSelected === 'ach_bank_transfer' && pendingConfirm && (
                <>
                  <Notice role='status'>{t('CHECKOUT_CONFIRMING_PAYMENT', "We're still confirming your payment. Check again in a moment: your order opens once it's placed.")}</Notice>
                  <ActionSlot $isLoading={blocked}>
                    <Button color='primary' size='md' fullWidth type='button' disabled={blocked} onClick={retryConfirm}>{t('CHECKOUT_TRY_AGAIN', 'Try again')}</Button>
                  </ActionSlot>
                </>
              )}
              {reconcileNotice && reconcileNotice !== 'opened' && (
                <Notice role='status'>
                  {reconcileNotice === 'pending'
                    ? t('CHECKOUT_CONFIRMING_PAYMENT', "We're still confirming your payment. Check again in a moment: your order opens once it's placed.")
                    : t('CHECKOUT_ORDER_NOT_CONFIRMED', "We couldn't confirm your order. Your cart and details are saved.")}
                </Notice>
              )}
              {methodSelected === 'gift_cards' && (
                <form>
                  <div id='gift-card-container' />
                  <ActionSlot $isLoading={blocked}>
                    <Button color='primary' size='md' fullWidth id='gift-card-button' type='button' disabled={blocked}>{t('PAY_WITH_GIFT_CARD', 'Pay with Gift Card')}</Button>
                  </ActionSlot>
                </form>
              )}
              {/* in the flow under the actions (their button is disabled meanwhile), so it never covers the pay button */}
              {isLoadingPlace && <SpinnerLoader size='md' />}
            </Container>
          </TabsContent>
        </Tabs>
      )}
      <Alert
        title={t('SQUARE_ERROR', 'Square Error')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </PaymentSquareContainer>
  )
}

// implementation notes`reconcileOrder` (Checkout's) reads the cart by its UUID before an attempt that follows another: after a 5xx
// the order may exist. It answers 'safe' when the cart is still open; any other answer stops the attempt and is shown.
// `onPlaceSent` (Checkout's) is told each time the controller sends the cart: a token that failed sends nothing, so
// it is not an attempt that needs reading. The controller takes `placeCart` from the order context, so the
// notice goes in a copy of it for the controller alone.
export const PaymentOptionSquare = ({ reconcileOrder, onPlaceSent, ...props }) => {
  const latest = useRef(reconcileOrder)
  latest.current = reconcileOrder
  const sent = useRef(onPlaceSent)
  sent.current = onPlaceSent
  const [orderState, orderActions] = useOrder()
  const [reconcileNotice, setReconcileNotice] = useState(null)
  // one function for the controller's lifetime: it binds its handlers to the buttons once
  const beforePlace = useCallback(async () => {
    if (!latest.current) return true
    let outcome
    try {
      outcome = await latest.current()
    } catch {
      outcome = 'unconfirmed'
    }
    setReconcileNotice(outcome === 'safe' ? null : outcome)
    return outcome === 'safe'
  }, [])
  const placeCart = (...args) => {
    sent.current?.()
    return orderActions.placeCart(...args)
  }
  const paymentPaypalProps = {
    ...props,
    singleFlight: true,
    beforePlace,
    reconcileNotice,
    UIComponent: PaymentOptionSquareUI
  }
  return (
    <OrderContext.Provider value={[orderState, { ...orderActions, placeCart }]}>
      <PaymentOptionSquareController {...paymentPaypalProps} />
    </OrderContext.Provider>
  )
}
