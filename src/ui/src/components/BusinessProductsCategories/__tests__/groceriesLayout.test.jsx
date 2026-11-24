import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { CategoriesWrap } from '../layouts/groceries/styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('BusinessProductsCategories groceries layout: fluid layout', () => {
  it('the list scrolls within the viewport less the header (its measured height)', () => {
    const theme = themeWithValues()
    const out = css(renderWith(theme, <CategoriesWrap data-testid='c' />).getByTestId('c'))
    expect(out).toContain(`max-height:calc(100dvh-var(--header-height,${theme.css.components.header.base.height}));`)
    expect(out).not.toContain('75px')
  })
})
