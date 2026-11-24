import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { GiftCardOrdersList } from '../index'

const state = vi.hoisted(() => ({ empty: false }))

vi.mock('~ui/src/components/GiftCard/VerticalGiftCardOrdersLayout', () => ({
  VerticalGiftCardOrdersLayout: ({ title, setIsEmpty }) => {
    React.useEffect(() => {
      if (state.empty) setIsEmpty(true)
    }, [])
    return state.empty ? null : <div data-testid='vertical-layout'>{title}</div>
  }
}))

describe('GiftCardOrdersList', () => {
  it('renders gift card order sections', () => {
    state.empty = false
    const { getByText, queryByRole } = renderWithProviders(<GiftCardOrdersList />)
    expect(getByText('Pending')).toBeInTheDocument()
    expect(getByText('Sent')).toBeInTheDocument()
    expect(getByText('Redeemed')).toBeInTheDocument()
    expect(queryByRole('heading', { name: 'You don\'t have cards' })).toBeNull()
  })

  it('without gift cards: the empty state of the page (an h2), as the orders tab', () => {
    state.empty = true
    const { getByRole } = renderWithProviders(<GiftCardOrdersList />)
    expect(getByRole('heading', { level: 2, name: 'You don\'t have cards' })).toBeInTheDocument()
  })
})
