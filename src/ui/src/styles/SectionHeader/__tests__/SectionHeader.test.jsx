import { describe, it, expect } from 'vitest'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { sectionDescriptionCss, sectionTitleCss, sectionTitleTextCss } from '../index'
import { themeWithValues } from '../../__tests__/themeTestUtils'

// components.section_header: the one owner of the titles (h2: base; a
// page's h1: the page variant)

const themed = () => themeWithValues((values) => {
  values.components.section_header.base = { ...values.components.section_header.base, align: 'center', margin_bottom: 9, title_color: '#0A0A0A' }
  values.components.section_header.variants.page = { ...values.components.section_header.variants.page, margin_bottom: 29 }
  return values
})

describe('components.section_header', () => {
  it('schema: align on the base; the page variant its h1 and a larger space under it', () => {
    expect(schemaEntry('components.section_header.base.align')).toMatchObject({ type: 'option', value: 'start', options: ['start', 'center', 'end'] })
    expect([...schemaKeys('components.section_header.variants.page')].sort()).toEqual(['margin_bottom', 'title'])
    expect(schemaEntry('components.section_header.variants.page.title')).toMatchObject({ type: 'text', value: '{typography.h1}' })
    expect(schemaEntry('components.section_header.variants.page.margin_bottom')).toMatchObject({ type: 'space', value: '{space.xl}' })
  })

  it('the defaults: the h2 sm under it, the page h1 xl under it, both at the start', () => {
    const theme = themeWithValues()
    const { sm, xl } = theme.values.tokens.space
    expect(sectionTitleCss(theme, { level: 'h2' })).toContain(`margin-bottom: ${sm}px;`)
    expect(sectionTitleCss(theme, { level: 'h1' })).toContain(`margin-bottom: ${xl}px;`)
    expect(sectionTitleCss(theme, { level: 'h1' })).toContain(`font-size: ${theme.values.tokens.typography.h1.size}px;`)
    expect(sectionTitleCss(theme, { level: 'h2' })).toContain('text-align: start;')
  })

  it('the page variant overrides the base\'s space; color and alignment are the base\'s', () => {
    const theme = themed()
    const h2 = sectionTitleCss(theme, { level: 'h2' })
    const h1 = sectionTitleCss(theme, { level: 'h1' })
    expect(h2).toContain('color: #0A0A0A;')
    expect(h2).toContain('text-align: center;')
    expect(h2).toContain('margin-bottom: 9px;')
    expect(h1).toContain('color: #0A0A0A;')
    expect(h1).toContain('text-align: center;')
    expect(h1).toContain('margin-bottom: 29px;')
    expect(sectionDescriptionCss(theme, { level: 'h1' })).toContain('text-align: center;')
  })

  it('a spot may leave the space, the alignment or the color to itself', () => {
    const theme = themed()
    expect(sectionTitleCss(theme, { level: 'h1', spaced: false })).not.toContain('margin-bottom')
    expect(sectionTitleCss(theme, { level: 'h1', aligned: false })).not.toContain('text-align')
    expect(sectionTitleTextCss(theme, { level: 'h1', color: false })).not.toContain('color:')
    expect(sectionTitleTextCss(theme, { level: 'h1' })).toContain('color: #0A0A0A;')
  })
})
