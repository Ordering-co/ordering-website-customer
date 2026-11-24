import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Container } from '../styles'

// implementation notesthe page fills 70dvh, not the screen minus 280px.
describe('Wallets: page height without fixed pixels', () => {
  it('Container min-height is 70dvh', () => {
    const css = cssFor(renderWith(themeWithValues(), <Container data-testid='page' />).getByTestId('page'))
    expect(css).toMatch(/min-height:\s*70dvh/)
    expect(css).not.toMatch(/280px/)
  })
})
