import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { ReviewOrder } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: () => null,
    errors: {},
    formState: { errors: {} }
  })
}))

vi.mock('~components/components/OrderReview', () => ({
  OrderReview: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
      stars={{ quality: 5 }}
      formState={{ loading: false, result: null }}
      handleSendReview={vi.fn()}
      closeReviewOrder={vi.fn()}
      setIsReviewed={vi.fn()}
      setStars={vi.fn()}
      useSimpleRating={false}
      {...rest}
    />
  )
}))

describe('ReviewOrder', () => {
  it('renders business order review prompt', () => {
    const { getByText } = renderWithProviders(<ReviewOrder />)
    expect(getByText('Rate the business')).toBeInTheDocument()
  })

  it('the comment is the base textarea; the submit button is the base button with its arrow, which sends', () => {
    const handleSendReview = vi.fn()
    const { getByRole, container } = renderWithProviders(<ReviewOrder handleSendReview={handleSendReview} />)
    expect(container.querySelector('textarea[name="comments"]')).toHaveAttribute('data-slot', 'textarea')
    const send = getByRole('button', { name: 'Continue' })
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send.querySelector('svg')).not.toBeNull()
    fireEvent.click(send)
    expect(handleSendReview).toHaveBeenCalledTimes(1)
  })

  it('while sending the button is busy, keeps its label and does not send again', () => {
    const handleSendReview = vi.fn()
    const { getByRole } = renderWithProviders(<ReviewOrder formState={{ loading: true, result: null }} handleSendReview={handleSendReview} />)
    const send = getByRole('button', { name: 'Continue' })
    expect(send).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(send)
    expect(handleSendReview).not.toHaveBeenCalled()
  })
})
