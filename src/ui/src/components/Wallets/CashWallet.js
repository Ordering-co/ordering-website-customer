import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'

import {
  SectionWrapper,
  BalanceElement,
  TransactionsWrapper,
  WrapContent,
  Transactions,
  TransactionsTitle,
  BalanceValue
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'

import { WalletTransactionItem } from '~ui/src/components/WalletTransactionItem'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Icon } from '~ui/src/design-system/components/Icon'
import { themeImage, themeValue } from '~/utils/themeTokens'
import { usePageSections } from '~ui/hooks/usePageSections'

export const CashWallet = (props) => {
  const {
    walletList,
    transactionsList
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  // the wallet's balance and its transactions (pages.wallets, group wallet),
  // in the theme's order; the theme may hide the transactions
  const { render } = usePageSections('wallets')
  const currentWalletSelected = (walletList.wallets?.length > 0 && walletList.wallets?.find(w => w.type === 'cash')) ?? null
  // the wallet has no transactions to list (loaded empty, or an error)
  const transactionsEmpty = !transactionsList?.loading &&
    !!(transactionsList?.error || !transactionsList.list?.[`wallet:${currentWalletSelected?.id}`]?.length)

  const walletRenderers = {
    balance: () => (
      <SectionWrapper>
        <BalanceElement data-doc-section='wallet-balance'>
          <h2>
            {t('AVAILABLE', 'Available')}
          </h2>
          <div className='balance_element'>
            <BalanceValue>
              <Icon
                name='walletCash'
                size={themeValue(theme, 'wallet_balance', 'base.icon_size')}
                style={{ color: themeValue(theme, 'wallet_balance', 'base.cash_icon_color') }}
              />
              <p className='amount'>
                {currentWalletSelected?.balance}
              </p>
            </BalanceValue>
            <span>
              {t('WALLET_CREDITS', 'Wallet credits')}
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
                  withFormatPrice={false}
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
      {!walletList.loading && !walletList.error && walletList.wallets?.length > 0 && (
        <>
          <WrapContent>
            <Transactions>
              {render(walletRenderers, { group: 'wallet' })}
            </Transactions>
          </WrapContent>
        </>
      )}

      {walletList?.loading && (
        <div style={{ width: '85%', margin: '0 auto' }}>
          {[...Array(8).keys()].map(i => (
            <SectionWrapper key={i} isLoading>
              <Skeleton height={40} />
            </SectionWrapper>
          ))}
        </div>
      )}

      {!walletList?.loading && (walletList?.error || !walletList?.wallets?.length) && (
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
