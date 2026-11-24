import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia, themeSize } from '~/utils/themeTokens'

const { CopyAction, ProductImageWrapper } = await vi.importActual('~ui/src/components/ProductShare/styles')

describe('ProductShare — copy window boxes (no fixed px)', () => {
  it('the copy action keeps a ch minimum and a 2 x size.xl separation on desktop', () => {
    const { container } = renderWith(defaultTheme, <CopyAction />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('min-width:12ch;')
    expect(css).toContain(`margin-top:calc(2 * ${themeSize(defaultTheme, 'xl')});`)
  })

  it('the product thumbnail is the xs media level on a phone and 4xl on desktop', () => {
    const { container } = renderWith(defaultTheme, <ProductImageWrapper />)
    const css = cssFor(container.firstChild)
    expect(css).toContain(`width:${themeMedia(defaultTheme, 'xs')};height:${themeMedia(defaultTheme, 'xs')};`)
    expect(css).toContain(`width:${themeMedia(defaultTheme, '4xl')};height:${themeMedia(defaultTheme, '4xl')};`)
  })
})
