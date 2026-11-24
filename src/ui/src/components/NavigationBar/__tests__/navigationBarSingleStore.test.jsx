import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { NavigationBar } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  auth: true,
  carts: {}
}))

// the lazy modal contents show the carts they get
vi.mock('@loadable/component', () => ({
  default: () => (props) => <div data-testid='lazy-modal-child' data-carts={(props.carts || []).map(cart => cart.uuid).join(',')} />
}))
// the dialogs load on their first opening (lazyOverlay, loadable is mocked here): the real overlays
vi.mock('~ui/src/components/Overlay/lazyOverlay', async () => {
  const { DialogOverlay, SheetOverlay } = await import('~ui/src/components/Overlay/overlays')
  return { LazyDialog: DialogOverlay, LazySheet: SheetOverlay }
})
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit: mocks.emit, on: vi.fn(), off: vi.fn() }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: mocks.auth }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1 }, carts: mocks.carts }]
}))

// a single store site (site.mode / site.business_slug)
const singleStore = () => themeWithValues((values) => ({
  ...values,
  site: { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' }
}))

describe('NavigationBar in a single store site', () => {
  beforeEach(() => {
    mocks.emit.mockClear()
    mocks.auth = true
    mocks.carts = {
      'businessId:41': { uuid: 'mine', business: { slug: 'mcbonalds' }, products: [{ id: 1 }] },
      'businessId:37': { uuid: 'other', business: { slug: 'salami' }, products: [{ id: 2 }] }
    }
  })

  it('no Explore; Home is the store, current on it, also for a guest', () => {
    const theme = singleStore()
    const view = renderWithProviders(<NavigationBar />, { theme, initialEntries: ['/store/mcbonalds'], routePath: '/store/:slug' })
    expect(view.queryByText('Explore')).toBeNull()
    const home = view.getByText('Home').closest('[aria-current]')
    expect(home).toHaveAttribute('aria-current', 'page')
    fireEvent.click(view.getByText('Home'))
    expect(mocks.emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'mcbonalds' } })
    view.unmount()

    mocks.auth = false
    mocks.emit.mockClear()
    const guest = renderWithProviders(<NavigationBar />, { theme, initialEntries: ['/mcbonalds'], routePath: '/:slug' })
    expect(guest.getByText('Home').closest('[aria-current]')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(guest.getByText('Home'))
    expect(mocks.emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'mcbonalds' } })
    expect(guest.queryByText('Where do we deliver?')).toBeNull()
  })

  it('My cart shows only the store\'s carts (as the header\'s cart)', async () => {
    const view = renderWithProviders(<NavigationBar />, { theme: singleStore(), initialEntries: ['/store/mcbonalds'], routePath: '/store/:slug' })
    fireEvent.click(view.getByText('My cart'))
    expect(await view.findByTestId('lazy-modal-child')).toHaveAttribute('data-carts', 'mine')
  })

  it('a site that lists businesses keeps Explore and every cart', async () => {
    const marketplace = renderWithProviders(<NavigationBar />, { theme: themeWithValues(), initialEntries: ['/search'], routePath: '/search' })
    expect(marketplace.getByText('Explore')).toBeInTheDocument()
    fireEvent.click(marketplace.getByText('My cart'))
    expect(await marketplace.findByTestId('lazy-modal-child')).toHaveAttribute('data-carts', 'mine,other')
  })
})
