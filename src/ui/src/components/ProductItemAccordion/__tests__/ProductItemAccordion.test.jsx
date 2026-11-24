import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

const onEditProduct = vi.hoisted(() => vi.fn())

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={{ ...productFixture, quantity: 2, price: 9.5, valid_quantity: true, valid_menu: true }}
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={vi.fn()}
      onDeleteProduct={vi.fn()}
      onEditProduct={onEditProduct}
      isCheckout={false}
      isCartProduct
      getProductMax={vi.fn()}
      {...rest}
    />
  )
}))

describe('ProductItemAccordion', () => {
  it('renders product name', () => {
    const { getByText } = renderWithProviders(<ProductItemAccordion />)
    expect(getByText('Burger')).toBeInTheDocument()
  })

  it('a removed ingredient reads "No <ingredient>"', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion productInfo={{ ingredients: [{ id: 1, name: 'Tomato', selected: false }, { id: 2, name: 'Lettuce', selected: true }], options: [] }} />
    )
    expect(getByText('No Tomato')).toBeInTheDocument()
  })

  it('hides the quantity and delete controls for a pending cart', () => {
    const editable = renderWithProviders(<ProductItemAccordion />)
    expect(editable.container.querySelector('[data-doc-control="cart-product-increment"]')).toBeInTheDocument()
    expect(editable.container.querySelector('[data-doc-control="cart-product-decrement"]')).toBeInTheDocument()
    editable.unmount()

    const pending = renderWithProviders(<ProductItemAccordion isCartPending />)
    expect(pending.container.querySelector('[data-doc-control="cart-product-increment"]')).not.toBeInTheDocument()
    expect(pending.container.querySelector('[data-doc-control="cart-product-decrement"]')).not.toBeInTheDocument()
    expect(pending.container.querySelector('[data-doc-control="cart-product-delete"]')).not.toBeInTheDocument()
    expect(pending.getByText('Burger')).toBeInTheDocument()
  })

  it('does not increment when the cart already holds maximum_per_order', () => {
    const changeQuantity = vi.fn()
    const product = { ...productFixture, quantity: 1, balance: 1, maximum_per_order: 1, valid_quantity: true, valid_menu: true }
    const { container } = renderWithProviders(<ProductItemAccordion product={product} changeQuantity={changeQuantity} />)
    const increment = container.querySelector('[data-doc-control="cart-product-increment"]')
    expect(increment).toBeDisabled()
    fireEvent.click(increment)
    expect(changeQuantity).not.toHaveBeenCalled()
  })

  it('counts other cart lines of the same product against maximum_per_order', () => {
    const changeQuantity = vi.fn()
    const product = { ...productFixture, quantity: 1, balance: 2, maximum_per_order: 2, valid_quantity: true, valid_menu: true }
    const { container } = renderWithProviders(<ProductItemAccordion product={product} changeQuantity={changeQuantity} />)
    const increment = container.querySelector('[data-doc-control="cart-product-increment"]')
    expect(increment).toBeDisabled()
    fireEvent.click(increment)
    expect(changeQuantity).not.toHaveBeenCalled()
  })

  it('increments while below maximum_per_order', () => {
    const changeQuantity = vi.fn()
    const product = { ...productFixture, quantity: 1, balance: 1, maximum_per_order: 2, valid_quantity: true, valid_menu: true }
    const { container } = renderWithProviders(<ProductItemAccordion product={product} changeQuantity={changeQuantity} />)
    fireEvent.click(container.querySelector('[data-doc-control="cart-product-increment"]'))
    expect(changeQuantity).toHaveBeenCalledWith(product, 2)
  })

  it('increments without a maximum_per_order', () => {
    const changeQuantity = vi.fn()
    const product = { ...productFixture, quantity: 3, balance: 5, valid_quantity: true, valid_menu: true }
    const { container } = renderWithProviders(<ProductItemAccordion product={product} changeQuantity={changeQuantity} />)
    fireEvent.click(container.querySelector('[data-doc-control="cart-product-increment"]'))
    expect(changeQuantity).toHaveBeenCalledWith(product, 4)
  })

  describe('the quantity stepper of the cart line (hideQuantitySelector off)', () => {
    const renderLineStepper = (product, changeQuantity = vi.fn()) => renderWithProviders(
      <ProductItemAccordion
        product={product}
        changeQuantity={changeQuantity}
        hideQuantitySelector={false}
        getProductMax={() => 4}
        offsetDisabled={() => 4}
      />
    )

    it('disables the increment once maximum_per_order is reached', () => {
      const changeQuantity = vi.fn()
      const product = { ...productFixture, quantity: 2, balance: 2, maximum_per_order: 2, valid: true, valid_quantity: true, valid_menu: true }
      const { getByRole } = renderLineStepper(product, changeQuantity)
      const increment = getByRole('button', { name: 'Increase quantity' })
      expect(increment).toBeDisabled()
      fireEvent.click(increment)
      expect(changeQuantity).not.toHaveBeenCalled()
    })

    it('counts other cart lines of the same product against maximum_per_order', () => {
      const product = { ...productFixture, quantity: 1, balance: 2, maximum_per_order: 2, valid: true, valid_quantity: true, valid_menu: true }
      const { getByRole } = renderLineStepper(product)
      expect(getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    })

    it('increments while below maximum_per_order and the product max', () => {
      const changeQuantity = vi.fn()
      const product = { ...productFixture, quantity: 1, balance: 1, maximum_per_order: 2, valid: true, valid_quantity: true, valid_menu: true }
      const { getByRole } = renderLineStepper(product, changeQuantity)
      const increment = getByRole('button', { name: 'Increase quantity' })
      expect(increment).not.toBeDisabled()
      fireEvent.click(increment)
      expect(changeQuantity).toHaveBeenCalledWith(product, 2)
    })
  })

  it('calls onEditProduct when edit is triggered', () => {
    onEditProduct.mockClear()
    const { getByRole } = renderWithProviders(<ProductItemAccordion />)
    fireEvent.click(getByRole('button', { name: 'Edit' }))
    expect(onEditProduct).toHaveBeenCalled()
  })
})
