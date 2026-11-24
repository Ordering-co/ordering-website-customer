import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, rebuildTheme, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia } from '~/utils/themeTokens'
import { BusinessLogo } from '../styles'

// implementation notesthe saved business's logo box is the 3xs image size of the theme, not 65/75px.
describe('FavoriteList: the business logo box follows the media scale', () => {
  it('width, height and min-height are the 3xs level, also when the store changes it', () => {
    const theme = rebuildTheme(themeWithValues(), (values) => {
      values.components.media.base['3xs'] = 72
      return values
    })
    expect(themeMedia(theme, '3xs')).toBe('72px')
    const view = renderWith(theme, <BusinessLogo bgimage='logo.png' data-testid='logo' />)
    const css = cssFor(view.getByTestId('logo'))
    expect(css).toMatch(/width:\s*72px/)
    expect(css).toMatch(/height:\s*72px/)
    expect(css).toMatch(/min-height:\s*72px/)
    expect(css).not.toMatch(/\b(65|75)px/)
  })
})
