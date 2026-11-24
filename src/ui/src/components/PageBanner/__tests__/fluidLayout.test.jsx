import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themeSpace } from '~/utils/themeTokens'

const { BannerContainer } = await vi.importActual('~ui/src/components/PageBanner/styles')

describe('PageBanner — fluid width', () => {
  it('the horizontal carousel leaves two xxl spaces of the viewport, not a fixed 60px', () => {
    const { container } = renderWith(defaultTheme, <BannerContainer isHorizontal />)
    const css = cssFor(container.firstChild)
    expect(css).toContain(`width:calc(100vw - 2 * ${themeSpace(defaultTheme, 'xxl')});`)
    expect(css).not.toContain('60px')
  })
})
