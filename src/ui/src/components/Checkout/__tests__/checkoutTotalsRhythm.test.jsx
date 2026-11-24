import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CartContainer, WrapperRightContainer, checkoutBottomRoomCss } from '../styles'
import { BOTTOM_NAV_ROOM_GAP, bottomNavRoom } from '../../NavigationBar/styles'

const flat = (css) => css.replace(/\s+/g, '')

const withTotals = (padding) => themeWithValues((values) => {
  values.components.checkout.base.totals_padding = padding
  return values
})

// The totals of the checkout: plain rows of the summary card (implementation notes
// round 5, mockup B: never a card inside a card), on the card's edge; the
// coupon row is checkout.totals_padding from the row above it (each box keeps
// below it the room of its shadow).
describe('checkout totals rhythm (complete theme)', () => {
  it('the totals are no card of their own: no card box, no padding', () => {
    const { getByText } = renderWith(withTotals(20), <CartContainer hideProductList>card</CartContainer>)
    const css = flat(cssFor(getByText('card')))
    expect(css).not.toMatch(/padding:20px;/)
    expect(css).not.toMatch(/box-shadow/)
    // the rows' text on the card's edge (no table spacing of the browser)
    expect(css).toMatch(/OrderBill-sc-[\w-]+table\{border-spacing:0;\}/)
    expect(css).toMatch(/OrderBill-sc-[\w-]+td\{padding-inline:0;\}/)
  })

  it('the bill\'s own space inside the card gives way to it; the coupon is totals_padding under the row above it', () => {
    const { getByText } = renderWith(withTotals(20), <CartContainer hideProductList>bill</CartContainer>)
    const css = flat(cssFor(getByText('bill')))
    expect(css).toMatch(/AccordionSection-sc-[\w-]+\{margin-bottom:0;\}/)
    // implementation notes (option b): totals_padding is the totals block's room above and below (no card)
    expect(css).toMatch(/OrderBill-sc-[\w-]+\{padding-top:20px;padding-bottom:20px;\}/)
    // the coupon: totals_padding above, the room of the theme's sm shadow below (y 1 + blur 4)
    expect(css).toMatch(/CouponContainer-sc-[\w-]+\{margin:20px00;padding-bottom:5px;\}/)
    expect(css).toMatch(/table:has\(\+\.CouponContainer-sc-[\w-]+\)tr:last-childtd\{padding-bottom:5px;\}/)
    expect(css).toMatch(/table\.commentstextarea\{display:block;\}/)
  })

  it('a totals_padding that is not a number is the default\'s (the coupon row\'s space)', () => {
    const fallback = renderWith(withTotals(null), <CartContainer hideProductList>fallback</CartContainer>)
    expect(flat(cssFor(fallback.getByText('fallback')))).toMatch(new RegExp(`CouponContainer-sc-[\\w-]+\\{margin:${defaultTheme.values.components.checkout.base.totals_padding}px00;`))
  })
})

// Small screens: the place order bar fixed at the bottom lies over the bottom
// navigation. The page's end keeps only the room the bar covers: complete theme
// adds after the footer what the bar needs beyond the navigation's room the
// app already leaves (bottomNavRoom); no 96px in the right column.
describe('checkout room for the place order bar', () => {
  it('bottomNavRoom: the navigation\'s height and the gap; 0 when the theme hides it', () => {
    expect(bottomNavRoom(defaultTheme)).toBe(65 + BOTTOM_NAV_ROOM_GAP)
    expect(bottomNavRoom(themeWithValues((v) => { v.components.bottom_nav.base.height = 72; return v }))).toBe(72 + BOTTOM_NAV_ROOM_GAP)
    expect(bottomNavRoom(themeWithValues((v) => { v.visibility.bottom_nav = false; return v }))).toBe(0)
  })

  it('the right column keeps no 96px below 576px', () => {
    const themed = renderWith(themeWithValues(), <WrapperRightContainer>themecol</WrapperRightContainer>)
    expect(flat(cssFor(themed.getByText('themecol')))).not.toContain('padding-bottom:96px')
  })

  it('CheckoutBottomRoom: a block of $room px after the page', () => {
    expect(flat(checkoutBottomRoomCss(58))).toBe("body::after{content:'';display:block;height:58px;}")
  })
})
