import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { HEADER_DOCKED, HEADER_LAYER } from '../../Header/styles'
import { OrderContextUI } from '../index'
import { ORDER_CONTEXT_DOCK_EVENT } from '../../Header/orderContextDock'
import { themedScroll } from '../../Header/__tests__/scrollTheme'

// jsdom has no PointerEvent: a mouse event that carries the pointer's fields (the base Select opens from the keyboard)
class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
  }
}
beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
afterEach(() => vi.unstubAllGlobals())
const openList = async (trigger) => {
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  return screen.findByRole('listbox')
}

// a small screen unless a test says otherwise
const windowSize = vi.hoisted(() => ({ width: 390, height: 800 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => windowSize }))

// no order type unless a test says otherwise (keeps today's default: an
// unknown type still shows the address, implementation notes showsCustomerAddress)
const orderActions = vi.hoisted(() => ({ changeAddress: vi.fn(), clear: vi.fn() }))
const orderStateMock = vi.hoisted(() => ({ options: {} }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderStateMock, orderActions]
}))

// present whether the order type is a quick switch field (not docked) or
// the capsule's inline switcher (docked)
const TYPE_SELECTOR = "[data-doc-control='order-type-open'], [data-doc-section='header-order-types']"

vi.mock('~ui/src/components/MomentContent', () => ({
  MomentContent: ({ onBusyChange }) => (
    <div data-testid='moment-content'>
      <button type='button' onClick={() => onBusyChange?.(true)}>start saving</button>
      <button type='button' onClick={() => onBusyChange?.(false)}>end saving</button>
    </div>
  )
}))
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))

