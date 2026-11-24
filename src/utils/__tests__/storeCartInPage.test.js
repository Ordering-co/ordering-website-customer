import { afterEach, describe, expect, it, vi } from 'vitest'
import { focusStoreCartAside, setStoreCartInPage, storeCartInPage, touchedCartLineCode } from '../storeCartInPage'

describe('storeCartInPage', () => {
  afterEach(() => {
    setStoreCartInPage(null)
    document.body.innerHTML = ''
  })

  it('is null until the store page publishes where it keeps the cart, and null again when it clears it', () => {
    expect(storeCartInPage()).toBeNull()
    setStoreCartInPage('aside')
    expect(storeCartInPage()).toBe('aside')
    setStoreCartInPage('bar')
    expect(storeCartInPage()).toBe('bar')
    setStoreCartInPage('header')
    expect(storeCartInPage()).toBe('header')
    setStoreCartInPage(undefined)
    expect(storeCartInPage()).toBeNull()
  })

  it('focusStoreCartAside scrolls to the panel and focuses it; false when the panel is not on the page', () => {
    expect(focusStoreCartAside()).toBe(false)
    document.body.innerHTML = '<aside data-doc-section="business-cart-aside" tabindex="-1"></aside>'
    const aside = document.querySelector('aside')
    aside.scrollIntoView = vi.fn()
    expect(focusStoreCartAside('smooth')).toBe(true)
    expect(aside.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
    expect(document.activeElement).toBe(aside)
  })
})

describe('touchedCartLineCode', () => {
  const cart = { products: [{ id: 1, code: 'a' }, { id: 2, code: 'b' }, { id: 1, code: 'c' }] }

  it('an update names its line', () => {
    expect(touchedCartLineCode({ id: 2, code: 'b' }, cart, ['a', 'b', 'c'])).toBe('b')
  })

  it('an add is the line whose code the cart did not have', () => {
    expect(touchedCartLineCode({ id: 1 }, cart, ['a', 'b'])).toBe('c')
  })

  it('an add the server merged into a line already there is the last line of that product', () => {
    expect(touchedCartLineCode({ id: 1 }, cart, ['a', 'b', 'c'])).toBe('c')
  })

  it('nothing found: null', () => {
    expect(touchedCartLineCode({ id: 9 }, cart, ['a', 'b', 'c'])).toBeNull()
    expect(touchedCartLineCode({ id: 9 }, null)).toBeNull()
  })
})
