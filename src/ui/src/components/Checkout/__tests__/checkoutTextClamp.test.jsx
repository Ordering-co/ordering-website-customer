import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { DockedOrderContextRow, StepCollapsedSummary, StoreStrip } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')
const twoLines = /display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;/

// implementation notes (with implementation notes's rule): names and addresses wrap to two
// lines before they are cut, never one line with an ellipsis
describe('checkout: names and addresses wrap to two lines before they are cut', () => {
  it("the summary's store row (short form) clamps its lines at two, not one with an ellipsis", () => {
    const address = 'Kitchen 8, Ardwick Kitchens, 42 Higher Ardwick, Manchester M12 6DA, UK'
    const { getByText } = renderWith(themeWithValues(), (
      <StoreStrip $short><div className='store-strip-text'><p title={address}>{address}</p></div></StoreStrip>
    ))
    const css = flat(cssFor(getByText(address)))
    expect(css).toMatch(twoLines)
    expect(css).not.toMatch(/white-space:nowrap/)
  })

  it("a folded step's summary clamps at two lines too", () => {
    const { getByText } = renderWith(themeWithValues(), (
      <StepCollapsedSummary title='Ana QA · ana@shop.test · 2015550123'>Ana QA · ana@shop.test · 2015550123</StepCollapsedSummary>
    ))
    const el = getByText(/Ana QA/)
    expect(flat(cssFor(el))).toMatch(twoLines)
    expect(el).toHaveAttribute('title', 'Ana QA · ana@shop.test · 2015550123')
  })
})

// implementation notesbetween 769 and 1023px the docked order context sat in the
// grid's first cell and pushed the details into the summary's column
describe('checkout grid: the docked order context is a row of its own', () => {
  it('spans every column', () => {
    const { getByText } = renderWith(themeWithValues(), <DockedOrderContextRow>bar</DockedOrderContextRow>)
    expect(flat(cssFor(getByText('bar')))).toMatch(/grid-column:1\/-1;/)
  })
})
