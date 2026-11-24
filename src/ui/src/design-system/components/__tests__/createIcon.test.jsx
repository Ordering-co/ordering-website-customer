import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { Heart, Truck } from 'lucide-react'
import { buildAppTheme } from '~/utils/appTheme'
import { themeIconSize } from '~/utils/themeTokens'
import { LUCIDE_ICON_REGISTRY } from '~ui/src/components/Icon/lucideRegistry'
import { ORDER_CONTEXT_GLYPHS } from '~ui/src/components/Icon/orderContextGlyphs'
import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { createIcon } from '../createIcon'
import { Icon } from '../Icon'

const theme = buildAppTheme(null, { version: 2, values: { tokens: { icon: { sm: 18, md: 22, lg: 30 } } } })
const draw = (element) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>).container.querySelector('svg')

afterEach(() => vi.restoreAllMocks())

describe('createIcon', () => {
  const Mini = createIcon({ heart: Heart, truck: Truck }, new Set(['heart']))

  it('draws only the glyphs of the registry it is given, at the text size by default', () => {
    const svg = draw(<Mini name='truck' />)
    expect(svg.getAttribute('class')).toContain('lucide-truck')
    expect(svg.getAttribute('width')).toBe('1em')
    expect(draw(<Mini name='truck' size='md' />).getAttribute('width')).toBe(themeIconSize(theme, 'md'))
    expect(draw(<Mini name='truck' size='2rem' />).getAttribute('width')).toBe('2rem')
  })

  it('is decoration unless it has a label; fills only the names of the set', () => {
    expect(draw(<Mini name='truck' />).getAttribute('aria-hidden')).toBe('true')
    const named = draw(<Mini name='truck' label='Delivery' />)
    expect(named.getAttribute('role')).toBe('img')
    expect(named.getAttribute('aria-label')).toBe('Delivery')
    expect(draw(<Mini name='heart' />).getAttribute('fill')).toBe('currentColor')
    expect(draw(<Mini name='truck' />).getAttribute('fill')).toBe('none')
  })

  it('a name outside its registry draws nothing and warns; the filled set is optional', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<ThemeProvider theme={theme}><Mini name='bell' /></ThemeProvider>)
    expect(container.querySelector('svg')).toBeNull()
    expect(warn).toHaveBeenCalledWith('Icon: unknown name "bell"')
    expect(draw(React.createElement(createIcon({ heart: Heart }), { name: 'heart' })).getAttribute('fill')).toBe('none')
  })

  it('Icon is it over the whole registry; OrderIcon over the order context\'s nine glyphs', () => {
    expect(draw(<Icon name='heartFilled' />).getAttribute('fill')).toBe('currentColor')
    expect(draw(<OrderIcon name='truckOutline' size='lg' label='Delivery' />).getAttribute('height')).toBe(themeIconSize(theme, 'lg'))
    expect(draw(<OrderIcon name='truckOutline' label='Delivery' />).getAttribute('aria-label')).toBe('Delivery')
    expect(Object.keys(ORDER_CONTEXT_GLYPHS)).toHaveLength(9)
    Object.entries(ORDER_CONTEXT_GLYPHS).forEach(([name, glyph]) => expect(LUCIDE_ICON_REGISTRY[name]).toBe(glyph))
  })
})
