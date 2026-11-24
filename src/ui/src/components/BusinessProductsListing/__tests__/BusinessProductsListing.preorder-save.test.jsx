import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { OrderProvider } from '~components/contexts/OrderContext'
import { BusinessProductsListing } from '../index'

const { ordering, session, toastActions } = vi.hoisted(() => ({
  ordering: { project: 'demo', businesses: vi.fn(), setAccessToken: vi.fn() },
  session: [{ auth: true, user: { id: 8 }, token: 'test-token' }, { logout: vi.fn() }],
  toastActions: { showToast: vi.fn() }
}))
vi.unmock('~components/contexts/OrderContext')
vi.unmock('~ui/utils')
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [ordering] }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => session }))
vi.mock('~components/contexts/ToastContext', () => ({
  ToastType: { Error: 'error' },
  useToast: () => [[], toastActions],
  useToastActions: () => toastActions
}))
vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/RenderProductsLayout', () => ({
  RenderProductsLayout: ({ businessState, onProductClick, handleChangeProfessionalSelected }) => (
    <>
      {businessState.business?.categories?.[0]?.products?.[0] && (
        <button type='button' onClick={() => onProductClick(businessState.business.categories[0].products[0])}>Open Fries</button>
      )}
      <button type='button' onClick={() => handleChangeProfessionalSelected({ id: 4 })}>Filter menu</button>
    </>
  )
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: ({ product, onRequestSchedule, schedulePending }) => (
    <>
      <h2>{product.name}</h2>
      <button type='button' disabled={schedulePending || !product.schedule_available}>Add to cart</button>
      {!product.schedule_available && <button type='button' onClick={onRequestSchedule}>Schedule for later</button>}
    </>
  )
}))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children }) => open ? <div>{children}</div> : null
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, onClose, children }) => open
    ? <div role='dialog'>{children}<button type='button' onClick={onClose}>Close</button></div>
    : null
}))

const product = { id: 11, name: 'Fries', extras: [], category_id: 1, schedule_available: false }
const business = {
  id: 5,
  slug: 'taco-shop',
  open: false,
  timezone: 'America/Chicago',
  categories: [{ id: 1, products: [product] }],
  schedule: Array.from({ length: 7 }, () => ({
    enabled: true,
    lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 17, minute: 0 } }]
  }))
}
const response = (result, error = false) => ({ content: { result, error }, status: 200 })
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('keeps the draft after a rejected PUT and waits for the menu for the saved moment', async () => {
  vi.setSystemTime(new Date('2026-11-21T14:00:00Z'))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const moment = '2026-11-22 16:00:00'
  const momentUnix = Date.parse('2026-11-22T16:00:00Z') / 1000
  const previousMenu = Promise.withResolvers()
  const confirmedMenu = Promise.withResolvers()
  const rejectedWrite = Promise.withResolvers()
  const saveOrder = vi.fn()
    .mockReturnValueOnce(rejectedWrite.promise)
    .mockResolvedValueOnce(response({ type: 2, moment, carts: [] }))
  const getBusiness = vi.fn(({ timestamp, professional_id: professionalId }) => {
    if (timestamp === momentUnix) return confirmedMenu.promise
    if (professionalId) return previousMenu.promise
    return Promise.resolve(response(business))
  })
  ordering.businesses.mockReturnValue({
    select: () => ({ parameters: params => ({ get: () => getBusiness(params) }) })
  })
  ordering.setAccessToken.mockReturnValue({
    orderOptions: () => ({
      get: () => Promise.resolve(response({ type: 2, moment: null, carts: [] })),
      save: saveOrder
    })
  })

  renderWithProviders(
    <OrderProvider strategy={{ getItem: vi.fn(), setItem: vi.fn() }}>
      <BusinessProductsListing ordering={ordering} slug='taco-shop' businessProps={[]} onProductRedirect={vi.fn()} notLoadProducts />
    </OrderProvider>,
    { initialEntries: ['/store/taco-shop'] }
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Open Fries' }))
  const schedule = screen.getByRole('button', { name: 'Schedule for later' })
  const chooseTime = () => {
    fireEvent.click(schedule)
    const dialog = screen.getByRole('dialog')
    const day = dialog.querySelector('[data-doc-date="2026-11-22"]')
    expect(day).toBeInTheDocument()
    fireEvent.keyDown(day, { key: 'Enter' })
    const slot = dialog.querySelector('[data-doc-time="10:00"]')
    expect([...dialog.querySelectorAll('[data-doc-time]')].map(item => item.dataset.docTime)).toContain('10:00')
    fireEvent.click(slot)
    return dialog
  }
  fireEvent.click(within(chooseTime()).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(saveOrder).not.toHaveBeenCalled()

  const dialog = chooseTime()
  const confirm = within(dialog).getByRole('button', { name: 'Go to menu' })
  const selectedTime = within(dialog).getByRole('button', { name: /Choose Time/ }).textContent
  fireEvent.click(confirm)
  await waitFor(() => expect(saveOrder).toHaveBeenCalledTimes(1))
  await act(async () => rejectedWrite.resolve(response(['That time is unavailable'], true)))
  expect(dialog).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: /Choose Time/ })).toHaveTextContent(selectedTime)
  expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: 'Filter menu' }))
  await waitFor(() => expect(getBusiness).toHaveBeenCalledWith(expect.objectContaining({ professional_id: 4 })))
  fireEvent.click(confirm)
  await waitFor(() => expect(getBusiness).toHaveBeenCalledWith(expect.objectContaining({ timestamp: momentUnix })))
  expect(saveOrder.mock.calls.map(([body]) => body.moment)).toEqual([momentUnix, momentUnix])

  await act(async () => previousMenu.resolve(response(business)))
  expect(dialog).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled()

  await act(async () => confirmedMenu.resolve(response({
    ...business,
    categories: [{ id: 1, products: [{ ...product, name: 'Fresh Fries', schedule_available: true }] }]
  })))
  expect(dialog).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Fresh Fries' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add to cart' })).toBeEnabled()
})
