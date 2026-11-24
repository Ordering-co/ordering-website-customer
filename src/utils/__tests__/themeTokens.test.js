import { describe, it, expect } from 'vitest'
import { rebuildTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { accordionChevronCss, blockStill, cardHoverCss, buttonStill, headingText, headingsCss, themeBorderStyle, themeBorderWidth, themeControlHeight, themeDropShadow, themeFontFamily, themeIconSize, themeRadius, themeShadow, themeShadowDown, themeShadowUp, themeOpacity, themePart, themePartText, themeMedia, themeSize, themeText, themeTextParts, themeTextStyle, themeValue, themeSpace, chipCss, themeImage, businessLogoPlaceholder } from '../themeTokens'

const SHADOW_LG = { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 0.15, elevation: 6 }

// The defaults with the fixed tokens these tests read: no theme-wide shadow
// size, rounding or border width (each level is its own), Montserrat
// headings, Archivo body and a card with a null shadow and its own text.
const theme = themeWithValues((values) => {
  values.tokens.shadow_style.size = 'none'
  values.tokens.border_style = { radius: 'none', width: 'thin', style: 'solid' }
  values.tokens.border = { thin: 1, thick: 3 }
  values.tokens.typography.h2 = { size: 24, line: 1.5, weight: 600, family: 'montserrat' }
  values.tokens.typography.body = { size: 14, line: 1.71, weight: 400, family: 'archivo' }
  values.components.card.base.shadow = null
  values.components.card.base.radius = 12
  values.components.choice.base.text = { size: 15, line: 1.47, weight: 500, family: 'inter' }
  return values
})

// `theme` with tokens.shadow_style.size 'none' replaced (the API's level for
// every unfixed shadow), some tokens or a component replaced: built again, so
// its CSS view follows
const withShadowSize = (size) => rebuildTheme(theme, (values) => { values.tokens.shadow_style.size = size })
const withTokens = (tokens) => rebuildTheme(theme, (values) => { Object.assign(values.tokens, tokens) })
const withComponent = (name, component) => rebuildTheme(theme, (values) => { values.components[name] = component })

describe('themeShadow / themeDropShadow', () => {
  it('reads tokens.shadow (a null shadow is none)', () => {
    expect(themeShadow(withShadowSize('lg'), 'md')).toBe('0px 4px 12px 0px rgba(0,0,0,0.15)')
    expect(themeShadow(withShadowSize('lg'), 'none')).toBe('none')
  })

  it('a component shadow wins over the level (null → none)', () => {
    expect(themeShadow(withShadowSize('lg'), 'lg', 'card')).toBe('none')
  })

  it('drop-shadow drops the spread', () => {
    expect(themeDropShadow(withShadowSize('sm'), 'lg')).toBe('drop-shadow(0px 1px 4px rgba(0,0,0,0.1))')
  })
})

describe('themeRadius / themeBorderWidth', () => {
  it('reads the radius level or the component radius', () => {
    const own = withTokens({ border_style: { radius: 'md', width: 'none', style: 'solid' } })
    expect(themeRadius(own, 'sm')).toBe('10px')
    expect(themeRadius(own, 'full')).toBe('9999px')
    expect(themeRadius(own, 'sm', 'card')).toBe('12px')
  })

  it('reads the border width (the theme-wide one unless fixed)', () => {
    expect(themeBorderWidth(theme, 'thick', { fixed: true })).toBe('3px')
    expect(themeBorderWidth(theme, 'thick')).toBe('1px')
  })
})

describe('themeText', () => {
  it('emits size, line, weight and the family of the role', () => {
    const css = themeText(theme, 'h2')
    expect(css).toContain("font-family: 'Montserrat', sans-serif;")
    expect(css).toContain('font-size: 24px;')
    expect(css).toContain('line-height: 1.5;')
    expect(css).toContain('font-weight: 600;')
    expect(themeText(theme, 'body')).toContain("font-family: 'Archivo', sans-serif;")
  })

  it('a component text wins, with its own family', () => {
    const css = themeText(theme, 'body', 'choice')
    expect(css).toContain("font-family: 'Inter', sans-serif;")
    expect(css).toContain('font-size: 15px;')
  })
})

describe('themeText props mask / themeFontFamily', () => {
  it('emits only the properties the block declares (a weight it keeps is painted)', () => {
    expect(themeText(theme, 'body', { props: ['size'] })).toBe('font-size: 14px;')
    // The weight the block keeps (Luis): size and family come from the theme.
    expect(themeText(theme, 'h2', { props: ['size', 'weight', 'family'], weight: 700 }))
      .toBe("font-family: 'Montserrat', sans-serif;\nfont-size: 24px;\nfont-weight: 700;")
    expect(themeText(theme, 'body', { props: ['size', 'weight'], important: true, weight: 'bold' }))
      .toBe('font-size: 14px !important;\nfont-weight: bold !important;')
    // without one, the level's weight
    expect(themeText(theme, 'h2', { props: ['weight'] })).toBe('font-weight: 600;')
  })

  it('a line kept without its size is the ratio', () => {
    expect(themeText(theme, 'body', { props: ['line'] })).toBe('line-height: 1.71;')
  })

  it('themeFontFamily gives the family of the role', () => {
    expect(themeFontFamily(theme, 'body')).toBe("'Archivo', sans-serif")
    expect(themeFontFamily(theme, 'heading')).toBe("'Montserrat', sans-serif")
  })
})

describe('themeText / themeTextStyle with a font that lacks the weight', () => {
  const lato = withTokens({
    font: { heading: 'playfair_display', body: 'lato' },
    typography: {
      ...theme.values.tokens.typography,
      label: { size: 14, line: 1.43, weight: 600, family: 'lato' },
      body: { size: 14, line: 1.71, weight: 400, family: 'lato' },
      h2: { size: 24, line: 1.5, weight: 300, family: 'playfair_display' }
    }
  })

  it('emits the nearest weight of the level\'s font', () => {
    expect(themeText(lato, 'label')).toContain('font-weight: 700;')
    expect(themeText(lato, 'h2')).toContain('font-weight: 400;')
    expect(headingText(lato, 'h2')).toContain('font-weight: 400;')
  })

  it('snaps the weight the block keeps, also without emitting the family', () => {
    expect(themeText(lato, 'body', { props: ['size', 'weight'], weight: 600 }))
      .toBe('font-size: 14px;\nfont-weight: 700;')
    expect(themeText(lato, 'body', { props: ['weight'], important: true, weight: 500 }))
      .toBe('font-weight: 400 !important;')
    expect(themeText(lato, 'body', { props: ['weight'], weight: 'bold' })).toBe('font-weight: bold;')
    expect(themeTextStyle(lato, 'body', { fontSize: 15, fontWeight: 600 })).toEqual({ fontSize: '14px', fontWeight: 700 })
    expect(themeTextStyle(lato, 'h2', { fontWeight: 300 })).toEqual({ fontWeight: 400 })
  })

  it('snaps a component text by its own family', () => {
    const card = { ...lato.values.components.order_card, base: { ...lato.values.components.order_card.base, total: { size: 14, line: 1.43, weight: 500, family: 'lato' } } }
    const themed = rebuildTheme(lato, (values) => { values.components.order_card = card })
    expect(themePartText(themed, 'order_card', 'base.total')).toContain('font-weight: 400;')
    expect(themePartText(themed, 'order_card', 'base.total', { weight: 600 })).toContain('font-weight: 700;')
  })
})

describe('themeTextStyle', () => {
  it('maps the keys of a style object, the rest stays', () => {
    expect(themeTextStyle(theme, 'body', { fontSize: 15, margin: 4 })).toEqual({ fontSize: '14px', margin: 4 })
    expect(themeTextStyle(theme, 'h2', { fontSize: 20, fontWeight: 400 })).toEqual({ fontSize: '24px', fontWeight: 400 })
    expect(themeTextStyle(theme, 'body', { fontFamily: 'Georgia' })).toEqual({ fontFamily: "'Archivo', sans-serif" })
    // the line is a ratio: a unitless lineHeight
    expect(themeTextStyle(theme, 'h2', { fontSize: 20, lineHeight: '30px' })).toEqual({ fontSize: '24px', lineHeight: '1.5' })
  })
})

describe('shadow styles from the API (solid, directions)', () => {
  const withShadow = (shadow) => withTokens({ shadow: { ...theme.values.tokens.shadow, lg: shadow }, shadow_style: { ...theme.values.tokens.shadow_style, size: 'lg' } })

  it('keeps a negative x, the spread and an opacity of 1', () => {
    expect(themeShadow(withShadow({ x: -6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 1 }), 'lg')).toBe('-6px 6px 0px 0px rgba(0,0,0,1)')
    expect(themeShadow(withShadow({ x: 0, y: 0, blur: 0, spread: 6, color: '#FF5500', opacity: 1 }), 'lg')).toBe('0px 0px 0px 6px rgba(255,85,0,1)')
  })

  it('drop-shadow draws a solid "around" shadow as an outline of four offsets', () => {
    expect(themeDropShadow(withShadow({ x: 0, y: 0, blur: 0, spread: 3, color: '#FF5500', opacity: 1 }), 'lg'))
      .toBe('drop-shadow(3px 0 0 rgba(255,85,0,1)) drop-shadow(-3px 0 0 rgba(255,85,0,1)) drop-shadow(0 3px 0 rgba(255,85,0,1)) drop-shadow(0 -3px 0 rgba(255,85,0,1))')
    expect(themeDropShadow(withShadow({ x: -6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 1 }), 'lg')).toBe('drop-shadow(-6px 6px 0px rgba(0,0,0,1))')
    expect(themeDropShadow(theme, 'none')).toBe('none')
  })
})

describe('themeShadowDown', () => {
  const withBar = (shadow) => withComponent('header', { ...theme.values.components.header, base: { ...theme.values.components.header.base, shadow } })
  it('casts the component shadow down', () => {
    expect(themeShadowDown(withBar({ x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }), 'header')).toBe('box-shadow: 0px 2px 0px 0px rgba(0,0,0,1);')
    expect(themeShadowDown(withBar(null), 'header')).toBe('box-shadow: none;')
  })
  it('is empty for a component without that shadow', () => {
    expect(themeShadowDown(theme, 'footer')).toBe('')
  })
})

describe('themeShadowUp', () => {
  const withBar = (shadow) => withComponent('bottom_nav', { ...theme.values.components.bottom_nav, base: { ...theme.values.components.bottom_nav.base, shadow } })
  it('casts the component shadow up', () => {
    expect(themeShadowUp(withBar({ x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }), 'bottom_nav')).toBe('box-shadow: 0px -2px 0px 0px rgba(0,0,0,1);')
    expect(themeShadowUp(withBar(null), 'bottom_nav')).toBe('box-shadow: none;')
  })
})

describe('themePart', () => {
  const themed = themeWithValues((values) => {
    values.tokens.font.heading = 'montserrat'
    values.components.card.base = { ...values.components.card.base, background: '#FAFAFA', radius: 10, border: { width: 2, color: '#E9ECEF', style: 'solid' }, shadow: null, font_role: 'heading' }
    values.components.product_card.base.name = { size: 14, line: 1.43, weight: 600 }
    values.components.product_card.variants.default.states.sold_out.opacity = 0.5
    return values
  })

  it('turns each prop into CSS by its kind', () => {
    expect(themePart(themed, 'card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' }))
      .toBe("background: #FAFAFA;\nborder-radius: 10px;\nborder: 2px solid #E9ECEF;\nbox-shadow: none;\nfont-family: 'Montserrat', sans-serif;")
    // a text without a family of its own is of its card's font role
    // (product_card.base.font_role, body by default)
    expect(themePart(themed, 'product_card', { text: 'base.name', opacity: 'variants.default.states.sold_out.opacity' }))
      .toBe("font-family: 'Archivo', sans-serif;\nfont-size: 14px;\nline-height: 1.43;\nfont-weight: 600;\nopacity: 0.5;")
  })

  it('reads a custom text style (an object of its own, not a level of the scale) as it reads a level', () => {
    const custom = withComponent('product_card', { base: { name: { size: 17, line: 1.29, weight: 500, letter_spacing: 1, transform: 'uppercase' } } })
    expect(themePart(custom, 'product_card', { text: 'base.name' }))
      .toBe("font-family: 'Archivo', sans-serif;\nfont-size: 17px;\nline-height: 1.29;\nfont-weight: 500;\nletter-spacing: 1px;\ntext-transform: uppercase;")
    expect(themePartText(custom, 'product_card', 'base.name', { weight: 600 }))
      .toBe("font-family: 'Archivo', sans-serif;\nfont-size: 17px;\nline-height: 1.29;\nfont-weight: 600;\nletter-spacing: 1px;\ntext-transform: uppercase;")
  })

  it('a null border is none; a prop the component lacks emits nothing', () => {
    expect(themePart(themeWithValues(), 'card', { border: 'base.border' })).toBe('border: none;')
    expect(themePart(themeWithValues(), 'card', { color: 'base.missing' })).toBe('')
  })
})

