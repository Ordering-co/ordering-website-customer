import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Review, ReviewItemContent } from '../styles'
import { BusinessReviews } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
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
      stars={5}
      onChangeReview={vi.fn()}
      handleClickOption={vi.fn()}
      {...rest}
    />
  )
}))

const DATES = /02\/01\/26|03\/01\/26/

describe('reviews: visibility business.reviews.review_date hides only the date', () => {
  it('shown: the author, the stars and the date', () => {
    const { getByText, container } = renderWithProviders(<BusinessReviews />, { theme: themeWithValues() })
    expect(getByText('Jane')).toBeInTheDocument()
    expect(container.textContent).toMatch(DATES)
  })

  it('complete theme hidden: no date, the author and the stars stay', () => {
    const theme = themeWithValues((values) => {
      values.visibility['business.reviews.review_date'] = false
      return values
    })
    const { getByText, container } = renderWithProviders(<BusinessReviews />, { theme })
    expect(getByText('Jane')).toBeInTheDocument()
    expect(container.querySelector('.review-avatar')).not.toBeNull()
    expect(container.textContent).not.toMatch(DATES)
  })
})

describe('reviews: components.business_reviews', () => {
  it('by default: 350px cards, 3 lines; the avatar is components.avatar, lg (md in the modal)', () => {
    const theme = themeWithValues()
    const avatar = theme.css.components.avatar
    expect(cssFor(renderWith(theme, <Review />).container.firstChild)).toMatch(/width: ?350px/)
    for (const [isColumnMode, size] of [[false, 'lg'], [true, 'md']]) {
      const view = renderWithProviders(<BusinessReviews isColumnMode={isColumnMode} />, { theme })
      const initials = view.container.querySelector('.review-avatar')
      expect(initials.style.getPropertyValue('--ui-avatar-size')).toBe(avatar.sizes[size].size)
      expect(initials.style.getPropertyValue('--ui-avatar-background')).toBe(avatar.base.background)
      expect(initials.style.getPropertyValue('--ui-avatar-color')).toBe(avatar.base.color)
      expect(initials.className).toContain('ui:mr-lg')
      view.unmount()
    }
    expect(cssFor(renderWith(theme, <ReviewItemContent />).container.firstChild)).toMatch(/-webkit-line-clamp: ?3/)
  })

  it('the card height is a multiple of the theme size token, not a fixed px', () => {
    const theme = themeWithValues()
    expect(cssFor(renderWith(theme, <Review reviewName />).container.firstChild)).toMatch(/height: ?calc\(3 \* 56px\)/)
    expect(cssFor(renderWith(theme, <Review />).container.firstChild)).toMatch(/height: ?calc\(2\.5 \* 56px\)/)
  })

  it('its card width and the comment\'s lines; the avatar follows components.avatar', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.components.business_reviews.base, { card_width: 300, comment_lines: 5 })
      Object.assign(values.components.avatar.base, { background: '#112233', color: '#445566', radius: 6 })
      values.components.avatar.sizes.lg.size = 60
      values.components.avatar.sizes.md.size = 40
      return values
    })
    expect(cssFor(renderWith(theme, <Review />).container.firstChild)).toMatch(/width: ?300px/)
    for (const [isColumnMode, size] of [[false, '60px'], [true, '40px']]) {
      const view = renderWithProviders(<BusinessReviews isColumnMode={isColumnMode} />, { theme })
      const initials = view.container.querySelector('.review-avatar')
      expect(initials.style.getPropertyValue('--ui-avatar-size')).toBe(size)
      expect(initials.style.getPropertyValue('--ui-avatar-background')).toBe('#112233')
      expect(initials.style.getPropertyValue('--ui-avatar-color')).toBe('#445566')
      expect(initials.style.getPropertyValue('--ui-avatar-radius')).toBe('6px')
      view.unmount()
    }
    expect(cssFor(renderWith(theme, <ReviewItemContent />).container.firstChild)).toMatch(/-webkit-line-clamp: ?5/)
  })
})
