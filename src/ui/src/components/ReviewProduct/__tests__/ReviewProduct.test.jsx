import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { ReviewProduct } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => {},
    handleSubmit: (fn) => () => fn({}),
    formState: { errors: {} },
    errors: {}
  })
}))

vi.mock('~components/components/ReviewProduct', () => ({
  ReviewProduct: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{
        business: businessFixture,
        products: [[{ id: 1, name: 'Burger' }]],
        delivery_datetime: '2026-01-01'
      }}
      formState={{ changes: [] }}
      handleSendProductReview={vi.fn()}
      closeReviewProduct={vi.fn()}
      setIsProductReviewed={vi.fn()}
      {...rest}
    />
  )
}))

describe('ReviewProduct', () => {
  it('renders business name in review header', () => {
    const { getByText } = renderWithProviders(<ReviewProduct />)
    expect(getByText(/Demo Store/)).toBeInTheDocument()
  })

  it('the submit button is the base button: disabled without changes, busy while sending, sends otherwise', () => {
    const handleSendProductReview = vi.fn()
    const { getByRole, rerender } = renderWithProviders(<ReviewProduct />)
    expect(getByRole('button', { name: 'Continue' })).toHaveAttribute('data-slot', 'button')
    expect(getByRole('button', { name: 'Continue' })).toBeDisabled()
    rerender(<ReviewProduct formState={{ changes: [{}], loading: true }} handleSendProductReview={handleSendProductReview} />)
    expect(getByRole('button', { name: 'Continue' })).toHaveAttribute('aria-busy', 'true')
    rerender(<ReviewProduct formState={{ changes: [{}] }} handleSendProductReview={handleSendProductReview} />)
    const send = getByRole('button', { name: 'Continue' })
    expect(send).not.toBeDisabled()
    expect(send).not.toHaveAttribute('aria-busy')
    fireEvent.click(send)
    expect(handleSendProductReview).toHaveBeenCalledTimes(1)
  })
})
