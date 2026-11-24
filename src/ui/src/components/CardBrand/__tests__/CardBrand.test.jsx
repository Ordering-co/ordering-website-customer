import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { CardBrand } from '../index'

describe('CardBrand (T9 and the generic card)', () => {
  it('a brand with its mark, 24x20 with contain (never stretched)', () => {
    const { getByAltText } = renderWith(defaultTheme, <CardBrand brand='VISA' alt='visa' />)
    const img = getByAltText('visa')
    expect(img).toHaveAttribute('src', BUNDLED_IMAGES.general.visa)
    expect(img).toHaveAttribute('width', '24')
    expect(img).toHaveAttribute('height', '20')
    const css = cssFor(img)
    expect(css).toContain('width:24px')
    expect(css).toContain('height:20px')
    expect(css).toContain('object-fit:contain')
  })

  it('a brand without a mark is the creditCard icon (not credit.jpg), named by its alt', () => {
    const { container, getByRole } = renderWith(defaultTheme, <CardBrand brand='unknownbrand' alt='unknownbrand' />)
    expect(container.querySelector('img')).toBeNull()
    const box = getByRole('img', { name: 'unknownbrand' })
    // the real icon, decorative: the box carries the name
    expect(box.querySelector('svg.lucide-credit-card')).toHaveAttribute('aria-hidden', 'true')
    expect(cssFor(box)).toContain('width:24px')
    expect(cssFor(box)).toContain('height:20px')
  })

  it('without an alt the icon is hidden from assistive tech', () => {
    const { container } = renderWith(defaultTheme, <CardBrand brand='' alt='' />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
