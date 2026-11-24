import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, rebuildTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessLogo, ReviewsProgressWrapper, WrapperBusinessLogo } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')

// implementation notesthe logo box is the theme's 3xs media level, the stars row is
// as wide as its measure allows (ch), not 210px.
describe('ReviewTrigger fluid layout', () => {
  it('the logo box and its fallback follow components.media 3xs', () => {
    const theme = rebuildTheme(themeWithValues(), (values) => {
      values.components.media.base['3xs'] = 77
      return values
    })
    const wrapper = renderWith(theme, <WrapperBusinessLogo>box</WrapperBusinessLogo>)
    expect(flat(cssFor(wrapper.getByText('box')))).toMatch(/width:77px;height:77px;min-height:77px;max-width:77px;/)
    const logo = renderWith(theme, <BusinessLogo>logo</BusinessLogo>)
    const css = flat(cssFor(logo.getByText('logo')))
    expect(css).toMatch(/width:77px;height:77px;/)
    expect(css).toMatch(/min-height:77px;/)
    expect(css).not.toContain('69px')
  })

  it('the stars row has a reading measure, not 210px', () => {
    const { getByText } = renderWith(themeWithValues(), <ReviewsProgressWrapper>stars</ReviewsProgressWrapper>)
    const css = flat(cssFor(getByText('stars')))
    expect(css).toContain('width:min(100%,26ch)')
    expect(css).not.toContain('210px')
  })
})
