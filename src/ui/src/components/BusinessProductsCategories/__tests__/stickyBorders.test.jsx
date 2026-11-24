import React from 'react'
import { describe, expect, it } from 'vitest'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { TabsNavigation } from '~ui/src/design-system/components/Tabs'
import { CategoriesContainer } from '../styles'

const withBorder = () => themeWithValues((values) => {
  values.components.category_tabs = {
    ...values.components.category_tabs,
    base: { ...values.components.category_tabs.base, border: { width: 1, color: '#2F3032', style: 'solid' }, radius: 14 }
  }
  return values
})

// The bar with its track, as the store page renders it
const bar = (props) => (
  <CategoriesContainer data-testid='bar' {...props}>
    <TabsNavigation data-testid='track' mode='section' edgeToEdge={props.$fullWidthSticky} />
  </CategoriesContainer>
)

const style = (el) => window.getComputedStyle(el)

// The rules of the bar's own generated class (not the ones it adds on scroll)
const ownCss = (el) => {
  const css = injectedCss()
  const cls = [...el.classList].find((c) => css.includes(`.${c}{`))
  return css.split('}').filter((rule) => rule.includes(`.${cls}`)).join('}')
}

// The category bar fixed on scroll, edge to edge
describe('CategoriesContainer fixed', () => {
  it('at rest it keeps the theme\'s border around and its radius', () => {
    const { getByTestId } = renderWith(withBorder(), bar({ $fullWidthSticky: true, className: 'category-lists' }))
    const barStyle = style(getByTestId('bar'))
    expect(barStyle.borderRadius).toBe('14px')
    expect(barStyle.borderTop).toBe('1px solid rgb(47, 48, 50)')
    expect(barStyle.borderLeft).toBe('1px solid rgb(47, 48, 50)')
    expect(barStyle.borderRight).toBe('1px solid rgb(47, 48, 50)')
    expect(getByTestId('track').className).toContain('ui:rounded-(--ui-tabs-radius)')
  })

  it('its border around, without sides once fixed', () => {
    const { getByTestId } = renderWith(withBorder(), bar({ $fullWidthSticky: true, className: 'sticky-prod-cat' }))
    expect(style(getByTestId('bar')).borderTop).toBe('1px solid rgb(47, 48, 50)')
    // (jsdom does not expand border-*: none, the CSS says it)
    expect(injectedCss()).toMatch(/\.sticky-prod-cat\{[^}]*border-left:none;border-right:none;/)
    expect(getByTestId('track').className).toContain('ui:in-[.sticky-prod-cat]:[border-inline:none]')
  })

  it('fixed edge to edge, the bar and its track are square', () => {
    const { getByTestId } = renderWith(withBorder(), bar({ $fullWidthSticky: true, className: 'sticky-prod-cat' }))
    expect(style(getByTestId('bar')).borderRadius).toBe('0')
    expect(injectedCss()).toMatch(/\.sticky-prod-cat\{[^}]*border-radius:0;/)
    expect(getByTestId('track').className).toContain('ui:in-[.sticky-prod-cat]:rounded-none')
  })

  it('fixed but not edge to edge (the kiosk\'s width): its radius and sides stay', () => {
    const { getByTestId } = renderWith(withBorder(), bar({ className: 'sticky-prod-cat' }))
    expect(style(getByTestId('bar')).borderRadius).toBe('14px')
    expect(style(getByTestId('bar')).borderLeft).toBe('1px solid rgb(47, 48, 50)')
    expect(ownCss(getByTestId('bar'))).toMatch(/border-radius:14px;/)
    expect(ownCss(getByTestId('bar'))).not.toMatch(/sticky-prod-cat/)
  })

  it('docked under a bar with a bottom border: one line, it loses its top', () => {
    const { getByTestId } = renderWith(withBorder(), bar({ $fullWidthSticky: true, className: 'sticky-prod-cat categories-joined' }))
    expect(getByTestId('bar')).toHaveClass('categories-joined')
    expect(injectedCss()).toMatch(/\.sticky-prod-cat\.categories-joined\{border-top:none;\}/)
  })
})
