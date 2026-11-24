import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { HelpContainer } from '../styles'

// implementation notesthe page fills the viewport less the header and the footer, in fluid units
const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('Help: fluid layout', () => {
  it('its minimum height is the dynamic viewport less four header heights (the theme\'s as fallback)', () => {
    const theme = themeWithValues()
    const out = css(renderWith(theme, <HelpContainer data-testid='h' />).getByTestId('h'))
    expect(out).toContain(`min-height:calc(100dvh-4*var(--header-height,${theme.css.components.header.base.height}))`)
    expect(out).not.toContain('280px')
  })
})
