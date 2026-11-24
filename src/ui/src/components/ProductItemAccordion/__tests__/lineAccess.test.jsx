import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

// The cart line: its name opens / closes its options (a real button), its
// image edits it (a named button), its edit action is named
const state = vi.hoisted(() => ({ productInfo: { ingredients: [], options: [] }, onEditProduct: null }))

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={state.productInfo}
      onEditProduct={state.onEditProduct}
      changeQuantity={() => {}}
      onDeleteProduct={() => {}}
      isCheckout={false}
      isCartProduct
      {...rest}
    />
  )
}))

const line = (extra = {}) => ({ ...productFixture, quantity: 1, price: 9.5, valid: true, valid_quantity: true, valid_menu: true, ...extra })
const withOptions = { ingredients: [], options: [{ id: 1, name: 'Size', suboptions: [] }] }

describe('ProductItemAccordion: the cart line', () => {
  it('a line with options: its name is the button that opens / closes them', () => {
    state.productInfo = withOptions
    state.onEditProduct = vi.fn()
    const { getByRole } = renderWithProviders(<ProductItemAccordion product={line()} />)
    const toggle = getByRole('button', { name: productFixture.name })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(toggle.getAttribute('aria-controls'))).not.toBeNull()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('a line without options: its name is text', () => {
    state.productInfo = { ingredients: [], options: [] }
    const { queryByRole, getByText } = renderWithProviders(<ProductItemAccordion product={line()} />)
    expect(getByText(productFixture.name).tagName).toBe('DIV')
    expect(queryByRole('button', { name: productFixture.name })).toBeNull()
  })

  it('its Edit link and its image edit it, without opening the options; one button named Edit', () => {
    state.productInfo = withOptions
    state.onEditProduct = vi.fn()
    const { getByRole, container } = renderWithProviders(<ProductItemAccordion product={line({ images: 'https://example.test/p.png' })} />)
    fireEvent.click(getByRole('button', { name: 'Edit' }))
    fireEvent.click(container.querySelector('[data-doc-control="cart-product-edit-image"]'))
    expect(state.onEditProduct).toHaveBeenCalledTimes(2)
    expect(getByRole('button', { name: productFixture.name })).toHaveAttribute('aria-expanded', 'false')
  })

  it('the pencil of the row is named Edit', () => {
    state.productInfo = { ingredients: [], options: [] }
    state.onEditProduct = vi.fn()
    const { getAllByRole } = renderWithProviders(<ProductItemAccordion product={line()} hideQuantitySelector={false} />, { theme: themeWithValues() })
    const edits = getAllByRole('button', { name: 'Edit' })
    expect(edits.some(b => b.getAttribute('data-doc-control') === 'cart-product-edit')).toBe(true)
  })
})

describe('ProductItemAccordion: a row of an order\'s summary', () => {
  const withSizes = { ingredients: [], options: [{ id: 1, name: 'Size', suboptions: [{ id: 2, name: 'Large', rank: 1 }] }] }
  const summaryRow = (theme) => {
    state.productInfo = withSizes
    state.onEditProduct = null
    const { container } = renderWithProviders(
      <ProductItemAccordion product={line()} isOrderDetails hideQuantitySelector={false} />,
      { theme }
    )
    return container.querySelector("[data-doc-section='cart-product-row']")
  }

  it('a grid of the quantity, the name and the price, its options under the name', () => {
    // without the product's image (visibility.confirmation.products.image)
    const css = cssFor(summaryRow(themeWithValues((values) => { values.visibility['confirmation.products.image'] = false; return values })))
    expect(css).toContain('display:grid')
    expect(css).toContain('grid-template-columns:auto minmax(0,1fr) auto')
    expect(css).toMatch(/\.accordion-product-options\{grid-column:2 \/ -1/)
  })

  it('with the product\'s image (the default): the image first, the options still under the name', () => {
    const css = cssFor(summaryRow(themeWithValues()))
    expect(css).toContain('grid-template-columns:auto auto minmax(0,1fr) auto')
    expect(css).toMatch(/\.accordion-product-options\{grid-column:3 \/ -1/)
  })
})
