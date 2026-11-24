import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'
import { themeColor } from '~/utils/themeColors'

// implementation notesthe cart line a product add just touched (the cart beside the direct menu): a tint of the theme's
// primary, and kept in view
vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={() => {}}
      onDeleteProduct={() => {}}
      isCheckout={false}
      isCartProduct
      {...rest}
    />
  )
}))

const line = { ...productFixture, quantity: 1, price: 9.5, valid: true, valid_quantity: true, valid_menu: true }
const row = (container) => container.querySelector('[data-doc-section="cart-product-row"]')

describe('ProductItemAccordion: a highlighted cart line', () => {
  it('is tinted with the primary subtle and scrolled into view; the others rest', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { container, rerender } = renderWithProviders(<ProductItemAccordion product={line} />)
    expect(row(container)).not.toHaveAttribute('data-doc-state-highlight')
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(cssFor(row(container))).not.toContain(themeColor(defaultTheme, 'primary_subtle'))

    rerender(<ProductItemAccordion product={line} highlighted />)
    expect(row(container)).toHaveAttribute('data-doc-state-highlight', 'true')
    expect(cssFor(row(container))).toContain(themeColor(defaultTheme, 'primary_subtle'))
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }))

    rerender(<ProductItemAccordion product={line} highlighted={false} />)
    expect(row(container)).not.toHaveAttribute('data-doc-state-highlight')
    delete Element.prototype.scrollIntoView
  })
})
