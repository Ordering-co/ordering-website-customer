import { getThemeCss } from '~/utils/themeCss'
import React, { useState, useEffect } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'

import { SectionWrapper } from './styles'

import { PaymentOptionWallet as PaymentOptionWalletController } from '~components/components/PaymentOptionWallet'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'

import { Alert } from '~ui/src/components/Confirm'
import { Choice } from '~ui/src/design-system/components/Choice'
import { themeColor } from '~/utils/themeColors'
import { themeHidden } from '~/utils/themeVisibility'
import { themeSpace } from '~/utils/themeTokens'
import { Icon } from '~ui/src/design-system/components/Icon'
const PaymentOptionWalletUI = (props) => {
  const {
    cart,
    errorState,
    setErrorState,
    selectWallet,
    walletsState,
    businessConfigs = [],
    deletetWalletSelected
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ parsePrice }] = useUtils()

  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [checkedState, setCheckedState] = useState(
    new Array(walletsState.result?.length).fill(false)
  )

  // the points' value in money (visibility.checkout.wallet.points_equivalence, off by default)
  const hidePointsEquivalence = themeHidden(theme, 'checkout.wallet.points_equivalence')
  const isWalletCashEnabled = configs?.wallet_cash_enabled?.value === '1'
  const isWalletPointsEnabled = configs?.wallet_credit_point_enabled?.value === '1'

  const isBusinessWalletCashEnabled = businessConfigs.find(config => config.key === 'wallet_cash_enabled')?.value === '1'
  const isBusinessWalletPointsEnabled = businessConfigs.find(config => config.key === 'wallet_credit_point_enabled')?.value === '1'

  const walletName = {
    cash: {
      name: t('PAY_WITH_WALLET_CREDITS', 'Pay with Wallet credits'),
      isActive: isWalletCashEnabled && isBusinessWalletCashEnabled
    },
    credit_point: {
      name: t('PAY_WITH_LOYALTY_POINTS', 'Pay with Loyalty points'),
      isActive: isWalletPointsEnabled && isBusinessWalletPointsEnabled
    }
  }

  const closeAlert = () => {
    setAlertState({ open: false, content: [] })
    setErrorState(null)
  }

  const handleOnChange = (position, wallet) => {
    const updatedCheckedState = checkedState.map((item, index) =>
      index === position ? !item : item
    )

    if (!checkedState[position]) {
      selectWallet(wallet)
    } else {
      deletetWalletSelected(wallet)
    }

    setCheckedState(updatedCheckedState)
  }

  const syncCheckedFromCart = () => {
    setCheckedState(
      walletsState?.result?.map(wallet => !!cart?.wallets?.find(w => w.id === wallet.id)) ?? []
    )
  }

  useEffect(() => {
    if (!walletsState.loading) {
      syncCheckedFromCart()
    }
  }, [walletsState.result?.length])

  useEffect(() => {
    if (errorState) {
      setAlertState({ open: true, content: errorState })
      // selectWallet/deletetWalletSelected failed — revert the optimistic
      // checkbox toggle back to the cart's actual wallet selection.
      syncCheckedFromCart()
    }
  }, [errorState])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: themeSpace(theme, 'md'), gap: getThemeCss(theme, 'choice').base.gap }}>
      {!walletsState.loading &&
        !walletsState.error &&
        walletsState.result?.length > 0 &&
        (
          <>
            {walletsState.result?.map((wallet, idx) => wallet.valid && wallet.balance >= 0 && walletName[wallet.type]?.isActive && (
                // an option of a multiple choice list (components.choice): the wallet's icon, its name and its balance at the end;
                // confirmed with the cart (status 2) it has nothing to tick
                <Choice
                  key={wallet.id}
                  type='check'
                  title={walletName[wallet.type]?.name}
                  icon={<Icon name={wallet.type === 'cash' ? 'walletCash' : 'walletLoyalty'} size='md' style={{ color: themeColor(theme, wallet.type === 'cash' ? 'rating' : 'favorite') }} />}
                  trailing={(
                    <span style={{ fontWeight: 600 }}>
                      {wallet.type === 'cash' && `${wallet?.balance} ${t('WALLET_CREDITS', 'Wallet credits')}`}
                      {wallet.type === 'credit_point' && (
                        <>
                          {`${wallet?.balance} ${t('POINTS', 'Points')}`} {wallet?.balance > 0 && !hidePointsEquivalence && `= ${parsePrice(wallet?.balance / wallet?.redemption_rate)}`}
                        </>
                      )}
                    </span>
                  )}
                  checked={checkedState[idx] ?? false}
                  onCheckedChange={() => handleOnChange(idx, wallet)}
                  disabled={(cart?.balance === 0 && !checkedState[idx]) || wallet.balance === 0}
                  readOnly={cart?.status === 2}
                  indicator={cart?.status !== 2}
                />
            ))}
          </>
        )}

      {walletsState?.loading && (
        <>
          {[...Array(2).keys()].map(i => (
            <SectionWrapper key={i}>
              <Skeleton height={40} />
            </SectionWrapper>
          ))}
        </>
      )}

      <Alert
        title={t('WALLET_ERROR_MESSAGES', 'Wallet')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </div>
  )
}

export const PaymentOptionWallet = (props) => {
  const paymentWalletProps = {
    ...props,
    UIComponent: PaymentOptionWalletUI
  }

  return (
    <PaymentOptionWalletController {...paymentWalletProps} />
  )
}
