import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { MultiCart, hasMultiCartCarts } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))

vi.mock('~components/components/MultiCartCreate', () => ({
  MultiCartCreate: ({ UIComponent, ...rest }) => <UIComponent {...rest} />
}))

const order = vi.hoisted(() => ({ state: { loading: false, carts: {} } }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [order.state, {}]
}))

const VALID = { uuid: 'a', valid: true, status: 1, business_id: 7 }

describe('MultiCart', () => {
  beforeEach(() => {
    order.state = { loading: false, carts: { 'businessId:7': VALID } }
  })

  it('while its carts are grouped: the skeleton, busy, with a status for assistive technology', () => {
    const { getAllByTestId, getByRole, container } = renderWithProviders(<MultiCart />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(getByRole('status')).toHaveTextContent('Loading')
    // visible only to a screen reader: the named sr-only rule
    expect(getByRole('status')).toHaveStyle({ position: 'absolute', width: '1px', height: '1px', margin: '-1px', overflow: 'hidden' })
    expect(container.querySelector('[data-doc-section="multi-cart-preparation"]')).toHaveAttribute('aria-busy', 'true')
  })

  it('while the order loads, the skeleton stays', () => {
    order.state = { loading: true, carts: {} }
    const { getAllByTestId } = renderWithProviders(<MultiCart />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('without a cart to group: the empty state of the multi checkout, its h1, to the businesses', () => {
    order.state = { loading: false, carts: { 'businessId:7': { ...VALID, valid: false } } }
    const onRedirectPage = vi.fn()
    const { getByRole, queryAllByTestId } = renderWithProviders(<MultiCart onRedirectPage={onRedirectPage} />)
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    expect(getByRole('heading', { level: 1, name: "You don't have any carts yet" })).toBeInTheDocument()
    fireEvent.click(getByRole('button', { name: 'Go to Businesses' }))
    expect(onRedirectPage).toHaveBeenCalledWith({ page: 'search' })
  })

  it('a cart counts as the controller sends it: valid, not pending, of a business', () => {
    expect(hasMultiCartCarts({ a: VALID })).toBe(true)
    expect(hasMultiCartCarts({ a: { ...VALID, status: 2 } })).toBe(false)
    expect(hasMultiCartCarts({ a: { ...VALID, business_id: null } })).toBe(false)
    expect(hasMultiCartCarts(null)).toBe(false)
  })
})
