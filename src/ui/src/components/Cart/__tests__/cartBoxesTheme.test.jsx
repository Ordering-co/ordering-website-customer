import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { CommentContainer, CouponContainer, OrderBill } from '../styles'

/**
 * The comment field and the coupon box under the bill: both keep the same
 * room for the theme's shadow (the accordion clips the bill's edges) and span
 * the bill alike.
 */

afterEach(cleanup)

// A theme whose Identity size is `md`, cast in the given offsets.
const themeWithShadow = (x, y, extra = {}) => themeWithValues((values) => {
  const v = structuredClone(values)
  v.tokens.shadow = { ...v.tokens.shadow, md: { x, y, blur: 0, spread: 0, color: '#000000', opacity: 1, ...extra } }
  v.tokens.shadow_style = { ...(v.tokens.shadow_style || {}), size: 'md' }
  return v
})

const Boxes = () => (
  <OrderBill data-testid='bill'>
    <table className='comments'>
      <tbody>
        <tr><CommentContainer data-testid='comment'><Textarea aria-label='Comments' /></CommentContainer></tr>
      </tbody>
    </table>
    <CouponContainer data-testid='coupon' />
  </OrderBill>
)

describe('Cart comment and coupon boxes (complete theme)', () => {
  it('both keep the room of a shadow falling down-right on its right side only', () => {
    const { getByTestId } = renderWith(themeWithShadow(3, 3), <Boxes />)
    for (const id of ['comment', 'coupon']) {
      const css = cssFor(getByTestId(id))
      expect(css).toContain('padding-left:0px')
      expect(css).toContain('padding-right:3px')
    }
    expect(cssFor(getByTestId('coupon'))).toContain('box-sizing:border-box')
  })

  it('follows the direction of the theme: a shadow falling left keeps its room on the left', () => {
    const { getByTestId } = renderWith(themeWithShadow(-4, 4), <Boxes />)
    for (const id of ['comment', 'coupon']) {
      const css = cssFor(getByTestId(id))
      expect(css).toContain('padding-left:4px')
      expect(css).toContain('padding-right:0px')
    }
  })

  it('a blurred shadow keeps room on both sides', () => {
    const { getByTestId } = renderWith(themeWithShadow(0, 2, { blur: 6 }), <Boxes />)
    const css = cssFor(getByTestId('coupon'))
    expect(css).toContain('padding-left:6px')
    expect(css).toContain('padding-right:6px')
  })

  it('the comment table has no cell spacing and its field stays still', () => {
    const { getByTestId, getByRole } = renderWith(themeWithShadow(3, 3), <Boxes />)
    const css = cssFor(getByTestId('bill'))
    expect(css).toMatch(/table\.comments\{[^}]*border-spacing:0/)
    expect(css).not.toMatch(/table\.comments textarea/)
    expect(getByRole('textbox', { name: 'Comments' })).toHaveAttribute('data-slot', 'textarea')
  })
})
