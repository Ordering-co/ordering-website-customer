import React from 'react'
import { describe, expect, it } from 'vitest'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Divider } from '../styles'

// The divider's height is the variant's (components.divider), never a literal of its own.
const heightOf = (variant, width) => {
  const theme = themeWithValues((values) => {
    values.components.order_details.base.divider = variant
    values.components.divider.variants.band.line.width = width
    return values
  })
  const { container } = renderWith(theme, <Divider />)
  return getComputedStyle(container.firstChild).height
}

describe('OrderDetails: the section divider takes its height from components.divider', () => {
  it('a band is as tall as its line, a line between sections has no height', () => {
    expect(heightOf('band', 8)).toBe('8px')
    expect(heightOf('band', 3)).toBe('3px')
    expect(heightOf('section', 8)).toBe('0px')
    expect(heightOf('item', 8)).toBe('0px')
  })

  it('writes no height literal of its own', () => {
    heightOf('band', 8)
    expect(injectedCss().replace(/\s+/g, '')).not.toContain('height:5px')
  })
})
