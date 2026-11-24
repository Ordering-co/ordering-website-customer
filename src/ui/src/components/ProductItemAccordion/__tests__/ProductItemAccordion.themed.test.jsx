import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

const handlers = vi.hoisted(() => ({
  changeQuantity: vi.fn(),
  onDeleteProduct: vi.fn()
}))

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [] }}
      onEditProduct={vi.fn()}
      isCheckout={false}
      isCartProduct
      {...handlers}
      {...rest}
    />
  )
}))

const line = (quantity, extra = {}) => ({ ...productFixture, quantity, price: 9.5, valid: true, valid_quantity: true, valid_menu: true, ...extra })

const reset = () => {
  handlers.changeQuantity.mockClear()
  handlers.onDeleteProduct.mockClear()
}

describe('ProductItemAccordion the cart line\'s stepper', () => {
  it('the popover actions: − decrements, + increments', () => {
    reset()
    const utils = renderWithProviders(<ProductItemAccordion product={line(2)} />, { theme: themeWithValues() })
    const minus = utils.getByRole('button', { name: 'Decrease quantity' })
    expect(minus).toHaveAttribute('data-doc-control', 'cart-product-decrement')
    fireEvent.click(minus)
    expect(handlers.changeQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: 2 }), 1)
    fireEvent.click(utils.getByRole('button', { name: 'Increase quantity' }))
    expect(handlers.changeQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: 2 }), 3)
  })

  it('at 1 the − is a trash that removes the line', () => {
    reset()
    const utils = renderWithProviders(<ProductItemAccordion product={line(1)} />, { theme: themeWithValues() })
    const remove = utils.getByRole('button', { name: 'Remove' })
    expect(remove).toHaveAttribute('data-doc-control', 'cart-product-delete')
    expect(remove.querySelector('svg.lucide-trash-2')).not.toBeNull()
    fireEvent.click(remove)
    expect(handlers.onDeleteProduct).toHaveBeenCalledTimes(1)
  })

  it('a line that cannot be edited cannot be incremented', () => {
    const utils = renderWithProviders(<ProductItemAccordion product={line(2)} isDisabledEdit />, { theme: themeWithValues() })
    expect(utils.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
  })

  it('instead of the select: the select\'s limits (max and stock offset), 0 removes', () => {
    reset()
    const props = {
      hideQuantitySelector: false,
      getProductMax: () => 3,
      offsetDisabled: () => 3
    }
    const atMax = renderWithProviders(<ProductItemAccordion product={line(3)} {...props} />, { theme: themeWithValues() })
    expect(atMax.container.querySelector('select')).toBeNull()
    expect(atMax.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    atMax.unmount()

    const byStock = renderWithProviders(<ProductItemAccordion product={line(2)} {...props} offsetDisabled={() => 2} />, { theme: themeWithValues() })
    expect(byStock.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    byStock.unmount()

    const one = renderWithProviders(<ProductItemAccordion product={line(1)} {...props} />, { theme: themeWithValues() })
    fireEvent.click(one.getByRole('button', { name: 'Increase quantity' }))
    expect(handlers.changeQuantity).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: 1 }), 2)
    fireEvent.click(one.getByRole('button', { name: 'Remove' }))
    expect(handlers.onDeleteProduct).toHaveBeenCalledTimes(1)
  })
})

describe('ProductItemAccordion the row\'s edit and delete', () => {
  it('are buttons of the theme, without a fixed gray', () => {
    reset()
    const props = { hideQuantitySelector: false, getProductMax: () => 3, offsetDisabled: () => 3 }
    const utils = renderWithProviders(<ProductItemAccordion product={line(2)} {...props} />, { theme: themeWithValues() })
    const edit = utils.container.querySelector('button[data-doc-control="cart-product-edit"]')
    expect(edit).not.toBeNull()
    expect(edit.innerHTML).not.toMatch(/B1BCCC/i)
    // below 411px the delete hides: jsdom matches no media query
    const remove = utils.container.querySelector('button[data-doc-control="cart-product-delete"]')
    expect(remove).toHaveAttribute('aria-label', 'Remove')
    fireEvent.click(remove)
    expect(handlers.onDeleteProduct).toHaveBeenCalledTimes(1)
  })
})

describe('ProductItemAccordion: visibility.cart.products.image in every cart', () => {
  const hidden = () => themeWithValues((values) => { values.visibility['cart.products.image'] = false; return values })
  const imageOf = (container) => container.querySelector('[data-doc-control="cart-product-edit-image"]')

  it('the key also hides the image in the header\'s cart', () => {
    const shown = renderWithProviders(<ProductItemAccordion product={line(1)} />, { theme: themeWithValues() })
    expect(imageOf(shown.container)).not.toBeNull()
    shown.unmount()
    const { container } = renderWithProviders(<ProductItemAccordion product={line(1)} />, { theme: hidden() })
    expect(imageOf(container)).toBeNull()
  })
})

describe('checkout and order details product names', () => {
  const theme = themeWithValues((values) => {
    values.tokens.typography.body_lg.size = 17
    values.tokens.typography.body_lg.line = 1.4
    values.tokens.typography.h4.size = 21
  })

  it.each(['isCheckout', 'isOrderDetails'])('the %s row applies the body_lg size and line to its product name', (surface) => {
    const product = line(2)
    const { getByTitle } = renderWithProviders(
      <ProductItemAccordion product={product} hideQuantitySelector={false} {...{ [surface]: true }} />,
      { theme }
    )
    expect(getByTitle(product.name)).toHaveClass('item-name')
    expect(injectedCss().replace(/\s+/g, '')).toMatch(/\.item-name\{[^}]*font-size:17px;line-height:1\.4;/)
  })
})
