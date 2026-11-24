import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptions } from '../index'

// implementation noteseach gateway that asks for more opens the base Dialog (real overlay), named by
// its title, with the gateway's form; its close calls handlePaymethodClick(null).

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/PaymentOptionCash', () => ({ PaymentOptionCash: () => null }))
vi.mock('~ui/src/components/PaymentOptionStripe', () => ({ PaymentOptionStripe: () => <div data-testid='form-stripe-connect' /> }))
vi.mock('~ui/src/components/PaymentOptionCard', () => ({ PaymentOptionCard: () => null }))
vi.mock('~ui/src/components/StripeElementsForm', () => ({ StripeElementsForm: () => <div data-testid='form-stripe-direct' /> }))
vi.mock('~ui/src/components/StripeRedirectForm', () => ({ StripeRedirectForm: () => <div data-testid='form-stripe-redirect' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => null }))
vi.mock('~ui/src/components/PaymentOptionPaypal', () => ({ PaymentOptionPaypal: () => <div data-testid='form-paypal' /> }))
const square = vi.hoisted(() => ({ props: null }))
vi.mock('~ui/src/components/PaymentOptionSquare', () => ({
  PaymentOptionSquare: (props) => {
    square.props = props
    return <div data-testid='form-square' />
  }
}))
vi.mock('~ui/src/components/PaymentOptionEpayco', () => ({ PaymentOptionEpayco: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ token: 'token', user: {} }] }))
vi.mock('~components/components/PaymentOptions', () => ({
  PaymentOptions: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={{ total: 20, uuid: 'c1' }}
      paymethodsList={{ loading: false, paymethods: [] }}
      paymethodSelected={null}
      paymethodData={{}}
      isOpenMethod={{}}
      {...rest}
    />
  )
}))

const cases = [
  ['paypal', 'Pay with PayPal', 'form-paypal'],
  ['stripe_connect', 'Select a card', 'form-stripe-connect'],
  ['stripe_direct', 'Add card', 'form-stripe-direct'],
  ['stripe_redirect', 'Stripe Redirect', 'form-stripe-redirect'],
  ['square', 'Square', 'form-square']
]

describe('PaymentOptions: the dialog of each gateway', () => {
  it.each(cases)('%s opens "%s" with its form and closes through handlePaymethodClick(null)', async (gateway, title, form) => {
    const handlePaymethodClick = vi.fn()
    const paymethod = { id: 9, name: title, gateway, credentials: { publishable: 'pk_test' } }
    const { findByRole } = renderWithProviders(
      <PaymentOptions isOpenMethod={{ paymethod }} handlePaymethodClick={handlePaymethodClick} />
    )
    const dialog = await findByRole('dialog', { name: title })
    expect(within(dialog).getByTestId(form)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(handlePaymethodClick).toHaveBeenCalledWith(null))
  })
})

// implementation notesSquare is told what Checkout reads the cart with and where to report each cart it sends
describe('PaymentOptions: Square gets Checkout\'s reconcile hooks', () => {
  it('hands PaymentOptionSquare reconcileOrder and onPlaceSent', async () => {
    const reconcileOrder = vi.fn()
    const onPlaceSent = vi.fn()
    const paymethod = { id: 9, name: 'Square', gateway: 'square', credentials: {} }
    const { findByRole } = renderWithProviders(
      <PaymentOptions isOpenMethod={{ paymethod }} handlePaymethodClick={vi.fn()} reconcileOrder={reconcileOrder} onPlaceSent={onPlaceSent} />
    )
    await findByRole('dialog', { name: 'Square' })
    expect(square.props.reconcileOrder).toBe(reconcileOrder)
    expect(square.props.onPlaceSent).toBe(onPlaceSent)
  })
})
