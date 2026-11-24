import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'

// implementation noteswith no image the favorite and Share, over the form's top start corner, sit in a row in
// the room the top keeps for the modal's close; stacked (as over an image) the second one covers the name.
let mockProduct
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
      productCart={{ quantity: 1, options: {}, ingredients: {} }}
    />
  )
}))
const { ProductForm } = await import('../index')

const base = { ...productFixture, ingredients: [], extras: [] }
const directionOf = (product) => {
  mockProduct = product
  const { container, unmount } = renderWithProviders(<ProductForm product={product} />, { theme: themeWithValues((values) => { values.components.product_modal.base.layout = 'sheet' }) })
  const value = window.getComputedStyle(container.querySelector('.favorite').parentElement).flexDirection
  unmount()
  return value
}

describe('ProductForm: the favorite and Share with no image', () => {
  it('sit in a row, apart from the stack over an image', () => {
    expect(directionOf({ ...base, images: 'https://example.com/photo.jpg' })).toBe('column')
    expect(directionOf({ ...base, images: null })).toBe('row')
  })
})
