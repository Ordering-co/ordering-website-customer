import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { purchaseGiftCardFixture } from '../../../__tests__/helpers/giftCardStudentTestMocks'
import { PurchaseGiftCard } from '../index'

vi.mock('~components/components/GiftCard/PurchaseGiftCard', () => ({
  PurchaseGiftCard: ({ UIComponent, ...rest }) => (
    <UIComponent {...purchaseGiftCardFixture} {...rest} />
  )
}))

const products = { loading: false, products: [{ id: 1, name: '$25 Gift Card', price: 25 }, { id: 2, name: '$50 Gift Card', price: 50 }] }

describe('PurchaseGiftCard', () => {
  it('renders gift card products under the section title (an h2)', () => {
    const { getByText, getByRole } = renderWithProviders(<PurchaseGiftCard />)
    expect(getByRole('heading', { level: 2, name: 'Select your gift card' })).toBeInTheDocument()
    expect(getByText('$25 Gift Card')).toBeInTheDocument()
    expect(getByText('Purchase')).toBeInTheDocument()
  })

  it('only the Purchase button buys, named with its amount', () => {
    const handleAccept = vi.fn()
    const { getByText, getByRole } = renderWithProviders(
      <PurchaseGiftCard productsListState={products} handleAccept={handleAccept} />
    )
    fireEvent.click(getByText('$25 Gift Card'))
    expect(handleAccept).not.toHaveBeenCalled()
    fireEvent.click(getByRole('button', { name: 'Purchase $50' }))
    expect(handleAccept).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })

  it('is not a choice list', () => {
    const { queryAllByRole } = renderWithProviders(<PurchaseGiftCard productsListState={products} />)
    expect(queryAllByRole('radio')).toHaveLength(0)
    expect(queryAllByRole('radiogroup')).toHaveLength(0)
  })

  it('without gift cards: the empty state, one level under the section title', () => {
    const { getByRole } = renderWithProviders(<PurchaseGiftCard productsListState={{ loading: false, products: [] }} />)
    expect(getByRole('heading', { level: 3, name: 'No gift cards available right now' })).toBeInTheDocument()
  })
})
