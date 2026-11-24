import { describe, expect, it, vi } from 'vitest'
import { defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { cardElementOptions } from '../index'

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: () => null,
  CardNumberElement: () => null,
  CardExpiryElement: () => null,
  CardCvcElement: () => null
}))

describe('cardElementOptions', () => {
  it('takes the input text color, the body font and danger as text of the default theme', () => {
    const { base, invalid } = cardElementOptions(defaultTheme).style
    const colors = defaultTheme.values.tokens.color
    expect(base.color).toBe(defaultTheme.values.components.input.base.text_color)
    expect(base.fontFamily).toMatch(/^'.+', sans-serif$/)
    expect(invalid).toEqual({ color: colors.danger_text, iconColor: colors.danger_text })
  })

  it('takes the input text, colors and danger as text of a complete theme', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.text = '#111111'
      values.tokens.color.text_muted = '#777777'
      values.tokens.color.danger_text = '#CC0000'
      values.components.input.base.text_color = '#222222'
      values.components.input.base.placeholder = '#888888'
      values.components.input.base.text = { ...values.components.input.base.text, size: 15, line: 1.6 }
      return values
    })
    const { base, invalid } = cardElementOptions(theme).style
    expect(base.color).toBe('#222222')
    expect(base['::placeholder'].color).toBe('#888888')
    expect(base.fontSize).toBe('15px')
    expect(base.lineHeight).toBe('24px') // 15 × 1.6: Stripe takes the line in px
    expect(invalid).toEqual({ color: '#CC0000', iconColor: '#CC0000' })
  })

  it('no fixed colors of its own: only what the theme gives', () => {
    const { base, invalid } = cardElementOptions(defaultTheme).style
    const values = JSON.stringify({ base, invalid })
    ;['#32325d', '#aab7c4', '#fa755a'].forEach((hex) => expect(values).not.toContain(hex))
  })
})
