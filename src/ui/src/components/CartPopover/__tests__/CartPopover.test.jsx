import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../design-system/components/Dialog'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CartPopover } from '../index'
import { scopedTheme } from '~/utils/themeGroups'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { setStoreCartInPage } from '~/utils/storeCartInPage'

const bus = vi.hoisted(() => ({}))
vi.mock('~components/contexts/EventContext', async () => {
  const { Emitter } = await import('~components/components/Emitter')
  bus.events = new Emitter()
  return { useEvent: () => [bus.events] }
})

vi.mock('react-popper', () => ({
  usePopper: () => ({
    styles: { popper: {}, arrow: {} },
    attributes: { popper: {}, arrow: {} }
  })
}))
vi.mock('~ui/src/components/CartContent', () => ({
  CartContent: () => <div data-testid='cart-content' />
}))

describe('CartPopover', () => {
  // implementation notesafter adding a product on a store page the drawer opens, unless the store page keeps the cart in
  // sight (the direct menu's panel or bar), which shows the add by itself
  describe('a product added in a store', () => {
    const added = (onClick, pathname = '/store/demo') => {
      renderWithProviders(<CartPopover auth location={{ pathname }} onClick={onClick} onClose={vi.fn()} />)
      bus.events.emit('cart_product_added', { id: 1 }, { uuid: 'a', products: [] })
    }

    afterEach(() => setStoreCartInPage(null))

    it('opens the drawer when the page keeps no cart in sight (designs A and C)', () => {
      const onClick = vi.fn()
      added(onClick)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it.each(['aside', 'bar', 'header'])('does not open it when the page keeps the cart in sight (%s)', (mode) => {
      setStoreCartInPage(mode)
      const onClick = vi.fn()
      added(onClick)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('off the store pages it never opened it', () => {
      const onClick = vi.fn()
      added(onClick, '/search')
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  // implementation notesthe direct menu without the cart column keeps the cart in this drawer; an add answers on the count
  describe('the count after a product add, with the cart in the header\'s drawer', () => {
    const badge = () => document.querySelector('#cart-header-item span[aria-hidden="true"]')
    const render = (props) => renderWithProviders(<CartPopover auth location={{ pathname: '/store/demo' }} onClick={vi.fn()} onClose={vi.fn()} carts={[{ uuid: 'a', products: [{ id: 1, quantity: 2 }] }]} {...props} />)
    const emit = (name) => act(() => bus.events.emit(name, { id: 1 }, { uuid: 'a', products: [] }))

    afterEach(() => setStoreCartInPage(null))

    it('animates in turn on each add or update, without remounting the badge', () => {
      setStoreCartInPage('header')
      render()
      const node = badge()
      expect(node).toHaveTextContent('2')
      expect(node).not.toHaveAttribute('data-count-pulse')
      emit('cart_product_added')
      expect(badge()).toBe(node)
      expect(node).toHaveAttribute('data-count-pulse', '1')
      emit('cart_product_updated')
      expect(node).toHaveAttribute('data-count-pulse', '0')
    })

    it.each([[null], ['aside'], ['bar']])('does not animate when the page keeps the cart elsewhere (%s)', (mode) => {
      setStoreCartInPage(mode)
      render()
      emit('cart_product_added')
      expect(badge()).not.toHaveAttribute('data-count-pulse')
    })

    it('moves only when the system allows it: the animation is inside the no-preference media query', () => {
      setStoreCartInPage('header')
      render()
      emit('cart_product_added')
      const css = Array.from(document.querySelectorAll('style')).map(style => style.textContent).join('\n')
      expect(css).toMatch(/@media \(prefers-reduced-motion:\s*no-preference\)\{[^@]*data-count-pulse='0'\]\{[^}]*animation:/)
      // the two turns use two animations (one name twice would not restart), and nothing animates outside the query
      const names = [...css.matchAll(/data-count-pulse='([01])'\]\{[^}]*?animation:(\w+) /g)].map(match => match[2])
      expect(new Set(names).size).toBe(2)
      expect(css.replace(/@media \(prefers-reduced-motion:\s*no-preference\)\{.*?\}\}/g, '')).not.toMatch(/data-count-pulse/)
    })
  })

  it('renders cart trigger and popover body', () => {
    const { getByTestId } = renderWithProviders(
      <CartPopover open auth location={{ pathname: '/' }} onClose={vi.fn()} />
    )
    expect(getByTestId('cart-content')).toBeInTheDocument()
  })

  // implementation notesthe drawer is the base Sheet from the right, named by its title
  it('the drawer: a right Sheet, its doc section, its close calls onClose and a click in it is not outside', async () => {
    const onClose = vi.fn()
    renderWithProviders(<CartPopover open auth location={{ pathname: '/' }} onClose={onClose} />)
    const sheet = await screen.findByRole('dialog', { name: 'Your cart' })
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
    expect(sheet).toHaveAttribute('data-side', 'right')
    expect(sheet).toHaveAttribute('data-doc-section', 'cart-popover')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    onClose.mockClear() // (the popover calls onClose once on mount, on its `auth` effect)
    fireEvent.mouseUp(screen.getByTestId('cart-content'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // implementation notesthe count is the units of every cart the header receives, valid or not
  const badge = (container) => container.querySelector('#cart-header-item > span > span')?.textContent

  it('the badge counts the units of every cart, valid or not (Delivery without an address keeps its number)', () => {
    const carts = [
      { uuid: 'a', valid: true, products: [{ id: 1, quantity: 1 }] },
      { uuid: 'b', valid: true, products: [{ id: 2, quantity: 2 }] },
      { uuid: 'c', valid: false, products: [{ id: 3, quantity: 1 }] }
    ]
    const { container, rerender } = renderWithProviders(
      <CartPopover auth carts={carts} location={{ pathname: '/' }} onClose={vi.fn()} />
    )
    expect(badge(container)).toBe('4')
    // one cart that is not valid: 2 + 1 units
    rerender(<CartPopover auth carts={[{ uuid: 'a', valid: false, products: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }] }]} location={{ pathname: '/' }} onClose={vi.fn()} />)
    expect(badge(container)).toBe('3')
    // emptied: no badge
    rerender(<CartPopover auth carts={[{ uuid: 'a', valid: false, products: [] }]} location={{ pathname: '/' }} onClose={vi.fn()} />)
    expect(badge(container)).toBeUndefined()
    rerender(<CartPopover auth carts={[]} location={{ pathname: '/' }} onClose={vi.fn()} />)
    expect(badge(container)).toBeUndefined()
  })

  it('a cart without a product list (not loaded yet) has no badge, not an empty one', () => {
    const { container } = renderWithProviders(
      <CartPopover auth carts={[{ uuid: 'a', valid: true }]} location={{ pathname: '/' }} onClose={vi.fn()} />
    )
    expect(container.querySelector('#cart-header-item')).not.toBeNull()
    expect(badge(container)).toBeUndefined()
  })

  it('hideButton (visibility.header.cart): no button, only the cart drawer while open', () => {
    const { container, queryByTestId, rerender } = renderWithProviders(
      <CartPopover hideButton auth location={{ pathname: '/' }} onClose={vi.fn()} />
    )
    expect(container.querySelector('#cart-header-item')).toBeNull()
    expect(queryByTestId('cart-content')).toBeNull()
    rerender(<CartPopover hideButton open auth location={{ pathname: '/' }} onClose={vi.fn()} />)
    expect(container.querySelector('#cart-header-item')).toBeNull()
    expect(queryByTestId('cart-content')).toBeInTheDocument()
  })

  it('header.cart_count: the theme hides the badge, the button and its icon stay; the default shows it', () => {
    const carts = [{ uuid: 'a', valid: true, products: [{ id: 1 }, { id: 2 }] }]
    const theme = themeWithValues((values) => {
      values.visibility['header.cart_count'] = false
      return values
    })
    const hidden = renderWithProviders(<CartPopover auth carts={carts} location={{ pathname: '/' }} onClose={vi.fn()} />, { theme })
    expect(hidden.container.querySelector('#cart-header-item')).toBeTruthy()
    expect(hidden.container.querySelector('#cart-header-item svg')).toHaveClass('lucide-shopping-basket')
    expect(badge(hidden.container)).toBeUndefined()
    hidden.unmount()
    const shown = renderWithProviders(<CartPopover auth carts={carts} location={{ pathname: '/' }} onClose={vi.fn()} />, { theme: themeWithValues() })
    expect(badge(shown.container)).toBe('2')
  })

  it('the wide cart is a base Button of header.slots.cart: named, anchored and still the doc control', () => {
    const slotTheme = themeWithValues((values) => {
      values.components.header.slots = { ...values.components.header.slots, cart: { component: 'button', size: 'lg', color: 'primary', appearance: 'solid' } }
      return values
    })
    const onClick = vi.fn()
    const { container, getByRole, rerender } = renderWithProviders(
      <CartPopover auth carts={[]} location={{ pathname: '/' }} onClick={onClick} onClose={vi.fn()} />, { theme: slotTheme }
    )
    const cart = getByRole('button', { name: 'My cart' })
    expect(cart).toBe(container.querySelector('#cart-header-item'))
    expect(cart).toHaveAttribute('data-slot', 'button')
    expect(cart).toHaveAttribute('data-doc-control', 'cart-open')
    expect(cart).toHaveAttribute('data-doc-state', 'closed')
    expect(cart).toHaveAttribute('aria-expanded', 'false')
    expect(cart.style.getPropertyValue('--ui-button-height')).toBe(componentVars(scopedTheme(slotTheme, 'header'), 'button', { size: 'lg', shape: 'icon' })['--ui-button-height'])
    // the icon shape (a square), with a count or without it
    expect(cart.className).toContain('ui:w-(--ui-button-height)')
    fireEvent.click(cart)
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<CartPopover open auth carts={[{ uuid: 'a', valid: true, products: [{ id: 1 }] }]} location={{ pathname: '/' }} onClick={onClick} onClose={vi.fn()} />)
    expect(container.querySelector('#cart-header-item')).toHaveAttribute('data-doc-state', 'open')
    expect(container.querySelector('#cart-header-item')).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('#cart-header-item').className).toContain('ui:w-(--ui-button-height)')
    expect(badge(container)).toBe('1')
  })

  // The popover closes on a click outside (window `mouseup`). A design-system
  // Dialog opened over it is a Base UI portal in the body, not inside the legacy
  // Popup's #app-modals: `isInsideOverlay` is what keeps it from counting as outside.
  describe('under a Dialog', () => {
    const setup = async () => {
      const onClose = vi.fn()
      renderWithProviders(
        <>
          <button data-testid='page'>page</button>
          <CartPopover open auth location={{ pathname: '/' }} onClose={onClose} />
          <Dialog open>
            <DialogContent>
              <DialogHeader><DialogTitle>Confirm</DialogTitle><DialogDescription>Sure?</DialogDescription></DialogHeader>
            </DialogContent>
          </Dialog>
        </>
      )
      await screen.findByRole('dialog')
      onClose.mockClear() // (the popover calls onClose once on mount, on its `auth` effect)
      return onClose
    }

    it('a click inside the Dialog does not close the popover below it', async () => {
      const onClose = await setup()
      fireEvent.mouseUp(screen.getByText('Confirm'))
      fireEvent.mouseUp(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('a click on the page, outside the popover and every overlay, still closes it', async () => {
      const onClose = await setup()
      fireEvent.mouseUp(screen.getByTestId('page'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // The other layer of `isInsideOverlay` (`#app-modals, [data-base-ui-portal]`): the
  // legacy Popup's modal root.
  describe('under a legacy modal (#app-modals)', () => {
    it('a click inside #app-modals does not close the popover', () => {
      const onClose = vi.fn()
      renderWithProviders(
        <>
          <CartPopover open auth location={{ pathname: '/' }} onClose={onClose} />
          <div id='app-modals'><button>legacy modal</button></div>
        </>
      )
      onClose.mockClear() // (the popover calls onClose once on mount, on its `auth` effect)
      fireEvent.mouseUp(screen.getByText('legacy modal')) // (the open drawer hides the rest from assistive technology)
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
