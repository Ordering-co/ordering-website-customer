import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'

// implementation notesthe total beside the label of the add button is the price, whatever it is: a total of 0 is a
// price ($0), not the bare number `0` that `total && parsePrice(total)` drew; none yet draws nothing.
let mockProduct
let mockTotal
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: class Navigation {}, Pagination: class Pagination {}, Thumbs: class Thumbs {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => null }))
vi.mock('~ui/src/components/ProductOption', () => ({ ProductOption: ({ option, children }) => <div id={`id_${option.id}`}>{children}</div> }))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({ ProductOptionSubOption: () => null }))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }] }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ loading: false, options: { type: 1 } }] }))
vi.mock('~components/utils/orderTypeAddress', () => ({ parseUnaddressedOrderTypes: () => [], shouldRequireOrderAddress: () => false }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: mockProduct, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      errors={{}}
      maxProductQuantity={5}
      showOption={() => true}
      {...rest}
      productCart={{ quantity: 1, total: mockTotal, options: {}, ingredients: {} }}
    />
  )
}))
const { ProductForm } = await import('../index')

const product = { ...productFixture, ingredients: [], extras: [] }
// the total is shown beside the label only when the theme says so (visibility product.add_price)
const withPrice = themeWithValues((values) => {
  values.visibility['product.add_price'] = true
  return values
})
const addButton = (total) => {
  mockProduct = product
  mockTotal = total
  const { container, unmount } = renderWithProviders(<ProductForm product={product} />, { theme: withPrice })
  // button > the Button's label box > AddButtonContent > label, total
  const spans = Array.from(container.querySelectorAll('[data-doc-control="add-product-to-cart"] span span span')).map((span) => span.textContent)
  unmount()
  return spans
}

describe('ProductForm: the total in the add button', () => {
  it('lets the translated label and total take separate lines when they need room', () => {
    mockProduct = product
    mockTotal = 21
    const { getByRole } = renderWithProviders(<ProductForm product={product} />, { theme: withPrice })
    const button = getByRole('button', { name: 'Add to cart $21' })
    const content = button.querySelector('span > span')
    expect(getComputedStyle(content).flexWrap).toBe('wrap')
  })

  it('a total above 0 is its price', () => {
    expect(addButton(21)).toEqual(['Add to cart', '$21'])
  })

  it('a total of 0 is a price too, never the bare 0', () => {
    expect(addButton(0)).toEqual(['Add to cart', '$0'])
  })

  it('no total yet draws nothing beside the label', () => {
    expect(addButton(undefined)).toEqual(['Add to cart', ''])
  })
})
