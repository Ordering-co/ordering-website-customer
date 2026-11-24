import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { AddActionSlot, ProductActions, ScheduleForLater } from '../styles'

const theme = themeWithValues()
const tight = (text) => text.replace(/\s+/g, '')
const slot = (props) => {
  const view = renderWith(theme, <AddActionSlot data-testid='s' {...props} />)
  const css = tight(cssFor(view.getByTestId('s')))
  view.unmount()
  return css
}

// implementation notesthe footer's actions are sized by their slot; no rule of the bar or the slot reaches the Button
describe('ProductForm: the slot of a footer action', () => {
  it('takes the row beside the quantity (the add button\'s basis), with no width and no margin of its own', () => {
    for (const props of [{ $twoColumns: false }, { $twoColumns: true }]) {
      const css = slot(props)
      expect(css).toMatch(/flex:11min\(100%,calc\(3\*[^)]+\)\);/)
      expect(css).toContain('min-width:0;')
      expect(css).not.toMatch(/(^|[;{])width:|margin-top:|@media/)
    }
  })

  it('sold out: no pointer, and it fills the row because the quantity is not there', () => {
    const css = slot({ $soldout: true })
    expect(css).toContain('pointer-events:none;')
    expect(css).toMatch(/flex:11min\(100%/)
  })

  it('the schedule wrapper takes no box: its button is a row item and its hint the row under them', () => {
    const view = renderWith(theme, <ScheduleForLater data-testid='x' />)
    expect(tight(cssFor(view.getByTestId('x')))).toContain('display:contents;')
  })

  it('the bar and the schedule slot write no width over a Button', () => {
    for (const Styled of [ProductActions, ScheduleForLater]) {
      const view = renderWith(theme, <Styled data-testid='x' />)
      const css = tight(cssFor(view.getByTestId('x')))
      view.unmount()
      expect(css).not.toMatch(/button\.add|[{,}>]button[{.:]/)
    }
  })
})
