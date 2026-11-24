import React from 'react'
import { describe, expect, it } from 'vitest'
import { defaultTheme, injectedCss, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { OrderClonnedMessage, OrderInfo } from '../styles'

// The cloned-order explanation is a full sentence, not a one-line status:
// OrderInfo's generic `p` rule (clamp: 1, for dates/types/status) must not
// cut it after its first line.
describe('OrderDetails: the cloned-order message is never cut to one line', () => {
  it('OrderClonnedMessage\'s own p overrides OrderInfo\'s clamp: 1', () => {
    const { getByText } = renderWith(defaultTheme, (
      <OrderInfo>
        <OrderClonnedMessage>
          <p>Your order has been cloned due a missing item, no extra charges will be made, for more information, please contact the store</p>
        </OrderClonnedMessage>
      </OrderInfo>
    ))
    const p = getByText(/cloned due a missing item/)
    const css = injectedCss().replace(/\s+/g, '')
    const cls = [...p.parentElement.classList].pop()
    const rule = css.match(new RegExp(`\\.${cls}\\.${cls}p\\{[^}]*\\}`))[0]
    expect(rule).toMatch(/display:block;/)
    expect(rule).not.toMatch(/-webkit-line-clamp:1/)
    expect(rule).not.toMatch(/overflow:hidden/)
  })
})
