import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { fieldIcon, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessReviewsUI } from '../index'

describe('BusinessReviews search: the magnifier (§2.5)', () => {
  it('uses the search field theme and leaves room for a decorative icon at the start', () => {
    const theme = themeWithValues((values) => {
      values.visibility['business.reviews.search'] = true
      return values
    })
    const { getByRole } = renderWithProviders(
      <BusinessReviewsUI totalReviews={1} stars={5} reviewsList={{ loading: false, reviews: [{ id: 1, name: 'Jane' }] }} onChangeReview={vi.fn()} />,
      { theme }
    )
    const search = getByRole('textbox', { name: 'Search' })
    const group = search.closest('[data-slot=input-group]')
    const icon = group.querySelector('[data-slot=input-prefix]')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon.className).toContain('ui:start-md')
    expect(icon.className).toContain('ui:pointer-events-none')
    expect(group.style.getPropertyValue('--ui-input-icon-color')).toBe(fieldIcon(theme, 'search_bar').color)
    expect(group.style.getPropertyValue('--ui-input-icon-size')).toBe(fieldIcon(theme, 'search_bar').size)
  })
})
