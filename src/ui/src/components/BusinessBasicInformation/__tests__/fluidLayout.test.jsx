import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { themeSize, themeSpace } from '~/utils/themeTokens'

const { RibbonBox, SearchComponentContainer } = await vi.importActual('~ui/src/components/BusinessBasicInformation/styles')
const tight = (text) => text.replace(/\s+/g, '')

describe('BusinessBasicInformation — fluid boxes (no fixed px)', () => {
  it('the ribbon text is capped at 30ch', () => {
    const { container } = renderWith(defaultTheme, <RibbonBox />)
    expect(cssFor(container.firstChild)).toContain('max-width:30ch;')
  })

  it('the compact search leaves size.lg + space.md at its end side, mirrored in rtl', () => {
    const reserve = (theme) => `calc(${themeSize(theme, 'lg')}+${themeSpace(theme, 'md')})`
    const ltr = renderWith(defaultTheme, <SearchComponentContainer />)
    expect(tight(cssFor(ltr.container.firstChild))).toContain(`right:${reserve(defaultTheme)};`)
    ltr.unmount()
    const rtl = { ...defaultTheme, rtl: true }
    const view = renderWith(rtl, <SearchComponentContainer />)
    expect(tight(cssFor(view.container.firstChild))).toContain(`left:${reserve(rtl)};`)
  })
})
