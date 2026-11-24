import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { BusinessItemAccordion } from '../index'
import { schemaDefault } from '~/utils/themeSchema'
import { EventContext } from '~components/contexts/EventContext'
import { Emitter } from '~components/components/Emitter'

vi.unmock('~components/contexts/EventContext')

const validCart = {
  products: [{ id: 1 }],
  valid_address: true,
  valid_maximum: true,
  minimum: 0,
  subtotal: 12
}

describe('BusinessItemAccordion', () => {
  it('renders business name and checkout action', () => {
    const { getByText } = renderWithProviders(
      <BusinessItemAccordion
        business={businessFixture}
        cart={validCart}
        uuid='cart-1'
        isProducts
        isForceOpenAccordion
        total={12}
        handleClickCheckout={vi.fn()}
      >
        <div>cart line</div>
      </BusinessItemAccordion>
    )
    expect(getByText('Demo Store')).toBeInTheDocument()
    expect(getByText('cart line')).toBeInTheDocument()
    expect(getByText(/Checkout/)).toBeInTheDocument()
  })

  it('hides the add more products action for a pending cart', () => {
    const props = {
      business: businessFixture,
      cart: validCart,
      uuid: 'cart-1',
      isProducts: true,
      isForceOpenAccordion: true,
      isStickyFooter: true,
      showUpsellingInBusinessInfo: true,
      total: 12,
      handleClickCheckout: vi.fn(),
      handleStoreRedirect: vi.fn()
    }
    const active = renderWithProviders(<BusinessItemAccordion {...props} />)
    expect(active.getByText('Add more products')).toBeInTheDocument()
    active.unmount()

    const pending = renderWithProviders(<BusinessItemAccordion {...props} isCartPending />)
    expect(pending.queryByText('Add more products')).not.toBeInTheDocument()
    expect(pending.getByText(/Checkout/)).toBeInTheDocument()
  })

  it('forceHideAddMoreProducts leaves only Checkout with the total; without it Add more products stays', () => {
    const props = {
      business: businessFixture,
      cart: validCart,
      uuid: 'cart-1',
      isProducts: true,
      isForceOpenAccordion: true,
      isStickyFooter: true,
      showUpsellingInBusinessInfo: true,
      total: 12,
      handleClickCheckout: vi.fn(),
      handleStoreRedirect: vi.fn()
    }
    const modal = renderWithProviders(<BusinessItemAccordion {...props} />)
    expect(modal.getByText('Add more products')).toBeInTheDocument()
    modal.unmount()

    const aside = renderWithProviders(<BusinessItemAccordion {...props} forceHideAddMoreProducts />)
    expect(aside.queryByText('Add more products')).not.toBeInTheDocument()
    expect(aside.getAllByRole('button', { name: /Checkout/ })).toHaveLength(1)
    expect(aside.getByRole('button', { name: /Checkout · .*12/ })).toBeInTheDocument()
  })

  it('calls checkout handler', () => {
    const handleClickCheckout = vi.fn()
    const { getByText } = renderWithProviders(
      <BusinessItemAccordion
        business={businessFixture}
        cart={validCart}
        isProducts
        isForceOpenAccordion
        total={12}
        handleClickCheckout={handleClickCheckout}
      />
    )
    fireEvent.click(getByText(/Checkout/))
    expect(handleClickCheckout).toHaveBeenCalled()
  })
})

