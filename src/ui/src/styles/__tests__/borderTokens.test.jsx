import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from './themeTestUtils'
import { CartGroupDivider } from '../../components/CartContent/styles'
import { TabsContainer } from '../../components/Wallets/styles'

// border is the soft line (separators, card and container edges).
// (The spots painted by a component of the theme, a card, a divider or an
// input, take that component's values, not the token: they are tested with
// their component.)
const SOFT = '#111111'
const STRONG = '#222222'
const theme = themeWithValues((values) => {
  values.tokens.color.border = SOFT
  values.tokens.color.border_strong = STRONG
  return values
})
const cssOf = (Component, props = {}) => cssFor(renderWith(theme, <Component data-testid='spot' {...props} />).getByTestId('spot')).replace(/\s+/g, '')

describe('separators and card borders are of the border token', () => {
  it.each([
    ['the cart group divider', CartGroupDivider]
  ])('%s', (_, Component) => {
    const css = cssOf(Component)
    expect(css).toContain(SOFT)
    expect(css).not.toContain(STRONG)
  })

  it('the wallet tabs draw no line of their own (the Tabs primitive draws its bar)', () => {
    expect(cssOf(TabsContainer)).toContain('border-bottom:none;')
  })
})
