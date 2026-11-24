import { describe, expect, it, vi } from 'vitest'
import { buildAppTheme } from '~/utils/appTheme'
import { cardElementOptions } from '~ui/src/components/CardForm'
import { THEMES } from '../../preview/themes'
import { placesSuggestionsCss, stripeAppearance, stripeElementOptions, stripeElementStyle } from '../sdkStyle'

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: () => null,
  CardNumberElement: () => null,
  CardExpiryElement: () => null,
  CardCvcElement: () => null
}))

const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const themed = (input) => buildAppTheme(null, { version: 2, values: { components: { input } } })

describe('stripeElementStyle / stripeElementOptions', () => {
  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe]])('is what the card form gave its elements before, in %s', (_, theme) => {
    expect(stripeElementOptions(theme)).toEqual(cardElementOptions(theme))
  })

  it('takes the text of components.input, its placeholder and the danger text color', () => {
    const theme = themed({ base: { text_color: '#222222', placeholder: '#888888', text: { size: 15, line: 1.6, weight: 500 } } })
    const { base, invalid } = stripeElementStyle(theme)
    expect(base.color).toBe('#222222')
    expect(base.iconColor).toBe('#222222')
    expect(base['::placeholder']).toEqual({ color: '#888888' })
    expect(base.fontSize).toBe('15px')
    expect(base.lineHeight).toBe('24px')
    expect(base.fontWeight).toBe('500')
    expect(invalid).toEqual({ color: theme.values.tokens.color.danger_text, iconColor: theme.values.tokens.color.danger_text })
  })

  it('another theme gives another style (it is not a fixed one)', () => {
    expect(stripeElementStyle(grill).base.fontFamily).not.toBe(stripeElementStyle(defaults).base.fontFamily)
  })

  it('on a phone the text is never under the least size of a field (iOS zooms the page)', () => {
    const phone = { ...themed({ base: { text: { size: 12, line: 1.5, weight: 400 } } }), platform: 'mobile' }
    expect(stripeElementStyle(phone).base.fontSize).toBe('16px')
    expect(stripeElementStyle(phone).base.lineHeight).toBe('24px')
    expect(stripeElementStyle({ ...phone, platform: undefined }).base.fontSize).toBe('12px')
  })

  it('no color of its own', () => {
    const values = JSON.stringify(stripeElementOptions(defaults))
    ;['#32325d', '#aab7c4', '#fa755a'].forEach((hex) => expect(values).not.toContain(hex))
  })
})

describe('stripeAppearance', () => {
  it('has no Stripe theme and paints the field\'s box, text and states from components.input', () => {
    const theme = themed({ base: { background: '#FAFAFA', text_color: '#222222', placeholder: '#888888', radius: 6, padding_x: 14 } })
    const { theme: name, variables, rules } = stripeAppearance(theme)
    expect(name).toBe('none')
    expect(variables).toMatchObject({ colorBackground: '#FAFAFA', colorText: '#222222', colorTextPlaceholder: '#888888', borderRadius: '6px', colorDanger: theme.values.tokens.color.danger_text })
    expect(rules['.Input']).toMatchObject({ backgroundColor: '#FAFAFA', color: '#222222', borderRadius: '6px', padding: '0 14px' })
    expect(rules['.Input'].border).toMatch(/^1px solid #/)
    expect(rules['.Input--invalid'].border).toMatch(/^1px solid #/)
    expect(rules['.Input--invalid'].color).toBe(theme.values.tokens.color.danger_text)
  })

  it('the states fall back to the resting border where the theme gives none, and follow it where it does', () => {
    const rest = { width: 1, color: '#111111', style: 'solid' }
    const own = themed({ base: { border: rest }, variants: { default: { states: { focus: { border: { width: 2, color: '#0044AA', style: 'solid' } } } } } })
    const { rules } = stripeAppearance(own)
    expect(rules['.Input'].border).toBe('1px solid #111111')
    expect(rules['.Input:focus'].border).toBe('2px solid #0044AA')
    expect(rules['.Input:hover'].border).toBe('1px solid #111111')
  })

  it('labels and errors take components.field', () => {
    const { rules } = stripeAppearance(defaults)
    expect(rules['.Label'].color).toBe(defaults.values.components.field.base.label_color)
    expect(rules['.Error'].color).toBe(defaults.values.components.field.base.error_color)
  })
})

describe('placesSuggestionsCss', () => {
  it('draws the list as a menu of the theme: its box, its rows and the selected row', () => {
    const css = placesSuggestionsCss(defaults)
    const menu = defaults.css.components.menu.base
    expect(css).toContain('.pac-container')
    expect(css).toContain('.pac-item')
    expect(css).toContain('.pac-item-selected')
    expect(css).toContain('.pac-item-query')
    expect(css).toContain(`background: ${menu.background} !important;`)
    expect(css).toContain(`min-height: ${menu.item_height} !important;`)
    expect(css).toContain(`background-color: ${menu.item_hover} !important;`)
  })

  it('every declaration wins over the list\'s inline styles', () => {
    const declarations = placesSuggestionsCss(defaults).split('\n').map((line) => line.trim()).filter((line) => /^[a-z-]+:/.test(line))
    expect(declarations.length).toBeGreaterThan(10)
    expect(declarations.filter((line) => !line.endsWith('!important;'))).toEqual([])
  })

  it('has no color of the list\'s own (#fff, #999, #ebf2fe) and follows the theme', () => {
    const css = placesSuggestionsCss(defaults)
    ;['#999', '#ebf2fe', '#e6e6e6'].forEach((hex) => expect(css.toLowerCase()).not.toContain(hex))
    expect(placesSuggestionsCss(grill)).not.toBe(css)
  })
})