describe('OrderContextUI', () => {
  it('renders delivery address prompt and the order type field', () => {
    window.localStorage.setItem('user-customer', JSON.stringify({ id: 1 }))
    const { getByText, container } = renderWithProviders(<OrderContextUI />)
    expect(getByText('Where do we delivery?')).toBeInTheDocument()
    expect(container.querySelector(TYPE_SELECTOR)).not.toBeNull()
  })

  it('the address is the base Button, ghost neutral, as a row', () => {
    const { getByRole } = renderWithProviders(<OrderContextUI isBusinessList />, { theme: themeWithValues() })
    const address = getByRole('button', { name: /Where do we delivery\?/ })
    expect(address).toHaveAttribute('type', 'button')
    expect(address).toHaveAttribute('data-slot', 'button')
    expect(address.className).toMatch(/ui:flex\b/)
  })

  it('the address and the order type keep their full text as the title when "…" cuts them', () => {
    orderStateMock.options.address = { address: '1234 Some Very Long Street Name, Suite 500' }
    const { getByRole, container } = renderWithProviders(<OrderContextUI isBusinessList />, { theme: themeWithValues() })
    expect(getByRole('button', { name: /Some Very Long Street Name/ }).querySelector('span[title]').getAttribute('title')).toBe('1234 Some Very Long Street Name, Suite 500')
    const typeSpan = container.querySelector("[data-doc-control='order-type-open'] span[title]")
    expect(typeSpan.getAttribute('title')).toBe(typeSpan.textContent)
    expect(typeSpan.textContent).toBe('Delivery')
    delete orderStateMock.options.address
  })

  it('docked: the bar under the header, of its background and shadow', () => {
    const theme = themeWithValues((values) => {
      values.components.header.base.background = '#FAFAFA'
      return values
    })
    const { container } = renderWithProviders(<OrderContextUI isDocked />, { theme })
    const bar = container.querySelector(`.${HEADER_DOCKED}`)
    expect(bar).not.toBeNull()
    const generated = [...bar.classList].filter((name) => name !== HEADER_DOCKED).pop()
    const rules = injectedCss().split('}').filter((rule) => rule.includes(`.${generated}`)).join('}')
    expect(rules).toContain('#FAFAFA')
  })

  // implementation notesthe bar is the dock of a revealing header. The header's root decides (what the page's header carries):
  // computed styles on the real document, the way the browser applies `html:has(...)`
  describe('docked, by the header\'s scroll behavior', () => {
    const withHeader = (behavior, state = 'top') => {
      const header = document.createElement('div')
      header.setAttribute('data-app-header', '')
      header.setAttribute('data-scroll-behavior', behavior)
      header.setAttribute('data-scroll-state', state)
      document.body.appendChild(header)
      return header
    }
    const dockedBar = () => renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() }).container.querySelector(`.${HEADER_DOCKED}`)
    afterEach(() => {
      document.querySelectorAll('[data-app-header]').forEach((node) => node.remove())
      document.documentElement.style.removeProperty('--header-height')
    })

    it('fixed: in the flow, as always', () => {
      withHeader('fixed', 'scrolled')
      const style = window.getComputedStyle(dockedBar())
      expect(style.position).not.toBe('sticky')
      expect(style.transform).not.toContain('translateY')
    })

    it('reveal: pegged right under the header, below its layer', () => {
      document.documentElement.style.setProperty('--header-height', '70px')
      withHeader('reveal')
      const style = window.getComputedStyle(dockedBar())
      expect(style.position).toBe('sticky')
      expect(style.top).toBe('var(--header-height,0px)')
      expect(Number(style.zIndex)).toBe(HEADER_LAYER - 1)
    })

    it('docked: it marks itself for the header, and tells it when it comes and goes', () => {
      const heard = vi.fn()
      window.addEventListener('header-dock-change', heard)
      const { container, unmount } = renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })
      expect(container.querySelector(`.${HEADER_DOCKED}`)).toHaveAttribute('data-header-dock')
      expect(heard).toHaveBeenCalled()
      heard.mockClear()
      unmount()
      expect(heard).toHaveBeenCalled()
      window.removeEventListener('header-dock-change', heard)
    })

    it('docked: it tells the header again when its slide with the header ends, and stops listening when it leaves', () => {
      const heard = vi.fn()
      const { container, unmount } = renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })
      const bar = container.querySelector(`.${HEADER_DOCKED}`)
      const end = (propertyName, target = bar) => {
        const event = new Event('transitionend', { bubbles: true })
        Object.defineProperty(event, 'propertyName', { value: propertyName })
        target.dispatchEvent(event)
      }
      window.addEventListener('header-dock-change', heard)
      end('transform')
      expect(heard).toHaveBeenCalledTimes(1)
      // another property, or a child's own transition bubbling up, is not the slide
      end('opacity')
      end('transform', bar.firstElementChild)
      expect(heard).toHaveBeenCalledTimes(1)
      unmount()
      heard.mockClear()
      end('transform')
      expect(heard).not.toHaveBeenCalled()
      window.removeEventListener('header-dock-change', heard)
    })

    it('reveal: hides with the header (its height and its own), and comes back with it', () => {
      withHeader('reveal', 'hidden')
      expect(window.getComputedStyle(dockedBar()).transform).toBe('translateY(calc(-100% - var(--header-height,0px)))')
      document.querySelector('[data-app-header]').setAttribute('data-scroll-state', 'scrolled')
      expect(window.getComputedStyle(document.querySelector(`.${HEADER_DOCKED}`)).transform).not.toContain('translateY')
    })
  })

  it('docked: the theme\'s spaces (space.lg inside, space.xl to the content, the page gutter)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space.lg = 18
      values.tokens.space.xl = 26
      values.tokens.layout.page_gutter = 22
      return values
    })
    const { container } = renderWithProviders(<OrderContextUI isDocked />, { theme })
    const bar = container.querySelector(`.${HEADER_DOCKED}`)
    const generated = [...bar.classList].filter((name) => name !== HEADER_DOCKED).pop()
    const rules = injectedCss().split('}').filter((rule) => rule.includes(`.${generated}`)).join('}')
    expect(rules).toContain('margin:0 0 26px')
    expect(rules).toContain('padding:18px 22px')
  })

  it('not docked: space.md above it and the page gutter on the business list', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space.md = 14
      values.tokens.layout.page_gutter = 22
      return values
    })
    const { getByRole } = renderWithProviders(<OrderContextUI isBusinessList />, { theme })
    // the button, its row (space.md under it) and the bar
    const row = getByRole('button', { name: /Where do we delivery\?/ }).parentElement
    expect(window.getComputedStyle(row).marginBottom).toBe('14px')
    const box = row.parentElement
    const style = window.getComputedStyle(box)
    expect(style.marginTop).toBe('14px')
    expect(style.padding).toBe('0px 22px')
  })

  it('not docked: no bar', () => {
    const { container } = renderWithProviders(<OrderContextUI isCheckOut />, { theme: themeWithValues() })
    expect(container.querySelector(`.${HEADER_DOCKED}`)).toBeNull()
  })

  it('the moment is a button that opens its modal; the order type opens the rich listbox in place (no modal)', async () => {
    const { getByRole, container } = renderWithProviders(<OrderContextUI isBusinessList />, { theme: themeWithValues() })
    const typeButton = container.querySelector("[data-doc-control='order-type-open']")
    expect(typeButton.tagName).toBe('BUTTON')
    expect(typeButton).toHaveAttribute('type', 'button')
    expect(typeButton).toHaveAttribute('aria-haspopup', 'listbox')
    expect(getByRole('combobox', { name: 'Order type' })).toBe(typeButton)
    expect(await openList(typeButton)).not.toBeNull()
  })

  it('docked, it has only the controls the header\'s row does not (orderContextPlacement)', () => {
    const controls = (width) => {
      windowSize.width = width
      const view = renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })
      const has = {
        address: !!view.queryByRole('button', { name: /Where do we delivery\?/ }),
        type: !!view.container.querySelector(TYPE_SELECTOR)
      }
      view.unmount()
      return has
    }
    expect(controls(390)).toEqual({ address: true, type: true })
    expect(controls(700)).toEqual({ address: true, type: true })
    expect(controls(800)).toEqual({ address: true, type: true })
    expect(controls(1023)).toEqual({ address: true, type: true })
    expect(controls(1024)).toEqual({ address: false, type: false })
    windowSize.width = 390
  })

  it('not docked, it has all of them at any width', () => {
    windowSize.width = 1280
    const { getByRole, container } = renderWithProviders(<OrderContextUI isCheckOut />, { theme: themeWithValues() })
    expect(getByRole('button', { name: /Where do we delivery\?/ })).toBeInTheDocument()
    expect(container.querySelector("[data-doc-control='order-type-open']")).toBeTruthy()
    windowSize.width = 390
  })
})

