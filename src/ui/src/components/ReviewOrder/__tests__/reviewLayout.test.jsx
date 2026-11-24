import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, rebuildTheme, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessLogo, Send } from '../styles'

// implementation notesthe review's action column and the multi-order logo are fluid / theme levels, not 300px, 200px and 124px.
describe('ReviewOrder: layout without fixed pixels', () => {
  it('Send: the action column is 38ch (25ch on a phone), not 300px / 200px', () => {
    const view = renderWith(themeWithValues(), <Send data-testid='send' />)
    const css = cssFor(view.getByTestId('send'))
    expect(css).toMatch(/grid-template-columns:\s*auto minmax\(0,\s*38ch\)/)
    expect(css).toMatch(/grid-template-columns:\s*auto minmax\(0,\s*25ch\)/)
    expect(css).not.toMatch(/\b(300|200)px/)
  })

  it('the multi-order logo is the md image size of the theme', () => {
    const theme = rebuildTheme(themeWithValues(), (values) => {
      values.components.media.base.md = 130
      return values
    })
    const view = renderWith(theme, <BusinessLogo isMulti data-testid='logo' />)
    const css = cssFor(view.getByTestId('logo'))
    expect(css).toMatch(/width:\s*130px/)
    expect(css).toMatch(/height:\s*130px/)
    expect(css).not.toMatch(/124px/)
  })
})
