import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// implementation noteswith the store closed and no valid scheduled moment (or a
// product whose own schedule rules it out even with one), ProductForm opens
// read-only — "Add to cart", the quantity stepper and the comment box
// really disabled (not only styled that way). implementation notesthe footer then
// shows one action instead of Add to cart / Login-SignUp — "Schedule for
// later" (preorder enabled) or the closed label, disabled (no preorder) —
// and the rows (ingredients, suboptions) keep their normal look, only their
// control and price dimmed, not a gray block. A valid moment reactivates it
// without remounting the listing's modal.

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
// the last describe block below uses the real OrderContext (its own doMock
// per test overrides this for every other test in the file)
vi.unmock('~components/contexts/OrderContext')

const product = (overrides = {}) => ({ id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', ingredients: [], extras: [], ...overrides })

const defaultProductCart = { quantity: 1, options: {}, ingredients: {} }

const renderProductForm = async ({
  business = { id: 1, name: 'Store', open: false },
  moment = null,
  product: productOverride,
  productCart = defaultProductCart,
  onRequestSchedule,
  schedulePending
} = {}) => {
  vi.resetModules()
  const handleSave = vi.fn()

  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    // type 2 (pickup): bypasses the address requirement (shouldRequireOrderAddress),
    // unrelated to this file's own closed/moment predicate
    useOrder: () => [{ loading: false, options: { type: 2, moment } }]
  }))
  vi.doMock('~components/components/ProductForm', () => ({
    ProductForm: ({ UIComponent, ...rest }) => (
      <UIComponent
        productObject={{ product: productOverride || product(), loading: false, error: null }}
        business={business}
        handleSave={handleSave}
        increment={vi.fn()}
        decrement={vi.fn()}
        handleChangeSuboptionState={vi.fn()}
        errors={{}}
        isSoldOut={false}
        editMode={false}
        maxProductQuantity={5}
        showOption={() => true}
        onRequestSchedule={onRequestSchedule}
        schedulePending={schedulePending}
        {...rest}
        // after {...rest}: the outer exported ProductForm (index.js) always
        // recomputes rest.productCart itself (adding `quantity`) from
        // whatever this inner component got, which is nothing here (<ProductForm
        // /> above renders with no props) — this test's own cart wins
        productCart={productCart}
      />
    )
  }))

  const { ProductForm } = await import('../index')
  const utils = renderWithProviders(<ProductForm />)
  return { ...utils, handleSave }
}