describe('themeValue / themeOpacity / chipCss', () => {
  const themed = themeWithValues((values) => {
    values.tokens.opacity.disabled = 0.4
    values.components.modal.base.overlay = 'rgba(0,0,0,0.6)'
    values.components.chip.base = { ...values.components.chip.base, background: '#EEEEEE', color: '#111111', radius: 20 }
    values.components.chip.variants.default.states.selected = { background: '#FF5500', color: '#FFFFFF', border: null }
    return values
  })

  it('themeValue reads a component value of the theme (a null one stays null)', () => {
    expect(themeValue(themed, 'modal', 'base.overlay')).toBe('rgba(0,0,0,0.6)')
    expect(themeValue(themed, 'card', 'base.border')).toBeNull()
  })

  it('themeOpacity reads tokens.opacity', () => {
    expect(themeOpacity(themed, 'disabled')).toBe('0.4')
  })

  it('themeTextParts is themeText one declaration at a time', () => {
    const parts = themeTextParts(themed, 'body')
    expect(parts['font-size']).toBe(`${themed.values.tokens.typography.body.size}px`)
    expect(Object.entries(parts).map(([property, value]) => `${property}: ${value};`).join('\n')).toBe(themeText(themed, 'body'))
  })

  it('chipCss paints the base or the selected state of components.chip', () => {
    expect(chipCss(themed, true)).toContain('background: #FF5500;')
    expect(chipCss(themed, false)).toContain('background: #EEEEEE;')
    expect(chipCss(themed, false)).toContain('border-radius: 20px;')
    // hovered, a chip that is not selected takes its pressed background
    expect(chipCss(themed, false)).toContain(`background: ${themed.values.components.chip.variants.default.states.pressed.background};`)
  })
})

