import React from 'react'
import { describe, expect, it } from 'vitest'
import { Divider, dividerCss, dividerLineCss, dividerRules, dividerSpacing, dividerTheme } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

// The served values (theme 10): what the schema's defaults resolve to
const LINE = { width: 1, color: '#E9ECEF', style: 'solid' }
const BAND = { width: 8, color: '#F8F9FA', style: 'solid' }

const theme = (mutate = () => {}) => themeWithValues((values) => {
  mutate(values.components.divider.variants)
  return values
})

const flat = (css) => css.replace(/\s+/g, ' ')

describe('components.divider: dividerTheme', () => {
  it('each variant resolved (line, spacing, indent)', () => {
    const t = theme()
    expect(dividerTheme(t, 'item')).toEqual({ line: LINE, spacing: 0, indent: 0 })
    expect(dividerTheme(t, 'section')).toEqual({ line: LINE, spacing: 24, indent: 0 })
    expect(dividerTheme(t, 'band')).toEqual({ line: BAND, spacing: 0, indent: 0 })
    expect(dividerTheme(t, 'vertical')).toEqual({ line: LINE, spacing: 16, indent: 8 })
  })

  it('an unknown variant: null', () => {
    expect(dividerTheme(theme(), 'thick')).toBeNull()
  })

  it('a null line is no divider; a bad spacing or indent is 0', () => {
    expect(dividerTheme(theme((v) => { v.item.line = null }), 'item')).toEqual({ line: null, spacing: 0, indent: 0 })
    expect(dividerTheme(theme((v) => { v.section.spacing = -3; v.section.indent = 'x' }), 'section')).toMatchObject({ spacing: 0, indent: 0 })
  })

  it('the line is fixed: tokens.border_style does not change it', () => {
    const t = themeWithValues((values) => {
      values.tokens.border_style = { width: 'thick', style: 'dotted' }
      return values
    })
    expect(dividerLineCss(t, 'item')).toBe('border-bottom: 1px solid #E9ECEF;')
  })
})

describe('components.divider: dividerLineCss', () => {
  it('the line on an edge (bottom by default)', () => {
    const t = theme()
    expect(dividerLineCss(t, 'item')).toBe('border-bottom: 1px solid #E9ECEF;')
    expect(dividerLineCss(t, 'item', { edge: 'top' })).toBe('border-top: 1px solid #E9ECEF;')
    expect(dividerLineCss(t, 'vertical', { edge: 'left' })).toBe('border-left: 1px solid #E9ECEF;')
  })

  it('inline edges follow theme.rtl', () => {
    const t = theme()
    expect(dividerLineCss(t, 'vertical', { edge: 'inline-start' })).toBe('border-left: 1px solid #E9ECEF;')
    expect(dividerLineCss(t, 'vertical', { edge: 'inline-end' })).toBe('border-right: 1px solid #E9ECEF;')
    const rtl = { ...t, rtl: true }
    expect(dividerLineCss(rtl, 'vertical', { edge: 'inline-start' })).toBe('border-right: 1px solid #E9ECEF;')
    expect(dividerLineCss(rtl, 'vertical', { edge: 'inline-end' })).toBe('border-left: 1px solid #E9ECEF;')
  })

  it('a style of the spot, !important, and the spacing as the padding on that edge', () => {
    const t = theme()
    expect(dividerLineCss(t, 'item', { style: 'dashed' })).toBe('border-bottom: 1px dashed #E9ECEF;')
    expect(dividerLineCss(t, 'item', { important: true })).toBe('border-bottom: 1px solid #E9ECEF !important;')
    expect(dividerLineCss(t, 'vertical', { edge: 'inline-end', padding: true })).toBe('border-right: 1px solid #E9ECEF; padding-right: 16px;')
  })

  it('no line: none (and no padding beside it)', () => {
    const t = theme((v) => { v.item.line = null; v.vertical.line = null })
    expect(dividerLineCss(t, 'item')).toBe('border-bottom: none;')
    expect(dividerLineCss(t, 'vertical', { edge: 'inline-end', padding: true })).toBe('border-right: none; padding-right: 0px;')
  })

  it('dividerSpacing: the variant\'s spacing in px', () => {
    expect(dividerSpacing(theme(), 'item')).toBe('0px')
    expect(dividerSpacing(theme(), 'section')).toBe('24px')
  })
})

