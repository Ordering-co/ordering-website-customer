import { describe, expect, it } from 'vitest'
import { cartItemsCount } from '../cartItemsCount'

describe('cartItemsCount (the header cart badge)', () => {
  it('is 0 without carts or without products', () => {
    expect(cartItemsCount(undefined)).toBe(0)
    expect(cartItemsCount(null)).toBe(0)
    expect(cartItemsCount([])).toBe(0)
    expect(cartItemsCount([{ uuid: 'a', valid: true, products: [] }, { uuid: 'b' }, null])).toBe(0)
  })

  it('counts units, not lines: 2 + 1 is 3', () => {
    expect(cartItemsCount([{ valid: true, products: [{ quantity: 2 }, { quantity: 1 }] }])).toBe(3)
  })

  it('counts a cart that is not valid (Delivery without an address) like a valid one', () => {
    expect(cartItemsCount([{ valid: false, products: [{ quantity: 2 }, { quantity: 1 }] }])).toBe(3)
    expect(cartItemsCount([{ valid: true, products: [{ quantity: 1 }] }, { valid: false, products: [{ quantity: 4 }] }])).toBe(5)
  })

  it('adds the carts of several stores', () => {
    expect(cartItemsCount([
      { uuid: 'a', valid: true, products: [{ quantity: 2 }] },
      { uuid: 'b', valid: true, products: [{ quantity: 1 }, { quantity: 3 }] }
    ])).toBe(6)
  })

  it('a product without a usable quantity is one unit', () => {
    expect(cartItemsCount([{ products: [{}, { quantity: 0 }, { quantity: '2' }] }])).toBe(4)
  })

  it('a reservation cart without products is one; with products it is only its products', () => {
    expect(cartItemsCount([{ reservation: { id: 1 }, products: [] }])).toBe(1)
    expect(cartItemsCount([{ reservation: { id: 1 } }])).toBe(1)
    expect(cartItemsCount([{ reservation: { id: 1 }, products: [{ quantity: 2 }] }])).toBe(2)
  })
})
