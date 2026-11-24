import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cartFixture } from '../../__tests__/helpers/cartTestMocks'
import { CartSidebar } from '../index'

vi.mock('~ui/src/components/CartContent', () => ({
  CartContent: ({ isOpenCart }) => <div data-testid='cart-content' data-open={String(isOpenCart)} />
}))

describe('CartSidebar', () => {
  it('marks persistent cart content inactive until the drawer opens', () => {
    const { getByTestId, getByText, getByLabelText } = renderWithProviders(<CartSidebar carts={[{ uuid: 'test-cart' }]} onClose={vi.fn()} />)
    expect(getByTestId('cart-content')).toHaveAttribute('data-open', 'false')
    fireEvent.click(getByText('1'))
    expect(getByTestId('cart-content')).toHaveAttribute('data-open', 'true')
    fireEvent.click(getByLabelText('Close'))
    expect(getByTestId('cart-content')).toHaveAttribute('data-open', 'false')
  })
  it('opens sidebar and shows cart title', () => {
    const onClose = vi.fn()
    const { getByText, container } = renderWithProviders(
      <CartSidebar open carts={[cartFixture]} onClose={onClose} />
    )
    const icon = container.querySelector('[class*="IconContent"]') || container.firstChild?.firstChild
    if (icon) fireEvent.click(icon)
    expect(getByText('Your cart')).toBeInTheDocument()
  })

  it('opens as wide as the theme\'s md dialog size, the whole width where it does not fit', () => {
    const { getByText, container } = renderWithProviders(<CartSidebar carts={[{ uuid: 'test-cart' }]} onClose={vi.fn()} />)
    const panel = container.querySelector('#cartSidebar')
    fireEvent.click(getByText('1'))
    expect(panel.style.width).toBe('min(100%, 600px)')
  })
})