describe('OrderContextUI — the controls the theme hides (visibility.order_context.*)', () => {
  const themedWith = (keys = {}) => themeWithValues((values) => {
    Object.assign(values.visibility, keys)
    return values
  })
  // the docked bar's controls on a phone (all three by default)
  const controls = (keys, props = { isDocked: true }) => {
    windowSize.width = 390
    const view = renderWithProviders(<OrderContextUI {...props} />, { theme: themedWith(keys) })
    const has = {
      bar: !!view.container.firstChild,
      address: !!view.queryByRole('button', { name: /Where do we delivery\?/ }),
      type: !!view.container.querySelector(TYPE_SELECTOR),
      moment: !!view.queryByRole('button', { name: /ASAP/ })
    }
    view.unmount()
    return has
  }
  const none = { 'order_context.order_type': false, 'order_context.moment': false, 'order_context.address': false }

  it('by default the bar has the three', () => {
    expect(controls()).toEqual({ bar: true, address: true, type: true, moment: true })
  })

  it('order_context.order_type hides the order type', () => {
    expect(controls({ 'order_context.order_type': false })).toEqual({ bar: true, address: true, type: false, moment: true })
  })

  it('order_context.moment hides the moment', () => {
    expect(controls({ 'order_context.moment': false })).toEqual({ bar: true, address: true, type: true, moment: false })
  })

  it('order_context.address hides the address', () => {
    expect(controls({ 'order_context.address': false })).toEqual({ bar: true, address: false, type: true, moment: true })
  })

  it('with every control hidden it renders nothing (no empty bar), docked or not', () => {
    expect(controls(none)).toEqual({ bar: false, address: false, type: false, moment: false })
    expect(controls(none, { isCheckOut: true }).bar).toBe(false)
  })

  it('docked, the controls left for the bar hidden (the row has them all from 1024px): nothing', () => {
    windowSize.width = 1024
    const view = renderWithProviders(<OrderContextUI isDocked />, { theme: themedWith({ 'order_context.address': false }) })
    expect(view.container.firstChild).toBeNull()
    view.unmount()
    windowSize.width = 390
  })
})

