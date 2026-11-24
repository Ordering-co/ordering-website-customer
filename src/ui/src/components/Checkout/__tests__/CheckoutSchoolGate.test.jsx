import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Checkout } from '../index'

const mocks = vi.hoisted(() => {
  const noop = () => {}
  const handlerClickPlaceOrder = vi.fn()
  return {
    cart: null,
    selectedStudentId: null,
    handlerClickPlaceOrder,
    orderState: { loading: false, options: { type: 2 }, carts: {} },
    orderActions: { confirmCart: noop },
    sessionState: { user: { id: 1, name: 'Parent' }, loading: false, auth: true, token: 'tok' },
    sessionActions: { login: noop },
    configState: { configs: {} },
    customerState: { user: null },
    paymentOptionsProps: null,
    userDetailsProps: null,
    events: { on: noop, off: noop, emit: noop },
    validationFields: { fields: {} },
    selectedStudent: { setStudentId: noop },
    controllerProps: {
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 },
      handlePaymethodChange: noop,
      handlerClickPlaceOrder,
      handleOrderRedirect: noop,
      placing: false,
      checkoutFieldsState: { loading: false, fields: [] },
      loyaltyPlansState: { result: [] },
      instructionsOptions: { result: [] },
      deliveryOptionSelected: undefined,
      cardList: { cards: [] }
    }
  }
})

const baseCart = {
  uuid: 'cart-1',
  status: 0,
  valid: true,
  valid_products: true,
  valid_maximum: true,
  valid_minimum: true,
  business_id: 1,
  business: { id: 1, name: 'Demo School', slug: 'demo-school', vertical: 'school' },
  products: [{ id: 10, name: 'Lunch', code: 'LNC-1', price: 9.5 }],
  total: 9.5,
  subtotal: 9.5,
  balance: 9.5
}

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => null }))
vi.mock('~ui/src/components/CartContent', () => ({ CartContent: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({ Alert: () => null, Confirm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressDetails', () => ({ AddressDetails: () => null }))
vi.mock('~ui/src/components/UserDetails', () => ({
  UserDetails: (props) => {
    mocks.userDetailsProps = props
    return null
  }
}))
vi.mock('~ui/src/components/PaymentOptions', () => ({
  PaymentOptions: (props) => {
    mocks.paymentOptionsProps = props
    return null
  }
}))
vi.mock('~ui/src/components/PaymentOptionWallet', () => ({ PaymentOptionWallet: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/PlaceSpot', () => ({ PlaceSpot: () => null }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, title, children }) => open ? <div data-testid='modal-stub'>{title}{children}</div> : null
}))
vi.mock('../OrderDetail', () => ({ OrderDetail: () => null }))
vi.mock('../../RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../../CheckoutStudentDetails', () => ({
  CheckoutStudentDetails: ({ onStudentAssigned }) => (
    <button type='button' data-testid='student-details-stub' onClick={() => onStudentAssigned(5)}>assign</button>
  )
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => {
    mocks.selectedStudent.studentId = mocks.selectedStudentId
    return mocks.selectedStudent
  }
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [mocks.orderState, mocks.orderActions]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.sessionState, mocks.sessionActions]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [mocks.configState]
}))
vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [mocks.customerState]
}))
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [mocks.events]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [mocks.validationFields]
}))
vi.mock('~components/components/Checkout', () => ({
  Checkout: ({ UIComponent, cartState, uuid, ...rest }) => (
    <UIComponent
      cart={cartState?.cart}
      cartState={cartState}
      businessDetails={mocks.businessDetails}
      {...mocks.controllerProps}
      {...rest}
    />
  )
}))

const noop = () => {}

