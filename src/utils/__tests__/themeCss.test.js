import { describe, it, expect } from 'vitest'
import { THEME_DEFAULTS as defaults } from '~/utils/appTheme'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import {
  cssBorder,
  cssShadow,
  cssText,
  cssValue,
  getThemeComponent,
  getThemeCss,
  getThemeMobileCss,
  getThemeMobileOverrides,
  isPositiveNumber,
  isSafeCssValue,
  resolveThemeProps,
  hasOwnFocusBorder
} from '../themeCss'

// cssBorder, cssShadow and cssText are the engine's conversions (its css
// entry), for a value the code composes itself.
describe('cssBorder', () => {
  it('turns a border object into CSS', () => {
    expect(cssBorder({ width: 1, color: '#DBDCDB', style: 'solid' })).toBe('1px solid #DBDCDB')
    expect(cssBorder({ width: 2, color: '#000' })).toBe('2px solid #000')
  })
  it('null means no border; anything that is not one (no width) is null', () => {
    expect(cssBorder(null)).toBe('none')
    expect(cssBorder(undefined)).toBeNull()
    expect(cssBorder('1px solid red')).toBeNull()
    expect(cssBorder({ color: 'red', style: 'dashed' })).toBeNull()
  })
})

describe('cssShadow', () => {
  it('applies the opacity to the color', () => {
    expect(cssShadow({ x: 0, y: 1, blur: 4, spread: 0, color: '#000000', opacity: 0.1, elevation: 1 }))
      .toBe('0px 1px 4px 0px rgba(0,0,0,0.1)')
  })
  it('keeps the color when there is no opacity or it cannot be parsed', () => {
    expect(cssShadow({ x: 1, y: 2, blur: 3, spread: 4, color: '#FF0000' })).toBe('1px 2px 3px 4px #FF0000')
    expect(cssShadow({ y: 2, color: 'transparent', opacity: 0.5 })).toBe('0px 2px 0px 0px transparent')
  })
  it('null means no shadow', () => {
    expect(cssShadow(null)).toBe('none')
    expect(cssShadow(undefined)).toBeNull()
  })
})

describe('cssText', () => {
  it('emits only the keys present', () => {
    expect(cssText({ size: 16, line: 1.88, weight: 400, family: 'archivo' })).toBe(
      "font-family: 'Archivo', sans-serif;\nfont-size: 16px;\nline-height: 1.88;\nfont-weight: 400;"
    )
    expect(cssText({ size: 12, letter_spacing: 0.5, transform: 'uppercase' })).toBe(
      'font-size: 12px;\nletter-spacing: 0.5px;\ntext-transform: uppercase;'
    )
    expect(cssText(null)).toBe('')
  })

  it('paints with the nearest weight the font has (the one the page loads)', () => {
    expect(cssText({ weight: 600, family: 'lato' })).toBe("font-family: 'Lato', sans-serif;\nfont-weight: 700;")
    expect(cssText({ weight: 900, family: 'Open Sans' })).toContain('font-weight: 800;')
    // The font it is painted with when the style emits none.
    expect(cssText({ weight: 600 }, 'lato')).toBe('font-weight: 700;')
    expect(cssText({ weight: 600 })).toBe('font-weight: 600;')
    expect(cssText({ weight: 600, family: 'archivo' })).toContain('font-weight: 600;')
    // An uploaded / custom font keeps its weight.
    expect(cssText({ weight: 600, family: 'My Font' })).toContain('font-weight: 600;')
  })
})

describe('line height: a ratio of the size', () => {
  it('cssText emits the line unitless, so it grows with the size', () => {
    expect(cssText({ size: 14, line: 1.71 })).toBe('font-size: 14px;\nline-height: 1.71;')
    expect(cssText({ line: 1.5 })).toBe('line-height: 1.5;')
  })

  it('each default level keeps the line it had in px (within half a pixel)', () => {
    const before = { display: 44, h1: 40, h2: 36, h3: 30, h4: 26, body_lg: 24, body: 24, label: 20, caption: 18, button: 30 }
    const { typography } = defaults.tokens
    expect(Object.keys(typography).filter((level) => before[level] === undefined)).toEqual([])
    Object.entries(before).forEach(([level, px]) => {
      const text = typography[level]
      expect(text.line).toBeLessThanOrEqual(2)
      expect(Math.abs(text.size * text.line - px)).toBeLessThanOrEqual(0.5)
      expect(cssText(text)).toContain(`line-height: ${text.line};`)
    })
  })
})

