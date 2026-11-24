import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia, themeSize } from '~/utils/themeTokens'

const { PlaceSpotContainer, WrapperOption } = await vi.importActual('~ui/src/components/PlaceSpot/styles')

describe('PlaceSpot — fluid boxes (no fixed px)', () => {
  it('the section reserves a multiple of size.xl and its illustration takes the xl media level', () => {
    const { container } = renderWith(defaultTheme, <PlaceSpotContainer isCheckout />)
    const css = cssFor(container.firstChild)
    expect(css).toContain(`min-height:calc(1.5 * ${themeSize(defaultTheme, 'xl')});`)
    expect(css).toContain(`height:${themeMedia(defaultTheme, 'xl')};`)
    expect(css).toContain('width:auto;aspect-ratio:170 / 150;')
  })

  it('the option column wraps at 30ch', () => {
    const { container } = renderWith(defaultTheme, <WrapperOption />)
    expect(cssFor(container.firstChild)).toContain('min-width:30ch;')
  })
})
