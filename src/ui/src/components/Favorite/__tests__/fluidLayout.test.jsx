import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { FavoritesContainer } from '../styles'

// implementation notesthe empty list fills the screen under the header (its measured
// height) and the profile shell, in fluid units, no fixed px.
describe('Favorite fluid layout', () => {
  it('the container leaves the header and 4 xl sizes of the theme', () => {
    const { getByText } = renderWith(themeWithValues(), <FavoritesContainer>box</FavoritesContainer>)
    const css = cssFor(getByText('box')).replace(/\s+/g, '')
    expect(css).toMatch(/min-height:calc\(100dvh-var\(--header-height,\d+px\)-4\*56px\);/)
    expect(css).not.toContain('280px')
  })
})
