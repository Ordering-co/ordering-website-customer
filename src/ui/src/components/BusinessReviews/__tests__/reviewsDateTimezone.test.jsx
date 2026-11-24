import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { BusinessReviews } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))

vi.mock('~components/components/BusinessReviews', () => ({
  BusinessReviews: ({ UIComponent, ...rest }) => (
    <UIComponent
      totalReviews={1}
      stars={5}
      onChangeReview={vi.fn()}
      handleClickOption={vi.fn()}
      {...rest}
    />
  )
}))

// created_at comes from the API in UTC
const reviews = { loading: false, reviews: [{ id: 1, name: 'Jane', total: 5, created_at: '2026-10-20 22:30:00', comment: 'Great' }] }
const theme = themeWithValues((values) => { values.visibility['business.reviews.review_date'] = true; return values })

describe("BusinessReviews: a review's date in the user's local time", () => {
  it.each([
    ['Asia/Kolkata', '21/10/26'],
    ['America/Los_Angeles', '20/10/26'],
    ['UTC', '20/10/26'],
    ['Pacific/Auckland', '21/10/26']
  ])('a user in %s reads %s', (zone, expected) => {
    withUserTimezone(zone, () => {
      const { getByText, unmount } = renderWithProviders(<BusinessReviews reviewsList={reviews} />, { theme })
      expect(getByText(expected)).toBeInTheDocument()
      unmount()
    })
  })
})
