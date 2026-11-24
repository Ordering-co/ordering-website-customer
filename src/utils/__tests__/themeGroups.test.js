import { describe, expect, it } from 'vitest'
import { buildAppTheme, THEME_DEFAULTS } from '../appTheme'
import { getThemeCss } from '../themeCss'
import { scopedTheme, slotButtonOptions, slotButtonProps, slotSize, themeSlot } from '../themeGroups'
import { buildCompleteValues, buildLocalTheme, envelope } from './fixtures/themeFixtures'

const local = buildLocalTheme()
const themeWithValues = (mutate = (values) => values, options) => buildAppTheme(local, envelope(mutate(buildCompleteValues()), options))

const HEADER_SLOTS = {
  address: { component: 'button', size: 'md', appearance: 'ghost', color: 'neutral', shape: null },
  cart: { component: 'button', size: 'lg', appearance: 'outline', color: 'primary', shape: 'icon' },
  moment: { component: 'input', size: 'sm' },
  order_type: { component: 'tabs', size: 'md', variant: null }
}

const withHeader = (header) => themeWithValues((values) => {
  values.components.header = { ...values.components.header, ...header }
  return values
})

describe('scopedTheme', () => {
  it('a group takes the components it changes; the rest stay the global ones', () => {
    const scopedButton = { base: { radius: 0 }, sizes: { md: { height: 32 } } }
    const theme = withHeader({ scope: { button: scopedButton } })
    const scoped = scopedTheme(theme, 'header')
    // the whole component, as the API serves it: what the theme leaves is the default
    const button = scoped.values.components.button
    expect(button.base).toEqual({ ...THEME_DEFAULTS.components.button.base, radius: 0 })
    expect(button.sizes.md).toEqual({ ...THEME_DEFAULTS.components.button.sizes.md, height: 32 })
    expect(button.variants).toEqual(THEME_DEFAULTS.components.button.variants)
    expect(scoped.values.components.input).toBe(theme.values.components.input)
    // the global theme is not changed
    expect(theme.values.components.button).toEqual(THEME_DEFAULTS.components.button)
  })

  it('its CSS view follows: getThemeCss reads the group\'s component inside it', () => {
    const theme = withHeader({ scope: { button: { base: { radius: 0 }, sizes: { md: { height: 32 } } } } })
    const scoped = scopedTheme(theme, 'header')
    expect(getThemeCss(scoped, 'button').base.radius).toBe('0px')
    expect(getThemeCss(scoped, 'button').sizes.md.height).toBe('32px')
    expect(getThemeCss(scoped, 'input')).toBe(getThemeCss(theme, 'input'))
    expect(getThemeCss(theme, 'button').sizes.md.height).toBe(`${THEME_DEFAULTS.components.button.sizes.md.height}px`)
  })

  it('the same theme when the group changes nothing, with v1 or a partial v2', () => {
    const theme = withHeader({})
    expect(scopedTheme(theme, 'header')).toBe(theme)
    const empty = withHeader({ scope: {} })
    expect(scopedTheme(empty, 'header')).toBe(empty)
    // the schema's declaration (an empty entry) changes nothing
    const declared = withHeader({ scope: { button: {} } })
    expect(scopedTheme(declared, 'header')).toBe(declared)
  })
})

describe('slots', () => {
  const theme = withHeader({ slots: HEADER_SLOTS })

  it('reads a piece: its component and the axes it chose (null: the default)', () => {
    expect(themeSlot(theme, 'header', 'cart')).toEqual({ component: 'button', size: 'lg', variant: null, appearance: 'outline', color: 'primary', shape: 'icon' })
    expect(themeSlot(theme, 'header', 'order_type')).toMatchObject({ component: 'tabs', size: 'md', variant: null })
    expect(themeSlot(theme, 'header', 'missing')).toBeNull()
  })

  it('a button slot: its options over the defaults, and the Button props', () => {
    expect(slotButtonOptions(theme, 'header', 'cart', { color: 'neutral', size: 'md' })).toEqual({ color: 'primary', appearance: 'outline', size: 'lg', shape: 'icon' })
    expect(slotButtonProps(theme, 'header', 'cart')).toEqual({ $size: 'lg', $color: 'primary', $appearance: 'outline' })
  })

  it('the options of a button slot for the design system\'s Button: the public names, the shape too; a missing slot gives the defaults', () => {
    expect(slotButtonOptions(theme, 'header', 'cart')).toEqual({ size: 'lg', color: 'primary', appearance: 'outline', shape: 'icon' })
    // (null axes are not options: the defaults stay, and the Button's own when there are none)
    expect(slotButtonOptions(theme, 'header', 'address', { size: 'sm', shape: 'text' })).toEqual({ size: 'md', color: 'neutral', appearance: 'ghost', shape: 'text' })
    expect(slotButtonOptions(theme, 'header', 'missing')).toEqual({})
    expect(slotButtonOptions(theme, 'header', 'missing', { size: 'sm' })).toEqual({ size: 'sm' })
  })

  it('the checkout\'s place order: the global slot and the bar\'s slot, each with its own options', () => {
    const checkout = themeWithValues((values) => {
      values.components.checkout = {
        ...values.components.checkout,
        slots: {
          ...values.components.checkout.slots,
          place_order: { component: 'button', size: 'lg', color: 'primary', appearance: 'solid' },
          place_order_mobile: { component: 'button', size: 'sm', color: 'secondary', appearance: 'outline' }
        }
      }
      return values
    })
    expect(slotButtonOptions(checkout, 'checkout', 'place_order')).toEqual({ size: 'lg', color: 'primary', appearance: 'solid' })
    expect(slotButtonOptions(checkout, 'checkout', 'place_order_mobile')).toEqual({ size: 'sm', color: 'secondary', appearance: 'outline' })
    // the legacy Button's props are the same values with the `$`
    expect(slotButtonProps(checkout, 'checkout', 'place_order_mobile')).toEqual({ $size: 'sm', $color: 'secondary', $appearance: 'outline' })
  })

  it('a field slot: its size, else the fallback', () => {
    expect(slotSize(theme, 'header', 'moment', 'md')).toBe('sm')
    expect(slotSize(theme, 'header', 'language', 'md')).toBe('md')
  })
})