describe('OrderContextUI — the customer\'s address by order type', () => {
  afterEach(() => {
    orderStateMock.options.type = undefined
    vi.clearAllMocks()
  })

  it('order type 1 (delivery) shows it; order type 2 (pickup) hides it', () => {
    orderStateMock.options.type = 1
    const { queryByRole, rerender } = renderWithProviders(<OrderContextUI isBusinessList />, { theme: themeWithValues() })
    expect(queryByRole('button', { name: /Where do we delivery\?/ })).toBeInTheDocument()

    orderStateMock.options.type = 2
    rerender(<OrderContextUI isBusinessList />)
    expect(queryByRole('button', { name: /Where do we delivery\?/ })).toBeNull()
  })

  it('re-render 2 → 1 → 2: the field appears then disappears, without clearing the saved address', () => {
    orderStateMock.options.type = 2
    const { queryByRole, rerender } = renderWithProviders(<OrderContextUI isBusinessList />, { theme: themeWithValues() })
    expect(queryByRole('button', { name: /Where do we delivery\?/ })).toBeNull()

    orderStateMock.options.type = 1
    rerender(<OrderContextUI isBusinessList />)
    expect(queryByRole('button', { name: /Where do we delivery\?/ })).toBeInTheDocument()

    orderStateMock.options.type = 2
    rerender(<OrderContextUI isBusinessList />)
    expect(queryByRole('button', { name: /Where do we delivery\?/ })).toBeNull()

    expect(orderActions.changeAddress).not.toHaveBeenCalled()
    expect(orderActions.clear).not.toHaveBeenCalled()
  })
})

describe('OrderContextUI — the cart line (isCart)', () => {
  it('the type link opens the rich listbox in place, not a modal', async () => {
    const { container, getByText } = renderWithProviders(<OrderContextUI isCart />, { theme: themeWithValues() })
    const typeLink = container.querySelector("[data-doc-control='order-type-open']")
    expect(typeLink.tagName).toBe('BUTTON')
    expect(typeLink).toHaveAttribute('aria-haspopup', 'listbox')
    expect(await openList(typeLink)).not.toBeNull()
    expect(getByText('We bring your order to your door')).toBeInTheDocument()
  })

  // implementation notesthe base Dialog
  it('the moment link still opens its modal: a base Dialog; its close closes it', async () => {
    const { container, getByTestId } = renderWithProviders(<OrderContextUI isCart />, { theme: themeWithValues() })
    const momentLink = container.querySelector("[data-doc-control='order-moment-open']")
    fireEvent.click(momentLink)
    expect(getByTestId('moment-content')).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(dialog).toContainElement(getByTestId('moment-content'))
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('moment-content')).toBeNull())
  })

  // implementation notesclosing and reopening while the Save is in flight let the old Save close the new picker
  it('the moment modal cannot be closed while its Save is in flight: no X, Escape does nothing; after it, it closes', async () => {
    const { container, getByText } = renderWithProviders(<OrderContextUI isCart />, { theme: themeWithValues() })
    fireEvent.click(container.querySelector("[data-doc-control='order-moment-open']"))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(getByText('start saving'))
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 })
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.getByTestId('moment-content')).toBeInTheDocument()
    fireEvent.click(getByText('end saving'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('moment-content')).toBeNull())
  })
})

describe('OrderContextUI — docked capsule: the theme\'s slot variant underline, size lg', () => {
  it('renders without breaking: a radio group inside the capsule', () => {
    const theme = themeWithValues((values) => {
      values.components.header = {
        ...values.components.header,
        slots: { ...(values.components.header?.slots || {}), order_type: { component: 'tabs', size: 'lg', variant: 'underline' } }
      }
      return values
    })
    const { container } = renderWithProviders(<OrderContextUI isDocked />, { theme })
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull()
  })
})

