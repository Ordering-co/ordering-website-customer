import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { checkoutCartFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { MultiCartsPaymethodsAndWallets } from '../index'
import { BUNDLED_IMAGES } from '../../../../../utils/bundledImages'

vi.mock('~components/components/MultiCartsPaymethodsAndWallets', () => ({
  MultiCartsPaymethodsAndWallets: ({ UIComponent, ...rest }) => (
    <UIComponent
      paymethodsAndWallets={{
        loading: false,
        paymethods: [{ id: 1, name: 'Cash', gateway: 'cash', enabled: true }]
      }}
      paymethodSelected={null}
      handleSelectPaymethod={vi.fn()}
      openCarts={[checkoutCartFixture]}
      cartGroup={{ carts: [checkoutCartFixture.uuid] }}
      walletsState={[]}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/PaymentOptionStripe', () => ({
  PaymentOptionStripe: () => null
}))

vi.mock('~ui/src/components/StripeElementsForm', () => ({
  StripeElementsForm: () => null
}))

vi.mock('~ui/src/components/PaymentOptionEpayco', () => ({
  PaymentOptionEpayco: () => null
}))

describe('MultiCartsPaymethodsAndWallets', () => {
  it('renders available paymethods', () => {
    const { getByText } = renderWithProviders(<MultiCartsPaymethodsAndWallets />)
    expect(getByText('Cash')).toBeInTheDocument()
  })
})

const completeTheme = (showIndicator = true) => themeWithValues((values) => {
  values.components.choice.base.show_indicator = showIndicator
  values.components.choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  return values
})

const paymethodsAndWallets = {
  loading: false,
  paymethods: [{ id: 1, name: 'Cash', gateway: 'cash' }, { id: 2, name: 'Card', gateway: 'card_delivery' }],
  wallets: []
}

describe('MultiCartsPaymethodsAndWallets', () => {
  it('each method is an action row of the choice; picking one selects it (also the current one)', () => {
    const handleSelectPaymethod = vi.fn()
    const { getAllByRole } = renderWithProviders(
      <MultiCartsPaymethodsAndWallets
        paymethodsAndWallets={paymethodsAndWallets}
        paymethodSelected={{ id: 2 }}
        handleSelectPaymethod={handleSelectPaymethod}
      />,
      { theme: completeTheme() }
    )
    const [cash, card] = getAllByRole('button')
    expect(card).toHaveAttribute('data-slot', 'choice')
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(cash).toHaveAttribute('aria-pressed', 'false')
    expect(card).toHaveAttribute('data-doc-state', 'selected')
    expect(cash).toHaveAttribute('data-doc-control', 'multi-checkout-payment-method')
    expect(card.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(card.querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    fireEvent.click(cash)
    expect(handleSelectPaymethod).toHaveBeenCalledWith(expect.objectContaining({ id: 1, paymethod_id: 1 }))
    handleSelectPaymethod.mockClear()
    // the arrows select nothing: opening a method can open Stripe
    fireEvent.keyDown(cash, { key: 'ArrowDown' })
    expect(handleSelectPaymethod).not.toHaveBeenCalled()
    fireEvent.click(card)
    expect(handleSelectPaymethod).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })

  it('options are disabled while the payment is incomplete; hidden indicator with show_indicator false', () => {
    const { getAllByRole } = renderWithProviders(
      <MultiCartsPaymethodsAndWallets paymethodsAndWallets={paymethodsAndWallets} cartGroup={{ result: { status: 'payment_incomplete' } }} />,
      { theme: completeTheme(false) }
    )
    expect(getAllByRole('button')[0]).toBeDisabled()
    expect(getAllByRole('button')[0].querySelector('[data-slot="choice-indicator"]')).toBeNull()
  })
})

describe('MultiCartsPaymethodsAndWallets — the checkout\'s choice block', () => {
  const stripeCard = {
    id: 3,
    gateway: 'stripe_direct',
    paymethod: { gateway: 'stripe_direct' },
    paymethod_data: { id: 'pm_1', card: { brand: 'visa', last4: '4242' } }
  }

  it('the methods are a group the choice\'s gap apart, the width of their container', () => {
    const theme = themeWithValues((values) => {
      values.components.choice.base.gap = 6
      return values
    })
    const { getByRole } = renderWithProviders(
      <MultiCartsPaymethodsAndWallets paymethodsAndWallets={paymethodsAndWallets} />,
      { theme }
    )
    const list = getByRole('group', { name: 'Payment Methods' })
    const css = cssFor(list)
    expect(css).toContain('gap:6px')
    expect(css).not.toContain('max-width')
  })

  it('the card picked is the selected option of the choice under its title, as in the checkout', () => {
    const themed = renderWithProviders(
      <MultiCartsPaymethodsAndWallets paymethodsAndWallets={paymethodsAndWallets} paymethodSelected={stripeCard} />,
      { theme: completeTheme() }
    )
    expect(themed.getByRole('heading', { name: 'Card' })).toBeInTheDocument()
    const card = themed.getByRole('radio', { name: 'XXXX-XXXX-XXXX-4242' })
    expect(card).toHaveAttribute('aria-checked', 'true')
    // it is the selected look of the theme's choice (components.choice), written on the piece
    expect(card).toHaveAttribute('data-checked')
    expect(card.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(card.style.getPropertyValue('--ui-choice-selected-border')).not.toBe('')
    // its indicator is the base one (a radio of components.radio), not the legacy glyph
    expect(card.querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(themed.container.querySelector('.checks')).toBeNull()
  })
})

describe('MultiCartsPaymethodsAndWallets: visibility checkout.payment_methods.logo', () => {
  const withVisibility = (visibility) => themeWithValues((values) => {
    Object.assign(values.visibility, visibility)
    return values
  })

  it('the methods\' logos: shown by default, hidden by the theme', () => {
    const logo = (theme) => {
      const { getAllByRole, unmount } = renderWithProviders(<MultiCartsPaymethodsAndWallets paymethodsAndWallets={paymethodsAndWallets} />, { theme })
      const result = !!getAllByRole('button')[0].querySelector('svg.lucide-banknote')
      unmount()
      return result
    }
    expect(logo(themeWithValues())).toBe(true)
    expect(logo(withVisibility({ 'checkout.payment_methods.logo': false }))).toBe(false)
  })
})

describe('MultiCartsPaymethodsAndWallets: card on delivery', () => {
  it('the method 2 logo is a Lucide stroke icon with the inherited color, not an image with its own gray (implementation notes B1)', () => {
    const { getAllByRole } = renderWithProviders(
      <MultiCartsPaymethodsAndWallets paymethodsAndWallets={{ loading: false, paymethods: [{ id: 2, name: 'Card on delivery', gateway: 'card_delivery' }], wallets: [] }} />
    )
    const logo = getAllByRole('button')[0].querySelector('[data-slot="choice-icon"]')
    expect(logo.querySelector('img')).toBeNull()
    const icon = logo.querySelector('svg')
    expect(icon).toHaveClass('lucide-credit-card')
    expect(icon).toHaveAttribute('stroke', 'currentColor')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('MultiCartsPaymethodsAndWallets: the add-card dialog', () => {
  it('picking Stripe direct opens the base Dialog "Add card"; its close closes it', async () => {
    const { getByText, findByRole, queryByRole } = renderWithProviders(
      <MultiCartsPaymethodsAndWallets
        paymethodsAndWallets={{ loading: false, paymethods: [{ id: 3, name: 'Stripe direct', gateway: 'stripe_direct', enabled: true }] }}
      />
    )
    fireEvent.click(getByText('Stripe direct'))
    const dialog = await findByRole('dialog', { name: 'Add card' })
    expect(within(dialog).getByText('Please add a publishable key')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})
