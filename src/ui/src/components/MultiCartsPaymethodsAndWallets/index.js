import { getThemeCss } from '~/utils/themeCss'
import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  PaymethodsListContainer,
  WalletPaymentOptionContainer
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { MultiCartsPaymethodsAndWallets as MultiCartsPaymethodsAndWalletsController } from '~components/components/MultiCartsPaymethodsAndWallets'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { StripeElementsForm } from '~ui/src/components/StripeElementsForm'
import { Choice, ChoiceIndicator } from '~ui/src/design-system/components/Choice'
import { PayChoiceLogo, PayCardSelected as ThemePayCardSelected } from '~ui/src/components/PaymentOptions/styles'
import {
  CardItemContent as StripeCardItemContent,
  CardsHeader as StripeCardsHeader,
  CardChoiceRow as StripeCardChoiceRow
} from '~ui/src/components/PaymentOptionStripe/styles'
import { CardBrand } from '~ui/src/components/CardBrand'
import { PaymentOptionStripe } from '~ui/src/components/PaymentOptionStripe'
import { PaymentOptionEpayco } from '~ui/src/components/PaymentOptionEpayco'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeVisible } from '~/utils/themeVisibility'
import { themeSpace } from '~/utils/themeTokens'

const stripeOptions = ['stripe_direct', 'stripe', 'stripe_connect']

const getPayIcon = (method) => {
  switch (method) {
    case 1:
      return <Icon name="cash" />
    case 22:
      return <Icon name="creditCard" />
    case 28:
      return <Icon name="stripeCard" />
    case 31:
      return <Icon name="stripeS" />
    case 32:
      return <Icon name="stripe" />
    case 3:
      return <Icon name="paypal" />
    case 2:
      return <Icon name="creditCard" />
    default:
      return <Icon name="creditCard" />
  }
}

