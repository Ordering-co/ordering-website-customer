import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { useEvent } from '~components/contexts/EventContext'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { CartContent } from '../index'

const progress = vi.hoisted(() => vi.fn(() => ({ status: 'progress' })))
vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({ useFreeDeliveryProgress: progress }))

const configs = vi.hoisted(() => ({ value: {} }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: configs.value }] }))

vi.mock('~ui/src/components/Cart', () => ({
  Cart: ({ cart, freeDeliveryProgress, isCheckout, isForceOpenCart }) => <div data-testid='cart-item' data-progress={freeDeliveryProgress?.status} data-checkout={String(isCheckout)} data-force-open={String(!!isForceOpenCart)}>{cart?.uuid}</div>
}))

const preview = vi.hoisted(() => ({ cartGroup: null, isPending: false, calls: [] }))
vi.mock('~ui/hooks/useCartGroupPreview', () => ({
  useCartGroupPreview: (options) => {
    preview.calls.push(options)
    return { cartGroup: preview.cartGroup, isPending: preview.isPending, loading: preview.isPending }
  }
}))

const multiBusinessConfigs = {
  checkout_multi_business_enabled: { value: '1' },
  multi_business_checkout_show_combined_delivery_fee: { value: '1' },
  multi_business_checkout_show_combined_driver_tip: { value: '1' }
}

const salad = { uuid: 'salad', business_id: 100, valid: true, status: 0, products: [{ id: 1 }], total: 69, delivery_price_with_discount: 8.57, driver_tip: 0 }
const inkognito = { uuid: 'inkognito', business_id: 102, valid: true, status: 0, products: [{ id: 2 }], total: 105, delivery_price_with_discount: 8.57, driver_tip: 0 }

