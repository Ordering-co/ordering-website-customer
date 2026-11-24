import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { AddressIcon } from '../styles'

describe('CustomOrderModal address field', () => {
  it('its icon takes components.input icon_color and icon_size', () => {
    const theme = themeWithValues((values) => {
      values.components.input.base.icon_size = 22
      values.components.input.base.icon_color = '#123456'
      return values
    })
    renderWith(theme, <AddressIcon data-testid='w' />)
    const css = cssFor(document.querySelector('[data-testid="w"]')).replace(/\s+/g, '')
    expect(css).toContain('color:#123456;font-size:22px;')
  })
})