describe('a radius of 0 (Rounding: none) is applied, never treated as missing', () => {
  const zero = withComponent('card', { ...theme.values.components.card, base: { ...theme.values.components.card.base, radius: 0 } })

  it('themeRadius and themePart emit 0px', () => {
    expect(themeRadius(zero, 'none')).toBe('0px')
    expect(themeRadius(zero, 'sm', 'card')).toBe('0px')
    expect(themePart(zero, 'card', { 'border-radius': 'base.radius' })).toBe('border-radius: 0px;')
  })
})

describe('theme-wide shadow size and rounding (tokens.shadow_style.size / border_style.radius)', () => {
  const overall = withTokens({
    shadow: { ...theme.values.tokens.shadow, md: { x: 3, y: 3, blur: 0, spread: 0, color: '#000000', opacity: 1 }, lg: SHADOW_LG },
    radius: { ...theme.values.tokens.radius, sm: 8, xl: 20 },
    shadow_style: { ...theme.values.tokens.shadow_style, size: 'lg' },
    border_style: { radius: 'xl', width: 'thick', style: 'dashed' }
  })

  it('a fixed shadow level takes the size; none, states and spots without a background keep theirs', () => {
    expect(themeShadow(overall, 'md')).toBe('0px 4px 12px 0px rgba(0,0,0,0.15)')
    expect(themeShadow(overall, 'none')).toBe('none')
    expect(themeShadow(overall, 'md', { fixed: true })).toBe('3px 3px 0px 0px rgba(0,0,0,1)')
    expect(themeDropShadow(overall, 'sm')).toBe('drop-shadow(0px 4px 12px rgba(0,0,0,0.15))')
    expect(themeDropShadow(overall, 'sm', { fixed: true })).toBe('drop-shadow(0px 1px 4px rgba(0,0,0,0.1))')
  })

  it('the component value, already resolved by the API, wins', () => {
    expect(themeShadow(overall, 'md', 'card')).toBe('none')
    expect(themeShadow(overall, 'md', { component: 'card', fixed: true })).toBe('none')
    expect(themeRadius(overall, 'sm', 'card')).toBe('12px')
  })

  it('a fixed radius level takes the rounding; none and full keep theirs', () => {
    expect(themeRadius(overall, 'sm')).toBe('20px')
    expect(themeRadius(overall, 'none')).toBe('0px')
    expect(themeRadius(overall, 'full')).toBe('9999px')
  })
})

