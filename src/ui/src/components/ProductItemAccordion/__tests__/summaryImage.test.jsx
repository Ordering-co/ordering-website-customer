import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

const mocks = vi.hoisted(() => ({ onEditProduct: vi.fn() }))

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={vi.fn()}
      onDeleteProduct={vi.fn()}
      onEditProduct={mocks.onEditProduct}
      {...rest}
    />
  )
}))

const line = { ...productFixture, quantity: 2, price: 9.5, total: 19, valid: true, valid_quantity: true, valid_menu: true }

const withVisibility = (visibility) => themeWithValues((values) => {
  Object.assign(values.visibility, visibility)
  return values
})

const image = (utils) => utils.container.querySelector('[data-doc-control="cart-product-edit-image"]')

// The checkout's summary (Cart with isCheckout: rows with their quantity)
const checkoutRow = (theme) => renderWithProviders(
  <ProductItemAccordion product={line} isCartProduct isCheckout hideQuantitySelector={false} />,
  { theme }
)
// The default layout of an order's details
const orderRow = (theme) => renderWithProviders(
  <ProductItemAccordion product={line} isOrderDetails hideQuantitySelector={false} />,
  { theme }
)

describe('the checkout summary\'s product image (visibility.checkout.products.image)', () => {
  it('the schema: hidden by default, and the summary has no image', () => {
    expect(schemaDefault('visibility.checkout.products.image')).toBe(false)
    expect(image(checkoutRow(themeWithValues()))).toBeNull()
  })

  it('on: the image is the first column of the row, before the quantity, and edits nothing', () => {
    mocks.onEditProduct.mockClear()
    const utils = checkoutRow(withVisibility({ 'checkout.products.image': true }))
    const img = image(utils)
    expect(img).not.toBeNull()
    expect(img.tagName).toBe('DIV')
    expect(img).toHaveClass('summary-image')
    fireEvent.click(img)
    expect(mocks.onEditProduct).not.toHaveBeenCalled()
    const row = utils.container.querySelector('[data-doc-section="cart-product-row"]')
    const rules = cssFor(row).replace(/\s+/g, '')
    expect(rules).toContain('grid-template-columns:autoautominmax(0,1fr)auto;')
    expect(rules).toMatch(/\.summary-image\{grid-column:1;/)
    // the image keeps its own width (the name's column rule leaves it out)
    expect(rules).toContain(':not(.quantity-item):not(.summary-image){grid-column:3;width:auto;}')
  })

  it('the cart\'s key does not show it in the checkout, nor hide the cart\'s', () => {
    expect(image(checkoutRow(withVisibility({ 'cart.products.image': true, 'checkout.products.image': false })))).toBeNull()
    const cart = renderWithProviders(<ProductItemAccordion product={line} isCartProduct />, { theme: withVisibility({ 'checkout.products.image': false }) })
    expect(image(cart)).not.toBeNull()
  })
})

describe('an order\'s product image in the default order details (visibility.confirmation.products.image)', () => {
  it('shown by default, as in the tracking layout', () => {
    expect(schemaDefault('visibility.confirmation.products.image')).toBe(true)
    const utils = orderRow(themeWithValues())
    expect(image(utils)).not.toBeNull()
    expect(image(utils).tagName).toBe('DIV')
  })

  it('the theme hides it; the cart\'s key does not', () => {
    expect(image(orderRow(withVisibility({ 'confirmation.products.image': false })))).toBeNull()
    expect(image(orderRow(withVisibility({ 'cart.products.image': false })))).not.toBeNull()
  })

  it('without the image the row keeps its three columns', () => {
    const utils = orderRow(withVisibility({ 'confirmation.products.image': false }))
    const row = utils.container.querySelector('[data-doc-section="cart-product-row"]')
    expect(cssFor(row).replace(/\s+/g, '')).toContain('grid-template-columns:autominmax(0,1fr)auto;')
  })
})
