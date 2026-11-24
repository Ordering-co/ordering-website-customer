import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation noteson a guest store (One store, or entered directly on a
// store's page) a visitor without a session adds to cart with the same
// "Add to cart" button, no extra "As guest user" click: a guest user is
// created first, the product is added once the login goes through.

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

// a tiny stand-in session: `login` flips `auth`, like the real SessionContext
const session = vi.hoisted(() => ({ auth: false, user: null }))

/**
 * @param {{ guestStore: boolean, handleSave: Function, orderOptions: object, updateOrderOptions: Function }} opts
 * guestStore drives the theme (One store) and the guest checkout settings
 * are off, so only `guestStore` can make the guest add directly.
 */
const renderProductForm = async ({
  guestStore,
  handleSave = vi.fn(),
  orderOptions = { type: 1, address: { location: { lat: 1, lng: 1 } } },
  updateOrderOptions = vi.fn().mockResolvedValue(true)
} = {}) => {
  vi.resetModules()
  session.auth = false
  session.user = null

  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth: session.auth, user: session.user }, {
      login: ({ user }) => { session.auth = true; session.user = user }
    }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{ loading: false, options: orderOptions }, { updateOrderOptions }]
  }))
  vi.doMock('~components/contexts/ConfigContext', () => ({
    // guest checkout settings off: only guestStore can allow the guest through
    useConfig: () => [{ configs: { guest_checkout_enabled: { value: '0' }, allowed_order_types_guest_checkout: { value: '' } } }]
  }))
  vi.doMock('~components/components/ProductForm', () => ({
    ProductForm: ({ UIComponent, ...rest }) => {
      const [actionStatus, setActionStatus] = React.useState({ loading: false, error: null })
      const handleCreateGuestUser = async () => {
        setActionStatus({ loading: true, error: null })
        await Promise.resolve()
        session.auth = true
        session.user = { id: 99, guest_id: 'guest-1' }
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

  const { ProductForm } = await import('../index')
  const theme = guestStore
    ? themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' } })
    : themeWithValues()
  const utils = renderWithProviders(<ProductForm />, { theme })
  return { ...utils, handleSave, updateOrderOptions }
}

describe('ProductForm: guest store add to cart', () => {
  it('a guest store shows "Add to cart" (not Login / Sign Up) and adds the product once the guest user is created', async () => {
    const handleSave = vi.fn()
    const { getByRole, queryByText } = await renderProductForm({ guestStore: true, handleSave })

    expect(queryByText('Login / Sign Up')).toBeNull()
    const addButton = getByRole('button', { name: 'Add to cart' })

    fireEvent.click(addButton)

    await waitFor(() => expect(handleSave).toHaveBeenCalled())
  })

  it('without a guest store, the same product shows Login / Sign Up, not Add to cart', async () => {
    const handleSave = vi.fn()
    const { queryByRole, getByRole } = await renderProductForm({ guestStore: false, handleSave })

    expect(queryByRole('button', { name: 'Add to cart' })).toBeNull()
    expect(getByRole('button', { name: 'Login / Sign Up' })).toBeInTheDocument()
    expect(handleSave).not.toHaveBeenCalled()
  })

  // implementation notesthe login window is the base Dialog's `xl` size (760px), not a width of its own
  it('Login / Sign Up opens the nested login window at the Dialog\'s xl size', async () => {
    const { getByRole } = await renderProductForm({ guestStore: false })
    fireEvent.click(getByRole('button', { name: 'Login / Sign Up' }))
    await waitFor(() => expect(document.querySelector('[data-slot=dialog-content]')).not.toBeNull())
    const content = document.querySelector('[data-slot=dialog-content]')
    const holder = content.closest('[style*="--ui-modal-width"]')
    expect(holder.style.getPropertyValue('--ui-modal-width')).toBe(`${themeWithValues().values.components.modal.sizes.xl.width}px`)
  })

  // implementation notesthe type/moment picked before the guest user existed only
  // lived in OrderContext's local state; the API add defaulted the missing
  // moment to "now" and rejected it on a closed store ("no menus")
  it('syncs the preorder type/moment picked before login, before adding the product', async () => {
    const handleSave = vi.fn()
    const updateOrderOptions = vi.fn().mockResolvedValue(true)
    const { getByRole } = await renderProductForm({
      guestStore: true,
      handleSave,
      updateOrderOptions,
      orderOptions: {
        type: 2,
        moment: '2026-11-17 17:00:00',
        address: { location: { lat: 1, lng: 1 } }
      }
    })

    fireEvent.click(getByRole('button', { name: 'Add to cart' }))

    await waitFor(() => expect(handleSave).toHaveBeenCalled())
    expect(updateOrderOptions).toHaveBeenCalledWith({ type: 2, moment: 1794934800 })
    expect(updateOrderOptions.mock.invocationCallOrder[0])
      .toBeLessThan(handleSave.mock.invocationCallOrder[0])
  })

  it('does not add the product when syncing the order options fails', async () => {
    const handleSave = vi.fn()
    const updateOrderOptions = vi.fn().mockResolvedValue(false)
    const { getByRole } = await renderProductForm({
      guestStore: true,
      handleSave,
      updateOrderOptions,
      orderOptions: {
        type: 2,
        moment: '2026-11-17 17:00:00',
        address: { location: { lat: 1, lng: 1 } }
      }
    })

    fireEvent.click(getByRole('button', { name: 'Add to cart' }))

    await waitFor(() => expect(updateOrderOptions).toHaveBeenCalled())
    // let the resolved updateOrderOptions promise's .then() run before asserting the negative
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(handleSave).not.toHaveBeenCalled()
  })
})
