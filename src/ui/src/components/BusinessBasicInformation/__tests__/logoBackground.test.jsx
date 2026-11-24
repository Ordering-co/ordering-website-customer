import React from 'react'
import { describe, expect, it } from 'vitest'
import { BusinessLogo } from '../styles'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notesthe business logo is never cropped. `themePart(theme, 'card',
// { background: ... })` used to emit the `background` shorthand after
// `background-size: cover`, resetting the size to `auto` and the position
// to `0% 0%` (confirmed in the browser: a 200x200 logo in a 120x120 box
// showed only its top-left corner). The fix is `background-size: contain`
// and `'background-color'` (never the `background` shorthand).

describe('BusinessLogo (BusinessBasicInformation): whole and centered, never cropped', () => {
  it('contain + centered, and the card paints only background-color (no `background:` shorthand after it)', () => {
    const { getByTestId } = renderWith(themeWithValues(), <BusinessLogo data-testid='logo' />)
    const css = cssFor(getByTestId('logo'))
    expect(css).toMatch(/background-size:\s*contain/)
    expect(css).toMatch(/background-position:\s*center/)
    expect(css).toMatch(/background-color:\s*#[0-9a-f]{6}/i)
    // the `background` shorthand (e.g. `background:#FFFFFF;`) would reset
    // the size/position declared above it
    expect(css).not.toContain('background:')
  })

  it('a non-default card background still paints only background-color', () => {
    const theme = themeWithValues((values) => {
      values.components.card.base.background = '#123456'
      return values
    })
    const { getByTestId } = renderWith(theme, <BusinessLogo data-testid='logo' />)
    const css = cssFor(getByTestId('logo'))
    expect(css).toMatch(/background-color:\s*#123456/i)
    expect(css).not.toContain('background:')
    expect(css).toMatch(/background-size:\s*contain/)
  })
})
