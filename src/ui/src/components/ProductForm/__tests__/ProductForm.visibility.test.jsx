import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '../../../../../utils/themeSchema'

// The pieces of the product window the theme shows or hides (visibility
// product.add_price, .offer_price, .gallery_arrows, .ingredients).

vi.mock('swiper/react', () => ({
  Swiper: ({ children, className }) => <div data-testid={className}>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({
  Navigation: class Navigation {},
  Pagination: class Pagination {},
  Thumbs: class Thumbs {}
}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ children }) => <div data-testid='product-option'>{children}</div>
}))
vi.mock('~ui/src/components/ProductIngredient', () => ({
  ProductIngredient: ({ ingredient }) => <div data-testid='ingredient'>{ingredient.name}</div>
}))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
// a customer with a session, so the add button shows
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ loading: false, options: { type: 1 } }]
}))
vi.mock('~components/utils/orderTypeAddress', () => ({
  parseUnaddressedOrderTypes: () => [],
  shouldRequireOrderAddress: () => false
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => ({ studentId: null })
}))

const productState = vi.hoisted(() => ({ current: null }))

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: productState.current, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      handleSave={vi.fn()}
      increment={vi.fn()}
      decrement={vi.fn()}
      handleChangeSuboptionState={vi.fn()}
      errors={[]}
      isSoldOut={false}
      editMode={false}
      maxProductQuantity={5}
      {...rest}
      productCart={{ quantity: 1, total: 21, ingredients: {}, options: {} }}
    />
  )
}))

const { ProductForm } = await import('../index')

const product = {
  id: 10,
  name: 'Burger',
  price: 9.5,
  offer_price: 12,
  in_offer: true,
  images: 'burger.jpg',
  gallery: [{ file: 'side.jpg' }],
  ingredients: [{ id: 1, name: 'Pickles' }]
}

const withKeys = (keys) => themeWithValues((values) => {
  values.components.product_modal.base.layout = 'sheet'
  Object.assign(values.visibility, keys)
  return values
})

const renderForm = (theme) => {
  productState.current = product
  return renderWithProviders(<ProductForm />, { theme })
}

const parts = (utils) => ({
  // the total is inside the add button, no longer by the quantity
  addPrice: utils.container.querySelector('[data-doc-control="add-product-to-cart"]')?.textContent.includes('$21') ?? false,
  offerPrice: utils.container.querySelector('.offer-price')?.textContent === '$12',
  arrows: !!utils.queryByRole('button', { name: 'Previous' }) && !!utils.queryByRole('button', { name: 'Next' }),
  ingredients: !!utils.container.querySelector('[data-doc-section="product-ingredients"]') && !!utils.queryByTestId('ingredient')
})

describe('product window: the pieces the theme shows', () => {
  it('by default: the price before the offer, the gallery arrows and the ingredients; the total in the add button as the schema says', () => {
    // the default of visibility product.add_price is the schema's, read here (not fixed in the test)
    const addPriceDefault = schemaDefault('visibility.product.add_price')
    expect(typeof addPriceDefault).toBe('boolean')
    expect(parts(renderForm(themeWithValues((values) => { values.components.product_modal.base.layout = 'sheet' })))).toEqual({ addPrice: addPriceDefault, offerPrice: true, arrows: true, ingredients: true })
  })

  it('the total on (visibility product.add_price): the cart line\'s total inside the add button, not by the quantity', () => {
    const utils = renderForm(withKeys({ 'product.add_price': true }))
    const add = utils.container.querySelector('[data-doc-control="add-product-to-cart"]')
    expect(add).toHaveTextContent('Add to cart')
    expect(add).toHaveTextContent('$21')
    expect(utils.container.querySelector('[data-doc-section="product-actions"] .quantity-control')).not.toHaveTextContent('$21')
  })

  it('the total off (visibility product.add_price false): the add button has only its label', () => {
    const add = renderForm(withKeys({ 'product.add_price': false })).container.querySelector('[data-doc-control="add-product-to-cart"]')
    expect(add).toHaveTextContent('Add to cart')
    expect(add).not.toHaveTextContent('$21')
  })

  it('hides the price before the offer, the gallery arrows and the ingredients (and their tab)', () => {
    const utils = renderForm(withKeys({
      'product.offer_price': false,
      'product.gallery_arrows': false,
      'product.ingredients': false
    }))
    expect(parts(utils)).toEqual({ addPrice: schemaDefault('visibility.product.add_price'), offerPrice: false, arrows: false, ingredients: false })
    // the price stays
    expect(utils.getByText('$9.5')).toBeInTheDocument()
    // no ingredients tab in the options' navigation
    expect(utils.queryByRole('button', { name: 'Ingredients' })).toBeNull()
  })

  it('the ingredients have their tab in the options\' navigation while shown', () => {
    const utils = renderForm(themeWithValues((values) => { values.components.product_modal.base.layout = 'sheet' }))
    expect(utils.getByRole('button', { name: 'Ingredients' })).toBeInTheDocument()
  })
})