// coordinator verify: at 375px "ASAP" clipped to "AS…" on one
// line; the threshold moved from 360 to 420
describe('OrderContextUI — docked capsule: when it stacks to two lines', () => {
  afterEach(() => {
    windowSize.width = 390
  })

  // no address (showsCustomerAddress keeps the default "unknown type shows
  // it" otherwise, per the file's own top comment): isolates the width rule
  const noAddressTheme = themeWithValues((values) => {
    values.visibility['order_context.address'] = false
    return values
  })

  it('stacks under 420px even without an address; stays one line at 420+', () => {
    windowSize.width = 419
    const narrow = renderWithProviders(<OrderContextUI isDocked />, { theme: noAddressTheme })
    const narrowCapsule = narrow.container.querySelector('[role="group"]')
    expect(window.getComputedStyle(narrowCapsule).flexDirection).toBe('column')
    narrow.unmount()

    windowSize.width = 420
    const wide = renderWithProviders(<OrderContextUI isDocked />, { theme: noAddressTheme })
    const wideCapsule = wide.container.querySelector('[role="group"]')
    expect(window.getComputedStyle(wideCapsule).flexDirection).not.toBe('column')
  })

  // implementation noteswith the type and the address both in the bar it stacked at any
  // width; from 576px (ORDER_CONTEXT_BAR_ONE_ROW) it is one row, the address the rest
  it('with the address, stacks under 576px and is one row from 576px', () => {
    const columnAt = (width) => {
      windowSize.width = width
      const view = renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })
      const capsule = view.container.querySelector('[role="group"]')
      const stacked = window.getComputedStyle(capsule).flexDirection === 'column'
      const address = !!view.queryByRole('button', { name: /Where do we delivery\?/ })
      view.unmount()
      return { stacked, address }
    }
    expect(columnAt(575)).toEqual({ stacked: true, address: true })
    expect(columnAt(576)).toEqual({ stacked: false, address: true })
    expect(columnAt(900)).toEqual({ stacked: false, address: true })
  })

  it('stacked: no stray leading divider before the row\'s first item', () => {
    windowSize.width = 390
    const { container } = renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })
    const capsule = container.querySelector('[role="group"]')
    const rest = capsule.lastElementChild
    expect(rest.firstElementChild.tagName).not.toBe('HR')
  })

  it('one line (wide enough, no address): a divider between the switcher and the moment', () => {
    // 700px: below the header's own 1024px threshold (the bar still shows,
    // orderContextPlacement), above the 420px stacking width
    windowSize.width = 700
    const { container } = renderWithProviders(<OrderContextUI isDocked />, { theme: noAddressTheme })
    const capsule = container.querySelector('[role="group"]')
    expect(window.getComputedStyle(capsule).flexDirection).not.toBe('column')
    const rest = capsule.lastElementChild
    expect(rest.firstElementChild.tagName).toBe('HR')
  })
})

