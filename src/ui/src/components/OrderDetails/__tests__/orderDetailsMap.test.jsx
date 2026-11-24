import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Map } from '../styles'

describe('the map of an active order', () => {
  it('its height is order_details map_height alone (no height of its own)', () => {
    const theme = themeWithValues((values) => {
      values.components.order_details.base.map_height = 333
      return values
    })
    const { getByTestId } = renderWith(theme, <Map data-testid='map' />)
    const css = cssFor(getByTestId('map')).replace(/\s+/g, '')
    expect(css).toContain('height:333px')
    expect(css).not.toContain('height:300px')
  })
})
