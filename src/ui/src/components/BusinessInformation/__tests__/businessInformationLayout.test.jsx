import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessLogo, BusinessMediaContent, DeliveryInfo, ImageContainer, Map } from '../styles'

// implementation notesfluid boxes and the media scale, no fixed px.
const theme = themeWithValues()
const css = (node) => {
  cleanup()
  const { container } = renderWith(theme, node)
  return cssFor(container.firstChild)
}
const media = theme.values.components.media.base

describe('BusinessInformation layout', () => {
  it('the logo reserves the 3xs medium, not 75px', () => {
    const out = css(<BusinessLogo />)
    expect(out).toContain(`min-height:${media['3xs']}px;`)
    expect(out).not.toContain('75px')
  })

  it('the map is as wide as its column and 13:5 up to 15dvh (today\'s 135px on a phone and on a desktop)', () => {
    const out = css(<Map />)
    expect(out).toContain('aspect-ratio:13 / 5;')
    expect(out).toContain('max-height:15dvh;')
    expect(out).not.toContain('135px')
  })

  it('the gallery thumbnails are the lg medium tall, 3:2', () => {
    const out = css(<BusinessMediaContent />)
    expect(out).toContain(`height:${media.lg}px;`)
    expect(out).toContain('aspect-ratio:3 / 2;')
    expect(out).not.toContain('width:215px')
  })

  it('the delivery value column is a width in ch', () => {
    const out = css(<DeliveryInfo />)
    expect(out).toContain('min-width:9ch;')
    expect(out).not.toContain('75px')
  })

  it('the enlarged photo is 16:9 before it loads, from CSS', () => {
    const out = css(<ImageContainer />)
    expect(out).toContain('aspect-ratio:auto 16 / 9;')
  })
})
