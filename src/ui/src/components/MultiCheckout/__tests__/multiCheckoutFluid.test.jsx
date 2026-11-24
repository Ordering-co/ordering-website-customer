import React from 'react'
import { describe, expect, it } from 'vitest'
import { themeWithValues, renderWith, cssFor } from '~ui/src/styles/__tests__/themeTestUtils'
import { getThemeCss } from '~/utils/themeCss'
import { Container } from '../styles'

// implementation notesno fixed px for the page height: the screen less the header, with the theme's header as fallback
describe('MultiCheckout: the page height is fluid', () => {
  it('keeps the screen less the header as its minimum height on wide screens', () => {
    const theme = themeWithValues()
    const el = renderWith(theme, <Container data-testid='page' />).getByTestId('page')
    expect(cssFor(el)).toContain(`min-height:calc(100dvh - 5 * var(--header-height,${getThemeCss(theme, 'header').base.height}))`)
    expect(cssFor(el)).not.toContain('337px')
  })
})