describe('theme-wide border width and style (tokens.border_style.width / style)', () => {
  const withBorder = (border) => withTokens({ border_style: { ...theme.values.tokens.border_style, ...border } })

  it('the box of an element takes the width; none removes it; fixed keeps the level', () => {
    expect(themeBorderWidth(withBorder({ width: 'thick' }), 'thin')).toBe('3px')
    expect(themeBorderWidth(withBorder({ width: 'thin' }), 'thick')).toBe('1px')
    expect(themeBorderWidth(withBorder({ width: 'none' }), 'thin')).toBe('0px')
    expect(themeBorderWidth(withBorder({ width: 'none' }), 'thin', { fixed: true })).toBe('1px')
    expect(themeBorderWidth(withBorder({ width: 'thick' }), 'thin', { fixed: true })).toBe('1px')
  })

  it('the style of the box borders is the theme-wide one', () => {
    expect(themeBorderStyle(withBorder({ style: 'dashed' }))).toBe('dashed')
    expect(themeBorderStyle(themeWithValues())).toBe('solid')
  })
})

describe('buttonStill', () => {
  it('a control that does not animate changes state at once and does not move', () => {
    const css = buttonStill(themeWithValues((values) => {
      values.components.button.base.animated = false
      return values
    }))
    expect(css).toContain('transition: none;')
    expect(css).toMatch(/&:hover, &:active \{\s*transform: none;\s*\}/)
    expect(css).not.toContain('translate')
    expect(css).not.toContain('box-shadow')
  })

  it('by default it fades its states (colors and shadow), never a movement', () => {
    const css = buttonStill(themeWithValues())
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('box-shadow')
    expect(css).not.toMatch(/transition:[^;]*transform/)
    expect(css).toMatch(/&:hover, &:active \{\s*transform: none;\s*\}/)
  })
})

