import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { OrderProvider, useOrder } from '~components/contexts/OrderContext'
import { ProductForm } from '../index'

vi.unmock('~components/contexts/OrderContext')
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => React.useContext(SessionContext)
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => React.useContext(ApiContext)
}))
vi.mock('~components/contexts/ToastContext', () => ({
  ToastType: { Error: 'error', Success: 'success', Info: 'info' },
  useToast: () => [[], { showToast: vi.fn() }],
  useToastActions: () => ({ showToast: vi.fn() })
}))
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))
vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...props }) => {
    const [, { login }] = React.useContext(SessionContext)
    const [, { addProduct }] = useOrder()
    return (
      <UIComponent
        {...props}
        productObject={{ product, loading: false, error: null }}
        productCart={productCart}
        business={{ id: 55, name: 'Cha Sha', slug: 'cha_sha' }}
        handleSave={() => addProduct(productCart, { business_id: 55 }, false)}
        handleCreateGuestUser={login}
        errors={{}}
        isSoldOut={false}
        maxProductQuantity={5}
        showOption={() => true}
      />
    )
  }
}))

const SessionContext = React.createContext()
const ApiContext = React.createContext()
const product = { id: 10, name: 'Stuffed Naan', price: 15.59, ingredients: [], extras: [] }
const productCart = {
  id: 10,
  name: 'Stuffed Naan',
  quantity: 1,
  ingredients: {},
  options: { 'id:1': { suboptions: { 'id:2': { name: 'Chicken', selected: true, quantity: 1 } } } }
}
const address = { address: '3525 Odyssey Drive, Mississauga', country_code: 'CA', location: { lat: 43.53, lng: -79.71 } }
const moment = '2026-11-21 15:00:00'
const addressId = 123
const response = (result, error = false) => ({ content: { result, error }, status: error ? 400 : 200 })

const deferred = () => {
  let finish
  const promise = new Promise(resolve => { finish = resolve })
  return { promise, resolve: finish }
}

const renderGuest = ({ waitForGuestDeliveryAddress = true, lookup = [] } = {}) => {
  const addressSaved = deferred()
  const addressLinked = deferred()
  const saveAddress = vi.fn().mockReturnValueOnce(addressSaved.promise).mockResolvedValue(response({ ...address, id: addressId }))
  const findAddress = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(response(lookup))
  }))
  const saveOptions = vi.fn(changes => changes.address_id
    ? addressLinked.promise
    : Promise.resolve(response({ type: 1, carts: [] })))
  const addProduct = vi.fn().mockResolvedValue(response({ business_id: 55, products: [productCart] }))
  const login = vi.fn()
  const api = {
    project: 'chasha',
    setAccessToken: () => api,
    users: () => ({
      addresses: id => id ? { save: vi.fn().mockResolvedValue(response({ ...address, id })) } : { where: findAddress, save: saveAddress }
    }),
    orderOptions: () => ({
      get: () => Promise.resolve(response({ type: null, moment: null, address: null, address_id: null, carts: [] })),
      save: saveOptions
    }),
    carts: () => ({ addProduct })
  }
  const stored = new Map([['options', { type: 1, address, moment }]])
  const strategy = {
    getItem: async key => stored.get(key),
    setItem: async (key, value) => { stored.set(key, value) },
    removeItem: async key => { stored.delete(key) }
  }
  const Provider = ({ children }) => {
    const [session, setSession] = React.useState({ auth: false, loading: false })
    return (
      <SessionContext.Provider value={[session, {
        login: () => {
          login()
          setSession({ auth: true, loading: false, token: 'simulated-token', user: { id: 99 } })
        }
      }]}>
        <ApiContext.Provider value={[api]}>
          <OrderProvider strategy={strategy} waitForGuestDeliveryAddress={waitForGuestDeliveryAddress || undefined}>
            {children}
          </OrderProvider>
        </ApiContext.Provider>
      </SessionContext.Provider>
    )
  }
  const theme = themeWithValues(values => { values.site = { ...values.site, mode: 'single_store', business_slug: 'cha_sha' } })
  let order
  let setProductOpen
  const ProductScreen = () => {
    order = useOrder()
    const [open, setOpen] = React.useState(true)
    setProductOpen = setOpen
    return open ? <ProductForm /> : null
  }
  const rendered = renderWithProviders(<Provider><ProductScreen /></Provider>, { theme })
  return {
    ...rendered,
    login,
    saveAddress,
    findAddress,
    addressSaved,
    saveOptions,
    addressLinked,
    addProduct,
    stored,
    order: () => order,
    showProduct: open => setProductOpen(open)
  }
}

const addFirstProduct = async view => {
  const button = await view.findByRole('button', { name: 'Add to cart' })
  fireEvent.click(button)
  await waitFor(() => expect(view.saveAddress).toHaveBeenCalledTimes(1))
}

