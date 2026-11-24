import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SwiperWrapper } from '../styles'

describe('ServiceForm photo (T3, like the product modal)', () => {
  it('4:3 with cover at every width', () => {
    const { getByTestId } = renderWith(themeWithValues(), <SwiperWrapper data-testid='gallery' />)
    expect(cssFor(getByTestId('gallery'))).toMatch(/\.mySwiper2\{height:auto;max-height:none;aspect-ratio:4 \/ 3;/)
  })
})
