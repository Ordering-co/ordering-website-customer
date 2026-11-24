import React from 'react'
import { describe, expect, it } from 'vitest'
import { SCHEMA, schemaDefault, schemaEntry, schemaKeys, schemaOptions } from '~/utils/themeSchema'
import { SCRIM_OPACITY, pageGutter, themeFocusRing, themeScrim, themeScrollbar, themeSpace, themeText } from '../../../../utils/themeTokens'
import { focusRingCss, focusRingReach } from '../Focus'
import { menuScrollbarVars } from '../../design-system/components/menuScrollbar'
import { headerGap, headerSide } from '../../components/Header/styles'
import { QuestionLabel } from '../../components/OrderDetails/layouts/Tracking/styles'
import { Layer as MomentLayer } from '../../components/MomentContent/styles'
import { HighestRatedContainer } from '../../components/HighestRated/styles'
import { cssFor, renderWith, themeWithValues } from './themeTestUtils'

// A theme served before these tokens existed: the defaults fill them in
const withoutNewTokens = () => themeWithValues((values) => {
  const { xxl, xxxl, ...space } = values.tokens.space
  const { layout, focus_ring: focusRing, scrollbar, ...tokens } = values.tokens
  const { gap, ...headerBase } = values.components.header.base
  return {
    ...values,
    tokens: { ...tokens, space },
    components: { ...values.components, header: { ...values.components.header, base: headerBase } }
  }
})