describe('guest Delivery with the real OrderProvider', () => {
  it('waits for the address and its order-options write before adding one customized product', async () => {
    const view = renderGuest()
    await addFirstProduct(view)
    expect(view.login).toHaveBeenCalledTimes(1)
    expect(view.addProduct).not.toHaveBeenCalled()
    expect(view.saveOptions).not.toHaveBeenCalled()
    const busy = view.getByRole('button', { name: 'Adding to cart…' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(busy)
    expect(view.saveAddress).toHaveBeenCalledTimes(1)
    await act(async () => view.addressSaved.resolve(response({ ...address, id: addressId })))
    expect(view.saveOptions).toHaveBeenCalledExactlyOnceWith(
      { type: 1, address_id: addressId, moment: 1795273200, user_id: 99 },
      expect.anything()
    )
    expect(view.addProduct).not.toHaveBeenCalled()
    await act(async () => view.addressLinked.resolve(response({ type: 1, address_id: addressId, address, moment, carts: [] })))
    expect(view.addProduct).toHaveBeenCalledExactlyOnceWith(
      { product: productCart, business_id: 55, user_id: 99 },
      expect.anything()
    )
    expect(view.stored.has('options')).toBe(false)
    fireEvent.click(view.getByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(view.addProduct).toHaveBeenCalledTimes(2))
    expect(view.saveAddress).toHaveBeenCalledTimes(1)
  })

  it('keeps the selections on a failed address save and retries it in place without creating another guest', async () => {
    const view = renderGuest()
    await addFirstProduct(view)
    await act(async () => view.addressSaved.resolve(response(['Address unavailable'], true)))
    expect(view.addProduct).not.toHaveBeenCalled()
    expect(view.stored.get('options')).toEqual({ type: 1, address, moment })
    const retry = await view.findByRole('button', { name: 'Please try again' })
    fireEvent.click(retry)
    await waitFor(() => expect(view.saveAddress).toHaveBeenCalledTimes(2))
    expect(view.login).toHaveBeenCalledTimes(1)
    expect(view.addProduct).not.toHaveBeenCalled()
    await act(async () => view.addressLinked.resolve(response({ type: 1, address_id: addressId, address, moment, carts: [] })))
    expect(view.addProduct).toHaveBeenCalledTimes(1)
    expect(view.addProduct.mock.calls[0][0].product).toEqual(productCart)
  })

  it('reuses the saved address when linking the order options has to be retried', async () => {
    const lookup = []
    const view = renderGuest({ lookup })
    await addFirstProduct(view)
    const savedAddress = { ...address, id: addressId, default: true }
    await act(async () => view.addressSaved.resolve(response(savedAddress)))
    lookup.push(savedAddress)
    await act(async () => view.addressLinked.resolve(response(['Could not link address'], true)))
    expect(view.addProduct).not.toHaveBeenCalled()
    view.saveOptions.mockResolvedValue(response({ type: 1, address_id: addressId, address, moment, carts: [] }))
    fireEvent.click(await view.findByRole('button', { name: 'Please try again' }))
    await waitFor(() => expect(view.addProduct).toHaveBeenCalledTimes(1))
    expect(view.findAddress).toHaveBeenCalledTimes(2)
    expect(view.saveAddress).toHaveBeenCalledTimes(1)
  })

  it('keeps address B on a fresh add after the migration of address A failed', async () => {
    const view = renderGuest()
    await addFirstProduct(view)
    await act(async () => view.addressSaved.resolve(response(['Address unavailable'], true)))
    await view.findByRole('button', { name: 'Please try again' })
    act(() => view.showProduct(false))

    const addressB = { id: 456, address: 'Address B', location: { lat: 42, lng: -79 } }
    view.saveOptions.mockImplementation(async ({ address_id: id }) => response({
      type: 1, address_id: id, address: id === 456 ? addressB : address, carts: []
    }))
    await act(async () => view.order()[1].changeAddress(456, { type: 1 }))
    expect(view.order()[0].options.address_id).toBe(456)

    act(() => view.showProduct(true))
    fireEvent.click(await view.findByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(view.addProduct).toHaveBeenCalledTimes(1))
    expect(view.saveOptions.mock.calls.map(([payload]) => payload.address_id)).toEqual([456])
    expect(view.order()[0].options.address_id).toBe(456)
    expect(view.stored.has('options')).toBe(false)
    expect(view.saveAddress).toHaveBeenCalledTimes(1)
  })

  it('waits for the latest selection and ignores the older migration response before adding', async () => {
    const view = renderGuest()
    await addFirstProduct(view)
    await act(async () => view.addressSaved.resolve(response({ ...address, id: addressId })))
    expect(view.saveOptions).toHaveBeenCalledTimes(1)

    const addressB = { id: 456, address: 'Address B', location: { lat: 42, lng: -79 } }
    const newMoment = '2026-11-21 16:00:00'
    const latest = { type: 7, address_id: 456, address: addressB, moment: newMoment }
    const replacement = deferred()
    view.saveOptions.mockReturnValue(replacement.promise)
    await act(async () => {
      view.order()[1].updateOrderOptions({ address_id: 456, type: 7, moment: 1795276800 })
    })
    expect(view.saveOptions).toHaveBeenCalledTimes(1)

    await act(async () => view.addressLinked.resolve(response({ type: 1, address_id: addressId, address, moment, carts: [] })))
    expect(view.order()[0].options.address_id).not.toBe(addressId)
    expect(view.saveOptions.mock.calls.map(([payload]) => payload.address_id)).toEqual([123, 456])
    expect(view.addProduct).not.toHaveBeenCalled()

    await act(async () => replacement.resolve(response({ ...latest, carts: [] })))
    expect(view.order()[0].options).toMatchObject(latest)
    expect(view.addProduct).toHaveBeenCalledTimes(1)
    expect(view.stored.has('options')).toBe(false)
  })

  it('links a still-selected guest address with the newly confirmed moment', async () => {
    const view = renderGuest()
    await addFirstProduct(view)
    await act(async () => view.addressSaved.resolve(response(['Address unavailable'], true)))
    await view.findByRole('button', { name: 'Please try again' })
    act(() => view.showProduct(false))

    const newMoment = '2026-11-21 16:00:00'
    view.saveOptions.mockImplementation(async changes => response({
      type: 1,
      address_id: changes.address_id ?? null,
      address: changes.address_id ? address : null,
      moment: newMoment,
      carts: []
    }))
    await act(async () => view.order()[1].changeMoment(new Date('2026-11-21T16:00:00Z')))
    expect(view.saveOptions.mock.calls.map(([payload]) => [payload.address_id, payload.moment]))
      .toEqual([[addressId, 1795276800]])
    expect(view.order()[0].options).toMatchObject({ address_id: addressId, moment: newMoment })

    act(() => view.showProduct(true))
    fireEvent.click(await view.findByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(view.addProduct).toHaveBeenCalledTimes(1))
  })

  it('cancels a timed-out address save and looks it up before retrying the add', async () => {
    vi.useFakeTimers()
    try {
      const lookup = []
      const view = renderGuest({ lookup })
      const cancel = vi.fn()
      view.saveAddress.mockReset().mockImplementation((address, { cancelToken } = {}) => {
        if (cancelToken) cancelToken.cancel = cancel
        return view.addressSaved.promise
      })
      await act(async () => fireEvent.click(view.getByRole('button', { name: 'Add to cart' })))
      expect(view.saveAddress).toHaveBeenCalledTimes(1)
      const first = view.order()[1].ensureGuestDeliveryAddress()
      expect(view.order()[1].ensureGuestDeliveryAddress({ retry: true })).toBe(first)
      expect(view.order()[0].loading).toBe(true)
      expect(view.getByRole('button', { name: 'Adding to cart…' })).toHaveAttribute('aria-busy', 'true')

      await act(async () => vi.advanceTimersByTimeAsync(15000))
      expect(view.order()[0].loading).toBe(false)
      await expect(first).resolves.toBe(false)
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(view.addProduct).not.toHaveBeenCalled()
      expect(view.saveOptions).not.toHaveBeenCalled()
      expect(view.order()[0].carts).toEqual({})

      // The server saved the first POST even though its response went missing.
      lookup.push({ ...address, id: addressId, default: true })
      view.saveOptions.mockResolvedValue(response({ type: 1, address_id: addressId, address, moment, carts: [] }))
      await act(async () => fireEvent.click(view.getByRole('button', { name: 'Please try again' })))
      expect(view.findAddress).toHaveBeenCalledTimes(2)
      expect(view.findAddress.mock.invocationCallOrder[1]).toBeLessThan(view.saveOptions.mock.invocationCallOrder[0])
      expect(view.saveAddress).toHaveBeenCalledTimes(1)
      expect(view.addProduct).toHaveBeenCalledTimes(1)

      await act(async () => view.addressSaved.resolve(response({ ...address, id: addressId })))
      expect(view.saveOptions).toHaveBeenCalledTimes(1)
      expect(view.addProduct).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the legacy flow for consumers that omit the opt-in', async () => {
    const view = renderGuest({ waitForGuestDeliveryAddress: false })
    await addFirstProduct(view)
    expect(view.addProduct).toHaveBeenCalledTimes(1)
    expect(view.saveOptions).toHaveBeenCalledWith(
      { type: 1, moment: 1795273200, user_id: 99 },
      expect.anything()
    )
    await act(async () => view.addressSaved.resolve(response({ ...address, id: addressId })))
    await act(async () => view.addressLinked.resolve(response({ type: 1, address_id: addressId, address, moment, carts: [] })))
  })
})
