import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ReviewTrigger } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click a radio
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

describe('ReviewTrigger', () => {
  it('renders review prompt and calls handleOpenOrderReview', () => {
    const handleOpenOrderReview = vi.fn()
    const { getByText } = renderWithProviders(
      <ReviewTrigger order={pastOrder} handleOpenOrderReview={handleOpenOrderReview} />
    )
    expect(getByText(/Your feedback is very important/i)).toBeInTheDocument()
    expect(getByText('Pizza Place')).toBeInTheDocument()
    fireEvent.click(getByText('Review'))
    expect(handleOpenOrderReview).toHaveBeenCalledWith(5)
  })

  it('the stars are components.rating, a group of radios, the picked one checked', () => {
    const theme = themeWithValues()
    const handleOpenOrderReview = vi.fn()
    const { getByRole, getByText } = renderWithProviders(
      <ReviewTrigger order={pastOrder} handleOpenOrderReview={handleOpenOrderReview} />,
      { theme }
    )
    const group = getByRole('radiogroup', { name: 'Rate your order' })
    const third = getByRole('radio', { name: '3 of 5 stars' })
    expect(getByRole('radio', { name: '5 of 5 stars' })).toBeChecked()
    expect(group.style.getPropertyValue('--ui-rating-icon-size')).toBe(`${theme.values.tokens.icon.lg}px`)
    fireEvent.click(third)
    expect(third).toBeChecked()
    fireEvent.click(getByText('Review'))
    expect(handleOpenOrderReview).toHaveBeenCalledWith(3)
  })

  it('the Review button is the base button', () => {
    const { getByRole } = renderWithProviders(<ReviewTrigger order={pastOrder} handleOpenOrderReview={vi.fn()} />)
    const review = getByRole('button', { name: 'Review' })
    expect(review).toHaveAttribute('data-slot', 'button')
    expect(review).toHaveAttribute('type', 'button')
  })
})