describe('CartContent', () => {
  beforeEach(() => {
    configs.value = {}
    progress.mockClear()
    preview.cartGroup = null
    preview.isPending = false
    preview.calls = []
    window.history.replaceState(null, '', '/')
  })

  it('sums each cart delivery fee while the group pricing is unavailable', () => {
    configs.value = multiBusinessConfigs
    const { getByText, getAllByText } = renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />)
    expect(getByText('Total delivery fee').nextSibling).toHaveTextContent('$17.14')
    expect(getAllByText('$174')).toHaveLength(2)
    expect(preview.calls.at(-1)).toEqual({ enabled: true })
  })

  it('shows the group delivery fee and totals once the cart group is priced', () => {
    configs.value = multiBusinessConfigs
    preview.cartGroup = {
      uuid: 'group-1',
      carts: [salad, { ...inkognito, delivery_price_with_discount: 0, total: 96 }]
    }
    const { getByText, getAllByText, queryByText } = renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />)
    expect(getByText('Total delivery fee').nextSibling).toHaveTextContent('$8.57')
    expect(getAllByText('$165')).toHaveLength(2)
    expect(queryByText('$174')).toBeNull()
  })

  it('shows skeletons instead of the per cart sums while the group pricing loads', () => {
    configs.value = multiBusinessConfigs
    preview.isPending = true
    const { getByText, queryByText, getAllByTestId, container } = renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />)
    expect(getByText('Total delivery fee')).toBeInTheDocument()
    expect(queryByText('$17.14')).toBeNull()
    expect(queryByText('$174')).toBeNull()
    expect(getAllByTestId('skeleton')).toHaveLength(3)
    expect(container.querySelector("[data-doc-control='multi-cart-group-checkout'] [data-testid='skeleton']")).toBeInTheDocument()
  })

  it('the group checkout is the md solid primary design system Button, with its price inside', () => {
    configs.value = multiBusinessConfigs
    preview.cartGroup = { uuid: 'group-1', carts: [salad, inkognito] }
    const theme = themeWithValues()
    const { container } = renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />, { theme })
    const checkout = container.querySelector("[data-doc-control='multi-cart-group-checkout']")
    expect(checkout.tagName).toBe('BUTTON')
    expect(checkout).toHaveAttribute('data-slot', 'button')
    expect(checkout).toHaveAttribute('data-doc-group-index', '0')
    const vars = componentVars(theme, 'button', { color: 'primary', appearance: 'solid', size: 'md' })
    ;['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color'].forEach((name) => expect(checkout.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
    expect(checkout).toHaveTextContent(/^Checkout\$174$/)
  })

  it('checks out the priced cart group even when the carts still carry an older group', () => {
    configs.value = multiBusinessConfigs
    preview.cartGroup = { uuid: 'group-1', carts: [salad, inkognito] }
    const stale = { group: { uuid: 'old-group' } }
    const { container } = renderWithProviders(<CartContent carts={[{ ...salad, ...stale }, { ...inkognito, ...stale }]} isOrderStateCarts />)
    const [events] = useEvent()
    events.emit.mockClear()
    fireEvent.click(container.querySelector("[data-doc-control='multi-cart-group-checkout']"))
    expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'multi_checkout', params: { cartUuid: 'group-1' } })
  })

  it('without a priced group checks out the carts own group, or chooses the carts when they have none', () => {
    configs.value = multiBusinessConfigs
    const [events] = useEvent()
    const grouped = { group: { uuid: 'old-group' } }
    const withGroup = renderWithProviders(<CartContent carts={[{ ...salad, ...grouped }, { ...inkognito, ...grouped }]} isOrderStateCarts />)
    events.emit.mockClear()
    fireEvent.click(withGroup.container.querySelector("[data-doc-control='multi-cart-group-checkout']"))
    expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'multi_checkout', params: { cartUuid: 'old-group' } })
    withGroup.unmount()

    const withoutGroup = renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />)
    events.emit.mockClear()
    fireEvent.click(withoutGroup.container.querySelector("[data-doc-control='multi-cart-group-checkout']"))
    expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'multi_cart' })
  })

  it('does not request the group pricing outside the multi business checkout', () => {
    renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts />)
    expect(preview.calls.at(-1)).toEqual({ enabled: false })
    configs.value = multiBusinessConfigs
    renderWithProviders(<CartContent carts={[salad, inkognito]} isOrderStateCarts isCustomerMode />)
    expect(preview.calls.at(-1)).toEqual({ enabled: false })
  })

  it('does not request the group pricing when the carts show no Cart #N group', () => {
    configs.value = multiBusinessConfigs
    renderWithProviders(<CartContent carts={[{ ...salad, group: { uuid: 'g1' } }, { ...inkognito, group: { uuid: 'g2' } }]} isOrderStateCarts />)
    expect(preview.calls.at(-1)).toEqual({ enabled: false })
  })

  it('does not request the group pricing when the carts are in several groups of the API', () => {
    configs.value = multiBusinessConfigs
    const third = { ...inkognito, uuid: 'third', business_id: 103 }
    const { getByText } = renderWithProviders(
      <CartContent carts={[{ ...salad, group: { uuid: 'g1' } }, { ...inkognito, group: { uuid: 'g1' } }, { ...third, group: { uuid: 'g2' } }]} isOrderStateCarts />
    )
    expect(getByText('Cart #1')).toBeInTheDocument()
    expect(preview.calls.at(-1)).toEqual({ enabled: false })
  })
  it('does not request promotional eligibility in checkout', () => {
    window.history.replaceState(null, '', '/checkout/cart-1')
    const cart = { uuid: 'cart-1', business_id: 1, valid: true, status: 0, products: [{ id: 1 }], total: 10 }
    const { getByTestId } = renderWithProviders(<CartContent carts={[cart]} isOrderStateCarts />)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
    expect(getByTestId('cart-item')).toHaveAttribute('data-checkout', 'true')
    window.history.replaceState(null, '', '/')
  })
  it('does not request promotional eligibility for the checkout cart list', () => {
    window.history.replaceState(null, '', '/checkout')
    const cart = { uuid: 'cart-1', business_id: 1, valid: true, status: 0, products: [{ id: 1 }], total: 10 }
    const { getByTestId } = renderWithProviders(<CartContent carts={[cart]} isOrderStateCarts />)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
    expect(getByTestId('cart-item')).toHaveAttribute('data-checkout', 'false')
  })
  it.each(['/checkout', '/checkout/cart-1', '/multi-checkout', '/multi-checkout/group-1'])('does not request offers from the header cart on %s', (path) => {
    window.history.replaceState(null, '', path)
    const cart = { uuid: 'cart-1', business_id: 1, valid: true, status: 0, products: [{ id: 1 }], total: 10 }
    const { getByTestId } = renderWithProviders(<CartContent carts={[cart]} isOrderStateCarts isCartPopover isOpenCart />)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
    expect(getByTestId('cart-item')).toHaveAttribute('data-checkout', 'false')
  })
  it('owns progress for the visible global cart and disables lookup while closed', () => {
    const cart = { uuid: 'cart-1', business_id: 1, business: { id: 1, slug: 'demo' }, valid: true, status: 0, products: [{ id: 1 }], total: 10 }
    const { getByTestId, rerender } = renderWithProviders(<CartContent carts={[cart]} isOrderStateCarts isOpenCart />)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ business: cart.business, cart, enabled: true }))
    expect(getByTestId('cart-item')).toHaveAttribute('data-progress', 'progress')
    rerender(<CartContent carts={[cart]} isOrderStateCarts isOpenCart={false} />)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
  })
  it('one cart on screen opens with its products, also when the user has carts of other stores (a single store site shows only its store\'s)', () => {
    const cart = (uuid) => ({ uuid, business_id: 1, valid: true, status: 0, products: [{ id: 1 }], total: 10 })
    const one = renderWithProviders(<CartContent carts={[cart('a')]} isOrderStateCarts isCartPopover />)
    expect(one.getByTestId('cart-item')).toHaveAttribute('data-force-open', 'true')
    one.unmount()
    // several carts: each opens on its own (the accordion's rules)
    const several = renderWithProviders(<CartContent carts={[cart('a'), cart('b')]} isOrderStateCarts isCartPopover />)
    expect(several.getAllByTestId('cart-item').map((el) => el.dataset.forceOpen)).toEqual(['false', 'false'])
    several.unmount()
    const withInvalid = renderWithProviders(<CartContent carts={[cart('a'), { ...cart('b'), valid: false, valid_address: false }]} isOrderStateCarts isCartPopover />)
    expect(withInvalid.getAllByTestId('cart-item').map((el) => el.dataset.forceOpen)).toEqual(['false', 'false'])
    withInvalid.unmount()
    const twoValidOneInvalid = renderWithProviders(<CartContent carts={[cart('a'), cart('c'), { ...cart('b'), valid: false }]} isOrderStateCarts isCartPopover />)
    expect(twoValidOneInvalid.getAllByTestId('cart-item').map((el) => el.dataset.forceOpen)).toEqual(['false', 'false', 'false'])
    twoValidOneInvalid.unmount()
    const onlyInvalid = renderWithProviders(<CartContent carts={[{ ...cart('b'), valid: false }]} isOrderStateCarts isCartPopover />)
    expect(onlyInvalid.getByTestId('cart-item')).toHaveAttribute('data-force-open', 'true')
    onlyInvalid.unmount()
    const withEmpty = renderWithProviders(<CartContent carts={[cart('a'), { ...cart('b'), products: [] }]} isOrderStateCarts isCartPopover />)
    expect(withEmpty.getByTestId('cart-item')).toHaveAttribute('data-force-open', 'true')
  })

  it('shows an invalid cart with products instead of the empty state', () => {
    const invalid = { ...salad, valid: false }
    const { getByTestId, queryByText } = renderWithProviders(<CartContent carts={[invalid]} isOrderStateCarts />)
    expect(getByTestId('cart-item')).toHaveTextContent('salad')
    expect(queryByText('You have no products added to the cart')).not.toBeInTheDocument()
  })

  it('shows an invalid cart outside the group checkout and its totals', () => {
    configs.value = multiBusinessConfigs
    const third = { ...inkognito, uuid: 'third', business_id: 103, total: 50, valid: false }
    const { getAllByTestId, getAllByText, queryByText, container } = renderWithProviders(<CartContent carts={[salad, inkognito, third]} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map(item => item.textContent)).toEqual(['salad', 'inkognito', 'third'])
    expect(container.querySelectorAll("[data-doc-control='multi-cart-group-checkout']")).toHaveLength(1)
    expect(getAllByText('$174')).toHaveLength(2)
    expect(queryByText('$224')).toBeNull()
  })

  it('without a Cart #N group shows the valid and invalid carts by themselves', () => {
    configs.value = multiBusinessConfigs
    const invalid = { ...inkognito, valid: false }
    const { getAllByTestId, queryByText, container } = renderWithProviders(<CartContent carts={[salad, invalid]} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map(item => item.textContent)).toEqual(['salad', 'inkognito'])
    expect(container.querySelector("[data-doc-control='multi-cart-group-checkout']")).toBeNull()
    expect(queryByText('Total for all Carts')).toBeNull()
  })

  it('offers no checkout when every cart is invalid', () => {
    configs.value = multiBusinessConfigs
    const { getAllByTestId, queryByText, container } = renderWithProviders(<CartContent carts={[{ ...salad, valid: false }, { ...inkognito, valid: false }]} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map(item => item.textContent)).toEqual(['salad', 'inkognito'])
    expect(container.querySelector("[data-doc-control='multi-cart-group-checkout']")).toBeNull()
    expect(queryByText('Total for all Carts')).toBeNull()
    expect(preview.calls.at(-1)).toEqual({ enabled: false })
  })

  it('keeps the empty state for carts without products', () => {
    const { getByText, queryByTestId } = renderWithProviders(<CartContent carts={[{ ...salad, products: [] }]} isOrderStateCarts />)
    expect(getByText('You have no products added to the cart')).toBeInTheDocument()
    expect(queryByTestId('cart-item')).toBeNull()
  })

  it('shows empty state when no carts', () => {
    const { getByText } = renderWithProviders(<CartContent carts={[]} isOrderStateCarts />)
    expect(getByText('You have no products added to the cart')).toBeInTheDocument()
  })

  it('renders cart items when carts are provided', () => {
    const carts = [{
      uuid: 'cart-1',
      valid: true,
      status: 1,
      products: [{ id: 1, name: 'Burger', code: 'BRG-1' }],
      total: 9.5,
      business_id: 1
    }]
    const { getByTestId } = renderWithProviders(
      <CartContent carts={carts} isOrderStateCarts />
    )
    expect(getByTestId('cart-item')).toBeInTheDocument()
  })

  it('with multi-business checkout makes one Cart #N per API group with its valid carts, and shows the invalid ones after the groups', () => {
    configs.value = { checkout_multi_business_enabled: { value: '1' } }
    const cart = (uuid, group, valid = true) => ({ uuid, group: { uuid: group }, business_id: 1, valid, status: 0, products: [{ id: 1 }], total: 10 })
    const carts = [cart('a1', 'g1'), cart('b1', 'g2'), cart('a2', 'g1'), cart('c1', 'g1', false), cart('d1', 'g3', false)]
    const { getAllByTestId, getByText, queryByText, container } = renderWithProviders(<CartContent carts={carts} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map((el) => el.textContent)).toEqual(['a1', 'a2', 'b1', 'c1', 'd1'])
    expect(getByText('Cart #1')).toBeInTheDocument()
    expect(getByText('Cart #2')).toBeInTheDocument()
    // g3 has no valid cart: no group for it.
    expect(queryByText('Cart #3')).toBeNull()
    const groupCheckouts = container.querySelectorAll("[data-doc-control='multi-cart-group-checkout']")
    expect(groupCheckouts).toHaveLength(2)
    // Each group checkout shows the total of its valid carts (g1: a1 + a2).
    expect(groupCheckouts[0].textContent).toContain('20')
    expect(groupCheckouts[1].textContent).toContain('10')
    expect(container.textContent).toMatch(/Total for all Carts/i)
  })

  it('with multi-business checkout and one valid cart shows no Cart #N group', () => {
    configs.value = { checkout_multi_business_enabled: { value: '1' } }
    const carts = [
      { uuid: 'a1', group: { uuid: 'g1' }, business_id: 1, valid: true, status: 0, products: [{ id: 1 }], total: 10 },
      { uuid: 'b1', group: { uuid: 'g2' }, business_id: 1, valid: false, status: 0, products: [{ id: 1 }], total: 10 }
    ]
    const { getAllByTestId, queryByText, container } = renderWithProviders(<CartContent carts={carts} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map((el) => el.textContent)).toEqual(['a1', 'b1'])
    expect(queryByText('Cart #1')).toBeNull()
    expect(container.querySelector("[data-doc-control='multi-cart-group-checkout']")).toBeNull()
  })

  it('with multi-business checkout and one valid cart per group shows no Cart #N group', () => {
    configs.value = { checkout_multi_business_enabled: { value: '1' } }
    const cart = (uuid, group, valid = true) => ({ uuid, group: { uuid: group }, business_id: 1, valid, status: 0, products: [{ id: 1 }], total: 10 })
    const carts = [cart('a1', 'g1'), cart('b1', 'g2'), cart('b2', 'g2', false)]
    const { getAllByTestId, queryByText, container } = renderWithProviders(<CartContent carts={carts} isOrderStateCarts />)
    expect(getAllByTestId('cart-item').map((el) => el.textContent)).toEqual(['a1', 'b1', 'b2'])
    expect(queryByText('Cart #1')).toBeNull()
    // nor the "Total for all Carts" footer of the groups
    expect(container.textContent).not.toMatch(/Total for all Carts/i)
    expect(container.querySelector("[data-doc-control='multi-cart-group-checkout']")).toBeNull()
  })
})
