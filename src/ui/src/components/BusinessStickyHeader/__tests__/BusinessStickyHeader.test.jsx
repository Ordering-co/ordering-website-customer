import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BusinessStickyHeader } from '../index'
import { HEADER_LOGO_ATTRIBUTE, HEADER_STORE_SLOT_ATTRIBUTE } from '../../Header/behindHeader'

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  session: { auth: true },
  carts: {},
  width: 1024,
  orderReads: 0
}))

// The motion header.base will have: the engine's own transition for it
const motion = vi.hoisted(() => ({ on: false }))
vi.mock('~/utils/themeMotion', async (original) => {
  const real = await original()
  const { transition } = await import('@orderingco/ordering-theme-engine/css')
  return {
    ...real,
    motionCss: (theme, component, properties) =>
      motion.on && component === 'header' ? transition({ ms: 200, easing: 'ease' }, properties) : real.motionCss(theme, component, properties)
  }
})

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: mocks.width, height: 800 })
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.session]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => { mocks.orderReads += 1; return [{ carts: mocks.carts }] }
}))
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit: mocks.emit, on: vi.fn(), off: vi.fn() }]
}))

// The bar's own look is the revealing header's: with a fixed header (the default) the
// row has the store instead (the last describe), and the bar stays in the page without a box
const withScroll = (scroll, theme = themeWithValues()) => {
  const header = theme.values.components.header
  return { ...theme, values: { ...theme.values, components: { ...theme.values.components, header: { ...header, base: { ...header.base, scroll_behavior: scroll } } } } }
}
const renderBar = (ui, { theme } = {}) => renderWithProviders(ui, { theme: withScroll('reveal', theme) })