describe('blockStill', () => {
  it('a block has no transition and no lift or zoom', () => {
    const css = blockStill(themeWithValues())
    expect(css).toContain('transition: none;')
    expect(css).toMatch(/&:hover, &:active \{\s*transform: none;\s*\}/)
    expect(css).not.toContain('@media')
  })
})

describe('cardHoverCss', () => {
  const withCard = (base, hover, motion = { enabled: true }) => themeWithValues((values) => {
    values.tokens.motion_style = { ...values.tokens.motion_style, easing: 'ease_out', ...motion }
    values.components.product_card.base = { ...values.components.product_card.base, ...base }
    values.components.product_card.variants.default.states.hover.shadow = hover
    return values
  })
  const hover = { x: 6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 1 }

  it('the hover shadow of the theme, at once when the card is not animated', () => {
    const css = cardHoverCss(withCard({ animated: false, speed: 200 }, hover), 'product_card')
    expect(css).toContain('transition: none;')
    expect(css).not.toContain('@media')
    expect(css).toMatch(/&:hover \{ box-shadow: 6px 6px 0px 0px/)
    expect(css).not.toContain('transform')
  })

  it('animated: the shadow fades at its speed, only without reduced motion and with the identity on', () => {
    expect(cardHoverCss(withCard({ animated: true, speed: 200 }, hover), 'product_card')).toContain('@media (prefers-reduced-motion: no-preference) { transition: box-shadow 200ms ease-out; }')
    expect(cardHoverCss(withCard({ animated: true, speed: 200 }, hover, { enabled: false }), 'product_card')).not.toContain('@media')
  })

  it('a null hover shadow is none', () => {
    expect(cardHoverCss(withCard({}, null), 'product_card')).toContain('&:hover { box-shadow: none; }')
  })
})

describe('headingText / headingsCss', () => {
  const themed = withTokens({
    typography: {
      ...theme.values.tokens.typography,
      h1: { size: 32, line: 1.25, weight: 600, family: 'montserrat' },
      h3: { size: 20, line: 1.4, weight: 600, family: 'montserrat' },
      h4: { size: 16, line: 1.5, weight: 500, family: 'montserrat' }
    }
  })

  it('is the whole typography of the level', () => {
    const h1 = headingText(themed, 'h1')
    expect(h1).toContain('font-size: 32px;')
    expect(h1).toContain('line-height: 1.25;')
    expect(h1).toContain('font-weight: 600;')
    expect(h1).toContain("font-family: 'Montserrat'")
  })

  it('h5 and h6 take h4, the smallest heading of the theme', () => {
    expect(headingText(themed, 'h5')).toBe(headingText(themed, 'h4'))
    expect(headingText(themed, 'h6')).toContain('font-size: 16px;')
  })

  it('headingsCss gives every heading element its level', () => {
    const css = headingsCss(themed)
    expect(css).toMatch(/h1 \{ [^}]*font-size: 32px;/)
    expect(css).toMatch(/h2 \{ [^}]*font-size: 24px;/)
    expect(css).toMatch(/h6 \{ [^}]*font-size: 16px;/)
  })
})

describe('accordionChevronCss', () => {
  it('gives the chevron components.accordion color and size', () => {
    const themed = themeWithValues((values) => {
      values.components.accordion.base = { ...values.components.accordion.base, chevron_color: '#112233', chevron_size: 20 }
      return values
    })
    expect(accordionChevronCss(themed)).toBe('color: #112233; font-size: 20px; width: 20px; height: 20px;')
  })
})

describe('themeSpace / themeSize / themeIconSize / themeControlHeight', () => {
  const sized = withTokens({
    space: { ...theme.values.tokens.space, none: 0, md: 16, xl: 32 },
    size: { ...theme.values.tokens.size, xl: 60 },
    icon: { ...theme.values.tokens.icon, md: 22 }
  })

  it('the level of tokens.space in px (0 included)', () => {
    expect(themeSpace(sized, 'md')).toBe('16px')
    expect(themeSpace(sized, 'xl')).toBe('32px')
    expect(themeSpace(sized, 'none')).toBe('0px')
  })

  it('the level of tokens.size and tokens.icon in px', () => {
    expect(themeSize(sized, 'xl')).toBe('60px')
    expect(themeSize(themeWithValues(), 'md')).toBe(`${themeWithValues().values.tokens.size.md}px`)
    expect(themeIconSize(sized, 'md')).toBe('22px')
  })

  it('the height of a control size; a size the component lacks is its md', () => {
    const { sizes } = theme.values.components.button
    expect(themeControlHeight(theme, 'button', 'lg')).toBe(sizes.lg.height)
    expect(themeControlHeight(theme, 'button')).toBe(sizes.md.height)
    expect(themeControlHeight(theme, 'button', 'xl')).toBe(sizes.md.height)
  })
})

describe('themeMedia', () => {
  it('each level is a size of the scale, in px', () => {
    const t = themeWithValues()
    const scale = { '3xs': 70, '2xs': 86, xs: 100, sm: 110, md: 124, lg: 140, xl: 150, '2xl': 165, '3xl': 180, '4xl': 200, '5xl': 300 }
    expect(Object.keys(scale).map((level) => themeMedia(t, level))).toEqual(Object.values(scale).map((px) => `${px}px`))
  })

  it('a store value replaces the level, and only that one', () => {
    const own = rebuildTheme(theme, (values) => { values.components.media.base.md = 130 })
    expect(themeMedia(own, 'md')).toBe('130px')
    expect(themeMedia(own, 'sm')).toBe('110px')
  })
})

describe('themeImage', () => {
  const withImages = (images) => rebuildTheme(theme, (values) => { Object.assign(values.images, images) })

  it('is the image of the theme', () => {
    expect(themeImage(withImages({ 'empty.not_found': 'https://cdn.test/nf.png' }), 'empty.not_found')).toBe('https://cdn.test/nf.png')
  })

  it('is null when the theme leaves it empty (and the bundle has none)', () => {
    expect(themeImage(withImages({ 'empty.not_found': '' }), 'empty.not_found')).toBeNull()
  })
})

describe('businessLogoPlaceholder', () => {
  it('is null by default (visibility.business.dummy_logo is off)', () => {
    expect(businessLogoPlaceholder(theme)).toBeNull()
  })

  it('is the theme\'s placeholder.business_logo image when visibility.business.dummy_logo is on', () => {
    const on = rebuildTheme(theme, (values) => {
      values.visibility = { ...values.visibility, 'business.dummy_logo': true }
    })
    expect(businessLogoPlaceholder(on)).toBe(on.values.images['placeholder.business_logo'])
  })
})