// implementation notesthe type, the moment and the address read as one row: the
// design system's Lucide icons at the tabs' size, the moment's text the tabs'
describe('OrderContextUI — docked capsule: the items share the tabs\' icon size and text', () => {
  const dock = () => renderWithProviders(<OrderContextUI isDocked />, { theme: themeWithValues() })

  it('the tab, the clock and the pin are Lucide icons of the same size', () => {
    const { container } = dock()
    const tabIcon = container.querySelector('[role="radio"] svg.lucide')
    const clock = container.querySelector("[data-doc-control='order-moment-open'] svg.lucide-clock")
    const pin = container.querySelector("[data-doc-control='order-address-open'] svg.lucide-map-pin")
    expect(tabIcon).not.toBeNull()
    expect(clock).toHaveAttribute('aria-hidden', 'true')
    expect(pin).toHaveAttribute('aria-hidden', 'true')
    const size = (icon) => window.getComputedStyle(icon).width
    expect(size(clock)).toBe(size(tabIcon))
    expect(size(pin)).toBe(size(tabIcon))
  })

  it('ASAP has the tabs\' text style', () => {
    const { container } = dock()
    const label = window.getComputedStyle(container.querySelector('[role="radio"]'))
    const moment = window.getComputedStyle(container.querySelector("[data-doc-control='order-moment-open']"))
    expect([moment.fontSize, moment.fontWeight, moment.fontFamily]).toEqual([label.fontSize, label.fontWeight, label.fontFamily])
  })

  it('ASAP has the color of an inactive tab, the address keeps the text\'s', () => {
    const { container } = dock()
    const inactive = container.querySelector('[role="radiogroup"]').style.getPropertyValue('--ui-tabs-inactive')
    const moment = container.querySelector("[data-doc-control='order-moment-open']")
    const address = container.querySelector("[data-doc-control='order-address-open']")
    expect(inactive).not.toBe('')
    expect(moment.style.getPropertyValue('--ui-capsule-inactive-color')).toBe(inactive)
    expect(moment.getAttribute('class')).toContain('ui:button-capsule-label')
    expect(address.getAttribute('class')).not.toContain('ui:button-capsule-label')
  })

  it('not docked, the type, the moment and the address fields draw Lucide icons too', () => {
    const { container } = renderWithProviders(<OrderContextUI isCheckOut />, { theme: themeWithValues() })
    const field = container.querySelector("[data-doc-control='order-type-open']")
    expect(field.querySelector('svg.lucide-truck')).not.toBeNull()
    expect(container.querySelector('svg.lucide-clock')).not.toBeNull()
    expect(container.querySelector('svg.lucide-map-pin')).not.toBeNull()
  })
})

// implementation noteswith a fixed header the bar tells the header's row when it leaves the view under it
describe('OrderContextUI — docked: it reports when it is out of view behind the header', () => {
  const observers = []
  class FakeObserver {
    constructor (callback, options) { this.callback = callback; this.options = options; this.target = null; this.live = true; observers.push(this) }
    observe (node) { this.target = node }
    disconnect () { this.live = false }
  }
  const reports = []
  const listener = (event) => reports.push(event.detail.out)
  const withHeader = (height) => {
    const header = document.createElement('div')
    header.setAttribute('data-app-header', '')
    Object.defineProperty(header, 'offsetHeight', { value: height })
    document.body.appendChild(header)
    return header
  }
  const live = () => observers.filter((observer) => observer.live)

  afterEach(() => {
    observers.length = 0
    reports.length = 0
    window.removeEventListener(ORDER_CONTEXT_DOCK_EVENT, listener)
    document.querySelectorAll('[data-app-header]').forEach((node) => node.remove())
    vi.unstubAllGlobals()
  })
  const setup = () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    window.addEventListener(ORDER_CONTEXT_DOCK_EVENT, listener)
  }

  it('fixed: it watches the bar with the header\'s height as the top margin, and reports out and back in', () => {
    setup()
    withHeader(64)
    const { container, unmount } = renderWithProviders(<OrderContextUI isDocked />, { theme: themedScroll('fixed') })
    expect(live()).toHaveLength(1)
    expect(live()[0].target).toBe(container.querySelector(`.${HEADER_DOCKED}`))
    expect(live()[0].options.rootMargin).toBe('-64px 0px 0px 0px')
    act(() => live()[0].callback([{ isIntersecting: false }]))
    act(() => live()[0].callback([{ isIntersecting: true }]))
    act(() => live()[0].callback([{ isIntersecting: false }]))
    expect(reports).toEqual([true, false, true])
    // leaving the page (or crossing 1024px) takes the chip away
    unmount()
    expect(reports).toEqual([true, false, true, false])
    expect(live()).toHaveLength(0)
  })

  it('reveal: the bar is the header\'s dock, nothing to report', () => {
    setup()
    withHeader(64)
    renderWithProviders(<OrderContextUI isDocked />, { theme: themedScroll('reveal') })
    expect(live()).toHaveLength(0)
  })

  it('not docked (the fields of a page): nothing to report', () => {
    setup()
    withHeader(64)
    renderWithProviders(<OrderContextUI isBusinessList />, { theme: themedScroll('fixed') })
    expect(live()).toHaveLength(0)
  })
})
