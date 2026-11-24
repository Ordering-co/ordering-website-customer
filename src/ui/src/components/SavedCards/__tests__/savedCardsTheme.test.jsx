import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CardBrand, CardData, CardItem, IframeWrapper } from '../styles'
import { SavedCards } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
const confirm = vi.hoisted(() => ({ props: null }))
vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: (props) => { confirm.props = props; return null }
}))
vi.mock('../useSavedCardsGateway', () => ({
  useSavedCardsGateway: () => ({ gateway: null, paymethodId: null, isAvailable: false, loading: false })
}))

describe('/profile/cards with the theme', () => {
  it('a saved card is a card of components.card with its inner space', () => {
    const theme = themeWithValues((values) => {
      values.components.card.base.padding = 18
      return values
    })
    const el = renderWith(theme, <CardItem data-testid='card' />).getByTestId('card')
    expect(el).toHaveStyle({ padding: '18px' })
  })

  it('its icon is the primary color, its brand the label text', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.primary = '#123456'
      values.tokens.typography.label = { ...values.tokens.typography.label, weight: 700 }
      return values
    })
    const data = renderWith(theme, <CardData data-testid='data' />).getByTestId('data')
    expect(cssFor(data).replace(/\s+/g, '')).toMatch(/svg\{[^}]*color:#123456;/)
    const brand = renderWith(theme, <CardBrand data-testid='brand' />).getByTestId('brand')
    expect(brand).toHaveStyle({ fontWeight: '700' })
  })

  it('the card form keeps 8.5 times the xl size, wrapper and iframe (not 480px)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.size.xl = 60
      return values
    })
    const css = cssFor(renderWith(theme, <IframeWrapper data-testid='frame' />).getByTestId('frame')).replace(/\s+/g, '')
    expect(css.match(/min-height:calc\(8\.5\*60px\)/g)).toHaveLength(2)
    expect(css).not.toMatch(/480px/)
  })

  it('the delete confirmation has a title (its accessible name)', () => {
    renderWithProviders(<SavedCards />, { theme: themeWithValues() })
    expect(confirm.props.title).toBe('Delete card')
  })
})
