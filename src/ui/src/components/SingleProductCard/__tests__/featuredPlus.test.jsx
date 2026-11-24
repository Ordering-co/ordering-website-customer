import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CardLogo } from '../styles'

// The image of a featured product
describe('CardLogo featured', () => {
  it('no plus badge', () => {
    const { getByTestId } = renderWith(themeWithValues(), <CardLogo data-testid='logo' isFeatured />)
    expect(getByTestId('logo').children).toHaveLength(0)
  })
})
