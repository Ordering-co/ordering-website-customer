import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, professionalFixture } from '../../__tests__/helpers/ordersTestMocks'
import { ReviewProfessional } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia } from '~/utils/themeTokens'

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
      order={{ ...pastOrder, professional: professionalFixture }}
      dirverReviews={{ quality: 5 }}
      formState={{ loading: false, result: null }}
      handleSendDriverReview={vi.fn()}
      closeReviewProfessional={vi.fn()}
      setIsProfessionalReviewed={vi.fn()}
      setDriverReviews={vi.fn()}
      {...rest}
    />
  )
}))

describe('ReviewProfessional', () => {
  it('renders professional service review prompt', () => {
    const { getByText } = renderWithProviders(<ReviewProfessional />)
    expect(getByText('How was your service?')).toBeInTheDocument()
    expect(getByText('Send review')).toBeInTheDocument()
  })

  it('the comment is the base textarea and the submit button the base button, which sends', () => {
    const handleSendDriverReview = vi.fn()
    const { getByRole, container } = renderWithProviders(<ReviewProfessional handleSendDriverReview={handleSendDriverReview} />)
    expect(container.querySelector('textarea[name="comment"]')).toHaveAttribute('data-slot', 'textarea')
    const send = getByRole('button', { name: 'Send review' })
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send).toHaveAttribute('type', 'submit')
    expect(send).not.toHaveAttribute('aria-busy')
    fireEvent.click(send)
    expect(handleSendDriverReview).toHaveBeenCalledTimes(1)
  })

  it('while sending the button is busy, keeps its label and does not send again', () => {
    const handleSendDriverReview = vi.fn()
    const { getByRole } = renderWithProviders(<ReviewProfessional formState={{ loading: true, result: null }} handleSendDriverReview={handleSendDriverReview} />)
    const send = getByRole('button', { name: 'Send review' })
    expect(send).toHaveAttribute('aria-busy', 'true')
    expect(send).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(send)
    expect(handleSendDriverReview).not.toHaveBeenCalled()
  })

  it('the portrait frame is a square of the md medium of the theme, its fallback glyph filling it', () => {
    const theme = themeWithValues()
    const { container } = renderWithProviders(<ReviewProfessional />, { theme })
    const frame = container.querySelector('svg').parentElement
    const css = cssFor(frame).replace(/\s+/g, '')
    expect(css).toContain(`width:${themeMedia(theme, 'md')};aspect-ratio:1;`)
    expect(css).toMatch(/svg\{width:100%;height:100%;/)
  })
})
