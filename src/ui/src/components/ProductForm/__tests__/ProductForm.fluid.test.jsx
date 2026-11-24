import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Divider, ProductActions, SwiperWrapper, VideoGalleryWrapper } from '../styles'

// implementation notesthe product form's measures are the theme's tokens or fluid units, not px of its own
afterEach(cleanup)

const css = (ui, theme) => {
  renderWithProviders(ui, { theme })
  return injectedCss().replace(/\s+/g, '')
}

describe('ProductForm: fluid and tokened measures', () => {
  const theme = themeWithValues((values) => {
    values.tokens.space.xl = 30
    values.tokens.size.xl = 60
    return values
  })

  it('the thumbnail rail keeps tokens.space.xl at its sides and its Swiper caps at the viewport, not at 500px', () => {
    const out = css(<SwiperWrapper />, theme)
    expect(out).toMatch(/\.product-thumb\{[^}]*margin:030px;/)
    expect(out).toContain('max-height:60dvh;')
    expect(out).not.toContain('max-height:500px')
  })

  it('the footer is at least one and a half of tokens.size.xl tall', () => {
    const out = css(<ProductActions />, theme)
    expect(out).toContain('min-height:calc(1.5*60px);')
    expect(out).not.toContain('38ch')
  })

  it('a hidden band divider declares no height of its own (it has no box)', () => {
    const hidden = themeWithValues((values) => {
      values.components.divider.variants.band.line = null
      return values
    })
    const out = css(<Divider />, hidden)
    expect(out).toContain('display:none;')
    expect(out).not.toContain('height:7px')
  })

  it('the video thumbnail\'s play icon is a stroke in the overlay text color (no fill, no icon font-size)', () => {
    const out = css(<VideoGalleryWrapper />, theme)
    expect(out).toMatch(/svg\{[^}]*color:/)
    expect(out).not.toMatch(/svg\{[^}]*fill:/)
  })
})