describe('ProductForm: closed + unscheduled opens read-only', () => {
  it('keeps both weight unit choices disabled and identifies the selected unit', async () => {
    const { getByRole } = await renderProductForm({ product: product({ weight: 0.5, weight_unit: 'kg' }) })
    const pieces = getByRole('button', { name: 'pcs', pressed: true })
    const kg = getByRole('button', { name: 'kg', pressed: false })
    expect(pieces).toBeDisabled()
    expect(kg).toBeDisabled()
    expect(pieces).toHaveAttribute('data-slot', 'chip')
    expect(kg).toHaveAttribute('data-slot', 'chip')
    fireEvent.click(kg)
    expect(kg).toHaveAttribute('aria-pressed', 'false')
  })

  it('closed, no valid moment, preorder enabled: the footer\'s one action is an active "Schedule for later" with a visible hint, no Add to cart', async () => {
    const onRequestSchedule = vi.fn()
    const { getByRole, getByText, queryByRole, container } = await renderProductForm({ onRequestSchedule })

    expect(getByText('Closed')).toBeInTheDocument()
    const scheduleButton = getByRole('button', { name: 'Schedule for later' })
    expect(scheduleButton).toBeEnabled()
    expect(scheduleButton).toHaveAttribute('data-doc-control', 'product-schedule-for-later')

    // the visible hint, not only a tooltip: aria-describedby resolves to it
    const describedById = scheduleButton.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    const hint = document.getElementById(describedById)
    expect(hint).toHaveTextContent('The store is closed right now. Schedule your order for later to add it to your cart.')

    // no Add to cart while closed: the one action replaces it
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(container.querySelector("[data-doc-control='product-request-schedule']")).not.toBeInTheDocument()

    expect(container.querySelector("[data-doc-control='product-quantity-decrement']")).toBeDisabled()
    expect(container.querySelector("[data-doc-control='product-quantity-increment']")).toBeDisabled()
    expect(container.querySelector("[data-doc-control='product-quantity']")).toBeDisabled()

    fireEvent.click(scheduleButton)
    expect(onRequestSchedule).toHaveBeenCalledTimes(1)
  })

  it('closed, no valid moment, preorder disabled (no onRequestSchedule from the listing): the footer shows a disabled closed-label button, no schedule button, no Add to cart', async () => {
    const { getAllByText, getByRole, queryByRole } = await renderProductForm({ onRequestSchedule: undefined })

    // the closed notice (its own text) and the footer's disabled button both
    // read "Closed" here (no next opening in this business's own fixture)
    expect(getAllByText('Closed')).toHaveLength(2)
    expect(queryByRole('button', { name: 'Schedule for later' })).not.toBeInTheDocument()
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    const closedButton = getByRole('button', { name: 'Closed' })
    expect(closedButton).toBeDisabled()
    expect(closedButton).toHaveAttribute('data-doc-control', 'product-schedule-for-later')
  })

  it('closed + a valid moment: active again, no notice, no footer action, "Add to cart" enabled', async () => {
    const { queryByText, queryByRole, getByRole } = await renderProductForm({
      moment: '2026-10-21 09:00:00',
      onRequestSchedule: vi.fn()
    })

    expect(queryByText('Closed')).not.toBeInTheDocument()
    expect(queryByRole('button', { name: 'Schedule for later' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Add to cart' })).toBeEnabled()
  })

  it('closed + a valid moment, but the product itself still rules out scheduling: stays read-only, "Schedule for later" active in place of Add to cart', async () => {
    const { getByText, getByRole, queryByRole } = await renderProductForm({
      moment: '2026-10-21 09:00:00',
      product: product({ schedule_available: false }),
      onRequestSchedule: vi.fn()
    })

    expect(getByText('Closed')).toBeInTheDocument()
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Schedule for later' })).toBeEnabled()
  })

  it('schedulePending keeps it read-only even with an already-valid moment (a slot tapped, "Go to menu" not clicked yet)', async () => {
    const { getByText, getByRole, queryByRole } = await renderProductForm({
      moment: '2026-10-21 09:00:00',
      onRequestSchedule: vi.fn(),
      schedulePending: true
    })

    expect(getByText('Closed')).toBeInTheDocument()
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Schedule for later' })).toBeEnabled()
  })

  it('open business: never read-only, whatever the moment or the product\'s own schedule', async () => {
    const { queryByText, getByRole } = await renderProductForm({
      business: { id: 1, name: 'Store', open: true },
      product: product({ schedule_available: false }),
      onRequestSchedule: vi.fn()
    })

    expect(queryByText('Closed')).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Add to cart' })).toBeEnabled()
  })

  // implementation notesthe gray block (WrapperSubOption.soldout / WrapperIngredients
  // isProductSoldout) is gone; rows keep their normal background while closed,
  // only really disabled — and, unlike sold out, an ingredient already in the
  // cart's defaults stays checked (ProductIngredient's own checked = selected
  // && !isSoldOut, never read from isReadOnly)
  it('closed + unscheduled: ingredient and suboption rows keep their normal look (no .soldout) and the cart\'s own selection, only really disabled', async () => {
    const productWithOptions = product({
      ingredients: [{ id: 200, name: 'Onion' }],
      extras: [{
        id: 1,
        rank: 1,
        options: [{
          id: 100,
          rank: 1,
          min: 0,
          max: 2,
          suboptions: [{ id: 1000, rank: 1, enabled: true, name: 'Extra cheese', price: 1 }]
        }]
      }]
    })
    const cart = {
      quantity: 1,
      ingredients: { 'id:200': { selected: true } },
      options: { 'id:100': { suboptions: { 'id:1000': { selected: true } }, balance: 1 } }
    }
    const { container } = await renderProductForm({ product: productWithOptions, productCart: cart })

    expect(container.querySelector('.soldout')).not.toBeInTheDocument()

    // the marker is the control itself (the piece's Choice: role checkbox / radio)
    const ingredient = container.querySelector("[data-doc-control='product-ingredient'][data-doc-ingredient-id='200']")
    expect(ingredient).toHaveAttribute('aria-disabled', 'true')
    expect(ingredient).toHaveAttribute('aria-checked', 'true')

    const suboption = container.querySelector("[data-doc-control='product-suboption'][data-doc-suboption-id='1000']")
    expect(suboption).toHaveAttribute('aria-disabled', 'true')
    expect(suboption).toHaveAttribute('aria-checked', 'true')
  })
})

// The real OrderContext (submodule): confirms the predicate reacts to an
// actual changeMoment call, not only to a mocked options object — the same
// regression class as ProductForm.realOrderContext.test.jsx.
describe('ProductForm: closed + unscheduled with the real OrderContext', () => {
  it('a valid moment from the real changeMoment lifts the read-only state', async () => {
    vi.resetModules()
    // undoes the earlier tests' own vi.doMock('~components/contexts/OrderContext', ...),
    // which (unlike vi.resetModules) outlives them for the rest of this file
    vi.doUnmock('~components/contexts/OrderContext')
    const handleSave = vi.fn()

    vi.doMock('~components/contexts/SessionContext', () => ({
      useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
    }))
    vi.doMock('~components/contexts/ApiContext', () => ({
      useApi: () => [{
        project: 'demo',
        setAccessToken: () => ({
          orderOptions: () => ({
            // echoes back the type (changeType(2)) and then the moment, each
            // as the real API would — the string format `state.options.moment`
            // is read as everywhere else, not the raw unix seconds this sends.
            // An authed changeMoment has no local optimistic update (unlike a
            // guest's): state only gets the new moment once this resolves, so
            // a stale echo here would leave the predicate still "requires one"
            save: vi.fn().mockImplementation((body) => Promise.resolve({
              content: { error: false, result: body.moment ? { moment: '2026-11-17 17:00:00' } : { type: body.type } },
              status: 200
            })),
            get: vi.fn().mockResolvedValue({ content: { error: false, result: { carts: [] } }, status: 200 })
          })
        })
      }, { setOrdering: vi.fn(), setLanguage: vi.fn() }]
    }))
    vi.doMock('~components/contexts/ToastContext', () => ({
      ToastType: { Error: 'error', Success: 'success', Info: 'info' },
      useToast: () => [[], { showToast: vi.fn() }],
      useToastActions: () => ({ showToast: vi.fn() })
    }))
    vi.doMock('~components/components/ProductForm', () => ({
      ProductForm: ({ UIComponent, ...rest }) => (
        <UIComponent
          productObject={{ product: product(), loading: false, error: null }}
          business={{ id: 1, name: 'Store', open: false }}
          handleSave={handleSave}
          increment={vi.fn()}
          decrement={vi.fn()}
          handleChangeSuboptionState={vi.fn()}
          errors={{}}
          isSoldOut={false}
          editMode={false}
          maxProductQuantity={5}
          showOption={() => true}
          productCart={{ quantity: 1, options: {}, ingredients: {} }}
          {...rest}
        />
      )
    }))

    const { OrderProvider, useOrder } = await import('~components/contexts/OrderContext')
    const { ProductForm } = await import('../index')

    let orderActions
    const OrderProbe = () => {
      ;[, orderActions] = useOrder()
      return null
    }

    const strategy = { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn(), removeItem: vi.fn() }

    const { getAllByText, queryByText, getByRole, queryByRole } = renderWithProviders(
      <OrderProvider strategy={strategy}>
        <OrderProbe />
        <ProductForm />
      </OrderProvider>
    )

    await waitFor(() => expect(typeof orderActions?.changeMoment).toBe('function'))
    // pickup: bypasses the address requirement (shouldRequireOrderAddress),
    // unrelated to this test's own closed/moment predicate
    await act(async () => { await orderActions.changeType(2) })
    // the closed notice and the footer's disabled button both read "Closed"
    expect(getAllByText('Closed').length).toBeGreaterThan(0)
    // no onRequestSchedule from this test's own ProductForm mock: the
    // footer's one action is the disabled closed-label button, never Add to cart
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Closed' })).toBeDisabled()

    const moment = new Date('2026-11-17T17:00:00.000Z')
    await act(async () => { await orderActions.changeMoment(moment) })

    expect(queryByText('Closed')).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Add to cart' })).toBeEnabled()
  })

  // the listing passes schedulePending={!!pendingSchedule}: MomentOption's
  // changeMoment already committed a real, valid moment above (the slot tap,
  // before BusinessPreorder's own "Go to menu" confirm) — schedulePending
  // must still block activation on its own, not just a mocked options object
  it('schedulePending blocks activation even once the real changeMoment commits a valid moment', async () => {
    vi.resetModules()
    vi.doUnmock('~components/contexts/OrderContext')
    const handleSave = vi.fn()

    vi.doMock('~components/contexts/SessionContext', () => ({
      useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
    }))
    vi.doMock('~components/contexts/ApiContext', () => ({
      useApi: () => [{
        project: 'demo',
        setAccessToken: () => ({
          orderOptions: () => ({
            save: vi.fn().mockImplementation((body) => Promise.resolve({
              content: { error: false, result: body.moment ? { moment: '2026-11-17 17:00:00' } : { type: body.type } },
              status: 200
            })),
            get: vi.fn().mockResolvedValue({ content: { error: false, result: { carts: [] } }, status: 200 })
          })
        })
      }, { setOrdering: vi.fn(), setLanguage: vi.fn() }]
    }))
    vi.doMock('~components/contexts/ToastContext', () => ({
      ToastType: { Error: 'error', Success: 'success', Info: 'info' },
      useToast: () => [[], { showToast: vi.fn() }],
      useToastActions: () => ({ showToast: vi.fn() })
    }))
    vi.doMock('~components/components/ProductForm', () => ({
      ProductForm: ({ UIComponent, ...rest }) => (
        <UIComponent
          productObject={{ product: product(), loading: false, error: null }}
          business={{ id: 1, name: 'Store', open: false }}
          handleSave={handleSave}
          increment={vi.fn()}
          decrement={vi.fn()}
          handleChangeSuboptionState={vi.fn()}
          errors={{}}
          isSoldOut={false}
          editMode={false}
          maxProductQuantity={5}
          showOption={() => true}
          productCart={{ quantity: 1, options: {}, ingredients: {} }}
          schedulePending
          {...rest}
        />
      )
    }))

    const { OrderProvider, useOrder } = await import('~components/contexts/OrderContext')
    const { ProductForm } = await import('../index')

    let orderActions
    const OrderProbe = () => {
      ;[, orderActions] = useOrder()
      return null
    }

    const strategy = { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn(), removeItem: vi.fn() }

    const { getAllByText, getByRole, queryByRole } = renderWithProviders(
      <OrderProvider strategy={strategy}>
        <OrderProbe />
        <ProductForm />
      </OrderProvider>
    )

    await waitFor(() => expect(typeof orderActions?.changeMoment).toBe('function'))
    await act(async () => { await orderActions.changeType(2) })
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Closed' })).toBeDisabled()

    // the slot tap: a real, valid moment, before any "Go to menu" confirm
    const moment2 = new Date('2026-11-17T17:00:00.000Z')
    await act(async () => { await orderActions.changeMoment(moment2) })

    // still read-only: schedulePending overrides the now-valid moment
    expect(getAllByText('Closed').length).toBeGreaterThan(0)
    expect(queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Closed' })).toBeDisabled()
  })
})
