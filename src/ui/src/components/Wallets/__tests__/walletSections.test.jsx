import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { Wallets } from '../index'

// /wallets?wallet=cash | credit_point as the theme lays them out
// (pages.wallets: the balance and the transactions ordered, the transactions
// and the loyalty level hidden) and the wallet_balance / wallet_transaction
// components. The controller is stubbed (the page's and the wallet's).
const WALLETS = [
  { id: 1, type: 'cash', balance: 25 },
  { id: 2, type: 'credit_point', balance: 100 }
]
const MOVEMENTS = [
  { amount: 10, created_at: '2026-07-01', description: 'Top up', event_type: 'credit' },
  { amount: -4, created_at: '2026-07-02', description: 'Order 12', event_type: 'debit' }
]

// `empty`: the wallets have no transactions
const MOVEMENTS_BY_WALLET = { empty: false }

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/components/WalletList', () => ({
  WalletList: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...rest}
      walletList={{ loading: false, error: null, wallets: WALLETS }}
      userLoyaltyLevel={{ loading: false, loyaltyLevel: { name: 'Gold', image: null } }}
      transactionsList={{ loading: false, error: null, list: MOVEMENTS_BY_WALLET.empty ? {} : { 'wallet:1': MOVEMENTS, 'wallet:2': MOVEMENTS } }}
      setWalletSelected={vi.fn()}
      isWalletCashEnabled
      isWalletPointsEnabled
    />
  )
}))

// The rules of an element's styled class (not of its other classes, `green`)
const ownCss = (el) => {
  const cls = Array.from(el.classList).find((c) => !c.includes('sc-') && c !== 'green')
  return injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}').replace(/\s+/g, '')
}

// A theme whose wallets page shows `sections` ([key, visible]) in that order
const withSections = (sections, mutate = (values) => values) => themeWithValues((values) => mutate({
  ...values,
  pages: {
    ...values.pages,
    wallets: { ...values.pages.wallets, sections: sections.map(([key, visible = true]) => ({ key, visible })) }
  }
}))

const renderWallet = (type, theme) => {
  const view = renderWithProviders(<Wallets walletType={type} />, { theme })
  const q = (selector) => view.container.querySelector(selector)
  return {
    ...view,
    balance: q('[data-doc-section="wallet-balance"]'),
    list: q('[data-doc-section="wallet-activity"]'),
    rows: Array.from(view.container.querySelectorAll('[data-doc-section="wallet-transaction"]'))
  }
}

// The balance's section and the transactions' one, in the order they are painted
const sectionsOf = (view) => {
  const transactions = view.balance.closest('[data-doc-section$="wallet"]').querySelector('.transactions_list')
  const parent = view.balance.parentElement.parentElement
  return Array.from(parent.children).map((el) => (el === transactions ? 'transactions' : el.contains(view.balance) ? 'balance' : 'other'))
}

