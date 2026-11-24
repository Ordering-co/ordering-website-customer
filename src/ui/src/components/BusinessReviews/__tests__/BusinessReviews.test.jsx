import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ProgressBar } from '~ui/src/styles/Progress'
import { ReviewsProgressContent } from '../styles'
import { BusinessReviews } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))

vi.mock('~components/components/BusinessReviews', () => ({
  BusinessReviews: ({ UIComponent, ...rest }) => (
    <UIComponent
      reviewsList={{ loading: false, reviews: [{ id: 1, name: 'Jane', quality: 5, created_at: '2026-01-01', comment: 'Great' }] }}
      totalReviews={1}
      stars={5}
      onChangeReview={vi.fn()}
      handleClickOption={vi.fn()}
      {...rest}
    />
  )
}))

describe('BusinessReviews', () => {
  it('renders review author name', () => {
    const { getByText } = renderWithProviders(<BusinessReviews />)
    expect(getByText('Jane')).toBeInTheDocument()
  })

  describe('the stars of a review', () => {
    const RATED = { loading: false, reviews: [{ id: 1, name: 'Jane', total: 4.5, created_at: '2026-01-01', comment: 'Great' }] }

    it('complete theme: components.rating sm, one image named by the rating', () => {
      const theme = themeWithValues()
      const { getByRole, container } = renderWithProviders(<BusinessReviews reviewsList={RATED} />, { theme })
      const stars = getByRole('img', { name: '4.5 of 5 stars' })
      expect(stars.querySelectorAll('[data-slot=rating-star]')).toHaveLength(5)
      expect(stars.querySelector('[data-slot=rating-cut]').style.width).toBe('50%')
      expect(stars.style.getPropertyValue('--ui-rating-gap')).toBe(`${theme.values.tokens.space.xs}px`)
      expect(container.querySelector('.star-fill')).toBeNull()
    })
  })

  it('keeps the ratings count under the fixed cart bar while the page scrolls', () => {
    const { getByText } = renderWithProviders(<BusinessReviews />)
    // a flex item honors z-index without a position: any value paints it over the cart bar
    const ratings = getByText('1 Ratings').closest('p')
    expect(ratings).toHaveClass('ratings')
    expect(window.getComputedStyle(ratings.parentElement).display).toBe('flex')
    expect(['', 'auto']).toContain(window.getComputedStyle(ratings).zIndex)
  })

  it('the ratings count opens the ranking in a dialog named by its heading; Close closes it', async () => {
    const view = renderWithProviders(<BusinessReviews />)
    fireEvent.click(view.getByText('1 Ratings'))
    const dialog = await view.findByRole('dialog', { name: 'Ranking' })
    expect(dialog.querySelector('[data-slot="dialog-title"]')).toHaveTextContent('Ranking')
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
  })

  describe('no reviews', () => {
    const EMPTY = { loading: false, reviews: [] }

    it('complete theme: the empty state of the app (NotFoundSource, empty.not_found) in place of the list, an h3 under the title', () => {
      const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.not_found': 'https://cdn.test/nf.png' } }))
      const { container, getByRole } = renderWithProviders(<BusinessReviews reviewsList={EMPTY} />, { theme })
      expect(getByRole('heading', { level: 3, name: 'No reviews' })).toBeInTheDocument()
      expect(container.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
      expect(container.querySelector('#content')).toBeNull()
    })
  })

  describe('the average rating bar', () => {

    it('theme: the container only holds components.progress sm (and the marks)', () => {
      const completeTheme = themeWithValues()
      const { getByTestId, getByRole } = renderWith(completeTheme, (
        <ReviewsProgressContent data-testid='content'>
          <ProgressBar size='sm' value={80} aria-label='Customers reviews' />
        </ReviewsProgressContent>
      ))
      const css = cssFor(getByTestId('content'))
      expect(css).not.toContain('height:4px')
      expect(css).not.toContain('background:')
      expect(css).toContain('display:grid')
      expect(cssFor(getByRole('progressbar'))).toContain(`height:${completeTheme.values.components.progress.sizes.sm.height}px`)
    })
  })
})
