import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessReviews } from '../index'

// The search of the comments and the ranking (the average and the ratings to
// filter by), off by default (visibility business.reviews.search, .ranking).

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))

const handlers = vi.hoisted(() => ({ onChangeReview: vi.fn(), handleClickOption: vi.fn() }))

vi.mock('~components/components/BusinessReviews', () => ({
  BusinessReviews: ({ UIComponent, ...rest }) => (
    <UIComponent
      reviewsList={{
        loading: false,
        reviews: [
          { id: 1, name: 'Jane', total: 5, created_at: '2026-01-02T10:00:00', comment: 'Great' },
          { id: 2, total: 4, created_at: '2026-01-03T10:00:00', comment: 'Fine' }
        ]
      }}
      totalReviews={2}
      stars={4.5}
      {...handlers}
      {...rest}
    />
  )
}))

const withKeys = (keys) => themeWithValues((values) => {
  Object.assign(values.visibility, keys)
  return values
})

describe('reviews: the search and the ranking', () => {
  beforeEach(() => {
    handlers.onChangeReview.mockClear()
    handlers.handleClickOption.mockClear()
  })

  it('by default neither (both off)', () => {
    const { queryByRole, queryByText } = renderWithProviders(<BusinessReviews />, { theme: themeWithValues() })
    expect(queryByRole('textbox', { name: 'Search' })).toBeNull()
    expect(queryByText('Customers reviews')).toBeNull()
  })

  it('search on: a named field that filters the comments as it is typed', () => {
    const { getByRole } = renderWithProviders(<BusinessReviews />, { theme: withKeys({ 'business.reviews.search': true }) })
    fireEvent.change(getByRole('textbox', { name: 'Search' }), { target: { value: 'gre' } })
    expect(handlers.onChangeReview).toHaveBeenLastCalledWith('gre')
    fireEvent.change(getByRole('textbox', { name: 'Search' }), { target: { value: '' } })
    expect(handlers.onChangeReview).toHaveBeenLastCalledWith('')
  })

  it('ranking on: the average as a bar and a button per rating that filters by it; again, all of them', () => {
    const { getByText, getByRole } = renderWithProviders(<BusinessReviews />, { theme: withKeys({ 'business.reviews.ranking': true }) })
    expect(getByText('Customers reviews')).toBeInTheDocument()
    expect(getByRole('progressbar')).toBeInTheDocument()
    const four = getByRole('button', { name: '4 of 5 stars' })
    expect(four).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(four)
    expect(handlers.handleClickOption).toHaveBeenLastCalledWith(4)
    expect(four).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(four)
    expect(handlers.handleClickOption).toHaveBeenLastCalledWith('all')
    expect(four).toHaveAttribute('aria-pressed', 'false')
  })
})