describe.each(['cash', 'credit_point'])('/wallets?wallet=%s: sections of the theme (pages.wallets)', (type) => {
  it('the balance, then the transactions, in a column', () => {
    const view = renderWallet(type, themeWithValues())
    expect(sectionsOf(view)).toEqual(['balance', 'transactions'])
    // the box of the sections is a column (not column-reverse)
    expect(view.balance.parentElement.parentElement.parentElement).toHaveStyle({ flexDirection: 'column' })
  })

  it('the transactions first, the balance after them', () => {
    const view = renderWallet(type, withSections([['transactions'], ['balance']]))
    expect(sectionsOf(view)).toEqual(['transactions', 'balance'])
    expect(view.rows).toHaveLength(2)
  })

  it('no transactions and the transactions first: their empty state before the balance', () => {
    MOVEMENTS_BY_WALLET.empty = true
    try {
      const view = renderWallet(type, withSections([['transactions'], ['balance']]))
      expect(sectionsOf(view)).toEqual(['transactions', 'balance'])
      const empty = view.container.querySelector('#not-found-source')
      expect(empty.closest('.transactions_list')).not.toBeNull()
      expect(empty.compareDocumentPosition(view.balance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    } finally {
      MOVEMENTS_BY_WALLET.empty = false
    }
  })

  it('hidden transactions, the balance alone (no list and no empty state)', () => {
    const view = renderWallet(type, withSections([['balance'], ['transactions', false]]))
    expect(view.list).toBeNull()
    expect(view.container.querySelector('.transactions_list')).toBeNull()
    expect(view.container.querySelector('#not-found-source')).toBeNull()
    expect(view.balance).not.toBeNull()
  })

  it('the balance cannot be hidden', () => {
    const view = renderWallet(type, withSections([['balance', false]]))
    expect(view.balance).not.toBeNull()
  })
})

describe('/wallets?wallet=credit_point: the loyalty level (visibility wallets.loyalty_level)', () => {
  it('a piece of the balance, not a section of the page', () => {
    expect(schemaDefault('visibility.wallets.loyalty_level')).toBe(true)
    expect((schemaDefault('pages.wallets.sections') || []).map((section) => section.key)).not.toContain('loyalty_level')
  })

  it('hidden by the theme', () => {
    const view = renderWallet('credit_point', themeWithValues((values) => { values.visibility['wallets.loyalty_level'] = false; return values }))
    expect(view.balance.querySelector('.loyalty_name')).toBeNull()
    expect(view.balance.querySelector('.amount')).not.toBeNull()
  })

  it('by default: shown', () => {
    expect(renderWallet('credit_point', themeWithValues()).balance.querySelector('.loyalty_name')).toHaveTextContent('Gold')
  })
})

describe('components.wallet_balance', () => {
  const BALANCE = {
    padding: 21,
    amount: { size: 41, line: 1.15, weight: 400 },
    amount_color: '#111213',
    label: { size: 15, line: 1.4, weight: 400 },
    label_color: '#212223',
    icon_size: 29,
    cash_icon_color: '#313233',
    points_icon_color: '#414243',
    loyalty_image_size: 77,
    loyalty_image_radius: 7,
    loyalty_name: { size: 25, line: 1.24, weight: 400 }
  }
  const themed = (mutate = (values) => values) => themeWithValues((values) => {
    values.components.wallet_balance.base = { ...values.components.wallet_balance.base, ...BALANCE }
    return mutate(values)
  })
  const flat = (el) => cssFor(el).replace(/\s+/g, '')

  it('its padding, the amount (its weight kept) and the label', () => {
    const { balance } = renderWallet('cash', themed())
    expect(balance).toHaveStyle({ padding: '21px' })
    const css = flat(balance)
    expect(css).toMatch(/\.amount\{(?:font-family:[^;]*;)?font-size:41px;line-height:1\.15;font-weight:bold;color:#111213;\}/)
    expect(css).toMatch(/>span\{(?:font-family:[^;]*;)?font-size:15px;line-height:1\.4;font-weight:400;color:#212223;\}/)
  })

  it('the amount of platforms.mobile_web below 576px', () => {
    const theme = themed((values) => {
      values.platforms.mobile_web.components.wallet_balance = { base: { amount: { size: 22, line: 1.27 } } }
      return values
    })
    const { balance } = renderWallet('cash', theme)
    expect(flat(balance)).toMatch(/@media\(max-width:575px\)\{[^@{]*\.amount\{(?:font-family:[^;]*;)?font-size:22px;line-height:1\.27;(?:font-weight:\d+;)?font-weight:bold;/)
  })

  it('the wallets\' icons of its size and colors', () => {
    const theme = themed()
    const cash = renderWallet('cash', theme)
    const cashIcon = cash.balance.querySelector('.amount').parentElement.querySelector('svg')
    expect(cashIcon).toHaveAttribute('width', '29')
    expect(cashIcon).toHaveStyle({ color: '#313233' })
    cash.unmount()
    const points = renderWallet('credit_point', theme)
    expect(points.balance.querySelector('.amount').parentElement.querySelector('svg')).toHaveStyle({ color: '#414243' })
  })

  it('the loyalty level\'s image size and radius, its name\'s text (its weight kept)', () => {
    const { balance } = renderWallet('credit_point', themed())
    const wrap = balance.querySelector('.loyalty_name').parentElement.querySelector('img').parentElement
    expect(wrap).toHaveStyle({ width: '77px', height: '77px' })
    expect(flat(wrap)).toMatch(/\.loyalty_placeholder\{border-radius:7px;/)
    expect(flat(balance.querySelector('.loyalty_name').parentElement)).toMatch(/span\.loyalty_name\{(?:font-family:[^;]*;)?font-size:25px;line-height:1\.24;font-weight:bold;\}/)
  })

  it('the loyalty image: its size and radius only from wallet_balance, the placeholder\'s trophy the lg icon', () => {
    const theme = themed((values) => {
      values.tokens.icon.lg = 30
      return values
    })
    const { balance } = renderWallet('credit_point', theme)
    const wrap = balance.querySelector('.loyalty_name').parentElement.querySelector('img').parentElement
    const css = flat(wrap)
    expect(css).not.toContain('width:100px')
    expect(css).not.toContain('font-size:44px')
    expect(css).toMatch(/\.loyalty_placeholdersvg\{width:30px;height:30px;font-size:30px;\}/)
  })

  it('the lg padding and the rating / favorite icons of today', () => {
    const theme = themeWithValues()
    const { balance } = renderWallet('cash', theme)
    expect(balance).toHaveStyle({ padding: `${theme.values.tokens.space.lg}px` })
    expect(balance.querySelector('.amount').parentElement.querySelector('svg')).toHaveStyle({ color: theme.values.tokens.color.rating })
  })
})

describe('components.wallet_transaction', () => {
  const ROW = {
    icon_size: 31,
    icon_radius: 3,
    credit_background: '#E1E2E3',
    credit_color: '#0F0E0D',
    debit_background: '#D1D2D3',
    debit_color: '#1F1E1D',
    description: { size: 18, line: 1.22, weight: 400 },
    date: { size: 10, line: 1.4, weight: 400 },
    date_color: '#2F2E2D',
    amount: { size: 17, line: 1.35, weight: 400 }
  }
  const themed = () => themeWithValues((values) => {
    values.components.wallet_transaction.base = { ...values.components.wallet_transaction.base, ...ROW }
    return values
  })

  it('the chip and its arrow (credit and debit)', () => {
    const { rows } = renderWallet('cash', themed())
    const [credit, debit] = rows
    const creditChip = credit.querySelector('.green')
    const css = ownCss(creditChip)
    expect(css).toMatch(/\{border-radius:3px;background:#D1D2D3;/)
    expect(css).toMatch(/svg\{color:#1F1E1D;width:31px;height:31px;font-size:31px;/)
    expect(css).toMatch(/\.green\{background:#E1E2E3;/)
    expect(css).toMatch(/\.greensvg\{color:#0F0E0D;/)
    // the debit's chip: the same rules, without .green
    expect(ownCss(debit.querySelector('.left-wrapper > div'))).toBe(css)
  })

  it('the date, the description and the amount (its weight kept)', () => {
    const { rows } = renderWallet('cash', themed())
    const [credit] = rows
    const content = credit.querySelector('.date').parentElement
    const css = ownCss(content)
    expect(css).toMatch(/\.date\{(?:font-family:[^;]*;)?font-size:10px;line-height:1\.4;font-weight:400;color:#2F2E2D;/)
    expect(css).toMatch(/div\.amount\{(?:font-family:[^;]*;)?font-size:17px;line-height:1\.35;font-weight:600;color:#1F1E1D;/)
    expect(css).toMatch(/div\.green\{color:#0F0E0D;/)
    const description = content.nextElementSibling
    expect(ownCss(description)).toMatch(/font-size:18px;line-height:1\.22;font-weight:700;/)
  })
})
