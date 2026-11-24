import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Wallets } from '../index'

// /wallets with a cash and a credit points wallet: the tabs switch between
// them unless the URL names one (?wallet=…); each tab loads its wallet

const WALLETS = [
  { id: 1, type: 'cash', balance: 25 },
  { id: 2, type: 'credit_point', balance: 100 }
]
const state = { visitActivity: vi.fn(), pointsEnabled: true }

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/components/WalletList', () => ({
  WalletList: ({ UIComponent, ...rest }) => {
    React.useEffect(() => {
      if (!rest.notFetchTransactionsInWallets) state.visitActivity(rest.walletType)
    }, [rest.notFetchTransactionsInWallets, rest.walletType])
    return (
    <UIComponent
      {...rest}
      walletList={{ loading: false, error: null, wallets: WALLETS }}
      userLoyaltyLevel={{ loading: false, loyaltyLevel: null }}
      transactionsList={{ loading: false, error: null, list: {} }}
      isWalletCashEnabled
      isWalletPointsEnabled={state.pointsEnabled}
    />
    )
  }
}))

beforeEach(() => {
  state.visitActivity = vi.fn()
  state.pointsEnabled = true
})

const tabsOf = (container) => container.querySelector('[data-slot=tabs-list][role=tablist]')?.parentElement

describe('Wallets tabs', () => {
  it('bare /wallets with two wallets: the tabs show and switch to the points wallet', () => {
    const { container, getByText } = renderWithProviders(<Wallets />)
    expect(tabsOf(container).hidden).toBe(false)
    // the first tab's wallet is loaded
    expect(state.visitActivity).toHaveBeenCalledWith('cash')
    fireEvent.click(getByText('Credit Points Wallet'))
    expect(state.visitActivity).toHaveBeenLastCalledWith('credit_point')
    expect(container.querySelector('[data-doc-wallet-type]').getAttribute('data-doc-wallet-type')).toBe('credit_point')
  })

  it('the URL names a wallet: no tabs, that wallet', () => {
    const { container } = renderWithProviders(<Wallets walletType='credit_point' />)
    expect(tabsOf(container).hidden).toBe(true)
    expect(state.visitActivity).toHaveBeenCalledWith('credit_point')
  })

  it('a single wallet: no tabs', () => {
    state.pointsEnabled = false
    const { container } = renderWithProviders(<Wallets />)
    expect(tabsOf(container).hidden).toBe(true)
  })
})

// The page's h1 (the wallet's name) opens the page's box as on the other
// account pages, the tabs under it
describe('Wallets tabs and the page\'s h1', () => {
  const order = (theme) => {
    const { container, getByRole } = renderWithProviders(<Wallets />, { theme })
    const h1 = getByRole('heading', { level: 1 })
    const tabs = tabsOf(container)
    // DOCUMENT_POSITION_FOLLOWING: the tabs come after the h1
    return h1.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING ? 'h1-first' : 'tabs-first'
  }

  it('the h1 first, the tabs under it (and they still switch)', () => {
    expect(order(themeWithValues())).toBe('h1-first')
  })

  it('switching the wallet keeps one bar of tabs, under the new wallet\'s h1', () => {
    const { container, getByText, getByRole } = renderWithProviders(<Wallets />, { theme: themeWithValues() })
    fireEvent.click(getByText('Credit Points Wallet'))
    expect(state.visitActivity).toHaveBeenLastCalledWith('credit_point')
    expect(container.querySelectorAll('[data-slot=tabs-list][role=tablist]')).toHaveLength(1)
    expect(getByRole('heading', { level: 1 }).compareDocumentPosition(tabsOf(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

it('keeps the focused tab mounted and links it to the new wallet panel', () => {
  const { getByRole, getByText } = renderWithProviders(<Wallets />)
  const points = getByRole('tab', { name: 'Credit Points Wallet' })
  points.focus()
  fireEvent.click(points, { detail: 0 })
  expect(points).toHaveFocus()
  expect(getByRole('tablist')).toHaveClass('ui:text-primary')
  const panel = getByRole('tabpanel', { name: 'Credit Points Wallet' })
  expect(points).toHaveAttribute('aria-controls', panel.id)
  expect(panel).toContainElement(getByText('Available Credit Points'))
})
