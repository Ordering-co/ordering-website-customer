import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { Heart } from 'lucide-react'
import { buildAppTheme } from '~/utils/appTheme'
import { themeIconSize } from '~/utils/themeTokens'
import { Icon } from '../Icon'

const defaults = buildAppTheme(null, null)
const roomy = buildAppTheme(null, { version: 2, values: { tokens: { icon: { sm: 18, md: 22, lg: 30 } } } })
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>).container.querySelector('svg')

afterEach(() => vi.restoreAllMocks())

describe('Icon', () => {
  it('draws the icon of the registry at the size of the text by default', () => {
    const svg = draw(<Icon name='heartOutline' />)
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('width')).toBe('1em')
    expect(svg.getAttribute('height')).toBe('1em')
  })

  it('a level is the theme\'s icon size, and another theme has another', () => {
    ;['sm', 'md', 'lg'].forEach((level) => {
      expect(draw(<Icon name='heartOutline' size={level} />).getAttribute('width')).toBe(themeIconSize(defaults, level))
    })
    expect(draw(<Icon name='heartOutline' size='md' />, roomy).getAttribute('width')).toBe('22px')
    expect(draw(<Icon name='heartOutline' size='lg' />, roomy).getAttribute('height')).toBe('30px')
  })

  it('any other size is a length or a number of px, as given', () => {
    expect(draw(<Icon name='heartOutline' size='2rem' />).getAttribute('width')).toBe('2rem')
    expect(draw(<Icon name='heartOutline' size={18} />).getAttribute('width')).toBe('18')
  })

  it('is decoration, hidden from assistive technology, unless it has a label', () => {
    const hidden = draw(<Icon name='bell' />)
    expect(hidden.getAttribute('aria-hidden')).toBe('true')
    expect(hidden.getAttribute('role')).toBeNull()
    const named = draw(<Icon name='bell' label='Notifications' />)
    expect(named.getAttribute('role')).toBe('img')
    expect(named.getAttribute('aria-label')).toBe('Notifications')
    expect(named.getAttribute('aria-hidden')).toBeNull()
  })

  it('fills the solid glyphs with the text color and leaves the stroke ones empty', () => {
    expect(draw(<Icon name='heartFilled' />).getAttribute('fill')).toBe('currentColor')
    expect(draw(<Icon name='starFilled' />).getAttribute('fill')).toBe('currentColor')
    expect(draw(<Icon name='heartOutline' />).getAttribute('fill')).toBe('none')
  })

  it('keeps Lucide\'s stroke: it has no width of its own', () => {
    const lucide = render(<Heart />).container.querySelector('svg')
    expect(draw(<Icon name='heartOutline' />).getAttribute('stroke-width')).toBe(lucide.getAttribute('stroke-width'))
  })

  it('draws the brand glyphs too, and passes className and the rest to the svg', () => {
    const svg = draw(<Icon name='facebook' className='ui:text-primary' data-testid='brand' />)
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.getAttribute('class')).toContain('ui:text-primary')
    expect(svg.getAttribute('data-testid')).toBe('brand')
  })

  it('an unknown name draws nothing and says so outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Icon name='nope' />)
    expect(container.firstChild).toBeNull()
    expect(warn).toHaveBeenCalledWith('Icon: unknown name "nope"')
  })

  it('works without a theme provider for a length', () => {
    expect(render(<Icon name='heartOutline' size={16} />).container.querySelector('svg').getAttribute('width')).toBe('16')
  })
})
