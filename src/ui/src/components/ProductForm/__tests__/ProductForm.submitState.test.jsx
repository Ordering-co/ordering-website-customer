import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notes / implementation notesthe buttons that add to cart are the base Button with `busy` (the legacy
// `$busy` before). While the add
// loads (the order's `loading` with a session, the guest's `actionStatus`
// without one) they show the spinner and say so (aria-busy) but are not
// disabled, and a click does not add again. The click that started the add
// says "Adding to cart…"; a load that comes from elsewhere is only "Loading".

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({
  Navigation: class Navigation {},
  Pagination: class Pagination {},
  Thumbs: class Thumbs {}
}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ children }) => <div data-testid='product-option'>{children}</div>
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => <div data-testid='address-list' /> }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

const product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', ingredients: [], extras: [] }

// the load the controller reports (the order's `loading` with a session, the guest's `actionStatus`
// without one), changed from a test like the controller does while it adds
const load = vi.hoisted(() => {
  const listeners = new Set()
  return {
    value: false,
    set (value) { this.value = value; listeners.forEach((listener) => listener()) },
    subscribe (listener) { listeners.add(listener); return () => listeners.delete(listener) }
  }
})

// with a session or as a guest of a guest store; `handleSave` / `handleCreateGuestUser` are what a click reaches
const renderProductForm = async ({ auth, loading = false, errors = {}, handleSave = vi.fn(), handleCreateGuestUser = vi.fn(), form = {} }) => {
  vi.resetModules()
  load.value = loading
  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth, user: auth ? { id: 1 } : null }, { login: vi.fn() }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => {
      const value = React.useSyncExternalStore(load.subscribe.bind(load), () => load.value)
      return [{ loading: auth && value, options: { type: 1, address: { location: { lat: 1, lng: 1 } } } }, { updateOrderOptions: vi.fn() }]
    }
  }))
  vi.doMock('~components/contexts/ConfigContext', () => ({
    useConfig: () => [{ configs: { guest_checkout_enabled: { value: '0' }, allowed_order_types_guest_checkout: { value: '' } } }]
  }))
  vi.doMock('~components/components/ProductForm', () => ({
    ProductForm: ({ UIComponent, ...rest }) => {
      const value = React.useSyncExternalStore(load.subscribe.bind(load), () => load.value)
      return (
        <UIComponent
          productObject={{ product, loading: false, error: null }}
          business={{ id: 1, name: 'Store', slug: 'mcbonalds' }}
          handleSave={handleSave}
          handleCreateGuestUser={handleCreateGuestUser}
          actionStatus={{ loading: !auth && value, error: null }}
          increment={vi.fn()}
          decrement={vi.fn()}
          handleChangeSuboptionState={vi.fn()}
          errors={errors}
          isSoldOut={false}
          editMode={false}
          maxProductQuantity={5}
          showOption={() => true}
          productCart={{ quantity: 1, options: {}, ingredients: {} }}
          {...rest}
          {...form}
        />
      )
    }
  }))
  const { ProductForm } = await import('../index')
  const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' } })
  const utils = renderWithProviders(<ProductForm />, { theme })
  const addButton = () => utils.container.querySelector('[data-doc-control="add-product-to-cart"]')
  return { ...utils, handleSave, handleCreateGuestUser, addButton }
}

// a save the test settles: it loads (as the controller does) until it ends
const deferredSave = () => {
  const save = { settle: null }
  save.handleSave = vi.fn(() => new Promise((resolve, reject) => {
    load.set(true)
    save.settle = ({ fail = false, keepLoading = false } = {}) => {
      if (!keepLoading) load.set(false)
      return fail ? reject(new Error('failed')) : resolve()
    }
  }))
  return save
}

describe.each([
  ['with a session', true, 'handleSave'],
  ['as a guest of a guest store', false, 'handleCreateGuestUser']
])('ProductForm add to cart, %s', (_, auth, action) => {
  it('while it loads from elsewhere: the spinner, aria-busy, not disabled, "Loading" (not "Adding to cart…") and the click adds nothing', async () => {
    const view = await renderProductForm({ auth, loading: true })
    const button = view.addButton()
    // the base Button's busy spinner, not the legacy one
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('data-busy')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button.firstChild).toHaveAttribute('data-slot', 'button-spinner')
    expect(button.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(button).toHaveTextContent('Loading')
    expect(button).not.toHaveTextContent('Adding to cart')
    fireEvent.click(button)
    expect(view[action]).not.toHaveBeenCalled()
  })

  it('not loading: no spinner, no aria-busy and the click adds', async () => {
    const view = await renderProductForm({ auth, loading: false })
    const button = view.addButton()
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).not.toHaveAttribute('data-busy')
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button.querySelector('[aria-hidden]')).toBeNull()
    expect(button).toHaveTextContent('Add to cart')
    fireEvent.click(button)
    expect(view[action]).toHaveBeenCalledTimes(1)
  })

  it('an error of an option still reaches the click: it jumps to the first one, adds nothing and is not "Adding to cart…"', async () => {
    // the first group with an error, as the options render it
    // (jsdom has no Element.scrollTo)
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    const view = await renderProductForm({ auth, errors: { 'id:9': true } })
    view.container.querySelector('.product-container').insertAdjacentHTML('beforeend', '<div class="error" id="id_9" tabindex="-1"></div>')
    expect(document.activeElement.id).not.toBe('id_9')
    fireEvent.click(view.addButton())
    expect(view[action]).not.toHaveBeenCalled()
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(document.activeElement.id).toBe('id_9')
    expect(view.addButton()).not.toHaveAttribute('aria-busy')
    expect(view.addButton()).toHaveTextContent('Add to cart')
    document.getElementById('id_9').remove()
    delete Element.prototype.scrollTo
  })
})

