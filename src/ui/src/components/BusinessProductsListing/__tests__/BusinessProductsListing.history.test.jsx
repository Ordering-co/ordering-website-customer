import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useHistory, useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ProductForm as ProductFormController } from '~components/components/ProductForm'
import { buildMenuListingMockOrdering, createMenuListingApiMocks, sampleBusiness } from '~components/__tests__/helpers/menuListingTestHelpers'
import { BusinessProductsListing } from '../index'

const { addProduct } = vi.hoisted(() => ({ addProduct: vi.fn().mockResolvedValue(true) }))
const order = [{ options: { type: 2 }, carts: {} }, { addProduct }]
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => order }))
vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children }) => open ? <div role='dialog'>{children}</div> : null
}))

const [productA, productB] = sampleBusiness.categories[0].products.map(product => ({ ...product, extras: [] }))
vi.mock('~ui/src/components/RenderProductsLayout', () => ({
  // Match the real menu: product actions only appear after the business is ready.
  RenderProductsLayout: ({ onProductClick, business, isLoading }) => {
    if (isLoading || !business?.id) return null
    return (
      <>
        <button type='button' onClick={() => onProductClick(productA)}>Open Burger</button>
        <button type='button' onClick={() => onProductClick(productB)}>Open Fries</button>
      </>
    )
  }
}))

// The actual ProductForm controller builds the add payload. Only its view is replaced.
const ProductFormProbe = ({ productObject, handleSave }) => (
  <>
    <h2 data-product-id={productObject.product?.id}>{productObject.product?.name}</h2>
    <button type='button' onClick={() => handleSave()}>Add</button>
  </>
)
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: (props) => <ProductFormController {...props} UIComponent={ProductFormProbe} useOrderContext />
}))

afterEach(() => vi.restoreAllMocks())

it.each(['taco-shop', '5'])('keeps the URL, product form and add payload in sync after an abandoned Forward request in /store/%s', async (slug) => {
  addProduct.mockClear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const api = createMenuListingApiMocks(vi)
  const ordering = buildMenuListingMockOrdering(vi, api)
  let resolveA
  const cancelA = vi.fn()
  api.mockProductGet.mockImplementationOnce(({ cancelToken }) => {
    cancelToken.cancel = cancelA
    return new Promise(resolve => { resolveA = resolve })
  })

  const storePath = '/store/' + slug
  let history
  const StoreRoute = () => {
    history = useHistory()
    const params = new URLSearchParams(useLocation().search)
    return (
      <BusinessProductsListing
        ordering={ordering}
        slug={slug}
        businessProps={[]}
        categoryId={params.get('category')}
        productId={params.get('product')}
        onProductRedirect={({ category, product }) => product
          ? history.push(storePath + '?category=' + category + '&product=' + product)
          : history.goBack()}
      />
    )
  }
  renderWithProviders(<StoreRoute />, { initialEntries: [storePath] })

  const burgerButton = await screen.findByRole('button', { name: 'Open Burger' })
  await act(async () => { fireEvent.click(burgerButton) })
  expect(await screen.findByRole('heading', { name: 'Burger' })).toHaveAttribute('data-product-id', '10')
  act(() => history.goBack())
  expect(screen.queryByRole('dialog')).toBeNull()
  act(() => history.goForward())
  await waitFor(() => expect(api.mockProductGet).toHaveBeenCalledTimes(1))
  act(() => history.goBack())
  await act(async () => resolveA({ content: { error: false, result: productA } }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByText('Open Fries'))

  expect(history.location.search).toBe('?category=1&product=11')
  expect(screen.getByRole('heading', { name: 'Fries' })).toHaveAttribute('data-product-id', '11')
  expect(cancelA).toHaveBeenCalledOnce()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add' })))
  expect(addProduct).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ id: 11, categoryId: 1, name: 'Fries' }),
    { business_id: 5 },
    false
  )

  // Forward must also reject the right request returning the wrong product.
  api.mockProductGet.mockResolvedValueOnce({ content: { error: false, result: productA } })
  act(() => history.goForward())
  expect(await screen.findByText("Sorry, we couldn't find the requested product.")).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
})
