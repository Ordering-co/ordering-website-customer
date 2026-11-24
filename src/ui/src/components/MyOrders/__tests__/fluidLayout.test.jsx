import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'

// setupTests.js mocks these styles globally: the real CSS here.
const { Container } = await vi.importActual('~ui/src/components/MyOrders/styles')

describe('MyOrders — fluid page height', () => {
  it('the account page reserves 60dvh, not the viewport minus 320px', () => {
    const { container } = renderWith(defaultTheme, <Container />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('min-height:60dvh;')
    expect(css).not.toContain('320px')
  })
})
