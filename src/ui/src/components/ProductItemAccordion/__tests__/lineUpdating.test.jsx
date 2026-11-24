import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { INDICATOR_DELAY_MS } from '~ui/hooks/useDelayedFlag'
import { themeOpacity } from '~/utils/themeTokens'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

// implementation notesa line of the cart (or of the checkout's summary) whose product is updating (`isUpdating`)
vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={vi.fn()}
      onDeleteProduct={vi.fn()}
      onEditProduct={vi.fn()}
      {...rest}
    />
  )
}))

const line = { ...productFixture, code: 'L-1', quantity: 2, price: 9.5, total: 19, valid: true, valid_quantity: true, valid_menu: true }
const theme = themeWithValues((values) => { values.components.spinner.sizes.sm.diameter = 19; return values })
const row = (container) => container.querySelector('[data-doc-section="cart-product-row"]')
const ring = (container) => container.querySelector('[data-doc-control="cart-line-spinner"]')
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })

describe('ProductItemAccordion: a line whose product is updating', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('the cart\'s line: busy at once; after the delay softened, with a sm ring after the price (the stepper and Edit stay in place)', () => {
    const { container, rerender } = renderWithProviders(<ProductItemAccordion product={line} isCartProduct />, { theme })
    expect(row(container)).not.toHaveAttribute('aria-busy')
    expect(ring(container)).toBeNull()

    rerender(<ProductItemAccordion product={line} isCartProduct isUpdating />)
    expect(row(container)).toHaveAttribute('aria-busy', 'true')
    expect(ring(container)).toBeNull()
    advance(INDICATOR_DELAY_MS)

    expect(row(container)).toHaveAttribute('data-doc-state-updating', 'true')
    const spinner = ring(container)
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
    expect(cssFor(spinner).replace(/\s+/g, '')).toMatch(/width:19px;height:19px;/)
    const price = spinner.closest('.prod-price')
    // the price first, the ring after it (the price keeps its place)
    expect(price.firstElementChild.tagName).toBe('SPAN')
    expect(price.firstElementChild).toHaveTextContent('$19')
    expect(price.lastElementChild).toBe(spinner.parentElement)
    const css = cssFor(row(container)).replace(/\s+/g, '')
    expect(css).toContain(`opacity:${themeOpacity(theme, 'disabled')};`)
    expect(css).toContain('>.accordion>.info,')
    // the controls stay (they are disabled by the order's own loading, as before)
    expect(container.querySelector('[data-doc-control="cart-product-increment"]')).not.toBeNull()
    expect(container.querySelector('[data-doc-control="cart-product-edit"]')).not.toBeNull()

    rerender(<ProductItemAccordion product={line} isCartProduct isUpdating={false} />)
    expect(row(container)).not.toHaveAttribute('aria-busy')
    expect(row(container)).not.toHaveAttribute('data-doc-state-updating')
    expect(ring(container)).toBeNull()
    expect(cssFor(row(container))).not.toMatch(/opacity/)
  })

  it('an update that ends before the delay never shows a ring nor softens', () => {
    const { container, rerender } = renderWithProviders(<ProductItemAccordion product={line} isCartProduct isUpdating />, { theme })
    advance(INDICATOR_DELAY_MS - 1)
    rerender(<ProductItemAccordion product={line} isCartProduct isUpdating={false} />)
    advance(INDICATOR_DELAY_MS * 3)
    expect(ring(container)).toBeNull()
    expect(row(container)).not.toHaveAttribute('data-doc-state-updating')
    expect(cssFor(row(container))).not.toMatch(/opacity/)
  })

  it('the checkout\'s summary: the ring goes before the price (which ends the row) and the grid\'s columns soften one by one', () => {
    const { container } = renderWithProviders(
      <ProductItemAccordion product={line} isCartProduct isCheckout hideQuantitySelector={false} isUpdating />,
      { theme }
    )
    advance(INDICATOR_DELAY_MS)
    const spinner = ring(container)
    const price = spinner.closest('.prod-price')
    expect(price.closest('.price-section')).not.toBeNull()
    expect(price.firstElementChild).toBe(spinner.parentElement)
    expect(price.lastElementChild).toHaveTextContent('$19')
    const css = cssFor(row(container)).replace(/\s+/g, '')
    // the summary's `.info` has `display: contents` (an opacity on it does nothing): its children soften
    expect(css).toContain('>.accordion>.info>*,')
    expect(css).toContain(`opacity:${themeOpacity(theme, 'disabled')};`)
  })
})
