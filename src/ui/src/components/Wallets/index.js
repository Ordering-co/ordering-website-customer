import React, { useCallback, useLayoutEffect, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  Container,
  TabsContainer,
  Title
} from './styles'

import { WalletList } from '~components/components/WalletList'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'

import { Tabs, TabsContent, TabsList, TabsNavigation, TabsTrigger } from '~ui/src/design-system/components/Tabs'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { CashWallet } from './CashWallet'
import { CreditPointsWallet } from './CreditPointsWallet'

const WalletActivityPanel = ({ walletType, transactionsList, pageWalletList, pageLoyaltyLevel, onActivityState }) => {
  const wallet = pageWalletList.wallets.find(entry => entry.type === walletType)
  const state = transactionsList?.loading
    ? 'loading'
    : transactionsList?.error
      ? 'error'
      : transactionsList?.list?.[`wallet:${wallet?.id}`]?.length ? 'activity' : 'no-activity'

  useLayoutEffect(() => {
    onActivityState(walletType, state)
  }, [onActivityState, walletType, state])

  const WalletComponent = walletType === 'cash' ? CashWallet : CreditPointsWallet
  return <WalletComponent walletList={pageWalletList} userLoyaltyLevel={pageLoyaltyLevel} transactionsList={transactionsList} />
}

const WalletsUI = (props) => {
  const {
    walletList,
    userLoyaltyLevel,
    isWalletCashEnabled,
    isWalletPointsEnabled,
    walletType
  } = props

  const [, t] = useLanguage()
  const [selected, setTabSelected] = useState(null)
  const firstAvailable = isWalletCashEnabled ? 'cash' : 'credit_point'
  const enabled = { cash: isWalletCashEnabled, credit_point: isWalletPointsEnabled }
  const urlWalletType = (walletType === 'cash' || walletType === 'credit_point') ? walletType : null
  const tabSelected = urlWalletType || (enabled[selected] ? selected : firstAvailable)
  const [activityByType, setActivityByType] = useState({})
  const onActivityState = useCallback((type, state) => {
    setActivityByType(current => current[type] === state ? current : { ...current, [type]: state })
  }, [])

  const walletName = {
    cash: {
      name: t('CASH_WALLET', 'Cash Wallet'),
      title: t('CASH_WALLET', 'Cash Wallet'),
      section: 'cash-wallet',
      isActive: isWalletCashEnabled
    },
    credit_point: {
      name: t('CREDITS_POINTS_WALLET', 'Credit Points Wallet'),
      title: t('LOYALTY_POINTS', 'Loyalty Points'),
      section: 'credit-points-wallet',
      isActive: isWalletPointsEnabled
    }
  }

  const hideTabs = !!urlWalletType || Object.values(walletName).filter(wallet => wallet.isActive).length < 2
  const wallet = walletName[tabSelected]
  const walletState = activityByType[tabSelected] ?? 'loading'

  return (
    <Container
      data-doc-section='wallets'
      data-doc-wallet-type={tabSelected}
      data-doc-state={
        walletList.loading || userLoyaltyLevel.loading
          ? 'loading'
          : walletList.error
            ? 'error'
            : walletList.wallets?.length > 0
              ? 'results'
              : 'empty'
      }
    >
      {!walletList.loading &&
        !userLoyaltyLevel.loading &&
        !walletList.error &&
        walletList.wallets?.length > 0 && (
          <Tabs
            layout='content-width'
            value={tabSelected}
            onValueChange={setTabSelected}
            render={<Container $nested data-doc-section={wallet.section} data-doc-state={walletState} />}
          >
            <Title>{wallet.title}</Title>
            <TabsContainer hidden={hideTabs}>
              <TabsList aria-label={t('WALLET', 'Wallet')}>
                {Object.entries(walletName).map(([type, data]) => data.isActive && (
                  <TabsTrigger key={type} value={type} className='tab_title'>{data.name}</TabsTrigger>
                ))}
              </TabsList>
            </TabsContainer>
            {Object.keys(walletName)
              .filter(type => type === tabSelected || (enabled[type] && activityByType[type]))
              .map(type => (
                <TabsContent
                  key={type}
                  value={type}
                  keepMounted
                  {...(hideTabs && { role: 'presentation', tabIndex: -1 })}
                >
                  {/* Each visited wallet retains the controller that loaded its own activity. */}
                  <WalletList
                    UIComponent={WalletActivityPanel}
                    walletType={type}
                    refresh={props.refresh}
                    pageWalletList={walletList}
                    pageLoyaltyLevel={userLoyaltyLevel}
                    onActivityState={onActivityState}
                  />
                </TabsContent>
              ))}
          </Tabs>
      )}

      {(walletList?.loading || userLoyaltyLevel.loading) && (
        <>
          <TabsNavigation width='content' tone='primary'>
            <Skeleton width={200} height={40} style={{ marginRight: 10 }} />
            <Skeleton width={200} height={40} style={{ marginRight: 10 }} />
            <Skeleton width={200} height={40} style={{ marginBottom: 15 }} />
          </TabsNavigation>
          <div style={{ width: '85%', margin: '0 auto' }}>
            {[...Array(8).keys()].map(i => (
              <Skeleton key={i} height={40} />
            ))}
          </div>
        </>
      )}

      {!walletList?.loading && !userLoyaltyLevel.loading && (walletList?.error || !walletList?.wallets?.length) && (
        /* the empty state of the app (the theme's
           empty.not_found); the page's only content, its h1 */
        <NotFoundSource
          variant={walletList?.error ? 'notFound' : 'empty'}
          headingLevel='h1'
          icon='wallet'
          content={walletList?.error
            ? t('ERROR_NOT_FOUND_WALLETS', 'Sorry, an error has occurred')
            : t('NOT_FOUND_WALLETS', 'No wallets to show at this time.')}
        />
      )}
    </Container>
  )
}

export const Wallets = (props) => {
  const [{ configs }] = useConfig()

  const isWalletCashEnabled = configs?.wallet_cash_enabled?.value === '1'
  const isWalletPointsEnabled = configs?.wallet_credit_point_enabled?.value === '1'

  const walletsProps = {
    ...props,
    UIComponent: WalletsUI,
    isWalletCashEnabled,
    isWalletPointsEnabled
  }
  return (
    <WalletList {...walletsProps} notFetchTransactionsInWallets />
  )
}
