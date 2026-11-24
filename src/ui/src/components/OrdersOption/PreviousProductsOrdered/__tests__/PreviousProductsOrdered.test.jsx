import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { sampleProductReorder } from '../../../__tests__/helpers/ordersTestMocks'
import { PreviousProductsOrdered } from '../index'

vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))

vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product, onProductClick }) => (
    <button type='button' onClick={() => onProductClick(product)}>{product.name}</button>
  )
}))

vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ children, open, width, hideCloseDefault, onClose }) => (open
    ? (
      <div data-testid='product-modal' data-width={width} data-hide-close={String(!!hideCloseDefault)}>
        <button type='button' onClick={onClose}>Close the product</button>
        {children}
      </div>
      )
    : null)
}))

vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: () => <div>Product form</div>
}))

describe('PreviousProductsOrdered', () => {
  it('renders previously ordered products', () => {
    const { getByText } = renderWithProviders(
      <PreviousProductsOrdered
        products={[sampleProductReorder]}
        handleUpdateProducts={vi.fn()}
        onBusinessClick={vi.fn()}
      />
    )
    expect(getByText('Cheese Slice')).toBeInTheDocument()
  })

  it('a product opens in the product window, 95ch wide (760px) and without its own close (the form has it)', () => {
    const { getByText, getByTestId, queryByTestId } = renderWithProviders(
      <PreviousProductsOrdered
        products={[sampleProductReorder]}
        handleUpdateProducts={vi.fn()}
        onBusinessClick={vi.fn()}
      />
    )
    expect(queryByTestId('product-modal')).toBeNull()
    fireEvent.click(getByText('Cheese Slice'))
    expect(getByTestId('product-modal')).toHaveAttribute('data-width', 'min(100%, 95ch)')
    expect(getByTestId('product-modal')).toHaveAttribute('data-hide-close', 'true')
    fireEvent.click(getByText('Close the product'))
    expect(queryByTestId('product-modal')).toBeNull()
  })
})
