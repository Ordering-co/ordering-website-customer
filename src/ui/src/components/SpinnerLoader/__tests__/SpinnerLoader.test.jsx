import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeSpace } from '~/utils/themeTokens'

import { SpinnerLoader } from '../index'

vi.unmock('~ui/src/components/SpinnerLoader')

describe('SpinnerLoader', () => {
  it('renders spinner immediately when delayMs is omitted', () => {
    const { container } = renderWithProviders(<SpinnerLoader content='Loading' />)
    expect(container.querySelector('.spinner')).toBeInTheDocument()
    expect(container).toHaveTextContent('Loading')
  })

  it('the logotype is the xl medium tall, with its own proportion and no fixed size attributes', () => {
    const { container, getByAltText } = renderWithProviders(<SpinnerLoader logotype='logo.png' />)
    const img = getByAltText('Logo')
    expect(img).not.toHaveAttribute('width')
    expect(img).not.toHaveAttribute('height')
    const css = cssFor(img.parentElement)
    expect(css).toContain('height:150px;')
    expect(css).toContain('width:auto;')
    expect(css).toContain('aspect-ratio:266 / 150;')
    expect(css).not.toContain('max-height')
    expect(container.querySelector('.spinner')).toBeInTheDocument()
  })

  describe('size', () => {
    const tight = (css) => css.replace(/\s+/g, '')
    // a diameter of its own per size, so each one is told apart
    const theme = themeWithValues((values) => {
      Object.assign(values.components.spinner.sizes.sm, { diameter: 19 })
      Object.assign(values.components.spinner.sizes.md, { diameter: 31 })
      Object.assign(values.components.spinner.sizes.lg, { diameter: 97 })
      return values
    })
    const renderSize = (props) => {
      const { container } = renderWithProviders(<SpinnerLoader {...props} />, { theme })
      return { box: container.firstChild, ring: container.querySelector('.spinner') }
    }
    // the ring's rules: its generated class is the one before the `spinner` it is given
    const ringCss = (ring) => tight(cssFor({ className: ring.className.replace(' spinner', '') }))
    const diameterOf = (ring) => ringCss(ring).match(/\.spinner-content>div\{[^}]*?width:(\d+)px;/)[1]

    it('is lg by default: the whole screen and the lg ring of the theme', () => {
      const { box, ring } = renderSize({})
      expect(diameterOf(ring)).toBe('97')
      expect(tight(cssFor(box))).toContain('height:100vh;height:100dvh;')
      expect(tight(cssFor(box))).not.toContain('padding-block')
    })

    it.each([['sm', '19'], ['md', '31']])('%s is the ring of that size and does not fill the screen', (size, diameter) => {
      const { box, ring } = renderSize({ size })
      expect(diameterOf(ring)).toBe(diameter)
      const css = tight(cssFor(box))
      expect(css).not.toContain('100vh')
      expect(css).not.toContain('100dvh')
      expect(css).not.toMatch(/(^|[;{])height:/)
      // the theme's space above and below, not a number of its own
      expect(css).toContain(`padding-block:${themeSpace(theme, 'md')};`)
      expect(box).toHaveStyle({ width: '100%' })
    })

    it('an unknown size is lg', () => {
      const { box, ring } = renderSize({ size: 'huge' })
      expect(diameterOf(ring)).toBe('97')
      expect(tight(cssFor(box))).toContain('height:100vh;')
    })

    it('a height the screen gives it still wins over the screen height', () => {
      const { box } = renderSize({ style: { height: 160 } })
      expect(box).toHaveStyle({ height: '160px' })
    })

    it('size is not an attribute of the markup and a size the screen gives the ring stays', () => {
      const { container } = renderWithProviders(<SpinnerLoader size='md' iconStyleWidth={40} iconStyleHeight={40} />, { theme })
      expect(container.querySelector('[size]')).toBeNull()
      expect(ringCss(container.querySelector('.spinner'))).toContain('width:40px;min-width:40px;height:40px;min-height:40px;')
    })
  })
})
