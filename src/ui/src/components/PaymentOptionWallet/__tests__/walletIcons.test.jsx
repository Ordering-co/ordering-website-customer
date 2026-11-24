import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { walletFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { PaymentOptionWallet } from '../index'

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { wallet_cash_enabled: { value: '1' }, wallet_credit_point_enabled: { value: '1' } } }]
}))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null }))
vi.mock('~components/components/PaymentOptionWallet', () => ({
  PaymentOptionWallet: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={{ wallets: [] }}
      walletsState={{
        loading: false,
        error: null,
        result: [
          { ...walletFixture, valid: true, balance: 25 },
          { ...walletFixture, id: 2, type: 'credit_point', valid: true, balance: 10, redemption_rate: 1 }
        ]
      }}
      businessConfigs={[{ key: 'wallet_cash_enabled', value: '1' }, { key: 'wallet_credit_point_enabled', value: '1' }]}
      selectWallet={vi.fn()}
      deletetWalletSelected={vi.fn()}
      setErrorState={vi.fn()}
      errorState={null}
      {...rest}
    />
  )
}))

describe('PaymentOptionWallet icons', () => {
  it('the coins in the rating color, the heart in the favorite color, of the theme\'s icon size', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color = { ...values.tokens.color, rating: '#FFB800', favorite: '#E63757' }
      values.tokens.icon = { ...values.tokens.icon, md: 20 }
      return values
    })
    const { container } = renderWithProviders(<PaymentOptionWallet />, { theme })
    const icons = Array.from(container.querySelectorAll('[data-slot="choice-icon"] > svg'))
    expect(icons).toHaveLength(2)
    expect(icons[0]).toHaveStyle({ color: '#FFB800' })
    expect(icons[1]).toHaveStyle({ color: '#E63757' })
    expect(icons[0].getAttribute('height')).toBe('20px')
    // decorative: the base icon hides it from assistive technology
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true')
  })
})
