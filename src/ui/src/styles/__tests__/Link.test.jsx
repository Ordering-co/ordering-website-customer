import React from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from '~ui/src/design-system/components/Button'
import { linkColor, linkThemeRules, linkTheme } from '../Link'
import { defaultTheme, renderWith, themeWithValues } from './themeTestUtils'

// A complete theme with components.link as the API serves it (resolved)
const withLink = (base = {}) => themeWithValues((values) => {
  values.components.link = {
    base: { color: '#2C7BE5', underline: 'hover', ...base },
    sizes: {
      sm: { text: { size: 12, line: 1.33, weight: 400, family: 'archivo' } },
      md: { text: { size: 14, line: 1.43, weight: 600, family: 'archivo' } },
      lg: { text: { size: 16, line: 1.5, weight: 600, family: 'archivo' } }
    },
    variants: {
      default: { states: { pressed: { opacity: 0.85 }, disabled: { color: '#B1BCCC' } } },
      muted: { color: '#616161', states: { pressed: { opacity: 0.85 }, disabled: { color: '#B1BCCC' } } },
      danger: { color: '#D83520', states: { pressed: { opacity: 0.85 }, disabled: { color: '#B1BCCC' } } }
    }
  }
  return values
})

describe('components.link', () => {
  it('resolves its variant and size (md and default when none or unknown)', () => {
    const theme = withLink()
    expect(linkTheme(theme)).toMatchObject({ color: '#2C7BE5', underline: 'hover', text: { size: 14 } })
    expect(linkTheme(theme, { variant: 'danger', size: 'sm' })).toMatchObject({ color: '#D83520', text: { size: 12 } })
    expect(linkTheme(theme, { variant: 'nope', size: 'xl' })).toMatchObject({ color: '#2C7BE5', text: { size: 14 } })
  })

  it('inline, no box; underline on hover; pressed opacity and disabled color', () => {
    const rules = linkThemeRules(withLink())
    expect(rules).toContain('padding: 0;')
    expect(rules).toContain('background: none;')
    expect(rules).toContain('color: #2C7BE5;')
    expect(rules).toContain('text-decoration: none;')
    expect(rules).toMatch(/&:hover \{[^}]*text-decoration: underline;/)
    expect(rules).toContain('&:active { opacity: 0.85; }')
    expect(rules).toContain("&:disabled, &[aria-disabled='true'] { color: #B1BCCC;")
  })

  it('underline: always / none', () => {
    expect(linkThemeRules(withLink({ underline: 'always' }))).toMatch(/^text-decoration: underline;/m)
    expect(linkThemeRules(withLink({ underline: 'none' }))).toMatch(/&:hover \{[^}]*text-decoration: none;/)
  })

  it('a link Button reads the theme\'s link variant and size', () => {
    const { getByRole } = renderWith(withLink(), <Button appearance='link' linkVariant='muted' size='sm'>Show map</Button>)
    const link = getByRole('button', { name: 'Show map' })
    expect(link).toHaveAttribute('type', 'button')
    expect(link.style.getPropertyValue('--ui-link-color')).toBe('#616161')
  })
})

describe('linkColor (a plain link)', () => {
  it('components.link\'s color', () => {
    expect(linkColor(withLink({ color: '#ABCDEF' }))).toBe('#ABCDEF')
  })

  it('a null color (not one the schema allows for links) is the default link color', () => {
    const theme = themeWithValues((values) => {
      values.components.link.base.color = null
      values.tokens.color.primary_text = '#123456'
      return values
    })
    expect(linkColor(theme)).toBe(defaultTheme.values.components.link.base.color)
  })
})
