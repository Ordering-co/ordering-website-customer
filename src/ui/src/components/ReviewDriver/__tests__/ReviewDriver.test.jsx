import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ReviewDriver } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: () => null,
    errors: {},
    formState: { errors: {} }
  })
}))

vi.mock('~components/components/ReviewDriver', () => ({
  ReviewDriver: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
      dirverReviews={{ quality: 5 }}
      formState={{ loading: false, result: null }}
      handleSendDriverReview={vi.fn()}
      closeReviewDriver={vi.fn()}
      setIsDriverReviewed={vi.fn()}
      setDriverReviews={vi.fn()}
      useSimpleRating={false}
      {...rest}
    />
  )
}))

describe('ReviewDriver', () => {
  it('renders driver review prompt', () => {
    const { getByText } = renderWithProviders(<ReviewDriver />)
    expect(getByText('Rate your order')).toBeInTheDocument()
  })

  it('the comment is the base textarea and the submit button the base button, which sends', () => {
    const handleSendDriverReview = vi.fn()
    const { getByRole, container } = renderWithProviders(<ReviewDriver handleSendDriverReview={handleSendDriverReview} />)
    expect(container.querySelector('textarea[name="comments"]')).toHaveAttribute('data-slot', 'textarea')
    const send = getByRole('button', { name: 'Continue' })
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send).toHaveAttribute('type', 'submit')
    expect(send).not.toHaveAttribute('aria-busy')
    fireEvent.click(send)
    expect(handleSendDriverReview).toHaveBeenCalledTimes(1)
  })

  it('while sending the button is busy, keeps its label and does not send again', () => {
    const handleSendDriverReview = vi.fn()
    const { getByRole } = renderWithProviders(<ReviewDriver formState={{ loading: true, result: null }} handleSendDriverReview={handleSendDriverReview} />)
    const send = getByRole('button', { name: 'Continue' })
    expect(send).toHaveAttribute('aria-busy', 'true')
    expect(send).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(send)
    expect(handleSendDriverReview).not.toHaveBeenCalled()
  })

  it('the submit button column is a 36ch reading width (25ch on a phone), and the whole row when the theme says main actions are full width', () => {
    const columns = (theme) => {
      const view = renderWithProviders(<ReviewDriver />, { theme })
      const css = cssFor(view.getByRole('button', { name: 'Continue' }).parentElement)
      view.unmount()
      return css
    }
    const narrow = columns(themeWithValues())
    expect(narrow).toContain('grid-template-columns:min(100%,36ch)')
    expect(narrow).toContain('grid-template-columns:min(100%,25ch)')
    expect(narrow).not.toMatch(/columns:(300|200)px/)
    const full = columns(themeWithValues((values) => { values.components.button.base.cta_full_width = true; return values }))
    expect(full).toContain('grid-template-columns:100%')
    expect(full).not.toContain('36ch')
  })
})
