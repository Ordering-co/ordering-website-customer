import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { OrderDetails } from '../index'

const state = vi.hoisted(() => ({ session: { auth: true, user: {} }, order: { loading: false, error: null, order: null } }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [state.session, { login: vi.fn() }]
}))
vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={state.order}
      messages={{ messages: [] }}
      reorderState={{ loading: false, error: null, result: null }}
      loyaltyPlansState={{ result: [] }}
      setMessages={vi.fn()}
      readMessages={vi.fn()}
      driverLocation={null}
      getOrder={vi.fn()}
      handleReorder={vi.fn()}
      handleBusinessRedirect={vi.fn()}
      handleOrderRedirect={vi.fn()}
      onGoBack={vi.fn()}
      orderTypes={[{ value: 1, text: 'Delivery' }]}
      googleMapsControls={{}}
      {...rest}
    />
  )
}))
// the invitation has its own tests: here, whether the page opens it
vi.mock('../../AccountInvite/AccountInvite', () => ({
  AccountInvite: ({ entry, open }) => (open ? <div data-testid='invite' data-entry={entry} /> : null)
}))

vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps-stub' />
}))

// the real getGoogleMapImage (now called to build the Mapbox failover too,
// SERGIO maps failover): keep the rest of the setup's stub
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({ getStatusPrefix: () => '' })
}))

vi.mock('~ui/hooks/useDriverLocationInterpolation', () => ({
  useDriverLocationInterpolation: vi.fn()
}))

vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({
  OrderEta: () => <span>ETA</span>
}))

vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: () => null
}))

vi.mock('~ui/src/components/TaxInformation', () => ({
  TaxInformation: () => null
}))

vi.mock('~ui/src/components/Messages', () => ({
  Messages: () => null
}))

vi.mock('~ui/src/components/ReviewOrder', () => ({
  ReviewOrder: () => null
}))

vi.mock('~ui/src/components/ReviewProduct', () => ({
  ReviewProduct: () => null
}))

vi.mock('~ui/src/components/ReviewDriver', () => ({
  ReviewDriver: () => null
}))

vi.mock('~ui/src/components/ReviewProfessional', () => ({
  ReviewProfessional: () => null
}))

vi.mock('~ui/src/components/GiftCard/SendGiftCard', () => ({
  SendGiftCard: () => null
}))

const orderFixture = {
  ...activeOrder,
  products: [],
  taxes: [],
  subtotal: 15.5,
  business: { ...activeOrder.business, location: { lat: 40.71, lng: -74.0 } },
  customer: { location: { lat: 40.72, lng: -74.01 } }
}
const loaded = { loading: false, error: null, order: orderFixture, businessData: orderFixture.business }
const show = () => renderWithProviders(<OrderDetails orderId={activeOrder.uuid} />)

describe('OrderDetails: the invitation to create an account', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
    state.session = { auth: true, user: { id: 5, guest_id: 'g-1' } }
    state.order = loaded
  })

  it('a guest is invited once the order is there, as the confirmation', () => {
    show()
    expect(screen.getByTestId('invite')).toHaveAttribute('data-entry', 'confirmation')
  })

  it('a user with an account is not', () => {
    state.session = { auth: true, user: { id: 5 } }
    show()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('a visitor with only the order\'s hash (no session) is not', () => {
    state.session = { auth: false, user: {} }
    show()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('it waits for the order and does not come with an error', () => {
    state.order = { loading: true, error: null, order: null }
    const view = show()
    expect(screen.queryByTestId('invite')).toBeNull()
    view.unmount()
    state.order = { loading: false, error: ['ERROR_NOT_FOUND'], order: null }
    show()
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('is not opened over the store chat a link opens with the order (one layer at a time)', () => {
    renderWithProviders(<OrderDetails orderId={activeOrder.uuid} openBChatByParam />)
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('stays when the order loads again under it (the account made in it changes the session)', () => {
    const view = show()
    expect(screen.getByTestId('invite')).toBeInTheDocument()
    state.order = { ...loaded, loading: true }
    view.rerender(<OrderDetails orderId={activeOrder.uuid} />)
    expect(screen.getByTestId('invite')).toBeInTheDocument()
  })
})