// The look a design system Button of these options has in a theme (its variables)
const LOOK = ['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color']
const expectLook = (theme, button, options) => {
  expect(button.tagName).toBe('BUTTON')
  expect(button).toHaveAttribute('data-slot', 'button')
  const vars = componentVars(theme, 'button', options)
  LOOK.forEach((name) => expect(button.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
}
// (by its label: a closed store's total is hidden on a narrow screen)
const named = (utils, name) => utils.getByText(name).closest('button')

const renderLinks = (theme) => renderWithProviders(
  <BusinessItemAccordion
    business={businessFixture}
    cart={validCart}
    isProducts
    handleStoreRedirect={vi.fn()}
    handleClearProducts={vi.fn()}
  />,
  { theme }
)

describe('BusinessItemAccordion store actions (design system Button)', () => {
  it('Go to store is the button of cart.slots.store and Clear cart the one of cart.slots.clear, with no dot between them', () => {
    const theme = themeWithValues((values) => {
      values.components.cart.slots.clear = { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: 'icon' }
      values.components.cart.slots.store = { component: 'button', size: 'sm', appearance: 'solid', color: 'primary', shape: null }
      return values
    })
    const utils = renderLinks(theme)
    const store = named(utils, 'Go to store')
    const clear = named(utils, 'Clear cart')
    expect(store).toHaveAttribute('type', 'button')
    expect(store).not.toHaveClass('go-store')
    expectLook(theme, store, { color: 'primary', appearance: 'solid', size: 'sm' })
    expect(clear).toHaveAttribute('type', 'button')
    expect(clear).not.toHaveClass('clear-cart')
    // a slot's shape is not the button's (the label stays)
    expectLook(theme, clear, { color: 'secondary', appearance: 'outline', size: 'lg' })
    // (the text shape: its side padding, not the icon's square)
    expect(clear.className).toContain('ui:px-(--ui-button-padding-x)')
    expect(utils.queryByText('•')).toBeNull()
  })

  it('by default: Go to store is the md ghost button of the primary, with or without its slot', () => {
    expect(schemaDefault('components.cart.slots.store')).toEqual({ component: 'button', size: 'md', appearance: 'ghost', color: 'primary', shape: null })
    const theme = themeWithValues()
    const withoutSlot = themeWithValues((values) => { values.components.cart.slots.store = { component: 'button', size: null, appearance: null, color: null, shape: null }; return values })
    ;[theme, withoutSlot].forEach((t) => {
      const utils = renderLinks(t)
      expectLook(t, named(utils, 'Go to store'), { color: 'primary', appearance: 'ghost', size: 'md' })
      utils.unmount()
    })
  })

  it('Clear cart without its slot is the md solid danger button (the legacy red), with it the slot\'s (md ghost danger)', () => {
    const theme = themeWithValues()
    // (the schema fills a missing slot: a slot that chooses nothing is the look without it)
    const withoutSlot = themeWithValues((values) => { values.components.cart.slots.clear = { component: 'button', size: null, appearance: null, color: null, shape: null }; return values })
    const own = renderLinks(theme)
    expectLook(theme, named(own, 'Clear cart'), { color: 'danger', appearance: 'ghost', size: 'md' })
    own.unmount()
    const bare = renderLinks(withoutSlot)
    expectLook(withoutSlot, named(bare, 'Clear cart'), { color: 'danger', appearance: 'solid', size: 'md' })
  })

  it('the row\'s span rules (the reservation\'s line) leave the labels of the buttons alone', () => {
    const utils = renderLinks(themeWithValues())
    const row = utils.container.querySelector('.info')
    const own = [...row.classList].filter((c) => c !== 'info')
    const css = injectedCss().split('}').filter((rule) => own.some((c) => rule.includes(`.${c}`))).join('}').replace(/\s+/g, ' ')
    // its spans are the ones of a row (> div > span), never any span inside (a Button's label)
    expect(css).toMatch(/> div > span ?\{[^}]*cursor: ?pointer/)
    expect(css).not.toMatch(/\.[\w-]+ span ?\{/)
    ;['Go to store', 'Clear cart'].forEach((name) => expect(utils.getByText(name).parentElement.parentElement).toHaveAttribute('data-slot', 'button'))
  })

  it('a closed store\'s Clear cart is the button of cart.slots.clear too', () => {
    const theme = themeWithValues((values) => {
      values.components.cart.slots.clear = { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: null }
      return values
    })
    const handleClearProducts = vi.fn()
    const utils = renderWithProviders(
      <BusinessItemAccordion business={businessFixture} cart={validCart} isProducts isClosed handleClearProducts={handleClearProducts} />,
      { theme }
    )
    const clear = named(utils, 'Clear cart')
    expectLook(theme, clear, { color: 'secondary', appearance: 'outline', size: 'lg' })
    fireEvent.click(clear)
    expect(handleClearProducts).toHaveBeenCalled()
  })

  it('a click on Clear cart or Go to store (on its label too) does not toggle the accordion', () => {
    const handleClearProducts = vi.fn()
    const handleStoreRedirect = vi.fn()
    const utils = renderWithProviders(
      <BusinessItemAccordion business={businessFixture} cart={validCart} isProducts handleClearProducts={handleClearProducts} handleStoreRedirect={handleStoreRedirect} />,
      { theme: themeWithValues() }
    )
    const accordion = utils.container.querySelector('[data-doc-control="business-cart-accordion"]')
    const state = accordion.getAttribute('data-doc-state')
    fireEvent.click(utils.getByText('Clear cart'))
    fireEvent.click(named(utils, 'Go to store'))
    fireEvent.click(utils.getByText('Go to store'))
    expect(handleClearProducts).toHaveBeenCalled()
    expect(handleStoreRedirect).toHaveBeenCalledTimes(2)
    expect(accordion.getAttribute('data-doc-state')).toBe(state)
  })
})

describe('BusinessItemAccordion: the toggle of the products', () => {
  it('is a button named by the store that opens / closes them', () => {
    const { getByRole } = renderWithProviders(
      <BusinessItemAccordion
        business={businessFixture}
        cart={validCart}
        uuid='cart-1'
        isProducts
        total={12}
        handleClickCheckout={vi.fn()}
      >
        <div>cart line</div>
      </BusinessItemAccordion>
    )
    const toggle = getByRole('button', { name: 'Demo Store' })
    const panel = document.getElementById(toggle.getAttribute('aria-controls'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('inert')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
  })

  it('keeps a forced panel usable without a toggle when another cart becomes active', () => {
    const events = new Emitter()
    const renderPanel = (activeUuid) => (
      <EventContext.Provider value={[events]}>
        <BusinessItemAccordion business={businessFixture} cart={validCart} uuid='cart-2' currentCartUuid={activeUuid} total={12} isProducts isForceOpenAccordion showUpsellingInBusinessInfo>
          <button type='button'>Edit invalid cart</button>
        </BusinessItemAccordion>
      </EventContext.Provider>
    )
    const { getByRole, queryByRole, rerender } = renderWithProviders(renderPanel(null))
    const edit = getByRole('button', { name: 'Edit invalid cart' })
    expect(queryByRole('button', { name: 'Demo Store' })).not.toBeInTheDocument()
    edit.focus()
    act(() => events.emit('cart_product_updated', {}, { uuid: 'cart-1' }))
    rerender(renderPanel('cart-1'))
    expect(edit.closest('[inert]')).toBeNull()
    expect(edit).toHaveFocus()
  })

  it('returns focus to the active store toggle when an update opens another cart', () => {
    const events = new Emitter()
    const { getByRole } = renderWithProviders(
      <EventContext.Provider value={[events]}>
        <BusinessItemAccordion business={businessFixture} cart={validCart} uuid='cart-1' total={12} isProducts>
          <button type='button'>Edit first item</button>
        </BusinessItemAccordion>
        <BusinessItemAccordion business={{ ...businessFixture, name: 'Second Store' }} cart={validCart} uuid='cart-2' total={12} isProducts>
          <button type='button'>Edit second item</button>
        </BusinessItemAccordion>
        <button type='button'>Outside cart</button>
      </EventContext.Provider>
    )
    const firstToggle = getByRole('button', { name: 'Demo Store' })
    const secondToggle = getByRole('button', { name: 'Second Store' })
    fireEvent.click(firstToggle)
    getByRole('button', { name: 'Edit first item' }).focus()

    act(() => events.emit('cart_product_updated', {}, { uuid: 'cart-2' }))

    expect(firstToggle).toHaveAttribute('aria-expanded', 'false')
    expect(secondToggle).toHaveAttribute('aria-expanded', 'true')
    expect(firstToggle).toHaveFocus()

    const outside = getByRole('button', { name: 'Outside cart' })
    outside.focus()
    act(() => events.emit('cart_product_updated', {}, { uuid: 'cart-1' }))
    expect(outside).toHaveFocus()
  })
})

describe('the store\'s open / close arrow', () => {
  const arrow = (theme) => {
    const utils = renderWithProviders(
      <BusinessItemAccordion business={businessFixture} cart={validCart} uuid='cart-1' isProducts total={12} handleClickCheckout={vi.fn()} />,
      { theme }
    )
    const toggle = utils.getByRole('button', { name: 'Demo Store' })
    const icon = toggle.querySelector('svg.lucide')
    const result = { name: [...icon.classList].find((c) => /^lucide-/.test(c) && c !== 'lucide') }
    utils.unmount()
    return result
  }

  it('the chevron of the theme\'s accordions (as the checkout\'s)', () => {
    expect(arrow(themeWithValues()).name).toBe('lucide-chevron-down')
  })
})

// The footer of a cart alone (the cart modal / popover, not a group): Add
// more products and Checkout with its price
describe('the cart\'s footer buttons (a cart alone)', () => {
  const footerCss = (theme, props = {}) => {
    const utils = renderWithProviders(
      <BusinessItemAccordion
        business={businessFixture}
        cart={validCart}
        uuid='cart-1'
        isProducts
        isForceOpenAccordion
        total={14.52}
        showUpsellingInBusinessInfo
        handleStoreRedirect={vi.fn()}
        handleClickCheckout={vi.fn()}
        {...props}
      />,
      { theme }
    )
    const footer = utils.container.querySelector('[data-doc-section="cart-handoff"]')
    // the slot of each action (its styled-components id): the footer sizes the slots, never the Buttons
    const slotEl = footer.querySelector('[data-doc-control="cart-checkout"]').parentElement
    const slot = slotEl.className.split(' ')[0]
    const result = { css: cssFor(footer).replace(/\s+/g, ''), labels: [...footer.querySelectorAll('button')].map((b) => b.textContent), slot, slotCss: cssFor(slotEl).replace(/\s+/g, '') }
    utils.unmount()
    return result
  }

  const footerButtons = (theme) => {
    const view = renderWithProviders(
      <BusinessItemAccordion business={businessFixture} cart={validCart} uuid='cart-1' isProducts isForceOpenAccordion total={14.52} showUpsellingInBusinessInfo handleStoreRedirect={vi.fn()} handleClickCheckout={vi.fn()} />,
      { theme }
    )
    const classes = [...view.container.querySelectorAll('[data-doc-section="cart-handoff"] button')].map((b) => b.className.split(' ').find((c) => c === 'ui:w-full'))
    view.unmount()
    return classes
  }

  it('Checkout at full width with its price, Add more products a quiet ghost under it', () => {
    const theme = themeWithValues()
    const { css, labels, slot } = footerCss(theme)
    expect(labels[0]).toBe('Add more products')
    expect(labels[1]).toMatch(/^Checkout · /)
    expect(css).toContain('flex-direction:column-reverse;')
    expect(css).toContain(`gap:${theme.values.tokens.space.xs}px;`)
    expect(css).toMatch(new RegExp(`\\.${slot}:first-child,[^{]*\\.${slot}:last-child\\{[^}]*[^-]flex:00auto;width:100%;`))
    // the Buttons fill their slot
    expect(footerButtons(theme)).toEqual(['ui:w-full', 'ui:w-full'])
  })

  it('Add more products and Checkout are design system buttons: alone a md ghost and a md solid primary, in a group sm outline and sm solid', () => {
    const theme = themeWithValues()
    const footer = (props) => renderWithProviders(
      <BusinessItemAccordion
        business={businessFixture}
        cart={validCart}
        uuid='cart-1'
        isProducts
        isForceOpenAccordion
        total={14.52}
        showUpsellingInBusinessInfo
        handleStoreRedirect={vi.fn()}
        handleClickCheckout={vi.fn()}
        {...props}
      />,
      { theme }
    )
    const alone = footer()
    expectLook(theme, named(alone, 'Add more products'), { color: 'primary', appearance: 'ghost', size: 'md' })
    const checkout = alone.container.querySelector('[data-doc-control="cart-checkout"]')
    expectLook(theme, checkout, { color: 'primary', appearance: 'solid', size: 'md' })
    expect(checkout).toHaveTextContent(/^Checkout · /)
    // one text child: the Button's own label, which ends in … when it does not fit
    expect(checkout.querySelector('span > span')).toHaveTextContent(/^Checkout · /)
    alone.unmount()
    const grouped = footer({ isInCartGroup: true, checkoutButtonDisabled: true })
    expectLook(theme, named(grouped, 'Add more products'), { color: 'primary', appearance: 'outline', size: 'sm' })
    const groupCheckout = grouped.container.querySelector('[data-doc-control="cart-checkout"]')
    expectLook(theme, groupCheckout, { color: 'primary', appearance: 'solid', size: 'sm' })
    expect(groupCheckout).toBeDisabled()
  })

  it('the Checkout below the minimum is one label with its price (it ends in … when it does not fit)', () => {
    const { container } = renderWithProviders(
      <BusinessItemAccordion business={businessFixture} cart={{ ...validCart, taxes: [], minimum: 20, valid_minimum: false }} uuid='cart-1' isProducts isForceOpenAccordion total={12} showUpsellingInBusinessInfo handleClickCheckout={vi.fn()} />,
      { theme: themeWithValues() }
    )
    const checkout = container.querySelector('[data-doc-control="cart-checkout"]')
    expect(checkout).toHaveAttribute('data-slot', 'button')
    expect(checkout).toHaveTextContent(/Minimum subtotal order/)
    const labels = [...checkout.querySelectorAll('span')].filter((span) => span.children.length === 0 && /20/.test(span.textContent))
    expect(labels).toHaveLength(1)
    expect(labels[0].textContent).toMatch(/^Minimum subtotal order:? .*20/)
  })

  it('a cart of a group keeps its layout', () => {
    expect(footerCss(themeWithValues(), { isInCartGroup: true }).css).not.toMatch(/flex:00auto;width:100%;min-width:0;max-width:100%/)
  })

  it('the footer gives its action slots widths only: the Buttons inside fill them, their display, one line and text are the Button\'s', () => {
    ;[{}, { isInCartGroup: true }].forEach((props) => {
      const { css, slot, slotCss } = footerCss(themeWithValues(), props)
      expect(css).toMatch(new RegExp(`\\.${slot}\\{min-width:18ch;max-width:70%;[^}]*(^|;)flex-shrink:1;\\}`))
      // its ch are the Button's own characters: the slot takes the Button's font
      expect(slotCss).toMatch(/font-family:[^;]+;font-size:\d+(\.\d+)?px;font-weight:\d+;/)
      expect(css).not.toMatch(/(^|[}>])button|display:block|white-space|text-align|overflow-wrap|hyphens/)
    })
  })
})

// visibility.cart.business_name / go_to_store / clear: the pieces of the cart's header
describe('the cart\'s header pieces (visibility.cart.*)', () => {
  const withVisibility = (visibility) => themeWithValues((values) => {
    Object.assign(values.visibility, visibility)
    return values
  })
  const shown = (theme) => {
    const utils = renderLinks(theme)
    const result = {
      name: !!utils.container.querySelector('h3'),
      store: !!utils.queryByText('Go to store'),
      clear: !!utils.queryByText('Clear cart')
    }
    utils.unmount()
    return result
  }

  it('the schema: all three shown by default', () => {
    expect(schemaDefault('visibility.cart.business_name')).toBe(true)
    expect(schemaDefault('visibility.cart.go_to_store')).toBe(true)
    expect(schemaDefault('visibility.cart.clear')).toBe(true)
    expect(shown(themeWithValues())).toEqual({ name: true, store: true, clear: true })
  })

  it('the theme hides each one apart', () => {
    expect(shown(withVisibility({ 'cart.business_name': false }))).toEqual({ name: false, store: true, clear: true })
    expect(shown(withVisibility({ 'cart.go_to_store': false }))).toEqual({ name: true, store: false, clear: true })
    expect(shown(withVisibility({ 'cart.clear': false }))).toEqual({ name: true, store: true, clear: false })
  })

  it('cart.clear hides the Clear cart of a closed store too', () => {
    const closed = (theme) => {
      const utils = renderWithProviders(
        <BusinessItemAccordion business={businessFixture} cart={validCart} isProducts isClosed handleClearProducts={vi.fn()} />,
        { theme }
      )
      const result = !!utils.queryByText('Clear cart')
      utils.unmount()
      return result
    }
    expect(closed(themeWithValues())).toBe(true)
    expect(closed(withVisibility({ 'cart.clear': false }))).toBe(false)
  })
})

// implementation notesthe cart's view (popover, modal, drawer)
describe('the cart\'s header in the cart\'s view', () => {
  const header = (props) => renderWithProviders(
    <BusinessItemAccordion
      business={businessFixture}
      cart={{ ...validCart, products: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }] }}
      uuid='cart-1'
      isProducts
      showUpsellingInBusinessInfo
      handleClearProducts={vi.fn()}
      {...props}
    />,
    { theme: themeWithValues() }
  )

  it('a cart alone: Clear cart is a link of its header, and it neither opens nor closes', () => {
    const handleClearProducts = vi.fn()
    const { getByText, container } = header({ isForceOpenAccordion: true, handleClearProducts })
    expect(container.querySelector('button.accordion-toggle')).toBeNull()
    fireEvent.click(getByText('Clear cart'))
    expect(handleClearProducts).toHaveBeenCalledTimes(1)
  })

  it('in the store\'s page: the count of items instead of the store\'s name', () => {
    const { getByText, container } = header({ isForceOpenAccordion: true, isStore: true })
    expect(getByText('3 items')).toBeInTheDocument()
    expect(container.querySelector('h3')).toBeNull()
  })

  it('several carts: each one keeps its toggle', () => {
    const { container } = header({})
    expect(container.querySelector('button.accordion-toggle')).not.toBeNull()
  })

  // implementation notesthe section gives its margin back to a modal's padding only when its sticky footer is there to cover it
  describe('the section margin that depends on the sticky footer', () => {
    const base = {
      business: businessFixture,
      cart: validCart,
      uuid: 'cart-1',
      isProducts: true,
      isForceOpenAccordion: true,
      isStickyFooter: true,
      showUpsellingInBusinessInfo: true,
      total: 12,
      handleClickCheckout: vi.fn(),
      handleStoreRedirect: vi.fn()
    }
    const sectionCss = (props) => {
      const { container, unmount } = renderWithProviders(<BusinessItemAccordion {...base} {...props} />)
      const footer = !!container.querySelector('[data-doc-section=cart-handoff]')
      const css = cssFor(container.firstChild)
      unmount()
      return { footer, takesPaddingBack: css.includes('--layer-pad-bottom') }
    }

    it('with its footer: the negative margin', () => {
      expect(sectionCss({})).toEqual({ footer: true, takesPaddingBack: true })
    })

    it('closed, without products, in the checkout or without a sticky footer: no footer and no negative margin', () => {
      for (const props of [{ isClosed: true }, { isProducts: 0 }, { isCheckout: true }, { isStickyFooter: false }]) {
        expect(sectionCss(props).takesPaddingBack, JSON.stringify(props)).toBe(false)
      }
      expect(sectionCss({ isClosed: true }).footer).toBe(false)
      expect(sectionCss({ isProducts: 0 }).footer).toBe(false)
    })
  })
})
