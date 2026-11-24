import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { WrapperMap } from '../styles'

// implementation notesthe map's box is fluid (width, a ratio and a share of the screen), not 250px.
describe('BusinessesMap fluid layout', () => {
  it('the map box takes its height from a 7:5 ratio, capped at 28dvh (250px at 390 and 1440 wide, measured)', () => {
    const { getByText } = renderWith(themeWithValues(), <WrapperMap>map</WrapperMap>)
    const css = cssFor(getByText('map')).replace(/\s+/g, '')
    expect(css).toContain('aspect-ratio:7/5')
    expect(css).toContain('max-height:28dvh')
    expect(css).not.toContain('250px')
  })
})
