import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'

const handlers = vi.hoisted(() => ({
  handleSave: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
  handleChangeProductCartQuantity: vi.fn()
}))

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
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
// Each option says the error it shows and how deep it is nested
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, error, nestingLevel }) => (
    <div data-testid={`option-${option.id}`} data-error={error ? 'true' : 'false'} data-level={nestingLevel} />
  )
}))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
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

const product = {
  ...productFixture,
  ingredients: [],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 1, rank: 1, name: 'Base', min: 1, max: 1, suboptions: [{ id: 11, name: 'Thin', enabled: true }] },
      { id: 2, rank: 2, name: 'Sauce', min: 1, max: 1, respect_to: 11, suboptions: [{ id: 21, name: 'Red', enabled: true }] }
    ]
  }]
}

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      handleChangeSuboptionState={vi.fn()}
      errors={{ 'id:1': true }}
      isSoldOut={false}
      editMode={false}
      maxProductQuantity={5}
      showOption={() => true}
      {...handlers}
      {...rest}
      productCart={{ quantity: 2, options: {}, ingredients: {} }}
    />
  )
}))

const { ProductForm } = await import('../index')

const renderForm = (theme) => renderWithProviders(<ProductForm />, { theme })

describe('ProductForm', () => {
  it('a group shows its error only after the first "Add"', () => {
    const utils = renderForm(themeWithValues())
    expect(utils.getByTestId('option-1')).toHaveAttribute('data-error', 'false')
    fireEvent.click(utils.container.querySelector('[data-doc-control="add-product-to-cart"]'))
    expect(handlers.handleSave).not.toHaveBeenCalled()
    expect(utils.getByTestId('option-1')).toHaveAttribute('data-error', 'true')
  })

  it('the nesting level of each option (respect_to)', () => {
    const utils = renderForm(themeWithValues())
    expect(utils.getByTestId('option-1')).toHaveAttribute('data-level', '0')
    expect(utils.getByTestId('option-2')).toHaveAttribute('data-level', '1')
  })

  it('the quantity: a stepper with the same handlers and limits, its value editable', () => {
    handlers.increment.mockClear()
    handlers.decrement.mockClear()
    handlers.handleChangeProductCartQuantity.mockClear()
    const utils = renderForm(themeWithValues())
    const minus = utils.getByRole('button', { name: 'Decrease quantity' })
    const plus = utils.getByRole('button', { name: 'Increase quantity' })
    expect(minus).toHaveAttribute('data-doc-control', 'product-quantity-decrement')
    expect(plus).toHaveAttribute('data-doc-control', 'product-quantity-increment')
    fireEvent.click(minus)
    fireEvent.click(plus)
    expect(handlers.decrement).toHaveBeenCalledTimes(1)
    expect(handlers.increment).toHaveBeenCalledTimes(1)
    const input = utils.getByLabelText('Quantity')
    expect(input).toHaveValue('2')
    fireEvent.change(input, { target: { value: '3' } })
    expect(handlers.handleChangeProductCartQuantity).toHaveBeenCalledWith(3)
  })
})

describe('ProductForm: the favorite', () => {
  it('is a real button, pressed when the product is a favorite', () => {
    const utils = renderForm(themeWithValues())
    const favorite = utils.getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
  })

  it('the favorite of the theme (components.favorite: its heart color), the outlined heart', () => {
    const theme = themeWithValues((values) => {
      values.components.favorite.base.color = '#AB1234'
      return values
    })
    const utils = renderForm(theme)
    const favorite = utils.getByRole('button', { name: 'Favorite' })
    // the heart is decorative (no role of its own): the one svg inside the Favorite button, outlined
    const heart = favorite.querySelector('svg')
    expect(heart).not.toBeNull()
    expect(heart).toHaveAttribute('aria-hidden', 'true')
    expect(favorite.style.getPropertyValue('--ui-favorite-color')).toBe('#AB1234')
  })
})
