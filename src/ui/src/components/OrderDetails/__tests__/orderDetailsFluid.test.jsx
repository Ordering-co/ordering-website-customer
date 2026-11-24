import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { OrderMessagesPane, OrderPreferences, SkeletonBlockWrapp, WrapperContainer } from '../styles'
import { BagImage, IntroText, MapToggleLane, MapTrackingWrapper, ProductImageWrapper } from '../layouts/Tracking/styles'
import { themeMedia, themeSpace } from '../../../../../utils/themeTokens'
import { bottomNavHeight } from '../../NavigationBar/styles'

// implementation notesthe page's widths, heights and offsets are fluid (%, ch, dvh, the header's measured height,
// tokens) and its images take a level of the media scale: no fixed px of layout.
const theme = themeWithValues((values) => { values.components.header.base.height = 72; return values })
const css = (ui, find = (container) => container.firstChild) => {
  const { container } = renderWith(theme, ui)
  return cssFor(find(container)).replace(/\s+/g, '')
}

describe('OrderDetails: fluid layout', () => {
  it('the messages pane fills the screen under the header: its measured height, the theme\'s as fallback', () => {
    const rules = css(<OrderMessagesPane />)
    expect(rules).toContain('height:calc(100dvh-var(--header-height,72px))')
    // below 576px, above the bottom navigation (its real height)
    expect(rules).toContain(`height:calc(100dvh-var(--header-height,72px)-${bottomNavHeight(theme)}px)`)
    expect(rules).not.toContain('105px')
  })

  it('the receipt and the active order are columns in characters, the page side space from tokens', () => {
    const active = css(<WrapperContainer />)
    expect(active).toContain(`width:calc(100%-2*${themeSpace(theme, 'xl')})`)
    expect(active).toContain('max-width:min(100%,188ch)')
    expect(active).toContain('min-height:60dvh')
    const completed = css(<WrapperContainer orderCompleted />)
    expect(completed).toContain('max-width:min(100%,72ch)')
    expect(completed).toContain('max-width:min(100%,88ch)')
    ;['50px', '580px', '337px', '1500px'].forEach((px) => expect(active + completed).not.toContain(px))
    expect(completed).not.toContain('700px;')
  })

  it('the loading line reserves the status row in the text\'s own line (2.5), not 40px', () => {
    expect(css(<SkeletonBlockWrapp />)).toContain('line-height:2.5')
  })

  it('the order type line is limited in characters (56ch), not 450px', () => {
    const { container } = renderWith(theme, <OrderPreferences><div className='order-type' /></OrderPreferences>)
    const rules = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(rules).toContain('max-width:min(100%,56ch)')
    expect(rules).not.toContain('450px')
  })
})

describe('OrderDetails tracking: fluid layout and the media scale', () => {
  it('the map is as wide as the screen up to 225ch, not 1800px', () => {
    const rules = css(<MapTrackingWrapper />)
    expect(rules).toContain('width:min(100vw,225ch)')
    expect(rules).toContain('max-width:225ch')
    expect(rules).not.toContain('1800px')
  })

  it('the floating button of the expanded map sits two xxxl spaces over the safe area', () => {
    const rules = css(<MapToggleLane expanded />)
    expect(rules).toContain(`bottom:calc(env(safe-area-inset-bottom,0px)+2*${themeSpace(theme, 'xxxl')})`)
  })

  it('the survey bag is the 2xl image of the media scale; the intro text is limited in characters', () => {
    expect(css(<BagImage alt='' />)).toContain(`width:${themeMedia(theme, '2xl')}`)
    expect(css(<IntroText />)).toContain('max-width:min(100%,52ch)')
  })

  it('the product thumbnail is the 3xs level of the media scale from 411px', () => {
    const rules = css(<ProductImageWrapper />)
    const level = themeMedia(theme, '3xs')
    expect(rules).toMatch(new RegExp(`@media\\(min-width:411px\\)\\{[^}]*max-width:${level};max-height:${level};height:${level};width:${level}`))
  })
})
