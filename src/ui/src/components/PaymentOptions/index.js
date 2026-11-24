import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  PaymentMethodsContainer,
  PaymentMethodsList,
  PaymentMethodsStatus,
  PayCardSelected,
  Container,
  PayChoiceLogo,
  RedirectDetails
} from './styles'

import { PaymentOptions as PaymentOptionsController } from '~components/components/PaymentOptions'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Alert } from '~ui/src/components/Confirm'
import { CardBrand } from '~ui/src/components/CardBrand'
import { PaymentOptionCash } from '~ui/src/components/PaymentOptionCash'
import { PaymentOptionStripe } from '~ui/src/components/PaymentOptionStripe'
import {
  CardItemContent as StripeCardItemContent,
  CardsHeader as StripeCardsHeader,
  CardsChangeLink as StripeCardsChangeLink,
  CardChoiceRow as StripeCardChoiceRow
} from '~ui/src/components/PaymentOptionStripe/styles'
import { PaymentOptionCard } from '~ui/src/components/PaymentOptionCard'
import { StripeElementsForm } from '~ui/src/components/StripeElementsForm'
import { StripeRedirectForm } from '~ui/src/components/StripeRedirectForm'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Button } from '~ui/src/design-system/components/Button'
import { PaymentOptionPaypal } from '~ui/src/components/PaymentOptionPaypal'
import { PaymentOptionSquare } from '~ui/src/components/PaymentOptionSquare'
import { PaymentOptionEpayco } from '~ui/src/components/PaymentOptionEpayco'

import { Choice, ChoiceIndicator } from '~ui/src/design-system/components/Choice'
import { themeControlHeight } from '~/utils/themeTokens'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeVisible } from '~/utils/themeVisibility'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'

const stripeOptions = ['stripe_direct', 'stripe', 'stripe_connect']
const stripeCardsMethods = ['stripe', 'stripe_connect_v2']
const stripeRedirectOptions = [
  { name: 'Bancontact', value: 'bancontact' },
  { name: 'Alipay', value: 'alipay' },
  { name: 'Giropay', value: 'giropay' },
  { name: 'iDEAL', value: 'ideal' }
]

const cardsPaymethods = ['credomatic']

const paypalBtnStyle = {
  color: 'gold',
  shape: 'pill',
  label: 'paypal',
  size: 'responsive'
}