const MultiCartsPaymethodsAndWalletsUI = (props) => {
  const {
    businessIds,
    balance,
    paymethodsAndWallets,
    walletsState,
    paymethodSelected,
    handleSelectPaymethod,
    handleSelectWallet,
    handlePaymethodDataChange,
    setCardList,
    walletsPaymethod,
    isCustomerMode,
    handlePlaceOrder,
    cartGroup
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ parsePrice }] = useUtils()
  const [openPaymethod, setOpenPaymethod] = useState(null)
  // the methods' logos and the points' value in money (visibility.checkout.*)
  const showPaymethodLogo = themeVisible(theme, 'checkout.payment_methods.logo')
  const showPointsEquivalence = themeVisible(theme, 'checkout.wallet.points_equivalence')

  const isWalletCashEnabled = configs?.wallet_cash_enabled?.value === '1'
  const isWalletPointsEnabled = configs?.wallet_credit_point_enabled?.value === '1'
  const methodsPay = ['global_google_pay', 'global_apple_pay']
  const stripeDirectMethods = ['stripe_direct', ...methodsPay]
  const walletName = {
    cash: {
      name: t('PAY_WITH_CASH_WALLET', 'Pay with Cash Wallet'),
      isActive: isWalletCashEnabled
    },
    credit_point: {
      name: t('PAY_WITH_CREDITS_POINTS_WALLET', 'Pay with Credit Points Wallet'),
      isActive: isWalletPointsEnabled
    }
  }

  const handleClickPaymethod = (paymethod) => {
    handleSelectPaymethod({ ...paymethod, paymethod: { gateway: paymethod.gateway }, paymethod_id: paymethod?.id })
    setOpenPaymethod(paymethod)
  }

  return (
    <Container>
      <PaymethodsListContainer role='group' aria-label={t('PAYMENT_METHODS', 'Payment Methods')}>
        {paymethodsAndWallets.loading
          ? (
              [...Array(5).keys()].map(i => <Skeleton key={i} height={48} />)
            )
          : (
              paymethodsAndWallets.paymethods.map(paymethod => (
              <React.Fragment key={paymethod.id}>
                {(!isCustomerMode || (isCustomerMode && (paymethod.gateway === 'card_delivery' || paymethod.gateway === 'cash'))) && (
                  /* an option of a choice list (components.choice) that is an action: opening a method can open Stripe, so the arrows select nothing */
                  <Choice
                    variant='action'
                    data-doc-control='multi-checkout-payment-method'
                    data-doc-payment-gateway={paymethod.gateway}
                    data-doc-state={paymethodSelected?.id === paymethod.id ? 'selected' : 'unselected'}
                    selected={paymethodSelected?.id === paymethod.id}
                    disabled={cartGroup?.result?.status === 'payment_incomplete'}
                    onClick={() => handleClickPaymethod(paymethod)}
                    icon={showPaymethodLogo ? <PayChoiceLogo>{getPayIcon(paymethod.id)}</PayChoiceLogo> : undefined}
                    title={t(paymethod?.gateway.toUpperCase(), paymethod?.name)}
                  />
                )}
              </React.Fragment>
              ))
            )}
      </PaymethodsListContainer>
      {paymethodSelected?.paymethod?.gateway === 'stripe' && (
        <PaymentOptionStripe
          paymethod={paymethodSelected?.paymethod}
          businessId={businessIds[0]}
          businessIds={businessIds}
          publicKey={paymethodSelected?.paymethod?.credentials?.publishable}
          payType={paymethodSelected?.paymethod?.name}
          onSelectCard={handlePaymethodDataChange}
          paymethodSelected={paymethodSelected?.data?.id}
          setCardList={setCardList}
        />
      )}

      {/* the card of Stripe Direct / Connect as in the checkout
          (PaymentOptions): its group's title and the card as the selected
          option of the theme's choice */}
      {stripeOptions.includes(paymethodSelected?.paymethod?.gateway) && paymethodSelected?.paymethod_data?.card && paymethodSelected?.gateway !== 'stripe' && (
        <ThemePayCardSelected data-doc-section='multi-checkout-card-selected'>
          <StripeCardsHeader>
            <h3>{t('CARD', 'Card')}</h3>
          </StripeCardsHeader>
          <Choice variant='card-actions' as={StripeCardChoiceRow} selected interactive={false} role='radio' aria-checked='true' aria-label={`XXXX-XXXX-XXXX-${paymethodSelected?.paymethod_data?.card?.last4}`}>
            <StripeCardItemContent>
              <ChoiceIndicator checked />
              <div>
                <CardBrand brand={paymethodSelected?.paymethod_data?.card?.brand} alt={paymethodSelected?.paymethod_data?.card?.brand} />
              </div>
              <span>
                XXXX-XXXX-XXXX-{paymethodSelected?.paymethod_data?.card?.last4}
              </span>
            </StripeCardItemContent>
          </Choice>
        </ThemePayCardSelected>
      )}

      {!isCustomerMode && (
        <WalletPaymentOptionContainer>
          {(paymethodsAndWallets.loading || walletsState.loading)
            ? (
              <>
                {[...Array(2).keys()].map(i => (
                  <div key={i}>
                    <Skeleton height={40} style={{ marginBottom: themeSpace(theme, 'xl') }} />
                  </div>
                ))}
              </>
              )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: getThemeCss(theme, 'choice').base.gap }}>
                {walletsState?.result?.filter(wallet =>
                  paymethodsAndWallets.wallets.find(item => item.type === wallet.type))
                  .map((wallet) => {
                    if (!walletName[wallet.type]?.isActive) return null
                    const selected = !!walletsPaymethod?.find(walletPay => walletPay.wallet_id === wallet.id)?.id
                    const confirmed = cartGroup?.result?.status === 'payment_incomplete'
                    return (
                      // an option of a multiple choice list (components.choice): the whole row is the checkbox
                      // (components.checkbox), its balance at the end; a confirmed payment has no box to tick
                      <Choice
                        key={wallet.type}
                        type='check'
                        name={`payment_option_${wallet.type}`}
                        value={`payment_option_${wallet.type}`}
                        checked={selected}
                        indicator={!confirmed}
                        readOnly={confirmed}
                        disabled={(balance === 0 && !selected) || wallet.balance === 0}
                        onCheckedChange={() => handleSelectWallet(!selected, wallet)}
                        title={walletName[wallet.type]?.name}
                        trailing={
                          wallet.type === 'cash'
                            ? `${wallet?.balance} ${t('WALLET_CREDITS', 'Wallet credits')}`
                            : `${wallet?.balance} ${t('POINTS', 'Points')}${wallet?.balance > 0 && showPointsEquivalence ? ` = ${parsePrice(wallet?.balance / wallet?.redemption_rate, { isTruncable: true })}` : ''}`
                        }
                      />
                    )
                  })}
              </div>
              )}
        </WalletPaymentOptionContainer>
      )}
      {paymethodSelected?.gateway === 'epayco' && (
        <PaymentOptionEpayco />
      )}
      {/* Stripe direct, Google pay, Apple pay */}
      {stripeDirectMethods?.includes(openPaymethod?.gateway) && !paymethodSelected?.paymethod_data?.id && (
        <DialogOverlay
          title={t('ADD_CARD', 'Add card')}
          open={stripeDirectMethods?.includes(openPaymethod?.gateway) && !paymethodSelected?.paymethod_data?.id}
          onClose={() => setOpenPaymethod(null)}
        >
          {!paymethodSelected?.data?.publishable &&
            <Container>
              <p>{t('ADD_PUBLISHABLE_KEY', 'Please add a publishable key')}</p>
            </Container>}
          {paymethodSelected?.data?.publishable && stripeDirectMethods?.includes(paymethodSelected?.paymethod?.gateway) && (
            <StripeElementsForm
              methodsPay={methodsPay}
              paymethod={paymethodSelected?.paymethod?.gateway}
              businessId={props.businessId}
              cartGroup={cartGroup?.result}
              publicKey={paymethodSelected?.data?.publishable || paymethodSelected?.data?.publishable_key}
              handleSource={handlePaymethodDataChange}
              onCancel={() => setOpenPaymethod(null)}
              handlePlaceOrder={handlePlaceOrder}
            />
          )}
        </DialogOverlay>
      )}
    </Container>
  )
}

export const MultiCartsPaymethodsAndWallets = (props) => {
  const multiCartsPaymethodsAndWalletsProps = {
    ...props,
    UIComponent: MultiCartsPaymethodsAndWalletsUI
  }
  return <MultiCartsPaymethodsAndWalletsController {...multiCartsPaymethodsAndWalletsProps} />
}
