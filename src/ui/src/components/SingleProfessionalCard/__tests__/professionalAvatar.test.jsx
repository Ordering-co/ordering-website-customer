import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { SingleProfessionalCard } from '../index'

// Appointments: the professional's card: its photo
// is an avatar of components.avatar (md to pick from a list, lg otherwise)
// and its spaces are the theme's

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: () => null }))
vi.mock('~ui/src/components/ProfessionalInfo', () => ({ ProfessionalInfo: () => null }))
vi.mock('~components/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      professional={{ id: 1, name: 'Sam', last_name: 'Lee', photo: 'https://img/sam.png', occupation: { name: 'Stylist' } }}
      handleFavoriteProfessional={vi.fn()}
      {...rest}
    />
  )
}))

const flat = (text) => text.replace(/\s+/g, '')
const card = (container) => container.querySelector('[data-doc-section="favorite-professional-card"]')
const renderCard = (theme, props = {}) => renderWithProviders(<SingleProfessionalCard {...props} />, { theme })

describe('SingleProfessionalCard: avatar and spaces', () => {
  it('to pick from a list: an md avatar, the padding of components.choice', () => {
    const theme = themeWithValues()
    const { container } = renderCard(theme, { isSmallPhoto: true, handleProfessionalClick: vi.fn() })
    const avatar = container.querySelector('[data-slot=avatar]')
    expect(avatar).toHaveAttribute('data-size', 'md')
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.md.size)
    expect(card(container)).toHaveClass('ui:py-sm', 'ui:px-lg')
  })

  it('elsewhere (favorites): an lg avatar, the md padding', () => {
    const theme = themeWithValues()
    const { container } = renderCard(theme)
    const avatar = container.querySelector('[data-slot=avatar]')
    expect(avatar).toHaveAttribute('data-size', 'lg')
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.lg.size)
    expect(flat(cssFor(card(container)))).toContain(`padding:${theme.values.tokens.space.md}px;`)
  })

  it('a card: it paints the card\'s background (components.card), not the page background', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color = { ...values.tokens.color, background: '#F0F0F0' }
      values.components.card.base = { ...values.components.card.base, background: '#FEFEFE' }
      return values
    })
    const { container } = renderCard(theme)
    const css = cssFor(card(container))
    expect(css).toContain('background:#FEFEFE')
    expect(css).not.toContain('#F0F0F0')
  })
})
