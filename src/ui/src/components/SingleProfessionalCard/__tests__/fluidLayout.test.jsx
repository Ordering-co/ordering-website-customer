import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'

const { Container } = await vi.importActual('~ui/src/components/SingleProfessionalCard/styles')

describe('SingleProfessionalCard — fluid minimum width', () => {
  it('the card is at least 26ch wide, never wider than its rail, not a fixed 205px', () => {
    const { container } = renderWith(defaultTheme, <Container />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('min-width:min(100%,26ch);')
    expect(css).not.toContain('205px')
  })
})
