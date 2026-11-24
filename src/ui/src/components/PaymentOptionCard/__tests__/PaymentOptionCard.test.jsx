import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptionCard } from '../index'

vi.mock('~ui/src/components/PaymentOptionStripe', () => ({
  PaymentOptionStripeUI: () => <div data-testid='stripe-ui'>Stripe UI</div>
}))
vi.mock('~ui/src/components/CardFormCustom', () => ({
  CardFormCustom: () => <div data-testid='card-form-custom' />
}))

vi.mock('~components/components/PaymentOptionStripe', () => ({
  PaymentOptionStripe: ({ UIComponent, ...rest }) => (
    <UIComponent
      cardsList={{ loading: false, cards: [] }}
      gateway='credomatic'
      handleNewCard={vi.fn()}
      paymethodSelected={{ paymethod: { gateway: 'credomatic' } }}
      token='test-token'
      {...rest}
    />
  )
}))

describe('PaymentOptionCard', () => {
  it('renders card payment shell', () => {
    const { getByTestId } = renderWithProviders(<PaymentOptionCard />)
    expect(getByTestId('stripe-ui')).toBeInTheDocument()
  })

  it('with no saved cards the add-card dialog opens with the card form, and closes', async () => {
    const { findByRole, queryByRole } = renderWithProviders(<PaymentOptionCard />)
    const dialog = await findByRole('dialog', { name: 'Add new card' })
    expect(within(dialog).getByTestId('card-form-custom')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})
