import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BannerContainer } from '../styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('CookieConsentBanner: fluid layout', () => {
  it('its card is as wide as 45 characters at most, never wider than its container', () => {
    const out = css(renderWith(themeWithValues(), <BannerContainer data-testid='b' />).getByTestId('b'))
    expect(out).toContain('max-width:min(100%,45ch);')
    expect(out).not.toContain('360px')
  })
})
