import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Message } from '../styles'

describe('TrackingHome: fluid layout', () => {
  it('the notice reads at most 52ch, never wider than its box', () => {
    const css = cssFor(renderWith(themeWithValues(), <Message />).container.firstChild)
    expect(css).toMatch(/max-width: ?min\(100%, ?52ch\)/)
    expect(css).not.toMatch(/420px/)
  })
})