describe('theme schema: new tokens and their defaults (today\'s values)', () => {
  const token = (path) => schemaDefault(`tokens.${path}`)
  const components = schemaKeys('components')

  it('space.xxl 32 and space.xxxl 48, above the scale of today', () => {
    expect([token('space.xl'), token('space.xxl'), token('space.xxxl')]).toEqual([24, 32, 48])
  })

  it('layout.page_gutter 20 and header.base.gap the lg space (16)', () => {
    expect([...schemaKeys('tokens.layout')].sort()).toEqual(['mode', 'page_gutter'])
    expect(token('layout.page_gutter')).toBe(20)
    expect(token('layout.mode')).toBe('original')
    expect(schemaEntry('components.header.base.gap')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(token('space.lg')).toBe(16)
  })

  it('focus_ring: levels of border, space and color (thick, xxs, primary)', () => {
    expect([...schemaKeys('tokens.focus_ring')].sort()).toEqual(['color', 'offset', 'width'])
    expect(token('focus_ring.width')).toBe('thick')
    expect(token('focus_ring.offset')).toBe('xxs')
    expect(token('focus_ring.color')).toBe('primary')
    expect(schemaKeys('tokens.border')).toContain(token('focus_ring.width'))
    expect(schemaKeys('tokens.space')).toContain(token('focus_ring.offset'))
    expect(schemaKeys('tokens.color')).toContain(token('focus_ring.color'))
  })

  it('scrollbar 6 / 3', () => {
    expect([...schemaKeys('tokens.scrollbar')].sort()).toEqual(['radius', 'size'])
    expect(token('scrollbar.size')).toBe(6)
    expect(token('scrollbar.radius')).toBe(3)
  })

  it('cleanup: no fab colors, no checkout_block (its tiles are v1 only), no v1 map', () => {
    expect(schemaEntry('components.cart.base.fab_background')).toBeUndefined()
    expect(schemaEntry('components.cart.base.fab_color')).toBeUndefined()
    expect(schemaEntry('components.cart.base.fab_radius')).toBeDefined()
    expect(components).not.toContain('checkout_block')
    expect(SCHEMA).not.toHaveProperty('v1')
  })

  it('no layouts per client: the theme draws them (header, business_header, product_card, product_search, the sign-up pages)', () => {
    ;['header', 'business_header', 'product_card', 'product_search'].forEach((name) => expect(schemaEntry(`components.${name}.base.layout`)).toBeUndefined())
    expect(schemaKeys('components.signup_page')).not.toContain('variants')
  })

  it('cleanup: keys nothing reads are not in the schema', () => {
    // the cart drawer animates as the modal
    expect(schemaEntry('components.cart.base.animated')).toBeUndefined()
    expect(schemaEntry('components.cart.base.speed')).toBeUndefined()
    expect(components).not.toContain('user_menu')
    expect(schemaEntry('components.header.slots.user_menu')).toBeUndefined()
    expect(schemaEntry('components.auth_form.slots.code')).toBeUndefined()
    // the checkbox is an icon: no check mark, own corners or disabled fill
    ;['check', 'radius', 'disabled'].forEach((key) => expect(schemaEntry(`components.checkbox.base.${key}`)).toBeUndefined())
    expect(schemaEntry('visibility.profile.address_list')).toBeUndefined()
  })

  it('the appointments mode is one global token: no layout per page', () => {
    // the store list's template is not the appointments mode
    expect(schemaOptions('components.business_listing_page.base.layout')).toEqual(['grid', 'showcase'])
    expect(schemaEntry('components.orders_page.base.layout')).toBeUndefined()
    expect(components).not.toContain('favorites_page')
    expect(token('layout.mode')).toBe('original')
  })
})

describe('space.xxl / xxxl', () => {
  it('the px of the level; a theme without it takes the default', () => {
    expect(themeSpace(themeWithValues(), 'xxl')).toBe('32px')
    expect(themeSpace(themeWithValues(), 'xxxl')).toBe('48px')
    expect(themeSpace(withoutNewTokens(), 'xxl')).toBe('32px')
  })

  it('a section of the page: xxl (from 30px)', () => {
    const themed = renderWith(themeWithValues(), <HighestRatedContainer data-testid='themed' />)
    expect(themed.getByTestId('themed')).toHaveStyle({ paddingBottom: '32px' })
    const old = renderWith(withoutNewTokens(), <HighestRatedContainer data-testid='old' />)
    expect(old.getByTestId('old')).toHaveStyle({ paddingBottom: '32px' })
  })
})

describe('page gutter and header spacing', () => {
  it('default: 20 / 16 as today', () => {
    ;[themeWithValues(), withoutNewTokens()].forEach((theme) => {
      expect(pageGutter(theme)).toBe(20)
      expect(headerSide(theme)).toBe(20)
      expect(headerGap(theme)).toBe(16)
    })
  })

  it('tokens.layout.page_gutter and header.base.gap', () => {
    const theme = themeWithValues((values) => {
      values.tokens.layout = { page_gutter: 28 }
      values.components.header.base.gap = 10
      return values
    })
    expect(pageGutter(theme)).toBe(28)
    expect(headerSide(theme)).toBe(28)
    expect(headerGap(theme)).toBe(10)
  })
})

describe('focus ring (tokens.focus_ring)', () => {
  it('default: the ring of today (border.thick, space.xxs, color.primary)', () => {
    const theme = themeWithValues()
    const { border, space, color } = theme.values.tokens
    expect(themeFocusRing(theme)).toEqual({ width: `${border.thick}px`, offset: `${space.xxs}px`, color: color.primary })
    expect(focusRingCss(theme)).toBe(`outline: ${border.thick}px solid ${color.primary}; outline-offset: ${space.xxs}px;`)
    expect(focusRingReach(theme)).toBe(border.thick + space.xxs)
  })

  it('a theme without focus_ring keeps today\'s ring', () => {
    expect(themeFocusRing(withoutNewTokens())).toEqual(themeFocusRing(themeWithValues()))
  })

  it('follows its levels and color', () => {
    const theme = themeWithValues((values) => {
      values.tokens.focus_ring = { width: 'thin', offset: 'xs', color: 'danger' }
      return values
    })
    const { border, space, color } = theme.values.tokens
    expect(focusRingCss(theme, { important: true })).toBe(`outline: ${border.thin}px solid ${color.danger} !important; outline-offset: ${space.xs}px !important;`)
    expect(focusRingReach(theme)).toBe(border.thin + space.xs)
  })

  it('an unknown level or color is today\'s', () => {
    const theme = themeWithValues((values) => {
      values.tokens.focus_ring = { width: 'huge', offset: 7, color: 'nope' }
      return values
    })
    expect(themeFocusRing(theme)).toEqual(themeFocusRing(themeWithValues()))
  })
})

describe('scrollbar (tokens.scrollbar)', () => {
  it('default 6px / 3px, also without the token', () => {
    expect(themeScrollbar(themeWithValues())).toEqual({ size: '6px', radius: '3px' })
    expect(themeScrollbar(withoutNewTokens())).toEqual({ size: '6px', radius: '3px' })
  })

  it('the menus\' lists follow it (the radius when the menu is rounded)', () => {
    expect(menuScrollbarVars(themeWithValues(), '8px')).toMatchObject({ '--ui-select-scrollbar-size': '6px', '--ui-select-scrollbar-radius': '3px' })
    expect(menuScrollbarVars(themeWithValues(), '0')['--ui-select-scrollbar-radius']).toBe('0')
    const theme = themeWithValues((values) => {
      values.tokens.scrollbar = { size: 10, radius: 5 }
      return values
    })
    expect(menuScrollbarVars(theme, '8px')).toMatchObject({ '--ui-select-scrollbar-size': '10px', '--ui-select-scrollbar-radius': '5px' })
  })
})

describe('loading veil (fixed 0.7)', () => {
  it('the page background at 0.7', () => {
    expect(SCRIM_OPACITY).toBe(0.7)
    expect(themeScrim(themeWithValues())).toBe('rgba(255,255,255,0.7)')
  })

  it('follows the background, not a theme opacity', () => {
    const theme = themeWithValues((values) => {
      // (new objects: the fixtures share the schema's token groups)
      values.tokens.opacity = { ...values.tokens.opacity, scrim: 0.5 }
      values.tokens.color = { ...values.tokens.color, background: '#000000' }
      return values
    })
    expect(themeScrim(theme)).toBe('rgba(0,0,0,0.7)')
  })

  it('no veil setting in the schema', () => {
    expect(schemaKeys('tokens.opacity')).not.toContain('scrim')
  })

  it('the layer of MomentContent: the veil', () => {
    const themed = renderWith(themeWithValues(), <MomentLayer data-testid='themed' />)
    expect(themed.getByTestId('themed')).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0.7)' })
  })
})

