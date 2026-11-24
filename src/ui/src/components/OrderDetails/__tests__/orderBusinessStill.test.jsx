import React from 'react'
import { describe, expect, it } from 'vitest'
import { defaultTheme, injectedCss, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { OrderBusiness } from '../styles'

// The business of an order is not a control: no lift and no shadow on hover.
describe('OrderDetails: the business block stays still', () => {
  it('no transition of its own and no hover shadow', () => {
    const { getByText } = renderWith(defaultTheme, <OrderBusiness>business</OrderBusiness>)
    const el = getByText('business')
    const css = injectedCss().replace(/\s+/g, '')
    const rules = [...el.classList].flatMap((cls) => css.split('}').filter((rule) => rule.includes(`.${cls}:hover`)))
    expect(rules.join('}')).not.toMatch(/box-shadow|translateY/)
    expect(css).not.toMatch(new RegExp(`\\.(${[...el.classList].join('|')})\\{[^}]*transition:all`))
  })
})
