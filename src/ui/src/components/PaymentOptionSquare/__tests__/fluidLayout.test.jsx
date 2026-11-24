import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { PaymentSquareContainer } from '../styles'

describe('PaymentOptionSquare: reserve', () => {
  it('the region of the form keeps a multiple of the theme size while it loads', () => {
    const { container } = renderWith(themeWithValues(), <PaymentSquareContainer />)
    expect(cssFor(container.firstChild)).toMatch(/min-height:\s*calc\(2\.7 \* 56px\)/)
  })
})
