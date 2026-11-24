import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { WrapLogo } from '../styles'

const css = (theme, props) => {
  const { getByTestId, unmount } = renderWith(theme, <WrapLogo data-testid='logo' isBgimage {...props} />)
  const rules = cssFor(getByTestId('logo'))
  unmount()
  return rules
}

describe('product card image (T3: 1:1 with cover)', () => {
  it('the plain card is 130x130', () => {
    const rules = css(themeWithValues(), {})
    expect(rules).toContain('height:130px')
    expect(rules).toContain('width:130px')
  })

  it('"order it again" is 4:3 at its width (226×170 on phones, its platforms.mobile_web value; 326×245 from 576px)', () => {
    const rules = css(themeWithValues(), { isPreviously: true })
    expect(rules).toMatch(/height:170px;max-height:170px;/)
    expect(rules).toMatch(/@media \(min-width:576px\)\{[^}]*height:245px;max-height:245px;/)
  })

  it('featured is square from 768px (246) and a favorite at 140', () => {
    expect(css(themeWithValues(), { isFeatured: true })).toMatch(/@media \(min-width:768px\)\{[^}]*height:246px;max-height:246px;/)
    expect(css(themeWithValues(), { isFavorite: true })).toMatch(/height:140px;max-height:140px;/)
  })
})
