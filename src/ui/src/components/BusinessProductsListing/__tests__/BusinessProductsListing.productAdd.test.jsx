import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// The "+" of the store page's designs (onProductAdd): a product with nothing to choose goes straight to the cart
// (whatever the store's one-click setting says); any other opens its window as a click on it does.

window.scrollTo = vi.fn()
vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({ useFreeDeliveryProgress: () => ({ status: 'none' }) }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => <div data-testid='product-form' /> }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => <div data-testid='cart' /> }))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children, dataDocSection }) => (open ? <div data-testid={dataDocSection}>{children}</div> : null)
}))

const product = (overrides = {}) => ({ id: 55, name: 'Soup', extras: [], inventoried: false, category_id: 10, ...overrides })

const renderListing = async ({ added = product(), auth = true, open = true, moment = null, cart = {} } = {}) => {
  vi.resetModules()
  const addProduct = vi.fn()
  const updateProduct = vi.fn()
  const business = { id: 1, slug: 'demo-store', open, categories: [{ id: 10, products: [added] }] }
  vi.doMock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: {} }] }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{ carts: cart, options: { type: 2, moment }, loading: false }, { addProduct, updateProduct }]
  }))
  vi.doMock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth, user: {} }, { login: vi.fn() }] }))
  vi.doMock('~ui/src/components/RenderProductsLayout', () => ({
    RenderProductsLayout: ({ onProductAdd }) => (
      <button type='button' data-testid='add' onClick={() => onProductAdd(added)}>+</button>
    )
  }))
  vi.doMock('~components/components/BusinessAndProductList', () => ({
    BusinessAndProductList: ({ UIComponent, ...rest }) => {
      const [productModal, setProductModal] = React.useState({ product: null, loading: false, error: null })
      return (
        <UIComponent
          businessState={{ business, loading: false, error: null }}
          categoryState={{ products: [], loading: false }}
          categorySelected={{ id: 1, name: 'Menu' }}
          productModal={productModal}
          updateProductModal={(value) => setProductModal((previous) => ({ ...previous, product: value }))}
          onProductRedirect={vi.fn()}
          handleChangeSearch={vi.fn()}
          errors={[]}
          notFound={false}
          setNotFound={vi.fn()}
          alertState={{ open: false, content: [] }}
          setAlertState={vi.fn()}
          {...rest}
        />
      )
    }
  }))
  const { BusinessProductsListing } = await import('../index')
  renderWithProviders(<BusinessProductsListing />)
  return { addProduct, updateProduct }
}

const press = () => act(async () => { fireEvent.click(screen.getByTestId('add')) })

describe('BusinessProductsListing: the "+" (onProductAdd)', () => {
  it('a product with no options goes straight to the cart, with no window', async () => {
    const { addProduct } = await renderListing()
    await press()
    expect(addProduct).toHaveBeenCalledTimes(1)
    expect(addProduct.mock.calls[0][0]).toMatchObject({ id: 55, quantity: 1 })
    expect(screen.queryByTestId('product-customization-dialog')).not.toBeInTheDocument()
  })

  it('one already in the cart adds one more to its line', async () => {
    const cart = { 7: { business: { slug: 'demo-store' }, business_id: 1, products: [{ id: 55, code: 'abc', quantity: 2 }] } }
    const { addProduct, updateProduct } = await renderListing({ cart })
    await press()
    expect(addProduct).not.toHaveBeenCalled()
    expect(updateProduct.mock.calls[0][0]).toEqual({ id: 55, code: 'abc', quantity: 3 })
  })

  it('a product with options opens its window instead', async () => {
    const { addProduct } = await renderListing({ added: product({ extras: [{ id: 1 }] }) })
    await press()
    expect(addProduct).not.toHaveBeenCalled()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
  })

  it('a guest, an inventoried product or a closed store with no moment chosen open the window too', async () => {
    for (const setup of [{ auth: false }, { added: product({ inventoried: true }) }, { open: false }]) {
      const { addProduct } = await renderListing(setup)
      await press()
      expect(addProduct).not.toHaveBeenCalled()
      expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
      document.body.innerHTML = ''
    }
  })

  it('a closed store with a moment chosen adds straight to the cart', async () => {
    const { addProduct } = await renderListing({ open: false, moment: '2030-01-01 12:00:00' })
    await press()
    expect(addProduct).toHaveBeenCalledTimes(1)
  })
})
