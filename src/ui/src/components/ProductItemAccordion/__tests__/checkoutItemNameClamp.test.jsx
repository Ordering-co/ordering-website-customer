import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

// implementation notes applied to the checkout/order-details summary line
// (ContentInfo .item-name, fullWidth): a long product name wraps to 2 lines
// instead of being cut to one, and keeps the full text in `title`.

const longName = 'Crispy Chicken Sandwich with Extra Pickles and Spicy Mayo Sauce'

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={{ ...productFixture, name: longName, quantity: 1, price: 9.5, valid_quantity: true, valid_menu: true }}
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={vi.fn()}
      onDeleteProduct={vi.fn()}
      onEditProduct={vi.fn()}
      isCheckout
      isCartProduct
      hideQuantitySelector={false}
      getProductMax={vi.fn()}
      {...rest}
    />
  )
}))

describe('ProductItemAccordion: the checkout summary\'s product name', () => {
  it('keeps the full name in title and clamps the visible text to 2 lines', () => {
    const { container, getByTitle } = renderWithProviders(<ProductItemAccordion />)
    const itemName = getByTitle(longName)
    expect(itemName).toHaveClass('item-name')

    // the clamp lives on the parent ContentInfo's `.item-name` rule
    const contentInfo = container.querySelector('.product-name').parentElement
    const css = cssFor(contentInfo)
    expect(css).toMatch(/-webkit-line-clamp: ?2/)
    expect(css).toMatch(/white-space: ?normal/)
    expect(css).not.toMatch(/text-overflow: ?ellipsis/)
  })
})
