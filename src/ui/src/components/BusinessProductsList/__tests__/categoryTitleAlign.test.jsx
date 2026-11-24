import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { CategoryDescription, WrapAllCategories } from '../styles'
import { WrapContent } from '../../RenderProductsLayout/styles'

const flat = (css) => css.replace(/\s+/g, '')
const css = (theme, element) => flat(cssFor(renderWith(theme, element).container.firstChild))

// A category's title starts where its cards start, at every
// width (below 993px the box and the h2 each added an md inset: 24px to the
// right of the cards), and below 576px the products have no side inset
// either, so cards and titles line up with the banner and the category bar.
describe('the category title lines up with its cards', () => {
  it('no inset on the title\'s box nor on its h2, whatever the width', () => {
    const rules = css(themeWithValues(), <WrapAllCategories />)
    expect(rules).toMatch(/\.category-title\{[^}]*margin:0;\}/)
    expect(rules).toMatch(/h2\{[^}]*margin:0;(\}|$)/)
    expect(css(themeWithValues(), <CategoryDescription />)).toMatch(/margin-inline-start:0;/)
  })

  it('the products have no side inset under 576px', () => {
    expect(css(themeWithValues(), <WrapContent />)).toContain('padding-left:0;padding-right:0;')
  })
})
