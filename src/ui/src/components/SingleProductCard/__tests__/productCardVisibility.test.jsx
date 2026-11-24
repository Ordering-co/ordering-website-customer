import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SingleProductCard } from '../index'

// The pieces of the product card the theme shows or hides (visibility
// product.ribbon, .offer_price, .cart_quantity, .add_button).

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => [{ current: null }, true]
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null)
}))

const onProductClick = vi.hoisted(() => vi.fn())
const product = {
  ...productFixture,
  price: 8,
  offer_price: 12,
  in_offer: true,
  ribbon: { enabled: true, text: 'Hot deal', color: '#ff0000', shape: 'rectangle' }
}

vi.mock('~components/components/SingleProductCard', () => ({
  SingleProductCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={product}
      onProductClick={onProductClick}
      isSoldOut={false}
      isSkeleton={false}
      productAddedToCartLength={2}
      handleFavoriteProduct={vi.fn()}
      {...rest}
    />
  )
}))

const withKeys = (keys) => themeWithValues((values) => {
  Object.assign(values.visibility, keys)
  return values
})

// the badge with how many are in the cart (2)
const hasCartQuantity = (container) => [...container.querySelectorAll('span')].some((span) => span.textContent === '2')

const parts = (container) => ({
  ribbon: container.textContent.includes('Hot deal'),
  offerPrice: container.querySelector('.off-price')?.textContent === '$12',
  cartQuantity: hasCartQuantity(container),
  addButton: !!container.querySelector('.add-button')
})

describe('product card: the pieces the theme shows', () => {
  beforeEach(() => onProductClick.mockClear())

  it('by default: the ribbon, the price before the offer and the quantity in the cart; no "Add" (off)', () => {
    const { container } = renderWithProviders(<SingleProductCard />, { theme: themeWithValues() })
    expect(parts(container)).toEqual({ ribbon: true, offerPrice: true, cartQuantity: true, addButton: false })
  })

  it('hides the ribbon, the price before the offer and the quantity in the cart', () => {
    const { container } = renderWithProviders(<SingleProductCard />, {
      theme: withKeys({ 'product.ribbon': false, 'product.offer_price': false, 'product.cart_quantity': false })
    })
    expect(container.textContent).not.toContain('Hot deal')
    expect(container.querySelector('.off-price')).toBeNull()
    // the current price stays
    expect(container.querySelector('.current-price')).toHaveTextContent('$8')
    expect(hasCartQuantity(container)).toBe(false)
  })

  it('"Add" on: shown, the look of the card\'s action (not a control of its own); a click opens the product', () => {
    const { container, getByRole } = renderWithProviders(<SingleProductCard />, { theme: withKeys({ 'product.add_button': true }) })
    const add = container.querySelector('.add-button [data-slot=button-decoration]')
    expect(add).toHaveTextContent('Add')
    expect(add.tagName).toBe('SPAN')
    expect(add).not.toHaveAttribute('tabindex')
    expect(add).toHaveAttribute('aria-hidden', 'true')
    // the card keeps one control that opens the product: its name
    expect(container.querySelectorAll('[data-card-link]')).toHaveLength(1)
    fireEvent.click(getByRole('button', { name: 'Burger' }))
    expect(onProductClick).toHaveBeenCalledTimes(1)
  })
})
