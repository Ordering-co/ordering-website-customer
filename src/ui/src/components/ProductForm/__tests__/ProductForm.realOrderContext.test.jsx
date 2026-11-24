import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notes (regression, PR #17 was reverted for this): ProductForm must
// only call functions the REAL OrderContext (submodule) actually exposes.
// Every other ProductForm test mocks `~components/contexts/OrderContext`
// wholesale, so none of them would have failed when ProductForm called
// `updateOrderOptions` and OrderContext's `functions` object did not expose
// it (`TypeError: ... is not a function`, white screen in production). This
// test keeps the real OrderProvider/useOrder and mocks only the network (the
// ordering SDK) and a minimal, reactive session.

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

// the real OrderContext (submodule), never mocked in this file
vi.unmock('~components/contexts/OrderContext')

const product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', ingredients: [], extras: [] }

// a minimal but REAL (React state + context) session: the real OrderProvider
// sits above where the guest user is created, so it must actually re-render
// (and re-read session.auth) once login happens — a plain mutated object (as
// the other ProductForm tests use, safe only because they mock OrderContext
// away) would leave OrderProvider's closures stuck on the stale `auth: false`
const SessionCtx = React.createContext()
const SessionProviderMock = ({ children }) => {
  const [session, setSession] = React.useState({ auth: false, loading: false, user: null, token: null })
  const login = (user) => setSession({ auth: true, loading: false, user, token: 'guest-token' })
  return <SessionCtx.Provider value={[session, { login, logout: vi.fn() }]}>{children}</SessionCtx.Provider>
}

const mocks = vi.hoisted(() => ({
  orderOptionsSave: vi.fn(),
  orderOptionsGet: vi.fn()
}))

describe('ProductForm with the real OrderContext (implementation notes regression)', () => {
  it('syncs the preorder type/moment via the real updateOrderOptions before adding the product', async () => {
    vi.resetModules()
    mocks.orderOptionsSave.mockReset().mockResolvedValue({
      content: { error: false, result: { type: 2 } },
      status: 200
    })
    mocks.orderOptionsGet.mockReset().mockResolvedValue({
      content: { error: false, result: { carts: [] } },
      status: 200
    })

    vi.doMock('~components/contexts/SessionContext', () => ({
      useSession: () => React.useContext(SessionCtx)
    }))
    vi.doMock('~components/contexts/ApiContext', () => ({
      useApi: () => [{
        project: 'demo',
        setAccessToken: () => ({
          orderOptions: () => ({ save: mocks.orderOptionsSave, get: mocks.orderOptionsGet })
        })
      }, { setOrdering: vi.fn(), setLanguage: vi.fn() }]
    }))
    // the global mock (setupTests.js) only exposes useToast, not
    // useToastActions, which the real OrderContext also needs
    vi.doMock('~components/contexts/ToastContext', () => ({
      ToastType: { Error: 'error', Success: 'success', Info: 'info' },
      useToast: () => [[], { showToast: vi.fn() }],
      useToastActions: () => ({ showToast: vi.fn() })
    }))

    const handleSave = vi.fn()
    // the fake controller stand-in for the submodule's real `ProductForm`
    // (~components/components/ProductForm): it loads a product, fetches
    // extras, etc. — out of scope here. `handleCreateGuestUser` is the one
    // thing under test: it must flip the REAL session to authenticated, the
    // same way the real guest-signup controller does.
    vi.doMock('~components/components/ProductForm', () => ({
      ProductForm: ({ UIComponent, ...rest }) => {
        const [actionStatus, setActionStatus] = React.useState({ loading: false, error: null })
        const [, { login }] = React.useContext(SessionCtx)
        const handleCreateGuestUser = async () => {
          setActionStatus({ loading: true, error: null })
          await Promise.resolve()
          login({ id: 99, guest_id: 'guest-1' })
          setActionStatus({ loading: false, error: null })
        }
        return (
          <UIComponent
            productObject={{ product, loading: false, error: null }}
            business={{ id: 1, name: 'Store', slug: 'mcbonalds' }}
            handleSave={handleSave}
            handleCreateGuestUser={handleCreateGuestUser}
            actionStatus={actionStatus}
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
      }
    }))

    const { OrderProvider, useOrder } = await import('~components/contexts/OrderContext')
    const { ProductForm } = await import('../index')

    let orderActions
    const OrderProbe = () => {
      ;[, orderActions] = useOrder()
      return null
    }

    const strategy = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }

    const theme = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' } })
    const { getByRole } = renderWithProviders(
      <SessionProviderMock>
        <OrderProvider strategy={strategy}>
          <OrderProbe />
          <ProductForm />
        </OrderProvider>
      </SessionProviderMock>,
      { theme }
    )

    await waitFor(() => expect(typeof orderActions?.changeType).toBe('function'))

    // the guest picks pickup + a preorder moment before signing up — exactly
    // what a "preorder on pickup" guest does on a One/guest store
    const moment = new Date('2026-11-17T17:00:00.000Z')
    await act(async () => { await orderActions.changeType(2) })
    await act(async () => { await orderActions.changeMoment(moment) })

    fireEvent.click(getByRole('button', { name: 'Add to cart' }))

    await waitFor(() => expect(handleSave).toHaveBeenCalled())

    expect(mocks.orderOptionsSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 2, moment: Math.floor(moment.getTime() / 1000), user_id: 99 }),
      expect.anything()
    )
    expect(mocks.orderOptionsSave.mock.invocationCallOrder[0])
      .toBeLessThan(handleSave.mock.invocationCallOrder[0])
  })
})
