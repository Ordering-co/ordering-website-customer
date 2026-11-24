import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CART_LINE_HIGHLIGHT_MS, useCartBarPulse, useCartLineHighlight } from '../useStoreCartFeedback'

const Probe = ({ cart, enabled = true }) => (
  <p data-highlight={useCartLineHighlight(cart) ?? ''} data-pulse={useCartBarPulse(enabled)} />
)
const probe = (container) => container.querySelector('p').dataset

const bus = vi.hoisted(() => ({}))
vi.mock('~components/contexts/EventContext', async () => {
  const { Emitter } = await import('~components/components/Emitter')
  bus.events = new Emitter()
  return { useEvent: () => [bus.events] }
})

describe('useCartLineHighlight', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('an add highlights the new line and takes it off after the hold time', () => {
    const before = { products: [{ id: 1, code: 'a' }] }
    const { container } = render(<Probe cart={before} />)
    expect(probe(container).highlight).toBe('')
    act(() => bus.events.emit('cart_product_added', { id: 2 }, { products: [...before.products, { id: 2, code: 'b' }] }))
    expect(probe(container).highlight).toBe('b')
    act(() => { vi.advanceTimersByTime(CART_LINE_HIGHLIGHT_MS - 1) })
    expect(probe(container).highlight).toBe('b')
    act(() => { vi.advanceTimersByTime(1) })
    expect(probe(container).highlight).toBe('')
  })

  it('an update highlights its line, and a second one restarts the hold', () => {
    const cart = { products: [{ id: 1, code: 'a' }, { id: 2, code: 'b' }] }
    const { container } = render(<Probe cart={cart} />)
    act(() => bus.events.emit('cart_product_updated', { id: 1, code: 'a', quantity: 2 }, cart))
    expect(probe(container).highlight).toBe('a')
    act(() => { vi.advanceTimersByTime(CART_LINE_HIGHLIGHT_MS - 100) })
    act(() => bus.events.emit('cart_product_updated', { id: 2, code: 'b', quantity: 2 }, cart))
    act(() => { vi.advanceTimersByTime(CART_LINE_HIGHLIGHT_MS - 100) })
    expect(probe(container).highlight).toBe('b')
    act(() => { vi.advanceTimersByTime(100) })
    expect(probe(container).highlight).toBe('')
  })

  it('stops listening and clears its timer on unmount', () => {
    const { unmount } = render(<Probe cart={{ products: [] }} />)
    unmount()
    expect(() => act(() => { bus.events.emit('cart_product_added', { id: 1 }, { products: [{ id: 1, code: 'a' }] }) })).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('useCartBarPulse', () => {
  it('grows with every add or update while enabled, and rests at 0 when it is not', () => {
    const { container, rerender } = render(<Probe cart={null} />)
    expect(probe(container).pulse).toBe('0')
    act(() => bus.events.emit('cart_product_added', { id: 1 }, {}))
    act(() => bus.events.emit('cart_product_updated', { id: 1 }, {}))
    expect(probe(container).pulse).toBe('2')
    rerender(<Probe cart={null} enabled={false} />)
    act(() => bus.events.emit('cart_product_added', { id: 1 }, {}))
    expect(probe(container).pulse).toBe('0')
  })
})
