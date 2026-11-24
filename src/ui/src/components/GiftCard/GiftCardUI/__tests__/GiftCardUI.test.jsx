import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { GiftCardUI } from '../index'

vi.mock('~ui/src/components/GiftCard/PurchaseGiftCard', () => ({
  PurchaseGiftCard: () => <div data-testid='purchase-gift-card-stub' />
}))

vi.mock('~ui/src/components/GiftCard/RedeemGiftCard', () => ({
  RedeemGiftCard: () => <div data-testid='redeem-gift-card-stub' />
}))

describe('GiftCardUI', () => {
  it('renders gift card hero and purchase section', () => {
    const { getAllByText, getByTestId } = renderWithProviders(<GiftCardUI />)
    expect(getAllByText('Gift Card Wallet').length).toBeGreaterThan(0)
    expect(getByTestId('purchase-gift-card-stub')).toBeInTheDocument()
  })

  // implementation notesthe base Dialog, the theme's lg
  it('opens redeem popup when redeem is pressed: a base Dialog; its close closes it', async () => {
    const { getByText, getByTestId } = renderWithProviders(<GiftCardUI />)
    fireEvent.click(getByText('Redeem'))
    expect(getByTestId('redeem-gift-card-stub')).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(dialog).toContainElement(getByTestId('redeem-gift-card-stub'))
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('redeem-gift-card-stub')).toBeNull())
  })

  it('one h1; the decorative hero card is hidden from assistive tech; the sections are h2', () => {
    const { container, getAllByRole } = renderWithProviders(<GiftCardUI />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('.card-label').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining(['Gift card'])
    )
  })

  it('the hero\'s line is the section divider (an hr)', () => {
    const { container } = renderWithProviders(<GiftCardUI />)
    expect(container.querySelector('hr')).not.toBeNull()
  })
})
