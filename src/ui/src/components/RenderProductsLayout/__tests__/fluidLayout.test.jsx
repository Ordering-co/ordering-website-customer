import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessCartContainer, BusinessCategoriesContainer, MobileCartViewWrapper, WrapContent, WrapperSearch } from '../styles'

const css = (Comp, props = {}) => cssFor(renderWith(themeWithValues(), <Comp {...props} />).container.firstChild).replace(/\s+/g, '')
const HEADER = 'var(--header-height,'

describe('RenderProductsLayout: fluid layout', () => {
  it('the sticky bar and the offsets under the header follow the real header height', () => {
    expect(css(BusinessCategoriesContainer)).toContain(`top:${HEADER}`)
    expect(css(BusinessCartContainer)).toContain(`margin-top:${HEADER}`)
    expect(css(WrapContent)).toContain(`margin-top:${HEADER}`)
    expect(css(WrapContent)).not.toContain('margin-top:70px')
  })

  it('the cart column and the search field are relative to their box', () => {
    expect(css(BusinessCartContainer)).toContain('min-width:min(100%,40ch)')
    expect(css(WrapperSearch)).toContain('width:min(100%,30ch)')
  })

  // implementation notesa vw unit can be wider than the screen shows and widen the page sideways
  it('the fixed cart bar spans the viewport by its sides, not by 100vw', () => {
    const bar = css(MobileCartViewWrapper)
    expect(bar).toContain('position:fixed;')
    expect(bar).toMatch(/left:0;right:0;bottom:0;/)
    expect(bar).not.toMatch(/width:100vw|\b100vw\b/)
  })
})
