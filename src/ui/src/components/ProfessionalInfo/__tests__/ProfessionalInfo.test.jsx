import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ProfessionalInfo } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))

const infoState = vi.hoisted(() => ({
  userState: {
    loading: false,
    user: { name: 'Jordan', occupation: { name: 'Therapist', description: 'Expert care' } }
  },
  userReviewState: { loading: false, reviews: [], error: null }
}))

vi.mock('~components/components/ProfessionalInfo', () => ({
  ProfessionalInfo: ({ UIComponent, ...rest }) => (
    <UIComponent
      userState={infoState.userState}
      userReviewState={infoState.userReviewState}
      {...rest}
    />
  )
}))

describe('ProfessionalInfo', () => {
  beforeEach(() => {
    infoState.userState = {
      loading: false,
      user: { name: 'Jordan', occupation: { name: 'Therapist', description: 'Expert care' } }
    }
    infoState.userReviewState = { loading: false, reviews: [], error: null }
  })

  it('renders professional details', () => {
    const { getByText } = renderWithProviders(<ProfessionalInfo />)
    expect(getByText('Jordan')).toBeInTheDocument()
    expect(getByText('Therapist')).toBeInTheDocument()
    expect(getByText('Expert care')).toBeInTheDocument()
  })

  describe('a review\'s rating bar', () => {
    const reviews = { loading: false, reviews: [{ id: 1, qualification: 4, comment: 'Nice' }], error: null }

    it('components.progress sm; the labels stay under it', () => {
      infoState.userReviewState = reviews
      const completeTheme = themeWithValues()
      const { getByRole, getByText } = renderWithProviders(<ProfessionalInfo />, { theme: completeTheme })
      const bar = getByRole('progressbar', { name: 'Reviews' })
      expect(bar).toHaveAttribute('aria-valuenow', '75')
      expect(cssFor(bar)).toContain(`height:${completeTheme.values.components.progress.sizes.sm.height}px`)
      expect(bar.textContent).toBe('')
      expect(getByText('Terrible')).toBeInTheDocument()
      expect(getByText('Great')).toBeInTheDocument()
    })
  })
})

describe('ProfessionalInfo (appointments): the photo', () => {
  beforeEach(() => {
    infoState.userState = { loading: false, user: { name: 'Jordan', photo: 'https://img/jordan.png', occupation: { name: 'Therapist' } } }
    infoState.userReviewState = { loading: false, reviews: [], error: null }
  })

  it('an xl avatar of components.avatar', () => {
    const theme = themeWithValues()
    const { container } = renderWithProviders(<ProfessionalInfo />, { theme })
    const avatar = container.querySelector('[data-slot=avatar]')
    expect(avatar).toHaveAttribute('data-size', 'xl')
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.xl.size)
  })

})
