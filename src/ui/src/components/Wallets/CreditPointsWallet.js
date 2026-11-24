import React, { useState, useEffect } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import {
  SectionWrapper,
  BalanceElement,
  TransactionsWrapper,
  WrapContent,
  Transactions,
  LoyaltyContent,
  LoyaltyWrapp,
  TransactionsTitle,
  BalanceValue
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'

import { WalletTransactionItem } from '~ui/src/components/WalletTransactionItem'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeImage, themeValue } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'
import { usePageSections } from '~ui/hooks/usePageSections'

export const CreditPointsWallet = (props) => {
  const {
    walletList,
    userLoyaltyLevel,
    transactionsList
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  // the wallet's balance and its transactions (pages.wallets, group wallet),
  // in the theme's order; the theme may hide the transactions
  const { render } = usePageSections('wallets')
  const [loyaltyImageError, setLoyaltyImageError] = useState(false)

  const currentWalletSelected = (walletList.wallets?.length > 0 && walletList.wallets?.find(w => w.type === 'credit_point')) ?? null
  // the wallet has no transactions to list (loaded empty, or an error)
  const transactionsEmpty = !transactionsList?.loading &&
    !!(transactionsList?.error || !transactionsList.list?.[`wallet:${currentWalletSelected?.id}`]?.length)
  const loyaltyLevel = Object.keys(userLoyaltyLevel.loyaltyLevel ?? {}).length > 0 && userLoyaltyLevel.loyaltyLevel
  // the level shown in the balance card, a piece of it the theme may hide
  // (visibility wallets.loyalty_level)
  const showLoyaltyLevel = !!loyaltyLevel && themeVisible(theme, 'wallets.loyalty_level')
  // a level without an image: the theme's placeholder
  // (images.placeholder.loyalty_level, the bundled dummy without one)
  const loyaltyDummy = themeImage(theme, 'placeholder.loyalty_level')

  // Reset the broken-image flag when the level (image) changes, so a new valid
  // image isn't kept hidden by a previous level's load failure.
  useEffect(() => {
    setLoyaltyImageError(false)
  }, [loyaltyLevel?.image])

  const walletRenderers = {
    balance: () => (
      <SectionWrapper>
        <BalanceElement data-doc-section='wallet-balance'>
          {showLoyaltyLevel && (
            <LoyaltyContent>
              <LoyaltyWrapp>
                {!!(loyaltyLevel.image ?? loyaltyDummy) && !loyaltyImageError
                  ? (
                    <img
                      src={loyaltyLevel.image ?? loyaltyDummy}
                      alt={loyaltyLevel.name}
                      onError={() => setLoyaltyImageError(true)}
                    />
                    )
                  : (
                    <span className='loyalty_placeholder' aria-hidden='true'>
                      <Icon name="trophy" />
                    </span>
                    )}
              </LoyaltyWrapp>
              <span className='loyalty_name'>
                {loyaltyLevel.name}
              </span>
            </LoyaltyContent>
          )}
          <div className='balance_element-points'>
            <BalanceValue>
              <Icon
                name='walletLoyalty'
                size={themeValue(theme, 'wallet_balance', 'base.icon_size')}
                style={{ color: themeValue(theme, 'wallet_balance', 'base.points_icon_color') }}
              />
              <p className='amount'>
                {currentWalletSelected?.balance}
              </p>
            </BalanceValue>
            <span>
              {t('AVAILABLE_CREDIT_POINTS', 'Available Credit Points')}
            </span>
          </div>
        </BalanceElement>
      </SectionWrapper>
    ),
    transactions: () => (
      <div className='transactions_list'>
        {!transactionsList?.loading && transactionsList.list?.[`wallet:${currentWalletSelected?.id}`]?.length > 0 && (
          <>
            <TransactionsTitle>{t('TRANSACTIONS_LIST', 'Transactions List')}</TransactionsTitle>
            <TransactionsWrapper data-doc-section='wallet-activity'>
              {transactionsList.list?.[`wallet:${currentWalletSelected?.id}`]?.map((transaction, i) => (
                <WalletTransactionItem
                  key={i}
                  item={transaction}
                  listItem
                  withFormatPrice={currentWalletSelected?.type === 'cash'}
                />
              ))}
            </TransactionsWrapper>
          </>
        )}

        {transactionsList?.loading && (
          <>
            {[...Array(8).keys()].map(i => (
              <SectionWrapper key={i} isLoading>
                <Skeleton height={40} />
              </SectionWrapper>
            ))}
          </>
        )}
        {transactionsEmpty && (
          /* the empty state of the app (NotFoundSource), a
             section of the wallet's h1 in the transactions' place (the
             theme's order): images.empty.transactions, else the theme's
             empty.not_found (the error: empty.not_found) */
          <NotFoundSource
            variant={transactionsList?.error ? 'notFound' : 'empty'}
            headingLevel='h2'
            icon='wallet'
            image={transactionsList?.error ? null : themeImage(theme, 'empty.transactions')}
            content={transactionsList?.error
              ? t('ERROR_NOT_FOUND_TRANSACTIONS', 'Sorry, an error has occurred')
              : t('NO_TRANSACTIONS_FOUND', 'No transactions found')}
          />
        )}
      </div>
    )
  }

  return (
    <>
      {!walletList.loading && !userLoyaltyLevel.loading && !walletList.error && walletList.wallets?.length > 0 && (
        <>
          <WrapContent>
            <Transactions isLoyaltyLevel={showLoyaltyLevel}>
              {render(walletRenderers, { group: 'wallet' })}
            </Transactions>
          </WrapContent>
        </>
      )}

      {(walletList?.loading || userLoyaltyLevel.loading) && (
        <div style={{ width: '85%', margin: '0 auto' }}>
          {[...Array(8).keys()].map(i => (
            <SectionWrapper key={i} isLoading>
              <Skeleton height={40} />
            </SectionWrapper>
          ))}
        </div>
      )}

      {!walletList?.loading && !userLoyaltyLevel.loading && (walletList?.error || !walletList?.wallets?.length) && (
        /* the empty state of the app, a section of the
           wallet's h1 (the theme's empty.not_found) */
        <NotFoundSource
          variant={walletList?.error ? 'notFound' : 'empty'}
          headingLevel='h2'
          icon='wallet'
          content={walletList?.error
            ? t('ERROR_NOT_FOUND_WALLETS', 'Sorry, an error has occurred')
            : t('NOT_FOUND_WALLETS', 'No wallets to show at this time.')}
        />
      )}
    </>
  )
}
