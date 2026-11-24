import React from 'react'
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'

// implementation notesthe dialog's body pads what it scrolls (the form takes that padding back with a negative
// margin), and a sticky bar at `top: 0` / `bottom: 0` stops at the padding: the form shows over it and
// under it. The bars stick at the body's edge: minus the modal's own padding, whatever the theme says.
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: class Navigation {}, Pagination: class Pagination {}, Thumbs: class Thumbs {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => null }))
vi.mock('~ui/src/components/ProductOption', () => ({ ProductOption: ({ option, children }) => <div id={`id_${option.id}`}>{children}</div> }))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({ ProductOptionSubOption: () => null }))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }] }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ loading: false, options: { type: 1 } }] }))
vi.mock('~components/utils/orderTypeAddress', () => ({ parseUnaddressedOrderTypes: () => [], shouldRequireOrderAddress: () => false }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

const product = {
  ...productFixture,
  images: 'https://example.com/photo.jpg',
  ingredients: [],
  extras: [{ id: 1, rank: 1, options: [{ id: 1, rank: 1, name: 'Base', suboptions: [] }] }]
}
vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      errors={{}}
      maxProductQuantity={5}
      showOption={() => true}
      {...rest}
      productCart={{ quantity: 1, options: {}, ingredients: {} }}
    />
  )
}))
const { ProductForm } = await import('../index')

const themed = (layout, padding, paddingTop) => withModalBase(themeWithValues((values) => {
  Object.assign(values.components.modal.base, { padding, padding_top: paddingTop })
  return values
}), { layout })

// (jsdom writes calc(-1 * 24px) as calc(-24px))
const stuck = (selector) => {
  const style = window.getComputedStyle(document.querySelector(selector))
  return { top: style.top, bottom: style.bottom }
}

describe('ProductForm: the sticky bars stick at the body\'s edge, not at its padding', () => {
  it.each(['card', 'steps'])('%s reserves the measured footer height in the dialog scroller', (layout) => {
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.dataset.docSection === 'product-actions') return { height: 110, top: 370, bottom: 480 }
      return { height: 480, top: 0, bottom: 480 }
    })
    try {
      const { getByRole, getByTestId } = renderWithProviders(
        <div data-testid='scroller' style={{ overflowY: 'auto' }}><ProductForm product={product} /></div>,
        { theme: themed(layout, 24, 36) }
      )
      const scrollPadding = () => getComputedStyle(getByTestId('scroller')).scrollPaddingBlockEnd
      expect(scrollPadding()).toBe('110px')
      act(() => getByRole('button', { name: 'Add to cart' }).focus())
      expect(scrollPadding()).toBe('')
      act(() => getByRole('button', { name: 'Additional instructions' }).focus())
      expect(scrollPadding()).toBe('110px')
    } finally {
      measure.mockRestore()
    }
  })

  it('releases scroll padding when the sticky footer shrinks', () => {
    const observed = new Map()
    vi.stubGlobal('ResizeObserver', class {
      constructor (callback) { this.callback = callback }
      observe (element) { observed.set(element, this.callback) }
      disconnect () {}
    })
    let footerHeight = 120
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.dataset.docSection === 'product-actions') return { height: footerHeight, top: 480 - footerHeight, bottom: 480 }
      return { height: 480, top: 0, bottom: 480 }
    })
    try {
      const { container, getByTestId, unmount } = renderWithProviders(
        <div data-testid='scroller' style={{ overflowY: 'auto' }}><ProductForm product={product} /></div>,
        { theme: themed('card', 24, 36) }
      )
      const actions = container.querySelector('[data-doc-section=product-actions]')
      const padding = () => getComputedStyle(getByTestId('scroller')).scrollPaddingBlockEnd
      expect(padding()).toBe('120px')
      footerHeight = 82
      act(() => observed.get(actions)())
      expect(padding()).toBe('82px')
      unmount()
    } finally {
      measure.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it.each([[24, 36], [10, 12]])('sheet (padding %ipx, top %ipx): the chips and the action bar', (padding, top) => {
    renderWithProviders(<ProductForm product={product} />, { theme: themed('sheet', padding, top) })
    // the chips stick under the band the X and the handle keep clear while the body scrolls
    expect(stuck('[data-doc-section=product-navigation]').top).toBe(`calc(calc(-1 * ${top}px) + var(--sticky-top-inset))`)
    expect(stuck('[data-doc-section=product-actions]').bottom).toBe(`calc(-${padding}px)`)
    // nothing under the bar: at the end of the scroll it rests on the edge, as it does while it sticks
    expect(window.getComputedStyle(document.querySelector('.product-container')).paddingBottom).toBe('0px')
  })

  it.each([[24, 36], [10, 12]])('steps (padding %ipx, top %ipx): the compact bar and the action bar', (padding, top) => {
    renderWithProviders(<ProductForm product={product} />, { theme: themed('steps', padding, top) })
    expect(stuck('[data-doc-section=product-steps-bar]').top).toBe(`calc(-${top}px)`)
    expect(stuck('[data-doc-section=product-actions]').bottom).toBe(`calc(-${padding}px)`)
  })
})
