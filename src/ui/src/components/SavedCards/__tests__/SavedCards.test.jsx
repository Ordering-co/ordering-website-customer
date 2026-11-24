import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SavedCards } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, title, children }) => (open ? <div>{title}{children}</div> : null)
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: () => null
}))
vi.mock('~ui/src/components/StripeElementsForm', () => ({
  StripeElementsForm: () => <div data-testid='stripe-elements-form' />
}))
vi.mock('../useSavedCardsGateway', () => ({
  useSavedCardsGateway: () => ({
    gateway: null,
    paymethodId: null,
    isAvailable: false,
    loading: false
  })
}))

describe('SavedCards', () => {
  it('renders unavailable saved cards state', () => {
    const { getByText } = renderWithProviders(<SavedCards />, { theme: themeWithValues() })
    expect(getByText('Saved cards are not available for this store.')).toBeInTheDocument()
  })
})

describe('SavedCards: its empty states with the theme', () => {
  const NF = 'https://cdn.test/nf.png'

  it('the empty state of the app (NotFoundSource, empty.not_found), an h2 of the page', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.not_found': NF } }))
    const { container, getByRole } = renderWithProviders(<SavedCards />, { theme })
    expect(getByRole('heading', { level: 2, name: 'Saved cards are not available for this store.' })).toBeInTheDocument()
    expect(container.querySelector('#not-found-source img')).toHaveAttribute('src', NF)
  })
})
