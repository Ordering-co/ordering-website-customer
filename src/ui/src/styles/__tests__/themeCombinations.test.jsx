import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, injectedCss, renderWith, themeWithValues } from './themeTestUtils'
import { focusRingInsetCss, focusRingRoomXCss } from '../Focus'
import { BusinessContainer } from '../../components/BusinessBasicInformation/styles'
import { CouponContainer } from '../../components/CouponControl/styles'
import { Button } from '../../design-system/components/Button'
import { TabsAction, TabsNavigation } from '../../design-system/components/Tabs'
import { Filters } from '../../components/BusinessListingSearch/styles'
import { FiltersContainer } from '../../components/BusinessesListing/layouts/OriginalBusinessesListing/styles'

// Combinations of theme values a site would choose (a dark theme, a store cover,
// rows that clip the focus ring…) that the schema allows and the web drew wrong.

const tight = (css) => css.replace(/\s+/g, '')

describe('store cover: the card keeps its image and overlay', () => {
  it('the card color is background-color, never the shorthand that resets the image', () => {
    const theme = themeWithValues((values) => {
      values.components.card.base.background = '#1A1D21'
      return values
    })
    const { getByTestId } = renderWith(theme, <BusinessContainer data-testid='c' bgimage='https://example.com/cover.jpg' isClosed />)
    const css = tight(cssFor(getByTestId('c')))
    expect(css).toContain('background-color:#1A1D21;')
    expect(css).not.toMatch(/[;{]background:#1A1D21/)
    expect(css).toContain('url("https://example.com/cover.jpg")')
  })
})

describe('focus ring in boxes that clip', () => {
  it('helpers: the ring inside the edge, and room at the sides of a row', () => {
    const theme = themeWithValues()
    expect(focusRingInsetCss(theme)).toMatch(/^outline-offset: -\d+px !important;$/)
    expect(focusRingRoomXCss(theme)).toMatch(/width: calc\(100% \+ \d+px\);.*margin-left: -\d+px;.*padding-left: \d+px;/)
  })

  it('the coupon row (it fills its card) and the category tabs (the bar scrolls): the ring inside', () => {
    const theme = themeWithValues()
    // the coupon card clips: its row is a Button with `focusInset`, and the card writes no rule over it
    const row = renderWith(theme, <CouponContainer><Button type='button' focusInset>Offers</Button></CouponContainer>)
    expect(row.getByRole('button', { name: 'Offers' }).className).toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
    expect(tight(injectedCss())).not.toMatch(/>button:focus-visible/)
    row.unmount()
    const { getByRole } = renderWith(theme, (
      <TabsNavigation mode='section'>
        <TabsAction onClick={() => {}}>Drinks</TabsAction>
      </TabsNavigation>
    ))
    expect(getByRole('button', { name: 'Drinks' }).className).toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
  })

  it('the filter rows: room at their sides', () => {
    const theme = themeWithValues()
    const { getByTestId } = renderWith(theme, <><Filters data-testid='f' /><FiltersContainer data-testid='fc' /></>)
    expect(tight(cssFor(getByTestId('f')))).toMatch(/margin-left:-\d+px;margin-right:-\d+px;padding-left:\d+px;padding-right:\d+px;/)
    expect(tight(cssFor(getByTestId('fc')))).toMatch(/\.filters-scroll>div\{padding-left:0;padding-right:0;width:calc\(100%\+\d+px\)/)
  })
})