// a state the caller decides stays the caller's: it disables the button (a click adds nothing) or, with a
// choice missing, leaves it clickable so the click can take the customer there
describe.each([
  ['with a session', true],
  ['as a guest of a guest store', false]
])('ProductForm add to cart, disabled cases, %s', (_, auth) => {
  it.each([
    ['quantity 0', { productCart: { quantity: 0, options: {}, ingredients: {} } }],
    ['under the minimum per order', { productCart: { quantity: 1, options: {}, ingredients: {} }, productObject: { product: { ...product, minimum_per_order: 3 }, loading: false, error: null } }],
    ['over the maximum per order', { productCart: { quantity: 2, options: {}, ingredients: {} }, productObject: { product: { ...product, maximum_per_order: 1 }, loading: false, error: null } }]
  ])('%s: the base Button is disabled, not busy', async (__, form) => {
    const view = await renderProductForm({ auth, form })
    const button = view.addButton()
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('disabled while it loads: disabled wins over busy (as the legacy one), no spinner and no click', async () => {
    const view = await renderProductForm({ auth, loading: true, form: { productCart: { quantity: 0, options: {}, ingredients: {} } } })
    const button = view.addButton()
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button.querySelector('[data-slot=button-spinner]')).toBeNull()
  })

  it('lets the priced action wrap and keeps the total in its accessible name', async () => {
    const view = await renderProductForm({ auth, form: { productCart: { quantity: 1, total: 12.5, options: {}, ingredients: {} } } })
    const button = view.addButton()
    const [label, total] = button.querySelectorAll('[data-slot=button] > span > span > span')
    const labelStyle = window.getComputedStyle(label)
    expect(button).toHaveAccessibleName('Add to cart $12.5')
    expect(button).toHaveClass('ui:h-auto')
    expect(labelStyle.whiteSpace).toBe('normal')
    expect(labelStyle.minWidth).toBe('0')
    expect(window.getComputedStyle(total).flexShrink).toBe('0')
    expect(window.getComputedStyle(label.parentElement).flexWrap).toBe('wrap')
  })

  it('a missing choice leaves it enabled (the click jumps to it) and it is a full width base Button', async () => {
    const view = await renderProductForm({ auth, errors: { 'id:9': true } })
    view.container.querySelector('.product-container').insertAdjacentHTML('beforeend', '<div class="error" id="id_9" tabindex="-1"></div>')
    const button = view.addButton()
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).not.toBeDisabled()
    expect(button).toHaveClass('disabled')
    expect(button).toHaveClass('ui:w-full')
  })
})

describe('ProductForm add to cart, the click that adds says so', () => {
  it('with a session: the click says "Adding to cart…" while it loads and goes back to "Add to cart" when the save ends', async () => {
    const save = deferredSave()
    const view = await renderProductForm({ auth: true, handleSave: save.handleSave })
    fireEvent.click(view.addButton())
    await waitFor(() => expect(view.addButton()).toHaveAttribute('aria-busy', 'true'))
    expect(view.addButton()).toHaveTextContent('Adding to cart…')
    expect(view.addButton().firstChild).toHaveAttribute('data-slot', 'button-spinner')
    fireEvent.click(view.addButton())
    expect(save.handleSave).toHaveBeenCalledTimes(1)
    await act(async () => { save.settle() })
    await waitFor(() => expect(view.addButton()).toHaveTextContent('Add to cart'))
    expect(view.addButton()).not.toHaveAttribute('aria-busy')
  })

  it('with a session: a save that fails also takes "Adding to cart…" away (a load that goes on is "Loading")', async () => {
    const save = deferredSave()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = await renderProductForm({ auth: true, handleSave: save.handleSave })
    fireEvent.click(view.addButton())
    await waitFor(() => expect(view.addButton()).toHaveTextContent('Adding to cart…'))
    await act(async () => { save.settle({ fail: true, keepLoading: true }) })
    await waitFor(() => expect(view.addButton()).toHaveTextContent('Loading'))
    expect(view.addButton()).not.toHaveTextContent('Adding to cart')
    logged.mockRestore()
  })

  it('as a guest: the click says "Adding to cart…" while the guest user is created', async () => {
    const view = await renderProductForm({ auth: false, handleCreateGuestUser: vi.fn(() => load.set(true)) })
    fireEvent.click(view.addButton())
    await waitFor(() => expect(view.addButton()).toHaveAttribute('aria-busy', 'true'))
    expect(view.addButton()).toHaveTextContent('Adding to cart…')
    expect(view.handleCreateGuestUser).toHaveBeenCalledTimes(1)
    fireEvent.click(view.addButton())
    expect(view.handleCreateGuestUser).toHaveBeenCalledTimes(1)
  })
})
