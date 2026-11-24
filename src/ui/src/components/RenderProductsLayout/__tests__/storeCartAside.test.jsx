import React from 'react'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CART_LINE_HIGHLIGHT_MS } from '~ui/hooks/useStoreCartFeedback'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { StoreCartAside } from '../StoreCartAside'

const bus = vi.hoisted(() => ({}))
vi.mock('~components/contexts/EventContext', async () => {
  const { Emitter } = await import('~components/components/Emitter')
  bus.events = new Emitter()
  return { useEvent: () => [bus.events] }
})

const cartProps = vi.hoisted(() => ({ current: null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: (props) => { cartProps.current = props; return null } }))

describe('StoreCartAside', () => {
  it('leaves one Checkout: the cart hides its own button and its Add more products', () => {
    renderWithProviders(<StoreCartAside currentCart={{ products: [{ id: 1 }], status: 0 }} business={{ id: 1 }} />)
    expect(cartProps.current).toMatchObject({ showUpsellingInBusinessInfo: true, forceHideCheckoutButton: true, forceHideAddMoreProducts: true })
  })

  // implementation notesthe cart does not open on an add; the line the add touched is highlighted for a few seconds
  describe('the line a product add touched', () => {
    const cart = { products: [{ id: 1, code: 'a' }], status: 0 }

    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('is handed to the cart on an add, and taken off after the hold time', () => {
      renderWithProviders(<StoreCartAside currentCart={cart} business={{ id: 1 }} />)
      expect(cartProps.current.highlightProductCode).toBeNull()
      act(() => bus.events.emit('cart_product_added', { id: 2 }, { products: [...cart.products, { id: 2, code: 'b' }] }))
      expect(cartProps.current.highlightProductCode).toBe('b')
      act(() => { vi.advanceTimersByTime(CART_LINE_HIGHLIGHT_MS) })
      expect(cartProps.current.highlightProductCode).toBeNull()
    })

    it('an update of a line already there highlights that line', () => {
      renderWithProviders(<StoreCartAside currentCart={cart} business={{ id: 1 }} />)
      act(() => bus.events.emit('cart_product_updated', { id: 1, code: 'a', quantity: 2 }, cart))
      expect(cartProps.current.highlightProductCode).toBe('a')
    })
  })
})
