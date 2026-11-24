import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { MapWrapper, ModalBody } from '../styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('CustomOrderModal: fluid layout', () => {
  it('the map keeps a 16:9 box (at most 40dvh) and the body a multiple of the theme size', () => {
    const theme = themeWithValues()
    const map = css(renderWith(theme, <MapWrapper data-testid='m' />).getByTestId('m'))
    expect(map).toContain('aspect-ratio:16/9;max-height:40dvh;')
    expect(map).not.toContain('200px')
    const body = css(renderWith(theme, <ModalBody data-testid='b' />).getByTestId('b'))
    expect(body).toContain(`min-height:calc(7*${theme.css.tokens.size.xl});`)
    expect(body).not.toContain('400px')
  })
})
