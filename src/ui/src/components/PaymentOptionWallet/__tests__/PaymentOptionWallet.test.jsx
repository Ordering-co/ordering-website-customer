import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { walletFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { PaymentOptionWallet } from '../index'

// Base UI forwards a pointer event to the checkbox's native input.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const mocks = vi.hoisted(() => ({ selectWallet: vi.fn() }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      wallet_cash_enabled: { value: '1' },
      wallet_credit_point_enabled: { value: '1' }
    }
  }]
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: () => null
}))

vi.mock('~components/components/PaymentOptionWallet', () => ({
  PaymentOptionWallet: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={{ wallets: [] }}
      walletsState={{ loading: false, error: null, result: [{ ...walletFixture, valid: true, balance: 25 }] }}
      businessConfigs={[
        { key: 'wallet_cash_enabled', value: '1' },
        { key: 'wallet_credit_point_enabled', value: '1' }
      ]}
      selectWallet={mocks.selectWallet}
      deletetWalletSelected={vi.fn()}
      setErrorState={vi.fn()}
      errorState={null}
      {...rest}
    />
  )
}))

describe('PaymentOptionWallet', () => {
  it('renders wallet payment option', () => {
    const { getByText } = renderWithProviders(<PaymentOptionWallet />)
    expect(getByText('Pay with Wallet credits')).toBeInTheDocument()
  })

  it('each wallet is an option of a multiple choice list: one checkbox row named by its title, the balance at the end', () => {
    const { getByRole, getByText } = renderWithProviders(<PaymentOptionWallet />, { theme: themeWithValues() })
    const checkbox = getByRole('checkbox', { name: 'Pay with Wallet credits' })
    expect(checkbox).toHaveAttribute('data-slot', 'choice')
    expect(checkbox.querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(checkbox.querySelector('[data-slot="choice-trailing"]')).toHaveTextContent('25 Wallet credits')
    fireEvent.click(getByText('Pay with Wallet credits'))
    expect(mocks.selectWallet).toHaveBeenCalled()
  })

  it('confirmed with the cart (status 2) the row has no indicator and picks nothing', () => {
    mocks.selectWallet.mockClear()
    const { getByRole, getByText } = renderWithProviders(<PaymentOptionWallet cart={{ status: 2, wallets: [{ id: walletFixture.id }] }} />, { theme: themeWithValues() })
    const row = getByRole('checkbox', { name: 'Pay with Wallet credits' })
    expect(row.querySelector('[data-slot="choice-indicator"]')).toBeNull()
    expect(row).toHaveAttribute('aria-readonly', 'true')
    fireEvent.click(getByText('Pay with Wallet credits'))
    expect(mocks.selectWallet).not.toHaveBeenCalled()
  })

  it('a wallet with no balance is disabled', () => {
    const { getByRole } = renderWithProviders(
      <PaymentOptionWallet walletsState={{ loading: false, error: null, result: [{ ...walletFixture, valid: true, balance: 0 }] }} />,
      { theme: themeWithValues() }
    )
    expect(getByRole('checkbox', { name: 'Pay with Wallet credits' })).toHaveAttribute('data-disabled')
  })

  it('the cash wallet shows the coins icon (no image)', () => {
    const { container } = renderWithProviders(<PaymentOptionWallet />, { theme: themeWithValues() })
    expect(container.querySelector('[data-slot="choice-icon"] svg.lucide-coins')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('[data-slot="choice-icon"] img')).toBeNull()
  })
})

// visibility.checkout.wallet.points_equivalence: "= $x" after the points (off by default)
describe('PaymentOptionWallet: the points\' value in money', () => {
  const points = { walletsState: { loading: false, error: null, result: [{ id: 2, type: 'credit_point', valid: true, balance: 40, redemption_rate: 10 }] } }
  const row = (theme) => {
    const utils = renderWithProviders(<PaymentOptionWallet {...points} />, { theme })
    const text = utils.getByRole('checkbox', { name: 'Pay with Loyalty points' }).textContent
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
