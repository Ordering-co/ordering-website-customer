import React from 'react'
import { describe, expect, it } from 'vitest'
import { themeWithValues, renderWith, cssFor, injectedCss } from '~ui/src/styles/__tests__/themeTestUtils'
import { DriverTipContainer } from '../styles'
import { DriverTipContainer as MultiDriverTipContainer } from '../../MultiCheckout/styles'

// CSS rules of all the element's classes (a styled() keeps its parent's)
const allCss = (el) => [...el.classList].map((cls) => injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}')).join('}')

// The driver tips' title is a section title of the checkout
// (checkout.section_title, its multi variant on the multi-checkout); only
// its subtitle is driver_tips'.
const withSectionTitle = () => themeWithValues((values) => {
  const { checkout } = values.components
  checkout.base.section_title = { ...checkout.base.section_title, size: 23 }
  checkout.base.section_title_color = '#123456'
  checkout.variants.multi.section_title = { ...checkout.variants.multi.section_title, size: 27 }
  return values
})

describe('the driver tips\' title: checkout.section_title', () => {
  it('/checkout: the section title of the checkout', () => {
    const { container } = renderWith(withSectionTitle(), <DriverTipContainer><h2>Driver tips</h2></DriverTipContainer>)
    const css = allCss(container.firstChild)
    expect(css).toMatch(/h2,[^{]*h4\{[^}]*font-size:23px;[^}]*color:#123456;/)
  })

  it('/multi-checkout: its multi variant', () => {
    const { container } = renderWith(withSectionTitle(), <MultiDriverTipContainer $driverTips><h2>Driver tips</h2></MultiDriverTipContainer>)
    expect(cssFor(container.firstChild)).toMatch(/h2,[^{]*h3\{[^}]*font-size:27px;/)
  })

  it('the schema: driver_tips has no title of its own', () => {
    const { driver_tips: tips } = themeWithValues().values.components
    expect(tips.base).not.toHaveProperty('title')
    expect(tips.base).not.toHaveProperty('title_color')
    expect(tips.variants?.multi || {}).not.toHaveProperty('title')
    expect(tips.base).toHaveProperty('subtitle')
  })
})