describe('small helpers', () => {
  it('getThemeComponent / getThemeMobileOverrides', () => {
    const theme = { values: { components: { button: { base: {} } }, platforms: { mobile_web: { components: { modal: { base: { radius: 0 } } } } } } }
    expect(getThemeComponent(theme, 'button')).toEqual({ base: {} })
    expect(getThemeComponent(theme, 'input')).toBeNull()
    expect(getThemeComponent({}, 'button')).toBeNull()
    expect(getThemeMobileOverrides(theme, 'modal')).toEqual({ base: { radius: 0 } })
    expect(getThemeMobileOverrides(theme, 'button')).toBeNull()
  })
})

describe('getThemeCss / getThemeMobileCss', () => {
  const theme = themeWithValues((values) => {
    values.components.card.base.radius = 12
    values.platforms.mobile_web.components.button = { base: { radius: 0 } }
  })

  it('a component of the theme as CSS (its view)', () => {
    expect(getThemeCss(theme, 'card')).toBe(theme.css.components.card)
    expect(getThemeCss(theme, 'card').base.radius).toBe('12px')
  })

  it('the phone overrides of a component as CSS, or null without them', () => {
    expect(getThemeMobileCss(theme, 'button').base.radius).toBe('0px')
    expect(getThemeMobileCss(theme, 'card')).toBeNull()
  })
})

describe('resolveThemeProps', () => {
  const component = {
    base: { height: 32, radius: 15 },
    variants: { primary: { background: '#00F', states: { pressed: { background: '#00A' } } } },
    sizes: { icon: { height: 34, radius: 9999 } }
  }
  it('merges base → variant → size and keeps states apart', () => {
    expect(resolveThemeProps(component, { variant: 'primary', size: 'icon' })).toEqual({
      height: 34, radius: 9999, background: '#00F', states: { pressed: { background: '#00A' } }
    })
    expect(resolveThemeProps(component, { variant: 'unknown' })).toEqual({ height: 32, radius: 15, states: {} })
    expect(resolveThemeProps(null)).toBeNull()
  })
})

describe('isSafeCssValue', () => {
  it.each(['#FF5500', 'azul', '8px', 'rgba(0,0,0,0.4)', 'transparent', 12, 0, -3])('accepts %s', (value) => {
    expect(isSafeCssValue(value)).toBe(true)
  })

  it.each(['{color.primary}', '{ink}', 'red; } body { display: none', "x'", 'a"b', 'a\\b', '<x>', Infinity, NaN, null, undefined, {}])('rejects %s', (value) => {
    expect(isSafeCssValue(value)).toBe(false)
  })
})

describe('CSS helpers with values that cannot go into CSS', () => {
  it('cssValue keeps safe values and returns null for the rest', () => {
    expect(cssValue('#FFF')).toBe('#FFF')
    expect(cssValue(600)).toBe(600)
    expect(cssValue('{ink}')).toBeNull()
    expect(cssValue('')).toBeNull()
    expect(cssValue(null)).toBeNull()
  })

  it('cssBorder and cssShadow: a border or a shadow with unsafe parts is not one (null)', () => {
    expect(cssBorder({ width: '{w}', style: '{s}', color: '{ink}' })).toBeNull()
    expect(cssBorder({ color: null })).toBeNull()
    expect(cssShadow({ x: '{x}', y: 2, color: '{ink}' })).toBeNull()
  })

  it('cssText emits nothing for unsafe values (a weight is a number)', () => {
    expect(cssText({ family: '{font.body}', weight: '{w}', transform: '{t}' })).toBe('')
    expect(cssText({ weight: 'bold' })).toBe('')
  })

  it('isPositiveNumber', () => {
    expect(isPositiveNumber(4)).toBe(true)
    expect([0, -1, NaN, Infinity, '4', null].map(isPositiveNumber)).toEqual([false, false, false, false, false, false])
  })
})

describe('hasOwnFocusBorder', () => {
  it.each([
    ['1px solid #909090', '1px solid rgb(144, 144, 144)', false],
    ['1px solid #909090', '1px solid rgba(144, 144, 144, 1)', false],
    ['1px solid #909090', '1px solid rgb(145, 144, 144)', true],
    ['1px solid #909090', '1px solid rgba(144, 144, 144, 0.5)', true],
    ['1px solid #909090', '1px dashed #909090', true],
    ['1px solid #909090', '2px solid #909090', true]
  ])('compares the painted borders %s and %s', (resting, focus, expected) => {
    expect(hasOwnFocusBorder(resting, focus)).toBe(expected)
  })
})
