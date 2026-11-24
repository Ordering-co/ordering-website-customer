import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { SummaryAccordionHeader } from '../styles'

/**
 * The chevron of the checkout's collapsible sections: the disclose
 * ChevronIcon (components.accordion chevron_color and chevron_size, turned
 * while open); the header does not restyle it.
 */

afterEach(cleanup)

const Header = ({ open }) => (
  <SummaryAccordionHeader data-testid='header' active={open}>
    <button type='button' className='header' aria-expanded={open}>
      <span className='title'>Summary</span>
      <ChevronIcon kind='disclose' open={open} />
    </button>
  </SummaryAccordionHeader>
)

const tight = (text) => text.replace(/\s+/g, '')
// an svg's className is not a string: its own classes, as cssFor reads them
const classOf = (svg) => ({ className: svg.getAttribute('class') })

describe('Checkout accordion chevron (complete theme)', () => {
  it('takes components.accordion chevron_color and chevron_size, turned while open', () => {
    const theme = themeWithValues((values) => {
      const v = structuredClone(values)
      v.components.accordion.base = { ...v.components.accordion.base, chevron_color: '#123456', chevron_size: 24 }
      return v
    })
    const { container } = renderWith(theme, <Header open />)
    const svg = container.querySelector('svg.lucide-chevron-down')
    const chevron = tight(cssFor(classOf(svg)))
    expect(chevron).toContain('color:#123456')
    expect(chevron).toContain('font-size:24px;width:24px;height:24px;')
    expect(chevron).toContain('transform:rotate(180deg)')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('the schema defaults: the accordion\'s chevron color at its size; the header has no svg rule of its own', () => {
    const theme = themeWithValues()
    const { container, getByTestId } = renderWith(theme, <Header open={false} />)
    const chevron = tight(cssFor(classOf(container.querySelector('svg.lucide-chevron-down'))))
    const { chevron_color: color, chevron_size: size } = theme.values.components.accordion.base
    expect(chevron).toContain(`color:${color}`)
    expect(chevron).toContain(`width:${size}px`)
    expect(chevron).toContain('transform:rotate(0deg)')
    expect(tight(cssFor(getByTestId('header')))).not.toMatch(/\.header svg\{/)
  })
})
