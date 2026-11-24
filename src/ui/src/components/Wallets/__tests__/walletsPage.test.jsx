import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { THEME_IMAGE_DEFAULTS } from '../../../../../utils/bundledImages'
import { pageGutter } from '~/utils/themeTokens'
import { Wallets } from '../index'

// the page's side space with the default theme (tokens.layout.page_gutter)
const HEADER_SIDE = pageGutter(themeWithValues())

// /wallets?wallet=cash and /wallets?wallet=credit_point: the wallets page
// (WalletsUI) and the wallet it shows, with the controller stubbed (both the
// page's and the wallet's own WalletList)

const WALLETS = [
  { id: 1, type: 'cash', balance: 25 },
  { id: 2, type: 'credit_point', balance: 100 }
]
const MOVEMENTS = [
  { amount: 10, created_at: '2026-07-01', description: 'Top up', event_type: 'credit' },
  { amount: -4, created_at: '2026-07-02', description: 'Order 12', event_type: 'debit' }
]
const state = { transactions: MOVEMENTS, wallets: WALLETS, transactionsError: null, levelImage: null }

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/components/WalletList', () => ({
  WalletList: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...rest}
      walletList={{ loading: false, error: null, wallets: state.wallets }}
      userLoyaltyLevel={{ loading: false, loyaltyLevel: { name: 'Gold', image: state.levelImage } }}
      transactionsList={{ loading: false, error: state.transactionsError, list: { 'wallet:1': state.transactions, 'wallet:2': state.transactions } }}
      setWalletSelected={vi.fn()}
      isWalletCashEnabled
      isWalletPointsEnabled
    />
  )
}))

afterEach(() => {
  state.transactions = MOVEMENTS
  state.wallets = WALLETS
  state.transactionsError = null
  state.levelImage = null
})

// A theme of spaces, icons and an item divider spacing that are not the
// defaults, so each gap is read from the theme
const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const ICON = { sm: 15, md: 21, lg: 26 }
const ITEM_SPACING = 7
const spacedTheme = () => themeWithValues((values) => {
  const divider = values.components.divider
  const { section_header: header, wallet_balance: balance, wallet_transaction: row } = values.components
  return {
    ...values,
    tokens: { ...values.tokens, space: SPACE, icon: ICON },
    components: {
      ...values.components,
      divider: { ...divider, variants: { ...divider.variants, item: { ...divider.variants.item, spacing: ITEM_SPACING } } },
      // the components that alias those tokens, as the API resolves them
      section_header: { ...header, variants: { ...header.variants, page: { ...header.variants.page, margin_bottom: SPACE.xl } } },
      wallet_balance: { ...balance, base: { ...balance.base, padding: SPACE.lg, icon_size: ICON.lg } },
      wallet_transaction: { ...row, base: { ...row.base, icon_size: ICON.lg } }
    }
  }
})

const VIEWS = [
  { type: 'cash', section: 'cash-wallet', title: 'Cash Wallet', h2: ['Available', 'Transactions List'], icon: 'rating' },
  { type: 'credit_point', section: 'credit-points-wallet', title: 'Loyalty Points', h2: ['Transactions List'], icon: 'favorite' }
]

const renderWallet = (type, theme) => {
  const view = renderWithProviders(<Wallets walletType={type} />, { theme })
  const q = (selector) => view.container.querySelector(selector)
  return {
    ...view,
    page: q('[data-doc-section="wallets"]'),
    wallet: q(`[data-doc-section="${type === 'cash' ? 'cash-wallet' : 'credit-points-wallet'}"]`),
    balance: q('[data-doc-section="wallet-balance"]'),
    list: q('[data-doc-section="wallet-activity"]'),
    rows: Array.from(view.container.querySelectorAll('[data-doc-section="wallet-transaction"]'))
  }
}

