import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia, themeSize } from '~/utils/themeTokens'

// setupTests.js mocks these styles globally: the real CSS here.
const { SingleCard, OrderPastContent, PastLogo } = await vi.importActual('~ui/src/components/VerticalOrdersLayout/styles')

describe('VerticalOrdersLayout — fluid boxes (no fixed px)', () => {
  it('the card is a multiple of size.xl high, not 100/140 px', () => {
    const { container } = renderWith(defaultTheme, <SingleCard />)
    const xl = themeSize(defaultTheme, 'xl')
    const css = cssFor(container.firstChild)
    expect(css).toContain(`min-height:calc(1.75 * ${xl});`)
    expect(css).toContain(`min-height:calc(2.5 * ${xl});`)
  })

  it('the past order text column is bounded in ch', () => {
    const { container } = renderWith(defaultTheme, <OrderPastContent />)
    expect(cssFor(container.firstChild)).toContain('min-width:28ch;')
  })

  it('the past logo takes the 3xs media level', () => {
    const { container } = renderWith(defaultTheme, <PastLogo />)
    expect(cssFor(container.firstChild)).toContain(`width:${themeMedia(defaultTheme, '3xs')};`)
  })
})
