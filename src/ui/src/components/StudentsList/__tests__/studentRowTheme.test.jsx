import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { StudentCard } from '../styles'
import { HeaderCartButton } from '../../HeaderOption/HeaderCartButton'

/**
 * Controls that were clickable boxes: a student row and the header's cart
 * are real buttons.
 */

afterEach(cleanup)

describe('clickable rows and the header cart', () => {
  it('a student row is a button', () => {
    const themed = renderWith(themeWithValues(), <StudentCard data-testid='row' />)
    const row = themed.getByTestId('row')
    expect(row.tagName).toBe('BUTTON')
    expect(row.getAttribute('type')).toBe('button')
  })

  it('a student row is a clickable card (the card\'s padding; hover only from its hover state)', () => {
    const theme = themeWithValues((values) => {
      values.components.card.base.padding = 23
      values.components.card.variants.default.states.hover.shadow = null
      return values
    })
    const row = renderWith(theme, <StudentCard data-testid='row'><strong>Ana</strong></StudentCard>).getByTestId('row')
    expect(row.style.getPropertyValue('--ui-action-card-padding')).toBe('23px')
    expect(row.style.getPropertyValue('--ui-action-card-hover-shadow')).toBe('none')
  })

  it('the header cart is a button', () => {
    const themed = renderWith(themeWithValues(), <HeaderCartButton data-testid='cart' aria-label='My cart' />)
    expect(themed.getByTestId('cart').tagName).toBe('BUTTON')
  })
})