describe('components.divider: dividerCss', () => {
  it('section: a hairline on the top edge of an empty box, spacing above and below, indent at the ends', () => {
    const css = dividerCss(theme((v) => { v.section.indent = 12 }), 'section')
    expect(css).toContain('height: 0;')
    expect(css).toContain('border-top: 1px solid #E9ECEF;')
    expect(css).toContain('width: auto;')
    expect(css).toContain('margin: 24px 12px;')
  })

  it('band: a full-width block of the line\'s width in its color', () => {
    const css = dividerCss(theme(), 'band')
    expect(css).toContain('height: 8px;')
    expect(css).toContain('background: #F8F9FA;')
    expect(css).toContain('border: none;')
    expect(css).toContain('margin: 0px 0px;')
  })

  it('vertical: the line stretched to its row, spacing beside it, indent at the ends', () => {
    const css = dividerCss(theme(), 'vertical')
    expect(css).toContain('align-self: stretch;')
    expect(css).toContain('width: 0;')
    expect(css).toContain('border-inline-start: 1px solid #E9ECEF;')
    expect(css).toContain('margin: 8px 16px;')
  })

  it('inline: false keeps the spot\'s width and inline margins (a bleed)', () => {
    const css = dividerCss(theme(), 'band', { inline: false })
    expect(css).toContain('margin-top: 0px; margin-bottom: 0px;')
    expect(css).not.toMatch(/(^| )(max-)?width:/)
    expect(css).not.toMatch(/margin: /)
  })

  it('no line: nothing is drawn and its spacing collapses', () => {
    expect(dividerCss(theme((v) => { v.section.line = null }), 'section')).toBe('display: none;')
  })

  it('dividerRules wraps it over the spot\'s rules', () => {
    expect(dividerRules(theme(), 'section')).toMatch(/^&& \{ .*border-top: 1px solid #E9ECEF;.* \}$/)
    expect(dividerRules(theme(), 'section', { specificity: 3 })).toMatch(/^&&& \{/)
  })
})

describe('Divider (<hr>)', () => {
  it('a separator; vertical ones say so; decorative ones are hidden', () => {
    const { getAllByRole, container } = renderWith(theme(), (
      <>
        <Divider />
        <Divider $variant='vertical' />
        <Divider $decorative data-testid='decorative' />
      </>
    ))
    const [section, vertical] = getAllByRole('separator')
    expect(section.tagName).toBe('HR')
    expect(section).not.toHaveAttribute('aria-orientation')
    expect(vertical).toHaveAttribute('aria-orientation', 'vertical')
    const decorative = container.querySelector('[data-testid="decorative"]')
    expect(decorative).toHaveAttribute('aria-hidden', 'true')
    expect(getAllByRole('separator')).toHaveLength(2)
  })

  it('the variant\'s look over the local one', () => {
    const { getAllByRole } = renderWith(theme(), (
      <>
        <Divider />
        <Divider $variant='band' />
        <Divider $variant='vertical' />
      </>
    ))
    const [section, band, vertical] = getAllByRole('separator')
    expect(section).toHaveStyle({ height: '0px', borderTop: '1px solid #E9ECEF', marginTop: '24px', marginBottom: '24px' })
    expect(band).toHaveStyle({ height: '8px', background: '#F8F9FA', marginTop: '0px' })
    expect(flat(cssFor(vertical))).toContain('border-inline-start:1px solid #E9ECEF')
    expect(flat(cssFor(vertical))).toContain('margin:8px 16px')
  })

  it('without a line: not shown', () => {
    const { getByRole } = renderWith(theme((v) => { v.section.line = null }), <Divider />)
    expect(getByRole('separator', { hidden: true })).toHaveStyle({ display: 'none' })
  })
})
