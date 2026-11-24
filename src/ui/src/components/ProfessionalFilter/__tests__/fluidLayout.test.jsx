import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ProfessionalItem } from '../styles'

describe('ProfessionalFilter: fluid layout', () => {
  it('the card of the carousel is one flex basis of 85% up to 25ch, not a fixed width', () => {
    const css = cssFor(renderWith(themeWithValues(), <ProfessionalItem />).container.firstChild)
    expect(css).toMatch(/flex: ?0 0 min\(85%, ?25ch\)/)
    expect(css).not.toMatch(/205px/)
  })
})
