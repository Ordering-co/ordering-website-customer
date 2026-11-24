import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessLogo } from '../styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('BusinessPreorder: the store logo box is a media level', () => {
  it('3xs on a phone and 2xs from 481px, the store\'s own values', () => {
    const theme = themeWithValues((values) => {
      values.components.media = { base: { '3xs': 71, '2xs': 87 } }
      return values
    })
    const out = css(renderWith(theme, <BusinessLogo data-testid='l' />).getByTestId('l'))
    expect(out).toContain('width:71px;min-width:71px;height:71px;')
    expect(out).toMatch(/@media\(min-width:481px\)\{[^}]*width:87px;height:87px;min-width:87px;min-height:87px;/)
    expect(out).not.toMatch(/65px|84px/)
  })
})