// The bar is hidden (display: none) until it is fixed, so the queries include hidden elements
describe('BusinessStickyHeader', () => {
  it('repeats the business name, hidden from assistive tech', () => {
    const { container } = renderBar(<BusinessStickyHeader name='Demo Store' />)
    const bar = container.querySelector('#business_name_bar')
    expect(bar).toHaveTextContent('Demo Store')
    expect(bar.querySelector('p')).toHaveAttribute('aria-hidden', 'true')
  })

  it('its cart opens the header cart and counts the units of every cart, valid or not', () => {
    mocks.carts = {
      a: { uuid: 'a', valid: true, products: [{ id: 1, quantity: 1 }] },
      b: { uuid: 'b', valid: true, products: [{ id: 2, quantity: 1 }] },
      c: { uuid: 'c', valid: false, products: [{ id: 3, quantity: 2 }] }
    }
    const { getByRole } = renderBar(<BusinessStickyHeader name='Demo Store' />)
    const cart = getByRole('button', { hidden: true })
    expect(cart).toHaveTextContent('4')
    fireEvent.click(cart)
    expect(mocks.emit).toHaveBeenCalledWith('header_cart_open')
  })

  it('one cart that is not valid (Delivery without an address): the count is its units', () => {
    mocks.carts = { a: { uuid: 'a', valid: false, products: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }] } }
    const { getByRole } = renderBar(<BusinessStickyHeader name='Demo Store' />)
    expect(getByRole('button', { hidden: true })).toHaveTextContent('3')
  })

  it('narrow screens: the cart too, the same count as on wide ones', () => {
    mocks.width = 390
    mocks.carts = { a: { uuid: 'a', valid: true, products: [{ id: 1 }, { id: 2 }, { id: 3 }] } }
    const { getByRole } = renderBar(<BusinessStickyHeader name='Demo Store' />)
    const cart = getByRole('button', { hidden: true })
    expect(cart).toHaveTextContent('3')
    fireEvent.click(cart)
    expect(mocks.emit).toHaveBeenCalledWith('header_cart_open')
    mocks.width = 1024
  })

  it('a single store site counts only the store\'s carts, as the header (not the user\'s carts of other stores)', () => {
    const theme = themeWithValues((values) => {
      values.site = { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' }
      return values
    })
    mocks.carts = {
      a: { uuid: 'a', valid: true, business: { slug: 'mcbonalds' }, products: [{ id: 1 }, { id: 2 }] },
      b: { uuid: 'b', valid: true, business: { slug: 'salami' }, products: [{ id: 3 }] },
      c: { uuid: 'c', valid: true, business: { slug: 'laundry' }, products: [{ id: 4 }] }
    }
    const wide = renderBar(<BusinessStickyHeader name='McBonalds' />, { theme })
    expect(wide.getByRole('button', { hidden: true })).toHaveTextContent('2')
    wide.unmount()
    mocks.width = 390
    const narrow = renderBar(<BusinessStickyHeader name='McBonalds' />, { theme })
    expect(narrow.getByRole('button', { hidden: true })).toHaveTextContent('2')
    narrow.unmount()
    // the store without a cart: no count
    mocks.carts = { b: mocks.carts.b }
    const none = renderBar(<BusinessStickyHeader name='McBonalds' />, { theme })
    expect(none.getByRole('button', { hidden: true }).textContent).toBe('')
    mocks.width = 1024
  })

  it('the cart and the back arrow are the base Button with the header\'s icons, not the legacy ones', () => {
    mocks.carts = { a: { uuid: 'a', valid: true, products: [{ id: 1 }] } }
    const { container } = renderBar(<BusinessStickyHeader name='Demo Store' onBack={vi.fn()} />)
    const [back, cart] = container.querySelectorAll('#business_name_bar [data-slot="button"]')
    expect(back).toHaveAttribute('href', '/search')
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(cart).toHaveAttribute('data-doc-control', 'cart-open')
    expect(cart).toHaveAttribute('aria-label', 'My cart (1)')
    expect(cart.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(cart).toHaveTextContent('1')
    // no icon of the legacy set (its mock renders a testid) nor a legacy styled button
    expect(container.querySelector('[data-testid^="icon-"]')).toBeNull()
  })

  // implementation notesthe cart is the header's for everyone, a visitor with no session included
  it('has the cart without a session', () => {
    mocks.session = { auth: false }
    const { getByRole } = renderBar(<BusinessStickyHeader name='Demo Store' />)
    expect(getByRole('button', { hidden: true })).toBeInTheDocument()
    expect(document.querySelector('[data-doc-control="cart-open"]')).not.toBeNull()
    mocks.session = { auth: true }
  })

  it('with the page\'s way back, it starts with the back arrow to the list; without it, none', () => {
    const onBack = vi.fn((e) => e.preventDefault())
    const { container, unmount } = renderBar(<BusinessStickyHeader name='Demo Store' onBack={onBack} />)
    const back = container.querySelector('#business_name_bar > a')
    expect(back).toHaveAttribute('href', '/search')
    expect(back).toHaveAttribute('aria-label', 'Back')
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalled()
    unmount()
    const none = renderBar(<BusinessStickyHeader name='Demo Store' />)
    expect(none.container.querySelector('#business_name_bar a')).toBeNull()
    expect(none.container.querySelector('#business_name_bar [aria-label="Back"]')).toBeNull()
  })

  describe('brand (implementation notes, Single Restaurant)', () => {
    it('a single store with a logo (brand kind "store") shows it small instead of the name', () => {
      const { container, queryByText } = renderBar(
        <BusinessStickyHeader
          name='Demo Store'
          brand={{ kind: 'store', storeLogo: 'https://cdn.test/store.png', logoSrc: 'https://cdn.test/store.png' }}
        />
      )
      const bar = container.querySelector('#business_name_bar')
      const img = bar.querySelector('img')
      expect(img).toHaveAttribute('src', 'https://cdn.test/store.png')
      expect(img).toHaveAttribute('aria-hidden', 'true')
      expect(bar.querySelector('p')).toBeNull()
      expect(queryByText('Demo Store')).not.toBeInTheDocument()
      // the bar itself still carries the name as its accessible label
      expect(bar).toHaveAttribute('aria-label', 'Demo Store')
    })

    it('the site\'s own logo (brand kind "site") shows small too, same as a store logo', () => {
      const { container } = renderBar(
        <BusinessStickyHeader name='Demo Store' brand={{ kind: 'site', logoSrc: 'https://cdn.test/logo.png' }} />
      )
      const img = container.querySelector('#business_name_bar img')
      expect(img).toHaveAttribute('src', 'https://cdn.test/logo.png')
    })

    it('without a logo (brand kind "name"), the name as text — exactly as today, no aria-label on the bar either', () => {
      const { container } = renderBar(
        <BusinessStickyHeader name='Demo Store' brand={{ kind: 'name', name: 'Nabe & Don' }} />
      )
      const bar = container.querySelector('#business_name_bar')
      expect(bar.querySelector('img')).toBeNull()
      expect(bar).toHaveTextContent('Demo Store')
      expect(bar).not.toHaveAttribute('aria-label')
    })

    it('Marketplace (no brand prop, as BusinessInfoComponent never passes one there) keeps the name as text, and the bar as before — no aria-label added', () => {
      const { container } = renderBar(<BusinessStickyHeader name='Demo Store' />)
      const bar = container.querySelector('#business_name_bar')
      expect(bar.querySelector('img')).toBeNull()
      expect(bar).toHaveTextContent('Demo Store')
      expect(bar).not.toHaveAttribute('aria-label')
    })
  })

  it('header.cart_count: the theme hides the count (the cart and its icon stay); the default shows it', () => {
    mocks.width = 1024
    mocks.carts = { a: { uuid: 'a', valid: true, products: [{ id: 1 }, { id: 2 }, { id: 3 }] } }
    const theme = themeWithValues((values) => {
      values.visibility['header.cart_count'] = false
      return values
    })
    const hidden = renderBar(<BusinessStickyHeader name='Demo Store' />, { theme })
    const cart = hidden.getByRole('button', { hidden: true })
    expect(cart).not.toHaveTextContent('3')
    expect(cart.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    hidden.unmount()
    const shown = renderBar(<BusinessStickyHeader name='Demo Store' />, { theme: themeWithValues() })
    expect(shown.getByRole('button', { hidden: true })).toHaveTextContent('3')
  })

  describe('under the header', () => {
    afterEach(() => {
      motion.on = false
      document.documentElement.style.removeProperty('--header-offset')
    })
    const fixedBar = () => {
      const { container } = renderBar(<BusinessStickyHeader name='Demo Store' />, { theme: themeWithValues() })
      const bar = container.querySelector('#business_name_bar')
      bar.classList.add('fixed-name')
      return bar
    }

    // implementation noteswith the header out of view the bar must not hang under the iOS status area
    it('hangs at what the header covers (never above the safe area), 0 when the page has no header', () => {
      const bar = fixedBar()
      expect(window.getComputedStyle(bar).top).toBe('max(var(--header-offset,0px),env(safe-area-inset-top,0px))')
      document.documentElement.style.setProperty('--header-offset', '70px')
      expect(window.getComputedStyle(bar).position).toBe('fixed')
    })

    it('moves with a revealing header by the header\'s motion, and not otherwise', () => {
      motion.on = true
      fixedBar()
      // every place the bar's `top` is given a transition is under a revealing header, inside the reduced-motion query
      const moving = injectedCss().match(/[^{}]*\{[^{}]*top 200ms[^{}]*\}/g)
      expect(moving?.length).toBeGreaterThan(0)
      moving.forEach((rule) => expect(rule).toContain("[data-scroll-behavior='reveal']"))
      expect(injectedCss()).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{html:has\([^)]*reveal[^{]*\{[^}]*top 200ms/)
    })
  })
})

// implementation noteswith a fixed header (the default) the bar paints nothing of its own and the header's row
// has the store: the back arrow and the name in the header's store slot, once the name is behind the header
describe('BusinessStickyHeader — with a fixed header', () => {
  const observers = []
  class FakeObserver {
    constructor (callback, options) { this.callback = callback; this.options = options; this.live = true; observers.push(this) }
    observe (node) { this.target = node }
    disconnect () { this.live = false }
  }
  const behind = (value = true) => act(() => observers.filter((observer) => observer.live).at(-1).callback([{
    isIntersecting: !value,
    boundingClientRect: { top: value ? -40 : 300 },
    rootBounds: { top: 64 }
  }]))

  // the page: a header with its store slot, the store's name, the bar
  const page = (props = {}, theme = withScroll('fixed')) => {
    const header = document.createElement('div')
    header.setAttribute('data-app-header', '')
    Object.defineProperty(header, 'offsetHeight', { value: 64 })
    const slot = document.createElement('div')
    slot.setAttribute(HEADER_STORE_SLOT_ATTRIBUTE, '')
    const toggle = document.createElement('button')
    toggle.setAttribute('aria-controls', 'sidebar_menu')
    const logo = document.createElement('button')
    logo.setAttribute(HEADER_LOGO_ATTRIBUTE, '')
    header.append(toggle, slot, logo)
    document.body.appendChild(header)
    const view = renderWithProviders(
      <>
        <h1 id='business_name'>Demo Store</h1>
        <BusinessStickyHeader name='Demo Store' {...props} />
      </>,
      { theme }
    )
    return { ...view, slot, toggle, logo, header, bar: view.container.querySelector('#business_name_bar') }
  }

  afterEach(() => {
    observers.length = 0
    document.querySelectorAll('[data-app-header]').forEach((node) => node.remove())
    vi.unstubAllGlobals()
    mocks.carts = {}
  })
  const stub = () => vi.stubGlobal('IntersectionObserver', FakeObserver)

  it('the bar stays in the page without a box or content, even when the page marks it fixed', () => {
    stub()
    const { bar } = page()
    expect(bar).not.toBeNull()
    expect(bar).toBeEmptyDOMElement()
    bar.classList.add('fixed-name')
    expect(window.getComputedStyle(bar).display).toBe('none')
  })

  it('while the name is in view, the row has nothing of the store', () => {
    stub()
    const { slot } = page({ onBack: vi.fn() })
    expect(slot).toBeEmptyDOMElement()
    // the observer's top margin is the header's own height
    expect(observers.at(-1).options.rootMargin).toBe('-64px 0px 0px 0px')
    expect(observers.at(-1).target).toBe(document.getElementById('business_name'))
  })

  it('once the name is behind the header, the row has the back arrow and the name, and no cart of its own', () => {
    stub()
    mocks.carts = { a: { uuid: 'a', valid: true, products: [{ id: 1 }] } }
    const onBack = vi.fn((event) => event.preventDefault())
    const { slot, bar } = page({ onBack })
    behind(true)
    const back = slot.querySelector('a')
    expect(back).toHaveAttribute('href', '/search')
    expect(back).toHaveAttribute('aria-label', 'Back')
    expect(back).toHaveAttribute('data-slot', 'button')
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalled()
    expect(slot.querySelector('p')).toHaveTextContent('Demo Store')
    expect(slot.querySelector('button')).toBeNull()
    // the bar is still where the others look for it
    expect(document.getElementById('business_name_bar')).toBe(bar)
    // and the name coming back into view empties the row's slot
    behind(false)
    expect(slot).toBeEmptyDOMElement()
  })

  it('without the page\'s way back, no arrow; a single store\'s logo in place of the name', () => {
    stub()
    const plain = page()
    behind(true)
    expect(plain.slot.querySelector('a')).toBeNull()
    expect(plain.slot.querySelector('p')).toHaveTextContent('Demo Store')
    plain.unmount()
    document.querySelectorAll('[data-app-header]').forEach((node) => node.remove())
    const branded = page({ brand: { kind: 'store', logoSrc: 'https://cdn.test/store.png' } })
    behind(true)
    expect(branded.slot.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/store.png')
    expect(branded.slot.querySelector('p')).toBeNull()
  })

  it('a name below the viewport is not behind the header', () => {
    stub()
    const { slot } = page({ onBack: vi.fn() })
    act(() => observers.at(-1).callback([{ isIntersecting: false, boundingClientRect: { top: 900 }, rootBounds: { top: 64 } }]))
    expect(slot).toBeEmptyDOMElement()
  })

  it('leaving the page empties the slot, so the header\'s logo is back', () => {
    stub()
    const { slot, unmount } = page({ onBack: vi.fn() })
    behind(true)
    expect(slot).not.toBeEmptyDOMElement()
    unmount()
    expect(slot).toBeEmptyDOMElement()
  })

  it('the focus on the back arrow when the name comes back into view goes to the header\'s logo, not to the body', () => {
    stub()
    const { slot, logo } = page({ onBack: vi.fn() })
    behind(true)
    act(() => { slot.querySelector('a').focus() })
    expect(document.activeElement).toBe(slot.querySelector('a'))
    behind(false)
    expect(slot).toBeEmptyDOMElement()
    expect(document.activeElement).toBe(logo)
  })

  it('without a logo it goes to the menu button; with the focus elsewhere it is left alone', () => {
    stub()
    const { slot, logo, toggle, header } = page({ onBack: vi.fn() })
    logo.remove()
    behind(true)
    act(() => { slot.querySelector('a').focus() })
    behind(false)
    expect(document.activeElement).toBe(toggle)
    behind(true)
    act(() => { header.appendChild(document.createElement('input')).focus() })
    const other = document.activeElement
    behind(false)
    expect(document.activeElement).toBe(other)
  })

  it('looks for the header\'s slot each time the name goes behind it, not once (a header that mounted again)', () => {
    stub()
    const { slot, header } = page({ onBack: vi.fn() })
    behind(true)
    expect(slot.querySelector('a')).not.toBeNull()
    behind(false)
    const next = document.createElement('div')
    next.setAttribute(HEADER_STORE_SLOT_ATTRIBUTE, '')
    slot.replaceWith(next)
    behind(true)
    expect(next.querySelector('a')).not.toBeNull()
    expect(header.contains(next)).toBe(true)
  })

  it('does not read the carts nor the session: the row has the cart of its own', () => {
    stub()
    mocks.orderReads = 0
    page({ onBack: vi.fn() })
    expect(mocks.orderReads).toBe(0)
  })

  it('right to left: the back arrow is mirrored', () => {
    stub()
    const ltr = page({ onBack: vi.fn() })
    behind(true)
    expect(window.getComputedStyle(ltr.slot.querySelector('a svg').parentElement).transform).not.toBe('scaleX(-1)')
    ltr.unmount()
    document.querySelectorAll('[data-app-header]').forEach((node) => node.remove())
    const theme = withScroll('fixed')
    const rtl = page({ onBack: vi.fn() }, { ...theme, rtl: true })
    behind(true)
    expect(window.getComputedStyle(rtl.slot.querySelector('a svg').parentElement).transform).toBe('scaleX(-1)')
  })

  it('a revealing header keeps the bar as it was, and watches nothing', () => {
    stub()
    const { bar, slot } = page({ onBack: vi.fn() }, withScroll('reveal'))
    expect(bar).toHaveTextContent('Demo Store')
    expect(bar.querySelector('a')).toHaveAttribute('href', '/search')
    expect(slot).toBeEmptyDOMElement()
    expect(observers).toHaveLength(0)
  })
})
