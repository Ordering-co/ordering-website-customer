import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BackAction } from '../styles'

// Under the back action the space the store page leaves between
// its back button and its title (space md), not the arrow's 5px
describe('multi-checkout back action', () => {
  it('md under it', () => {
    const { getByText } = renderWith(themeWithValues(), <BackAction>back</BackAction>)
    expect(cssFor(getByText('back')).replace(/\s+/g, '')).toContain('margin:0012px;')
  })
})