const PaymentOptionsUI = (props) => {
  const {
    cart,
    errorCash,
    isLoading,
    isDisabled,
    useKioskApp,
    paymethodData,
    paymethodsList,
    retryPaymethods,
    businessDetailsError,
    retryBusinessDetails,
    paymentDisclosureRef,
    setPaymethodData,
    handleOrderRedirect,
    handlePaymethodClick,
    handlePaymethodDataChange,
    handleOpenGuestSignup,
    signupPaymethodId,
    onSignupPaymethodResumed,
    isCustomerMode,
    isOpenMethod,
    onPaymentChange,
    setCreateOrder,
    onPlaceOrderClick,
    handlePlaceOrder,
    paymethods,
    setCardList,
    requiredFields,
    openUserModal,
    paymethodClicked,
    setPaymethodClicked,
    validateDriverTipField,
    paymethodV2Featured,
    setOpenModal,
    createBusinessUserPaymethod
  } = props
  const [, t] = useLanguage()
  const [{ token, user }] = useSession()
  const theme = useTheme()
  // the logo before each method's name (visibility.checkout.payment_methods.logo)
  const showPaymethodLogo = themeVisible(theme, 'checkout.payment_methods.logo')
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [retrying, setRetrying] = useState(false)
  const [hasRetried, setHasRetried] = useState(false)
  const retryButtonRef = useRef(null)
  const methodsListRef = useRef(null)
  const restoreRetryFocus = useRef(false)
  const paymethodSelected = props.paySelected || props.paymethodSelected

  // implementation notesa card method clicked in the list is not "selected" for the
  // order until a card is chosen (the controller keeps `paymethodSelected`
  // null meanwhile); the screen needs to know which one is being set up
  useEffect(() => {
    props.onOpenMethodChange?.(isOpenMethod?.paymethod ?? null)
  }, [isOpenMethod?.paymethod?.id])

  const braintreeIcons = {
    paypal_braintree: <img src={BUNDLED_IMAGES.general.paypal} alt='PayPal' data-gateway='paypal_braintree' />,
    google_pay_braintree: <img src={BUNDLED_IMAGES.general.googlePay} alt='Google Pay' />,
    apple_pay_braintree: <img src={BUNDLED_IMAGES.general.applePay} alt='Apple Pay' />
  }

  const iconsById = {
    1: <Icon name="cash" />,
    2: <Icon name="creditCard" />,
    3: <Icon name="paypal" />,
    22: <Icon name="creditCard" />,
    28: <Icon name="stripeCard" />,
    31: <Icon name="stripeS" />,
    32: <Icon name="stripe" />
  }

  const getPayIcon = (paymethod) => {
    return braintreeIcons[paymethod?.gateway] ?? iconsById[paymethod?.id] ?? <Icon name="creditCard" />
  }

  const methodsPay = ['google_pay', 'apple_pay']

  const stripeDirectMethods = ['stripe_direct', ...methodsPay]

  const includeKioskPaymethods = ['cash', 'card_delivery']

  const multiCheckoutMethods = ['global_google_pay', 'global_apple_pay']

  const applePayMethods = ['apple_pay', 'global_apple_pay']

  let isApplePaySupported = false
  try {
    isApplePaySupported = typeof window !== 'undefined' &&
      !!window.ApplePaySession &&
      typeof window.ApplePaySession.canMakePayments === 'function' &&
      window.ApplePaySession.canMakePayments()
  } catch {
    isApplePaySupported = false
  }

  const list = (paymethodsList ? paymethodsList.paymethods : paymethods?.map(pay => pay.paymethod)) ?? []
  const loadingMethods = isLoading || (!businessDetailsError && paymethodsList?.loading)
  const methodsError = businessDetailsError || paymethodsList?.error

  const popupMethods = ['stripe', 'stripe_direct', 'stripe_connect', 'stripe_connect_v2', 'stripe_redirect', 'paypal', 'square', 'google_pay', 'apple_pay']

  const modalMethods = popupMethods.filter(gateway => !stripeCardsMethods.includes(gateway))

  const guestNotSupportedMethods = ['stripe', 'stripe_connect', 'stripe_connect_v2', 'stripe_redirect']

  const supportedMethods = list
    .filter(p => !multiCheckoutMethods.includes(p.gateway))
    .filter(p => isApplePaySupported || !applePayMethods.includes(p.gateway))
    .filter(p => useKioskApp ? includeKioskPaymethods.includes(p.gateway) : p)

  const canShowMethods = !loadingMethods && !methodsError
  const retryingMethods = retrying && loadingMethods
  const showRecovery = retryingMethods || (!loadingMethods && methodsError)
  const retryMethods = businessDetailsError ? retryBusinessDetails : retryPaymethods
  const methodsUnavailable = t('NO_PAYMENT_METHODS', 'No payment methods!')
  const methodsErrorLabel = t('ERROR_UNKNOWN', 'An error has occurred')
  const methodsLabel = t('PAYMENT_METHODS', 'Payment Methods')

  let retryStatus = ''
  if (hasRetried) {
    if (loadingMethods) retryStatus = t('LOADING', 'Loading')
    else if (methodsError) retryStatus = methodsErrorLabel
    else retryStatus = supportedMethods.length ? methodsLabel : methodsUnavailable
  }

  const handleRetryMethods = async () => {
    setRetrying(true)
    setHasRetried(true)
    try {
      await retryMethods()
    } finally {
      restoreRetryFocus.current = document.activeElement === retryButtonRef.current
      setRetrying(false)
    }
  }

  useLayoutEffect(() => {
    if (retrying || !restoreRetryFocus.current) return
    restoreRetryFocus.current = false
    if (methodsError) return
    const selected = methodsListRef.current?.querySelector('[data-doc-control="payment-method"][aria-pressed="true"]:not(:disabled)')
    const focusTarget = selected ?? paymentDisclosureRef?.current
    focusTarget?.focus()
  }, [retrying, methodsError, paymentDisclosureRef])

  const paymethodsFieldRequired = ['paypal', 'apple_pay', 'global_apple_pay', 'google_pay']

  const stripeCardsPaymethod = [isOpenMethod?.paymethod, paymethodSelected]
    .find(paymethod => stripeCardsMethods.includes(paymethod?.gateway))
  const stripeCardsGateway = stripeCardsPaymethod?.gateway
  const stripeCardsPublicKey = (stripeCardsPaymethod?.paymethod ?? stripeCardsPaymethod)?.credentials?.publishable

  const handlePaymentMethodClick = (paymethod) => {
    if (paymethodsFieldRequired.includes(paymethod?.gateway) &&
      validateDriverTipField
    ) {
      setAlertState({
        open: true,
        content: [t('DRIVER_TIPS_REQUIRED', 'Driver tips is required, please select a driver tip before selecting this payment method')]
      })
      return
    }
    if (paymethodsFieldRequired.includes(paymethod?.gateway) && requiredFields.length > 0) {
      openUserModal && openUserModal(true)
      setPaymethodClicked({
        confirmed: false,
        paymethod
      })
      return
    }

    if (handleOpenGuestSignup && guestNotSupportedMethods.includes(paymethod?.gateway) && user?.guest_id) {
      handleOpenGuestSignup(paymethod.id)
      return
    }

    if (cart?.balance > 0 || user?.guest_id) {
      const isPopupMethod = popupMethods.includes(paymethod?.gateway)
      handlePaymethodClick(paymethod, isPopupMethod)
      return true
    }

    setAlertState({
      open: true,
      content: [t('CART_BALANCE_ZERO', 'Sorry, the amount to pay is equal to zero and it is not necessary to select a payment method')]
    })
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const getNamePaymethod = (paymethod) => {
    return t(paymethod.gateway.toUpperCase(), paymethod.name)
  }

  const isPaymethodActive = (paymethod) => (paymethodSelected?.id || isOpenMethod?.paymethod?.id) === paymethod.id

  // Where the screen controls whether the list is open (the checkout: `listOpen` / `onListOpenChange`): once a method is chosen
  // the list folds to it (and to what it needs below: the cash amount, the
  // cards). The
  // method shown is the one being set up (a popup method's cards) before the
  // one already saved.
  const canFold = typeof props.listOpen === 'boolean'
  const shownMethodId = canFold ? (isOpenMethod?.paymethod?.id || paymethodSelected?.id) : null
  const isMethodShown = (paymethod) => canFold ? shownMethodId === paymethod.id : isPaymethodActive(paymethod)
  const listFolded = canFold && !props.listOpen && !!supportedMethods?.some(isMethodShown)
  const setListOpen = (open) => props.onListOpenChange && props.onListOpenChange(open)

  const handleChoiceClick = (paymethod) => {
    if (!canFold) {
      handlePaymentMethodClick(paymethod)
      return
    }
    if (isMethodShown(paymethod) && !modalMethods.includes(paymethod?.gateway)) {
      setListOpen(listFolded)
      return
    }
    if (handlePaymentMethodClick(paymethod)) setListOpen(false)
  }

  const getPaymethodLogo = (paymethod) => paymethod.image
    ? (
      <img
        src={paymethod.image}
        alt={getNamePaymethod(paymethod)}
        loading='lazy'
      />
      )
    : getPayIcon(paymethod)

  // implementation notes round 2: a ref, not state — guarantees the preselect (either
  // branch below) fires at most once per mount. `supportedMethods` is a new
  // array every render, so without this guard several renders could each
  // see `paymethodSelected` still null (it hasn't caught up yet) and each
  // call handlePaymethodClick again.
  const preselectedOnMount = useRef(false)

  useEffect(() => {
    if (preselectedOnMount.current || signupPaymethodId) return
    if (supportedMethods?.length === 1 && !paymethodSelected && !popupMethods.includes(supportedMethods[0]?.gateway)) {
      preselectedOnMount.current = true
      handlePaymethodClick && handlePaymethodClick(supportedMethods[0])
      return
    }
    // implementation notes (B): in the checkout, with several methods and none chosen
    // yet (and the controller did not preselect cart.paymethod_id), take the
    // first non-popup one so the payment step is ready without a click; never
    // in customer mode, kiosk, or outside the checkout's folding (canFold).
    if (
      canFold &&
      supportedMethods?.length > 1 &&
      !paymethodSelected &&
      !cart?.paymethod_id &&
      !isCustomerMode &&
      !useKioskApp
    ) {
      const firstNonPopup = [...supportedMethods].sort((a, b) => a.id - b.id).find((p) => !popupMethods.includes(p?.gateway))
      if (firstNonPopup) {
        preselectedOnMount.current = true
        handlePaymethodClick && handlePaymethodClick(firstNonPopup)
      }
    }
  }, [supportedMethods])

  useEffect(() => {
    if (paymethodSelected?.gateway !== 'cash' && errorCash) {
      props.setErrorCash(false)
    }
  }, [paymethodSelected])

  useEffect(() => {
    if (props.paySelected && props.paySelected?.data) {
      setPaymethodData(props.paySelected?.data)
      const isRequiredModal = ['paypal']
      if (isRequiredModal.includes(paymethodSelected?.gateway)) {
        handlePaymentMethodClick(null)
      }
    }
  }, [props.paySelected])

  useEffect(() => {
    if (!signupPaymethodId || !user || user.guest_id || !canShowMethods) return
    const method = supportedMethods.find(paymethod => paymethod.id === signupPaymethodId)
    onSignupPaymethodResumed()
    if (method && handlePaymentMethodClick(method)) setListOpen(false)
    else if (!method) handlePaymethodClick(null)
  }, [signupPaymethodId, user, canShowMethods, supportedMethods])

  useEffect(() => {
    if (methodsPay.includes(paymethodSelected?.gateway) && paymethodData?.id && paymethodSelected?.data?.card) {
      handlePlaceOrder?.()
    }
  }, [JSON.stringify(paymethodData), paymethodSelected])

  useEffect(() => {
    if (paymethodClicked?.confirmed && !isDisabled && !requiredFields?.length) {
      setPaymethodClicked(null)
      if (handlePaymentMethodClick(paymethodClicked.paymethod)) setListOpen(false)
    }
  }, [paymethodClicked, isDisabled, requiredFields])

  return (
    <PaymentMethodsContainer data-doc-section='payment-method-options'>
      <PaymentMethodsList
        ref={methodsListRef}
        className='payments-list'
        data-doc-section='payment-method-list'
        role={canShowMethods && supportedMethods.length ? 'group' : undefined}
        aria-label={canShowMethods && supportedMethods.length ? methodsLabel : undefined}
      >
        {canShowMethods &&
          supportedMethods.length > 0 && (
          supportedMethods.sort((a, b) => a.id - b.id).filter(paymethod => !listFolded || isMethodShown(paymethod)).map(paymethod => (
              <React.Fragment key={paymethod.id}>
                {
                  (((!isCustomerMode || isCustomerMode) && paymethod.gateway) || (isCustomerMode && (paymethod.gateway === 'card_delivery' || paymethod.gateway === 'cash'))) && (
                    /* an option of a choice list (components.choice) that is an action: pressing the current one folds or opens the list */
                    <Choice
                      variant='action'
                      data-doc-control='payment-method'
                      data-doc-payment-gateway={paymethod.gateway}
                      className={isMethodShown(paymethod) ? 'active' : ''}
                      selected={isMethodShown(paymethod)}
                      disabled={isDisabled}
                      onClick={() => handleChoiceClick(paymethod)}
                      icon={showPaymethodLogo ? <PayChoiceLogo>{getPaymethodLogo(paymethod)}</PayChoiceLogo> : undefined}
                      title={getNamePaymethod(paymethod)}
                    />
                  )
                }
              </React.Fragment>
          )
          )
        )}

        {loadingMethods && !showRecovery && (
          [...Array(5).keys()].map(i => <Skeleton key={i} height={themeControlHeight(theme, 'choice')} />)
        )}

        {canShowMethods && supportedMethods.length === 0 && (
          <p>{methodsUnavailable}</p>
        )}
      </PaymentMethodsList>

      {showRecovery && (
        <NotFoundSource compact icon='creditCardFront' content={methodsErrorLabel}>
          {(retryMethods || retryingMethods) && (
            <Button ref={retryButtonRef} appearance='outline' size='md' loading={retryingMethods} onClick={handleRetryMethods}>
              {t('CHECKOUT_TRY_AGAIN', 'Try again')}
            </Button>
          )}
        </NotFoundSource>
      )}
      <PaymentMethodsStatus role='status'>{retryStatus}</PaymentMethodsStatus>

      {paymethodSelected?.gateway === 'cash' && (
        <PaymentOptionCash
          data={paymethodSelected?.data}
          orderTotal={cart?.balance ?? cart?.total}
          defaultValue={paymethodSelected?.data?.cash}
          onChangeData={handlePaymethodDataChange}
          setErrorCash={props.setErrorCash}
        />
      )}
      {stripeCardsGateway && (
        <PaymentOptionStripe
          key={stripeCardsGateway}
          gateway={stripeCardsGateway}
          setCardList={setCardList}
          paymethod={isOpenMethod?.paymethod}
          businessId={props.businessId}
          publicKey={stripeCardsPublicKey}
          onPaymentChange={onPaymentChange}
          payType={isOpenMethod?.paymethod?.name}
          onSelectCard={handlePaymethodDataChange}
          onCancel={() => handlePaymethodClick(null)}
          paymethodSelected={paymethodSelected?.data?.id}
          handlePaymentMethodClick={handlePaymentMethodClick}
          foldOnSelect={canFold}
        />
      )}
      {paymethodSelected?.gateway === 'epayco' && (
        <PaymentOptionEpayco />
      )}

      {(cardsPaymethods.includes(isOpenMethod?.paymethod?.gateway) ||
        cardsPaymethods.includes(paymethodSelected?.gateway) ||
        paymethodV2Featured?.includes('get_cards')) && (
          <PaymentOptionCard
            setCardList={setCardList}
            paymethodSelectedInfo={paymethodSelected}
            paymethod={isOpenMethod?.paymethod}
            businessId={props.businessId}
            publicKey={isOpenMethod?.paymethod?.credentials?.publishable}
            gateway={isOpenMethod?.paymethod?.gateway || paymethodSelected?.gateway}
            onPaymentChange={onPaymentChange}
            payType={isOpenMethod?.paymethod?.name}
            onSelectCard={handlePaymethodDataChange}
            onCancel={() => handlePaymethodClick(null)}
            paymethodSelected={paymethodSelected?.data?.id}
            handlePaymentMethodClick={handlePaymentMethodClick}
            paymethodV2Featured={paymethodV2Featured}
            setOpenModal={setOpenModal}
            createBusinessUserPaymethod={createBusinessUserPaymethod}
          />
      )}

      {/* the card of Stripe Direct / Connect as the cards of
          Stripe (its group's title, the card as the selected option of the
          theme's choice) and the action that opens the method again to pick
          or add another card */}
      {stripeOptions.includes(paymethodSelected?.gateway) && paymethodData?.card && !isCustomerMode && paymethodSelected?.gateway !== 'stripe' && (
        <PayCardSelected>
          <StripeCardsHeader>
            <h3>{t('CARD', 'Card')}</h3>
            <StripeCardsChangeLink
              onClick={() => handlePaymentMethodClick(list?.find(paymethod => paymethod?.gateway === paymethodSelected?.gateway))}
            >
              {t('CHANGE', 'Change')}
            </StripeCardsChangeLink>
          </StripeCardsHeader>
          <Choice variant='card-actions' as={StripeCardChoiceRow} selected interactive={false} role='radio' aria-checked='true' aria-label={`XXXX-XXXX-XXXX-${paymethodData?.card?.last4}`}>
            <StripeCardItemContent>
              <ChoiceIndicator checked />
              <div>
                <CardBrand brand={paymethodData?.card?.brand} alt={paymethodData?.card?.brand} />
              </div>
              <span>
                XXXX-XXXX-XXXX-{paymethodData?.card?.last4}
              </span>
            </StripeCardItemContent>
          </Choice>
        </PayCardSelected>
      )}

      {/* what Stripe Redirect will pay with once its form is
          filled (the bank method, the account holder and the email), as the
          selected option of the theme's choice under its title, and the
          action that opens the form again */}
      {paymethodSelected?.gateway === 'stripe_redirect' && paymethodData?.type && !isCustomerMode && (
        <PayCardSelected>
          <StripeCardsHeader>
            <h3>{t('SELECT_A_PAYMENT_METHOD', 'Select a payment method')}</h3>
            <StripeCardsChangeLink
              onClick={() => handlePaymentMethodClick(list?.find(paymethod => paymethod?.gateway === 'stripe_redirect'))}
            >
              {t('CHANGE', 'Change')}
            </StripeCardsChangeLink>
          </StripeCardsHeader>
          <Choice variant='card-actions' as={StripeCardChoiceRow} selected interactive={false} role='radio' aria-checked='true'>
            <StripeCardItemContent>
              <ChoiceIndicator checked />
              <RedirectDetails>
                <span>{stripeRedirectOptions.find(option => option.value === paymethodData.type)?.name ?? paymethodData.type}</span>
                {(paymethodData.owner?.name || paymethodData.owner?.email) && (
                  <small>{[paymethodData.owner?.name, paymethodData.owner?.email].filter(Boolean).join(' · ')}</small>
                )}
              </RedirectDetails>
            </StripeCardItemContent>
          </Choice>
        </PayCardSelected>
      )}

      {/* Paypal */}
      {isOpenMethod?.paymethod?.gateway === 'paypal' && !paymethodData.id && (
        <DialogOverlay
          open={isOpenMethod?.paymethod?.gateway === 'paypal' && !paymethodData.id}
          onClose={() => handlePaymethodClick(null)}
          title={t('PAY_WITH_PAYPAL', 'Pay with PayPal')}
        >
          {isOpenMethod?.paymethod?.gateway === 'paypal' && (
            <PaymentOptionPaypal
              clientId={isOpenMethod?.paymethod?.credentials?.client_id}
              body={{
                paymethod_id: isOpenMethod?.paymethod?.id,
                amount: cart?.balance ?? cart.total,
                delivery_zone_id: cart.delivery_zone_id,
                cartUuid: cart.uuid
              }}
              btnStyle={paypalBtnStyle}
              noAuthMessage={
                !token
                  ? t('NEED_LOGIN_TO_USE', 'Sorry, you need to login to use this method')
                  : null
              }
              handlerChangePaypal={(uuid) => handleOrderRedirect && handleOrderRedirect(uuid)}
            />
          )}
        </DialogOverlay>
      )}

      {/* Stripe Connect */}
      {isOpenMethod?.paymethod?.gateway === 'stripe_connect' && !paymethodData.id && (
        <DialogOverlay
          title={t('SELECT_A_CARD', 'Select a card')}
          open={isOpenMethod?.paymethod?.gateway === 'stripe_connect' && !paymethodData.id}
          onClose={() => handlePaymethodClick(null)}
        >
          {isOpenMethod?.paymethod?.gateway === 'stripe_connect' && (
            <PaymentOptionStripe
              paymethod={isOpenMethod?.paymethod}
              businessId={props.businessId}
              publicKey={isOpenMethod?.paymethod?.credentials?.stripe?.publishable}
              clientSecret={isOpenMethod?.paymethod?.credentials?.publishable}
              payType={paymethodsList?.name}
              onSelectCard={handlePaymethodDataChange}
              onCancel={() => handlePaymethodClick(null)}
              paymethodSelected={paymethodSelected?.data?.id}
            />
          )}
        </DialogOverlay>
      )}

      {/* Stripe direct, Google pay, Apple pay */}
      {stripeDirectMethods?.includes(isOpenMethod?.paymethod?.gateway) && !paymethodData.id && (
        <DialogOverlay
          title={t('ADD_CARD', 'Add card')}
          open={stripeDirectMethods?.includes(isOpenMethod?.paymethod?.gateway) && !paymethodData.id}
          onClose={() => handlePaymethodClick(null)}
        >
          {!isOpenMethod?.paymethod?.credentials?.publishable &&
            <Container>
              <p>{t('ADD_PUBLISHABLE_KEY', 'Please add a publishable key')}</p>
            </Container>}
          {isOpenMethod?.paymethod?.credentials?.publishable && stripeDirectMethods?.includes(isOpenMethod?.paymethod?.gateway) && (
            <StripeElementsForm
              methodsPay={methodsPay}
              paymethod={isOpenMethod?.paymethod?.gateway}
              businessId={props.businessId}
              cart={cart}
              publicKey={isOpenMethod?.paymethod?.credentials?.publishable || isOpenMethod?.paymethod?.credentials?.publishable_key}
              handleSource={handlePaymethodDataChange}
              onCancel={() => handlePaymethodClick(null)}
              handlePlaceOrder={handlePlaceOrder}
            />
          )}
        </DialogOverlay>
      )}

      {/* Stripe Redirect */}
      {isOpenMethod?.paymethod?.gateway === 'stripe_redirect' && !paymethodData.type && (
        <DialogOverlay
          title={t('STRIPE_REDIRECT', 'Stripe Redirect')}
          open={isOpenMethod?.paymethod?.gateway === 'stripe_redirect' && !paymethodData.type}
          onClose={() => handlePaymethodClick(null)}
        >
          <StripeRedirectForm
            businessId={props.businessId}
            currency={props.currency}
            paymethods={stripeRedirectOptions}
            handleStripeRedirect={handlePaymethodDataChange}
          />
        </DialogOverlay>
      )}
      {isOpenMethod?.paymethod?.gateway === 'square' && !paymethodData.token && (
        <DialogOverlay
          title={t('SQUARE', 'Square')}
          open={isOpenMethod?.paymethod?.gateway === 'square' && !paymethodData.token}
          onClose={() => handlePaymethodClick(null)}
        >
          <PaymentOptionSquare
            businessId={props.businessId}
            cartTotal={cart?.total}
            data={isOpenMethod?.paymethod?.credentials}
            body={{
              paymethod_id: isOpenMethod?.paymethod?.id,
              amount: cart.total,
              delivery_zone_id: cart.delivery_zone_id,
              cartUuid: cart.uuid
            }}
            onPlaceOrderClick={onPlaceOrderClick}
            setCreateOrder={setCreateOrder}
            reconcileOrder={props.reconcileOrder}
            onPlaceSent={props.onPlaceSent}
          />
        </DialogOverlay>
      )}
      <Alert
        title={t('PAYMENT_METHODS', 'Payment Methods')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </PaymentMethodsContainer>
  )
}

export const PaymentOptions = (props) => {
  const paymentOptions = {
    ...props,
    UIComponent: PaymentOptionsUI
  }
  return (
    <PaymentOptionsController {...paymentOptions} />
  )
}