// The :hover / :active rules of an element's own class
const stateRules = (el) => cssFor(el).replace(/\s+/g, '').split(/(?<=})/).filter((rule) => /:(hover|active)/.test(rule))
// A block that is not a control keeps only blockStill's "no movement"
const expectNoHover = (el) => {
  stateRules(el).forEach((rule) => expect(rule.replace(/^[^{]*{/, '').replace(/-(webkit|ms)-transform:none;/g, '').replace(/}$/, '')).toBe('transform:none;'))
  expect(window.getComputedStyle(el).cursor).not.toBe('pointer')
}

describe.each(VIEWS)('/wallets?wallet=$type', ({ type, section, title, h2, icon }) => {
  it('one h1, its sections h2, no skipped level', () => {
    const view = renderWallet(type, spacedTheme())
    expect(view.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([title])
    expect(view.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(h2)
    ;[3, 4, 5, 6].forEach((level) => expect(view.queryAllByRole('heading', { level })).toHaveLength(0))
  })

  it('the account pages\' box on the page, none on the wallet; the title its gap over the balance', () => {
    const theme = spacedTheme()
    const { page, wallet, balance, getByRole } = renderWallet(type, theme)
    expect(wallet).toHaveAttribute('data-doc-section', section)
    // the box of components.account_page
    const box = theme.values.components.account_page.base
    expect(page).toHaveStyle({ width: '100%', paddingTop: `${box.padding_top}px`, paddingLeft: `${HEADER_SIDE}px`, paddingRight: `${HEADER_SIDE}px`, paddingBottom: `${box.padding_bottom}px` })
    expect(wallet).toHaveStyle({ width: '100%', paddingTop: '0px', paddingLeft: '0px', paddingRight: '0px', paddingBottom: '0px', marginTop: '0px', minHeight: '0' })
    expect(getByRole('heading', { level: 1 })).toHaveStyle({ marginTop: '0px', marginBottom: `${theme.values.tokens.space.xl}px`, fontSize: `${theme.values.tokens.typography.h1.size}px` })
    // nothing between the title's gap and the balance card
    expect(balance.parentElement).toHaveStyle({ paddingTop: '0px' })
    // no width of the page's own: the shared box's
    expect(cssFor(page).replace(/\s+/g, '')).not.toContain('85%')
  })

  it('the balance is a card of components.card, lg inside, md between its blocks, with the wallet\'s icon', () => {
    const theme = spacedTheme()
    const { balance } = renderWallet(type, theme)
    const card = theme.values.components.card.base
    expect(balance).toHaveStyle({ backgroundColor: card.background, padding: `${SPACE.lg}px`, gap: `${SPACE.md}px` })
    const amount = balance.querySelector('.amount')
    expect(amount).toHaveStyle({ color: theme.values.tokens.color.text })
    const unit = amount.parentElement.nextElementSibling
    expect(unit.tagName).toBe('SPAN')
    expect(unit).toHaveStyle({ color: theme.values.tokens.color.text_muted, marginLeft: '0px' })
    expect(unit.parentElement).toHaveStyle({ gap: `${SPACE.xs}px` })
    // the registry's wallet icon, of the lg icon size, rating / favorite colored, sm from the amount
    const svg = amount.parentElement.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', String(ICON.lg))
    expect(svg).toHaveStyle({ color: theme.values.tokens.color[icon] })
    expect(amount.parentElement).toHaveStyle({ gap: `${SPACE.sm}px` })
    expectNoHover(balance)
  })

  it('the transactions a section xl under the balance, their h2 md over one card list of divided rows', () => {
    const theme = spacedTheme()
    const { list, rows } = renderWallet(type, theme)
    const section = list.parentElement
    expect(section).toHaveClass('transactions_list')
    // xl from the balance: the gap of the wallet's sections (in the theme's order)
    expect(section).toHaveStyle({ marginTop: '0px' })
    expect(section.parentElement).toHaveStyle({ display: 'flex', flexDirection: 'column', gap: `${SPACE.xl}px` })
    const heading = list.previousElementSibling
    expect(heading.tagName).toBe('H2')
    expect(heading).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px`, fontSize: `${theme.values.tokens.typography.h2.size}px` })
    // at the start, over the list's `.transactions_list h2` (0,2,1) rules: jsdom
    // cascades by source order only, so the rule is read instead
    expect(cssFor(heading).replace(/\s+/g, '')).toMatch(/^\.(\w+)\.\1\.\1\{[^}]*text-align:start;/)
    // one card: a list (ul) of rows (li), lg in from its sides
    expect(list.tagName).toBe('UL')
    expect(list).toHaveStyle({ backgroundColor: theme.values.components.card.base.background, paddingTop: '0px', paddingLeft: `${SPACE.lg}px`, paddingRight: `${SPACE.lg}px`, marginTop: '0px', listStyle: 'none' })
    expect(rows.map((row) => row.tagName)).toEqual(['LI', 'LI'])
    rows.forEach((row) => expect(row).toHaveStyle({ paddingTop: `${SPACE.md}px`, paddingBottom: `${SPACE.md}px`, paddingLeft: '0px', paddingRight: '0px', marginBottom: '0px' }))
    // the divider's item spacing between two rows only
    expect(rows[0]).toHaveStyle({ marginTop: '0px' })
    expect(rows[1]).toHaveStyle({ marginTop: `${ITEM_SPACING}px` })
    // the divider's item line under each row but the last
    expect(rows[0]).toHaveStyle({ borderBottomStyle: 'solid', borderBottomColor: theme.values.tokens.color.border })
    expect(window.getComputedStyle(rows[1]).borderBottomStyle).toMatch(/none|^$/)
    expectNoHover(list)
    rows.forEach(expectNoHover)
  })

  it('a row\'s icon, date and amount from the theme (success / danger as text, muted, icon lg, md gaps)', () => {
    const theme = spacedTheme()
    const { rows } = renderWallet(type, theme)
    const color = theme.values.tokens.color
    const [credit, debit] = rows
    const creditChip = credit.querySelector('.green')
    expect(creditChip).toHaveStyle({ padding: `${SPACE.md}px`, backgroundColor: color.success_subtle })
    expect(creditChip.querySelector('svg')).toHaveStyle({ width: `${ICON.lg}px`, height: `${ICON.lg}px`, color: color.success_text })
    const debitChip = debit.querySelector('.left-wrapper > div')
    expect(debitChip).toHaveStyle({ backgroundColor: color.danger_subtle })
    expect(debitChip.querySelector('svg')).toHaveStyle({ color: color.danger_text })
    expectNoHover(creditChip)
    // md between icon and text, and text and amount
    expect(credit.querySelector('.left-wrapper')).toHaveStyle({ gap: `${SPACE.md}px` })
    expect(credit.querySelector('.left-wrapper').parentElement).toHaveStyle({ gap: `${SPACE.md}px` })
    expect(credit.querySelector('.date')).toHaveStyle({ color: color.text_muted, marginBottom: `${SPACE.xs}px`, fontSize: `${theme.values.tokens.typography.body.size}px` })
    expect(credit.querySelector('.amount')).toHaveStyle({ color: color.success_text, fontWeight: '600' })
    expect(debit.querySelector('.amount')).toHaveStyle({ color: color.danger_text })
    expect(credit.querySelector('.date').parentElement.parentElement).toHaveStyle({ marginLeft: '0px' })
  })

  it('no transactions, the empty state of the app (NotFoundSource) in the transactions\' section, xl under the balance, an h2 of the wallet\'s h1', () => {
    state.transactions = []
    const theme = spacedTheme()
    const view = renderWallet(type, theme)
    const { wallet } = view
    const section = wallet.querySelector('.transactions_list')
    expect(section).toHaveStyle({ marginTop: '0px' })
    // the empty state is the transactions' section (it follows the theme's
    // order), xl from the balance by the gap of the sections, no margin of its own
    const empty = section.querySelector(':scope > #not-found-source')
    expect(empty).not.toBeNull()
    expect(wallet.querySelector(':scope > #not-found-source')).toBeNull()
    expect(section.parentElement).toHaveStyle({ gap: `${SPACE.xl}px` })
    expect(cssFor(section.parentElement).replace(/\s+/g, '')).toMatch(/\.transactions_list>\.[\w-]+\{margin-top:0;margin-bottom:0;\}/)
    expect(view.getByRole('heading', { level: 2, name: 'No transactions found' })).toBeInTheDocument()
    // without an image of the theme (neither empty.transactions nor empty.not_found), the icon
    expect(empty.querySelector('img')).toBeNull()
    expect(stateRules(wallet).join('')).not.toContain('scale(')
  })

  it('no transactions, images.empty.transactions; without it, empty.not_found', () => {
    state.transactions = []
    const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
    const { wallet, unmount } = renderWallet(type, withImages({ 'empty.transactions': 'https://cdn.test/tx.png', 'empty.not_found': 'https://cdn.test/nf.png' }))
    const img = wallet.querySelector('#not-found-source img')
    expect(img).toHaveAttribute('src', 'https://cdn.test/tx.png')
    // decorative: the message beside it says it
    expect(img).toHaveAttribute('alt', '')
    unmount()
    const { wallet: w2 } = renderWallet(type, withImages({ 'empty.not_found': 'https://cdn.test/nf.png' }))
    expect(w2.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
  })

  it('the transactions\' error, the error of NotFoundSource with empty.not_found (not the transactions\' image)', () => {
    state.transactions = []
    state.transactionsError = ['boom']
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.transactions': 'https://cdn.test/tx.png', 'empty.not_found': 'https://cdn.test/nf.png' } }))
    const view = renderWallet(type, theme)
    expect(view.getByRole('heading', { level: 2, name: 'Sorry, an error has occurred' })).toBeInTheDocument()
    expect(view.wallet.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
  })

  it('the wallet tabs are the Tabs primitive, each a button (still hidden)', () => {
    const view = renderWallet(type, spacedTheme())
    const tabs = view.getAllByRole('tab', { hidden: true })
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Cash Wallet', 'Credit Points Wallet'])
    tabs.forEach((tab) => {
      expect(tab.tagName).toBe('BUTTON')
      expect(tab).toHaveAttribute('type', 'button')
      expect(stateRules(tab).join('')).not.toMatch(/translateY|scale/)
    })
    expect(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveTextContent(type === 'cash' ? 'Cash Wallet' : 'Credit Points Wallet')
    expect(view.getByRole('tablist', { hidden: true }).parentElement).toHaveAttribute('hidden')
  })
})

describe('/wallets: the loyalty level and the page without a wallet in the query', () => {
  it('the level md from its name; an image that fails, the placeholder with the lg trophy; no hover', () => {
    const theme = spacedTheme()
    const { balance } = renderWallet('credit_point', theme)
    const name = balance.querySelector('.loyalty_name')
    const level = name.parentElement
    fireEvent.error(level.querySelector('img'))
    expect(level).toHaveStyle({ gap: `${SPACE.md}px` })
    expect(name).toHaveStyle({ color: theme.values.tokens.color.text, marginLeft: '0px' })
    const placeholder = balance.querySelector('.loyalty_placeholder')
    expect(placeholder).toHaveStyle({ backgroundColor: theme.values.tokens.color.surface_alt, color: theme.values.tokens.color.text_muted })
    expect(placeholder.querySelector('svg')).toHaveStyle({ width: `${ICON.lg}px`, height: `${ICON.lg}px` })
    expectNoHover(level)
    expect(stateRules(placeholder.parentElement).join('')).not.toContain('scale(')
  })

  it('a level without an image, images.placeholder.loyalty_level of the theme', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'placeholder.loyalty_level': 'https://cdn.test/level.png' } }))
    const { balance } = renderWallet('credit_point', theme)
    const img = balance.querySelector('.loyalty_name').parentElement.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://cdn.test/level.png')
    expect(img).toHaveAttribute('alt', 'Gold')
  })

  it('the level\'s own image wins over the placeholder; without either, the bundle\'s dummy', () => {
    state.levelImage = 'https://cdn.test/gold.png'
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'placeholder.loyalty_level': 'https://cdn.test/level.png' } }))
    const { balance, unmount } = renderWallet('credit_point', theme)
    expect(balance.querySelector('.loyalty_name').parentElement.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/gold.png')
    unmount()
    state.levelImage = null
    const { balance: b2 } = renderWallet('credit_point', themeWithValues())
    expect(b2.querySelector('.loyalty_name').parentElement.querySelector('img')).toHaveAttribute('src', THEME_IMAGE_DEFAULTS['placeholder.loyalty_level'])
  })

  it('no wallets, the empty state of the app as the page\'s h1', () => {
    state.wallets = []
    const view = renderWallet(undefined, themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.not_found': 'https://cdn.test/nf.png' } })))
    expect(view.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['No wallets to show at this time.'])
    expect(view.page.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
  })

  it('/wallets with no query is one box too (the page\'s, not the wallet\'s)', () => {
    const view = renderWallet(undefined, spacedTheme())
    const wallet = view.container.querySelector('[data-doc-section="cash-wallet"]')
    expect(view.page).toHaveStyle({ paddingTop: `${themeWithValues().values.components.account_page.base.padding_top}px`, paddingLeft: `${HEADER_SIDE}px` })
    expect(wallet).toHaveStyle({ paddingTop: '0px', paddingLeft: '0px', width: '100%' })
  })
})