const renderCheckout = (cart) => {
  mocks.cart = cart
  mocks.orderState = { loading: false, options: { type: 2 }, carts: { 'businessId:1': cart } }
  mocks.businessDetails = { business: cart.business, loading: false, error: null }
  return renderWithProviders(
    <Checkout cartUuid={cart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />
  )
}

describe('Checkout school gate', () => {
  beforeEach(() => {
    window.scrollTo = noop
    mocks.cart = null
    mocks.selectedStudentId = null
    mocks.configState = { configs: {} }
    mocks.sessionState = { user: { id: 1, name: 'Parent' }, loading: false, auth: true, token: 'tok' }
    mocks.controllerProps.checkoutFieldsState = { loading: false, fields: [] }
    delete mocks.controllerProps.onPlaceOrderClick
    mocks.paymentOptionsProps = null
    mocks.userDetailsProps = null
    mocks.handlerClickPlaceOrder.mockReset()
    window.localStorage.removeItem('user-customer')
  })

  // implementation notes (B): a school cart with no student is now a fixable gap
  // (schoolNeedsStudent moved out of the hard-disabled list): the button
  // reads "Continue to payment" and stays clickable; clicking it never
  // reaches the controller (it scrolls to the student picker instead)
  it('lists the student as missing and never calls the controller when a school cart has none', async () => {
    mocks.selectedStudentId = '5'
    const { findByText, getByTestId } = renderCheckout({ ...baseCart, student_id: null })
    const button = (await findByText('Continue to payment')).closest('button')
    expect(button).not.toBeDisabled()
    expect(await findByText('Please select a student to place the order.')).toBeInTheDocument()
    expect(getByTestId('student-details-stub')).toBeInTheDocument()
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('allows place order once the cart carries the student', async () => {
    const { findByText, queryByText } = renderCheckout({ ...baseCart, student_id: 5 })
    // round 4: the CTA carries the total ("Place order · £X")
    const button = (await findByText('Place Order · $9.5')).closest('button')
    expect(button).not.toBeDisabled()
    expect(queryByText('Please select a student to place the order.')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalled()
  })

  it('opens the gate once the student details report a successful assign', async () => {
    const { findByText, getByTestId, queryByText } = renderCheckout({ ...baseCart, student_id: null })
    const button = (await findByText('Continue to payment')).closest('button')
    expect(button).not.toBeDisabled()
    fireEvent.click(getByTestId('student-details-stub'))
    expect(await findByText('Place Order · $9.5')).toBeInTheDocument()
    expect(queryByText('Please select a student to place the order.')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalled()
  })

  it('does not gate non-school carts', async () => {
    const { findByText, queryByTestId } = renderCheckout({
      ...baseCart,
      business: { ...baseCart.business, vertical: 'food' },
      student_id: null
    })
    const button = (await findByText('Place Order · $9.5')).closest('button')
    expect(button).not.toBeDisabled()
    expect(queryByTestId('student-details-stub')).not.toBeInTheDocument()
  })

  it('blocks a persisted guest when guest checkout is disabled', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    const { findByText, queryByText } = renderCheckout({
      ...baseCart,
      business: { ...baseCart.business, vertical: 'food' }
    })

    expect((await findByText('Place Order · $9.5')).closest('button')).toBeDisabled()
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
    expect(mocks.paymentOptionsProps.handlePlaceOrder).toBeUndefined()
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  // implementation notes (B): a guest allowed to check out never sees "Continue as
  // guest" any more — the inline form (mocked to null here) renders right
  // away, so the regression is checked through the same guestCheckoutAllowed
  // state instead of that removed button
  it('allows an exact configured type and revalidates retained checkout callbacks after revocation', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    mocks.configState = {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'pickup' }
      }
    }
    const { findByText, queryByText, rerender } = renderCheckout({
      ...baseCart,
      business: { ...baseCart.business, vertical: 'food' }
    })
    await findByText('Place Order · $9.5')
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
    expect(mocks.userDetailsProps).not.toBeNull()

    const paymentCompleted = vi.fn()
    mocks.controllerProps.onPlaceOrderClick = paymentCompleted
    rerender(<Checkout cartUuid='cart-1' handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    const retainedPaymentCallback = mocks.paymentOptionsProps.onPlaceOrderClick
    mocks.configState = { configs: {} }
    rerender(<Checkout cartUuid='cart-1' handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    retainedPaymentCallback()

    expect(paymentCompleted).not.toHaveBeenCalled()
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    expect((await findByText('Place Order · $9.5')).closest('button')).toBeDisabled()
  })

  // implementation notes (B): clicking the CTA with required fields pending no longer
  // opens the UserDetails modal (the inline form already shows them); the
  // modal still exists for PaymentOptions' own openUserModal, so the
  // retained-callback regression is checked through that entry point
  it('keeps a retained modal save callback from placing an order after permission revocation', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    mocks.configState = {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'pickup' }
      }
    }
    mocks.controllerProps.checkoutFieldsState = {
      loading: false,
      fields: [{
        order_type_id: 2,
        enabled: true,
        required_with_guest: true,
        validation_field: { code: 'name' }
      }]
    }
    const { rerender } = renderCheckout({
      ...baseCart,
      business: { ...baseCart.business, vertical: 'food' }
    })
    await waitFor(() => expect(mocks.paymentOptionsProps.requiredFields).toContain('name'))
    act(() => { mocks.paymentOptionsProps.openUserModal(true) })
    await waitFor(() => expect(mocks.userDetailsProps?.isModal).toBe(true))
    expect(mocks.userDetailsProps.handlePlaceOrderAsGuest).toBeUndefined()
    const retainedGuestHandler = mocks.userDetailsProps.onClose

    mocks.configState = { configs: {} }
    rerender(<Checkout cartUuid='cart-1' handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    act(() => retainedGuestHandler())

    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })
})
