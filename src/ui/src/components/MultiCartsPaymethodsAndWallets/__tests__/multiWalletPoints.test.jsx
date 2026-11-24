import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { MultiCartsPaymethodsAndWallets } from '../index'

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { wallet_cash_enabled: { value: '1' }, wallet_credit_point_enabled: { value: '1' } } }]
}))
vi.mock('~ui/src/components/PaymentOptionStripe', () => ({ PaymentOptionStripe: () => null }))
vi.mock('~ui/src/components/StripeElementsForm', () => ({ StripeElementsForm: () => null }))
vi.mock('~ui/src/components/PaymentOptionEpayco', () => ({ PaymentOptionEpayco: () => null }))

const wallet = { id: 2, type: 'credit_point', balance: 40, redemption_rate: 10 }
const handleSelectWallet = vi.hoisted(() => vi.fn())

vi.mock('~components/components/MultiCartsPaymethodsAndWallets', () => ({
  MultiCartsPaymethodsAndWallets: ({ UIComponent, ...rest }) => (
    <UIComponent
      paymethodsAndWallets={{ loading: false, paymethods: [], wallets: [{ type: 'credit_point' }] }}
      walletsState={{ loading: false, result: [wallet] }}
      walletsPaymethod={[]}
      handleSelectPaymethod={vi.fn()}
      handleSelectWallet={handleSelectWallet}
      cartGroup={{}}
      balance={20}
      {...rest}
    />
  )
}))

// visibility.checkout.wallet.points_equivalence: "= $x" after the points,
// off by default as in the single checkout (it was always shown here)
describe('MultiCartsPaymethodsAndWallets: the points\' value in money', () => {
  const row = (theme) => {
    const utils = renderWithProviders(<MultiCartsPaymethodsAndWallets />, { theme })
    const text = utils.getByText('Pay with Credit Points Wallet').closest('[data-slot="choice"]').textContent
    utils.unmount()
    return text
  }

  it('hidden by default: only the points', () => {
    const text = row(themeWithValues())
    expect(text).toContain('40 Points')
    expect(text).not.toContain('=')
  })

  it('on: the points and what they are worth', () => {
    const text = row(themeWithValues((values) => { values.visibility['checkout.wallet.points_equivalence'] = true; return values }))
    expect(text).toMatch(/40 Points\s*= \$?4/)
  })
})

describe('MultiCartsPaymethodsAndWallets: the wallet rows are checkbox choices', () => {
  // (jsdom has no PointerEvent: a mouse event that carries the pointer's fields, as Select.test does)
  class FakePointerEvent extends MouseEvent {
    constructor (type, init = {}) {
      super(type, init)
      this.pointerType = init.pointerType
    }
  }
  beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
  afterEach(() => vi.unstubAllGlobals())

  it('the row is one control: its text and balance describe it, a click toggles the wallet', () => {
    handleSelectWallet.mockClear()
    const { getByRole } = renderWithProviders(<MultiCartsPaymethodsAndWallets />, { theme: themeWithValues() })
    const row = getByRole('checkbox', { name: 'Pay with Credit Points Wallet' })
    expect(row).toHaveAttribute('data-slot', 'choice')
    expect(row).toHaveAttribute('aria-checked', 'false')
    expect(row.querySelector('[data-slot="choice-trailing"]')).toHaveTextContent('40 Points')
    fireEvent.click(row)
    expect(handleSelectWallet).toHaveBeenCalledWith(true, wallet)
  })

  it('a payment already confirmed shows the row without a box and picks nothing', () => {
    handleSelectWallet.mockClear()
    const { getByRole } = renderWithProviders(<MultiCartsPaymethodsAndWallets cartGroup={{ result: { status: 'payment_incomplete' } }} walletsPaymethod={[{ id: 9, wallet_id: 2 }]} />, { theme: themeWithValues() })
    const row = getByRole('checkbox', { name: 'Pay with Credit Points Wallet' })
    expect(row).toHaveAttribute('aria-checked', 'true')
    expect(row.querySelector('[data-slot="choice-indicator"]')).toBeNull()
    fireEvent.click(row)
    expect(handleSelectWallet).not.toHaveBeenCalled()
  })

  it('a wallet with no balance is disabled', () => {
    wallet.balance = 0
    const { getByRole } = renderWithProviders(<MultiCartsPaymethodsAndWallets />, { theme: themeWithValues() })
    expect(getByRole('checkbox', { name: 'Pay with Credit Points Wallet' })).toHaveAttribute('aria-disabled', 'true')
    wallet.balance = 40
  })
})