describe('type scale (tokens.typography)', () => {
  it('no overline and no body_sm: the small text is body', () => {
    expect(schemaKeys('tokens.typography')).not.toContain('overline')
    expect(schemaKeys('tokens.typography')).not.toContain('body_sm')
  })

  it('themeText passes letter_spacing and transform when asked', () => {
    const theme = themeWithValues((values) => {
      values.tokens.typography = { ...values.tokens.typography, caption: { size: 12, line: 1.5, weight: 400, letter_spacing: 0.48, transform: 'uppercase' } }
      return values
    })
    const css = themeText(theme, 'caption', { props: ['size', 'letter_spacing', 'transform'] })
    expect(css).toContain('font-size: 12px;')
    expect(css).toContain('letter-spacing: 0.48px;')
    expect(css).toContain('text-transform: uppercase;')
    expect(css).not.toContain('line-height')
  })

  it('the survey label: the caption role, bold, with no spacing or capitals of its own', () => {
    const themed = renderWith(themeWithValues(), <QuestionLabel>Q</QuestionLabel>)
    const themedCss = cssFor(themed.getByText('Q'))
    expect(themedCss).not.toContain('letter-spacing:.04em')
    expect(themedCss).not.toContain('text-transform:uppercase')
    expect(themed.getByText('Q')).toHaveStyle({ fontSize: '12px', fontWeight: '700' })
  })
})
