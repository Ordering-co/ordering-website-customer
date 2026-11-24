import React from 'react'
import { describe, expect, it } from 'vitest'
import { ChevronIcon, listChevronMaskCss, rtlMirrorCss } from '../index'
import { CHEVRON_DOWN_MASK, CHEVRON_GLYPHS } from '../../../components/Icon/chevronGlyphs'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

const tight = (text) => text.replace(/\s+/g, '')

const themed = (mutate = (values) => values, extra = {}) => ({ ...themeWithValues(mutate), ...extra })

const chevron = (theme, props = {}) => {
  const { container } = renderWith(theme, <ChevronIcon {...props} />)
  const el = container.querySelector('[data-chevron]')
  // an svg's className is not a string: its own classes, as the helper reads them
  return { el, css: tight(cssFor({ className: el.getAttribute('class') })) }
}

describe('ChevronIcon', () => {
  it('draws from the three glyphs of Icon/chevronGlyphs (the only lucide-react import it needs)', () => {
    expect(Object.keys(CHEVRON_GLYPHS).sort()).toEqual(['chevronDown', 'chevronLeft', 'chevronRight'])
    expect(chevron(themed(), { kind: 'navigate', direction: 'back' }).el).toHaveClass('lucide-chevron-left')
  })

  it('always decorative: aria-hidden, not focusable', () => {
    ;['disclose', 'list', 'navigate'].forEach((kind) => {
      const { el } = chevron(themed(), { kind })
      expect(el).toHaveAttribute('aria-hidden', 'true')
      expect(el).toHaveAttribute('focusable', 'false')
      expect(el).toHaveAttribute('data-chevron', kind)
    })
  })

  it('the glyph, Lucide\'s: chevron-down to disclose and for a list; chevron-right / chevron-left to navigate', () => {
    expect(chevron(themed(), { kind: 'disclose' }).el).toHaveClass('lucide-chevron-down')
    expect(chevron(themed(), { kind: 'list' }).el).toHaveClass('lucide-chevron-down')
    expect(chevron(themed(), { kind: 'navigate' }).el).toHaveClass('lucide-chevron-right')
    expect(chevron(themed(), { kind: 'navigate', direction: 'back' }).el).toHaveClass('lucide-chevron-left')
  })

  describe('disclose', () => {
    const theme = () => themed((values) => {
      values.components.accordion.base.chevron_color = '#123456'
      values.components.accordion.base.chevron_size = 26
      values.components.accordion.base.animated = true
      values.components.accordion.base.speed = 240
      values.components.product_option.base.animated = true
      values.components.product_option.base.speed = 90
      return values
    })

    it('the accordion\'s chevron color and size', () => {
      const { css } = chevron(theme())
      expect(css).toContain('color:#123456;')
      expect(css).toContain('font-size:26px;width:26px;height:26px;')
    })

    it('down while closed, turned 180° while open, with the accordion\'s motion', () => {
      expect(chevron(theme(), { open: false }).css).toContain('transform:rotate(0deg);')
      const open = chevron(theme(), { open: true }).css
      expect(open).toContain('transform:rotate(180deg);')
      expect(open).toMatch(/transition:transform240ms/)
    })

    it('a component of its own animates it (product_option)', () => {
      expect(chevron(theme(), { open: true, motion: 'product_option' }).css).toMatch(/transition:transform90ms/)
    })

    it('the accordion not animated: it turns at once', () => {
      const still = themed((values) => {
        values.components.accordion.base.animated = false
        return values
      })
      const { css } = chevron(still, { open: true })
      expect(css).toContain('transition:none;')
      expect(css).not.toMatch(/transition:transform\d/)
    })
  })

  describe('list', () => {
    const theme = () => themed((values) => {
      values.components.input.base.icon_size = 22
      values.components.input.base.icon_gap = 6
      values.components.input.base.icon_color = '#ABCDEF'
      values.components.menu.base.animated = true
      values.components.menu.base.speed = 150
      return values
    })

    it('components.input icon_size, icon_gap before it (logical), in the field\'s text color (no color of its own)', () => {
      const { css } = chevron(theme(), { kind: 'list' })
      expect(css).toContain('font-size:22px;width:22px;height:22px;')
      expect(css).toContain('margin-inline-start:6px;')
      expect(css).not.toContain('#ABCDEF')
      expect(css).not.toMatch(/[;{]color:/)
    })

    it('turns 180° while its list is open, with the menu\'s motion', () => {
      expect(chevron(theme(), { kind: 'list', open: false }).css).toContain('transform:rotate(0deg);')
      const open = chevron(theme(), { kind: 'list', open: true }).css
      expect(open).toContain('transform:rotate(180deg);')
      expect(open).toMatch(/transition:transform150ms/)
    })

    it('the menu not animated: it turns at once', () => {
      const { css } = chevron(themed(), { kind: 'list', open: true })
      expect(css).toContain('transform:rotate(180deg);')
      expect(css).toContain('transition:none;')
    })

    it('a trigger that opens a modal (no open) never turns', () => {
      const { css } = chevron(theme(), { kind: 'list' })
      expect(css).not.toContain('rotate(')
    })

    it('a container that sizes and spaces it (size and gap false): neither', () => {
      const { css } = chevron(theme(), { kind: 'list', size: false, gap: false })
      expect(css).not.toContain('22px')
      expect(css).not.toContain('margin-inline-start')
    })
  })

  describe('navigate', () => {
    it('the md icon unless its container gives a size; no color of its own', () => {
      const theme = themed((values) => {
        values.tokens.icon.md = 23
        return values
      })
      expect(chevron(theme, { kind: 'navigate' }).css).toContain('width:23px;height:23px;')
      expect(chevron(theme, { kind: 'navigate', size: '31px' }).css).toContain('width:31px;height:31px;')
      expect(chevron(theme, { kind: 'navigate' }).css).not.toMatch(/[;{]color:/)
    })

    it('mirrored right to left, not left to right', () => {
      expect(chevron(themed(), { kind: 'navigate' }).css).not.toContain('scaleX(-1)')
      expect(chevron(themed(undefined, { rtl: true }), { kind: 'navigate' }).css).toContain('transform:scaleX(-1);')
      expect(rtlMirrorCss({ rtl: true })).toBe('transform: scaleX(-1);')
      expect(rtlMirrorCss({})).toBe('')
    })
  })
})

describe('listChevronMaskCss', () => {
  it('the Lucide chevron-down glyph as a mask of components.input icon_size, painted in currentColor', () => {
    const theme = themed((values) => {
      values.components.input.base.icon_size = 18
      return values
    })
    const css = tight(listChevronMaskCss(theme))
    expect(css).toContain('width:18px;height:18px;')
    expect(css).toContain('background-color:currentColor;')
    expect(css).toMatch(/-webkit-mask:url\("data:image\/svg\+xml,[^"]*viewBox='002424'[^"]*m69666-6/)
    expect(css).toMatch(/[;]mask:url\("data:image\/svg\+xml/)
  })

  it('the mask is CHEVRON_DOWN_MASK of Icon/chevronGlyphs (the glyphs live there, not in the control)', () => {
    expect(CHEVRON_DOWN_MASK).toMatch(/^url\("data:image\/svg\+xml,/)
    const css = listChevronMaskCss(themed())
    expect(css).toContain(`-webkit-mask: ${CHEVRON_DOWN_MASK} center / contain no-repeat;`)
    expect(css).toContain(`mask: ${CHEVRON_DOWN_MASK} center / contain no-repeat;`)
  })
})
