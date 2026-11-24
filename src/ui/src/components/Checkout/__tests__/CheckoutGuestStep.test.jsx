import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Checkout } from '../index'
import { PaymentOptionSquare } from '../../PaymentOptionSquare'
import { Ordering } from '~components/sdk/lib/index'

// implementation notes (B): guided steps in the guest checkout — the progress
// indicator, the inline guest form (no "Continue as guest" gate), the
// Place Order CTA that never greys out for a fixable gap, and its
// loading/slow/error states.
const mocks = vi.hoisted(() => {
  const noop = () => {}
  const handlerClickPlaceOrder = vi.fn()
  return {
    windowSize: { width: 1024, height: 768 },
    userDetailsProps: null,
    paymentOptionsProps: null,
    signUpFormProps: null,
    loginFormProps: null,
    handlerClickPlaceOrder,
    // the SDK read of a cart by its UUID, as ordering.carts(uuid).get()
    readCart: vi.fn(),
    ordering: null,
    orderState: { loading: false, options: { type: 2 }, carts: {} },
    orderActions: { confirmCart: noop },
    sessionState: { user: { guest_id: 'guest-1', name: 'Ana', lastname: 'García', guest_email: 'ana@example.com', guest_cellphone: '7700900123', country_phone_code: '44' }, loading: false, auth: true, token: 'tok' },
    sessionActions: { login: vi.fn().mockResolvedValue(undefined) },
    configState: {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'pickup' }
      }
    },
    customerState: { user: null },
    events: { on: noop, off: noop, emit: noop },
    validationFields: { fields: {} },
    controllerProps: {
      paymethodSelected: null,
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

mocks.ordering = { root: 'https://api.test', setAccessToken: () => ({ carts: () => ({ get: (...args) => mocks.readCart(...args) }) }) }

const baseCart = {
  uuid: 'cart-1',
  status: 0,
  valid: true,
  valid_products: true,
  valid_address: true,
  valid_maximum: true,
  valid_minimum: true,
  business_id: 1,
  balance: 9.5,
  business: { id: 1, name: 'Demo Store', slug: 'demo-store', vertical: 'food' },
  products: [{ id: 10, name: 'Burger', code: 'BRG-1', price: 9.5 }],
  total: 9.5,
  subtotal: 9.5
}

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
// setupTests' libphonenumber-js answers no number: this one knows a valid and an invalid one
vi.mock('libphonenumber-js', () => ({
  default: (value) => ({ isValid: () => value === '+16502530000' })
}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => null }))
// setupTests' 1024 px by default; a test sets a small screen through mocks
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => mocks.windowSize }))
vi.mock('~ui/src/components/CartContent', () => ({ CartContent: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, content }) => (open ? <div data-testid='alert'>{content}</div> : null),
  Confirm: () => null
}))
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: (props) => {
    mocks.signUpFormProps = props
    return null
  }
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: (props) => {
    mocks.loginFormProps = props
    return null
  }
}))
vi.mock('~ui/src/components/AddressDetails', () => ({
  AddressDetails: (props) => {
    mocks.addressDetailsProps = props
    return <div data-testid='address-details-stub' />
  }
}))
vi.mock('~ui/src/components/UserDetails', () => ({
  UserDetails: (props) => {
    mocks.userDetailsProps = props
    // as the real UserDetails: it reports whether its form is open
    // (implementation notesa signed-in customer's form opens with the edit trigger)
    const formOpen = !props.isCheckoutGuestForm && !!props.isUserDetailsEdit
    React.useEffect(() => {
      if (!props.isCheckoutGuestForm) props.setIsOpenUserData?.(formOpen)
    }, [formOpen])
    const Title = props.CustomerDetailsTitleComponent
    const Below = props.BelowTitleComponent
    return (
      <div>
        {Title && <Title />}
        {/* real UserDetailsUI passes its own isEdit; this stub approximates
            it with the trigger prop Checkout computes it from */}
        {Below && <Below isEdit={props.isUserDetailsEdit} />}
        {/* a guest form stub so the CTA (step 1 incomplete, or dirty) can
            submit it, as the real UserFormDetailsUI does with
            isCheckoutGuestForm; mocks.guestFormSaveOutcome drives what a
            submit does, like a real save would through handleSuccessUpdate
            (success) or onSaved(false) (a failed save or validation) */}
        {props.isCheckoutGuestForm && (
          <form
            data-checkout-guest-form='true'
            onSubmit={(e) => {
              e.preventDefault()
              mocks.guestFormSubmitCount = (mocks.guestFormSubmitCount || 0) + 1
              props.onSaveStart?.()
              if (mocks.guestFormSaveOutcome === 'success') {
                props.onDirtyChange?.(false)
                props.handleSuccessUpdate?.()
              } else if (mocks.guestFormSaveOutcome === 'failure') props.onSaved?.(false)
            }}
          >
            <input data-testid='guest-form-field' />
          </form>
        )}
        {/* a signed-in customer's open form, as UserFormDetailsUI draws it */}
        {formOpen && (
          <form
            data-doc-control='profile-form'
            onSubmit={(e) => {
              e.preventDefault()
              mocks.profileFormSubmitCount = (mocks.profileFormSubmitCount || 0) + 1
            }}
          >
            <input data-testid='profile-form-field' />
          </form>
        )}
      </div>
    )
  }
}))
vi.mock('~ui/src/components/PaymentOptions', () => ({
  PaymentOptions: (props) => {
    mocks.paymentOptionsProps = props
    return typeof mocks.paymentOptionsContent === 'function' ? mocks.paymentOptionsContent(props) : (mocks.paymentOptionsContent ?? null)
  }
}))
vi.mock('~ui/src/components/PaymentOptionWallet', () => ({ PaymentOptionWallet: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/PlaceSpot', () => ({ PlaceSpot: () => null }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('../OrderDetail', () => ({ OrderDetail: () => null }))
vi.mock('../../RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../../CheckoutStudentDetails', () => ({ CheckoutStudentDetails: () => null }))
vi.mock('~components/contexts/OrderContext', async () => {
  // as the real module: the context's value when there is one (PaymentOptionSquare gives the controller its own), else the fixture
  const { createContext, useContext } = await import('react')
  const OrderContext = createContext()
  return { OrderContext, useOrder: () => useContext(OrderContext) || [mocks.orderState, mocks.orderActions] }
})
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [mocks.ordering]
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

const renderCheckout = (cart, type = 2, { theme, ...props } = {}) => {
  mocks.orderState = { loading: false, options: { type }, carts: { 'businessId:1': cart } }
  mocks.businessDetails = { business: cart.business, loading: false, error: null }
  return renderWithProviders(
    <Checkout cartUuid={cart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} {...props} />,
    theme ? { theme } : {}
  )
}

// a theme whose pages.checkout hides the "customer" section
const customerHidden = () => themeWithValues((values) => {
  values.pages.checkout.sections = values.pages.checkout.sections.map((section) => section.key === 'customer' ? { ...section, visible: false } : section)
  return values
})

describe('Checkout guest step (B)', () => {
  beforeEach(() => {
    window.scrollTo = noop
    window.localStorage.removeItem('user-customer')
    mocks.sessionState = { user: { guest_id: 'guest-1', name: 'Ana', lastname: 'García', guest_email: 'ana@example.com', guest_cellphone: '7700900123', country_phone_code: '44' }, loading: false, auth: true, token: 'tok' }
    mocks.configState = {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'pickup' }
      }
    }
    mocks.controllerProps = {
      ...mocks.controllerProps,
      paymethodSelected: null,
      placing: false,
      checkoutFieldsState: {
        loading: false,
        fields: [{
          order_type_id: 2,
          enabled: true,
          required_with_guest: true,
          validation_field: { code: 'middle_name' }
        }]
      }
    }
    mocks.userDetailsProps = null
    mocks.paymentOptionsProps = null
    mocks.paymentOptionsContent = null
    mocks.orderActions = { confirmCart: noop }
    mocks.signUpFormProps = null
    mocks.loginFormProps = null
    mocks.addressDetailsProps = null
    mocks.guestFormSubmitCount = 0
    mocks.profileFormSubmitCount = 0
    mocks.guestFormSaveOutcome = null
    mocks.customerState = { user: null }
    mocks.windowSize = { width: 1024, height: 768 }
    mocks.handlerClickPlaceOrder.mockReset()
    mocks.readCart.mockReset()
    mocks.readCart.mockResolvedValue({ content: { error: false, result: { status: 0 } } })
    mocks.sessionActions.login.mockClear()
  })

  it('a guest allowed to check out gets the form right away: no "Continue as guest", with login and sign-up links above it', async () => {
    const { findByText, queryByText } = renderCheckout(baseCart)
    await findByText('Continue to payment')
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
    expect(mocks.userDetailsProps.isCheckoutGuestForm).toBe(true)
    expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(true)
    expect(queryByText('Log in for faster checkout')).toBeInTheDocument()
    expect(queryByText('Sign up for faster checkout')).toBeInTheDocument()
  })

  it('a guest not allowed to check out keeps today\'s Sign up / Login buttons, isGuest on Sign up, no Continue as guest', async () => {
    mocks.configState = { configs: {} }
    const { findByText, queryByText } = renderCheckout(baseCart)
    const signUp = await findByText('Sign up')
    expect(queryByText('Login')).toBeInTheDocument()
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
    fireEvent.click(signUp)
    await waitFor(() => expect(mocks.signUpFormProps?.isGuest).toBe(true))
  })

  it('"Sign up for faster checkout" opens SignUpForm with isGuest and the guest\'s own data prefilled, and never places the order on success', async () => {
    const { findByText } = renderCheckout(baseCart)
    fireEvent.click(await findByText('Sign up for faster checkout'))
    await waitFor(() => expect(mocks.signUpFormProps).not.toBeNull())
    expect(mocks.signUpFormProps.isGuest).toBe(true)
    expect(mocks.signUpFormProps.externalPhoneNumber).toBe('+447700900123')
    expect(mocks.signUpFormProps.initialValues).toEqual({ name: 'Ana', lastname: 'García', email: 'ana@example.com' })

    await act(async () => { await mocks.signUpFormProps.handleSuccessSignup({ id: 2, session: { access_token: 'tok2' } }) })
    expect(mocks.sessionActions.login).toHaveBeenCalled()
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('"Log in for faster checkout" opens the existing LoginForm modal', async () => {
    const { findByText } = renderCheckout(baseCart)
    fireEvent.click(await findByText('Log in for faster checkout'))
    await waitFor(() => expect(mocks.loginFormProps).not.toBeNull())
    expect(mocks.loginFormProps.isGuest).toBe(true)
  })

  it('the login modal is a base dialog; its close closes it and places nothing', async () => {
    const { findByText } = renderCheckout(baseCart)
    fireEvent.click(await findByText('Log in for faster checkout'))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('the progress reads "Step 1 of 2", "Step 2 of 2" and "Ready to place your order" as the steps complete', async () => {
    const { findByText, rerender } = renderCheckout(baseCart)
    await findByText('Step 1 of 2')

    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    await findByText('Step 2 of 2')

    mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 } }
    rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    await findByText('Ready to place your order')
  })

  // implementation notes"Ready" only when the required-fields request answered and
  // nothing blocks the button
  describe('the progress is "Ready" only when it is true', () => {
    const cash = { id: 1, gateway: 'cash', paymethod_id: 1 }
    const rerenderCheckout = (rerender) => rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)

    it('while the fields load: "Checking your details…", never Ready; the empty list then answers Ready; a failed request, an error label, then a good retry, Ready', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: cash, checkoutFieldsState: { loading: true, fields: [] } }
      const { findByText, queryByText, rerender, container } = renderCheckout(baseCart)
      await findByText('Checking your details…')
      expect(queryByText('Ready to place your order')).not.toBeInTheDocument()
      expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '0')

      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, error: true, fields: null } }
      rerenderCheckout(rerender)
      await findByText("We couldn't load the checkout details")
      expect(queryByText('Ready to place your order')).not.toBeInTheDocument()

      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      rerenderCheckout(rerender)
      await findByText('Ready to place your order')
      expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '2')
    })

    it('delivery without a valid address: both steps done but not Ready, a notice label; a valid address reads Ready', async () => {
      mocks.sessionState = { user: { id: 5, name: 'Ana', lastname: 'García', email: 'ana@example.com' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: cash, checkoutFieldsState: { loading: false, fields: [] } }
      const blocked = renderCheckout({ ...baseCart, valid: false, valid_address: false }, 1)
      await blocked.findByText('Review the notice below to place your order')
      expect(blocked.queryByText('Ready to place your order')).not.toBeInTheDocument()
      expect(blocked.container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '1')
      blocked.unmount()

      const valid = renderCheckout(baseCart, 1)
      await valid.findByText('Ready to place your order')
      expect(valid.container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '2')
    })

    // "Ready" and the main action ask the same: a gap the action would not
    // place with (missingItems, a data error) is not "Ready" either
    it('a required comment left empty is not Ready and places nothing; once written it reads Ready and one click places once', async () => {
      const commentField = { order_type_id: 2, enabled: true, required_with_guest: true, validation_field: { code: 'comments' } }
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: cash, checkoutFieldsState: { loading: false, fields: [commentField] } }
      mocks.handlerClickPlaceOrder.mockResolvedValue({})
      const view = renderCheckout({ ...baseCart, paymethod_id: 1, comment: null })
      await view.findByText('Review the notice below to place your order')
      expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()
      expect(view.container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '1')
      expect(view.getByRole('button', { name: 'a comment' })).toBeInTheDocument()
      fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)

      // the cart is read once on mount: the written comment is a new mount
      view.unmount()
      const written = renderCheckout({ ...baseCart, paymethod_id: 1, comment: 'No onions' })
      await written.findByText('Ready to place your order')
      expect(written.container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '2')
      fireEvent.click(written.getByRole('button', { name: /Place Order/ }))
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    })

    it('an invalid phone number is not Ready and places nothing; a valid one reads Ready and one click places once', async () => {
      mocks.sessionState = { user: { id: 5, name: 'Ana', lastname: 'García', email: 'ana@example.com', cellphone: '123', country_phone_code: '1' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: cash, checkoutFieldsState: { loading: false, fields: [] } }
      mocks.handlerClickPlaceOrder.mockResolvedValue({})
      const view = renderCheckout(baseCart)
      await view.findByText('Review the notice below to place your order')
      expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()
      fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)
      view.unmount()

      mocks.sessionState = { user: { id: 5, name: 'Ana', lastname: 'García', email: 'ana@example.com', cellphone: '6502530000', country_phone_code: '1' }, loading: false, auth: true, token: 'tok' }
      const valid = renderCheckout(baseCart)
      await valid.findByText('Ready to place your order')
      fireEvent.click(valid.getByRole('button', { name: /Place Order/ }))
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    })

    it('a Stripe method without its card is not Ready until the card is selected', async () => {
      const restored = { id: 28, gateway: 'stripe', paymethodId: 28, data: {}, paymethod: { id: 28, gateway: 'stripe' } }
      mocks.sessionState = { ...mocks.sessionState, user: { id: 4, name: 'Ana' } }
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: restored, checkoutFieldsState: { loading: false, fields: [] } }
      const view = renderCheckout({ ...baseCart, paymethod_id: 28, paymethod_data: {} })
      await view.findByText('Review the notice below to place your order')
      expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()

      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { ...restored, data: { id: 'card_4242' } } }
      rerenderCheckout(view.rerender)
      await view.findByText('Ready to place your order')
    })
  })

  // implementation notesa card method clicked in the list (the controller keeps
  // paymethodSelected null until a card is picked) asks for its card
  describe('a chosen card method without a card asks for a card, not a payment method', () => {
    const stripe = { id: 2, gateway: 'stripe' }
    const methodText = 'Please, select a payment method to place order.'
    const cardText = 'Please, select or add a card to place order.'

    it('desktop and mobile bar: no saved cards says add/select a card; a saved card unselected says a card selection; picking one clears only that; no method still asks for a method', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      const first = renderCheckout(baseCart)
      await first.findByText(methodText)
      expect(first.getAllByText(/a payment method/).length).toBeGreaterThan(0)

      act(() => mocks.paymentOptionsProps.onOpenMethodChange(stripe))
      expect(await first.findByText(cardText)).toBeInTheDocument()
      expect(first.queryByText(methodText)).not.toBeInTheDocument()
      expect(first.queryByText('a payment method')).not.toBeInTheDocument()
      expect(first.getByRole('button', { name: 'a card' })).toBeInTheDocument()

      act(() => mocks.paymentOptionsProps.setCardList({ cards: [{ id: 7, card_token: 'tok' }] }))
      expect(await first.findByRole('button', { name: 'a card selection' })).toBeInTheDocument()

      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { ...stripe, paymethodId: 2, data: { id: 7, card_token: 'tok' } } }
      first.rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
      await waitFor(() => expect(first.queryByText(cardText)).not.toBeInTheDocument())
      expect(first.queryByText(methodText)).not.toBeInTheDocument()
      first.unmount()

      mocks.windowSize = { width: 400, height: 760 }
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: null }
      const mobile = renderCheckout(baseCart)
      await mobile.findByText(methodText)
      act(() => mocks.paymentOptionsProps.onOpenMethodChange(stripe))
      expect(await mobile.findByText(cardText)).toBeInTheDocument()
      expect(mobile.queryByText(methodText)).not.toBeInTheDocument()
    })

    // the controller rebuilds the method from cart.paymethod_id; its data has no card id
    describe('a Stripe method restored from the cart with no card selected', () => {
      const restored = { id: 28, gateway: 'stripe', paymethodId: 28, data: {}, paymethod: { id: 28, gateway: 'stripe' } }
      const restoredCart = { ...baseCart, paymethod_id: 28, paymethod_data: {} }
      const sourceIds = []
      beforeEach(() => {
        sourceIds.length = 0
        mocks.sessionState = { ...mocks.sessionState, user: { id: 4, name: 'Ana' } }
        mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] }, paymethodSelected: restored }
        // the controller sends the selected card's id as source_id
        mocks.handlerClickPlaceOrder.mockImplementation(async () => {
          sourceIds.push(mocks.controllerProps.paymethodSelected?.data?.id)
          return {}
        })
      })

      it('with a saved card: asks for a card selection, places nothing until it is picked, then places once with its id', async () => {
        const view = renderCheckout(restoredCart)
        await view.findByText(/Place Order/)
        act(() => mocks.paymentOptionsProps.setCardList({ cards: [{ id: 'card_4242' }] }))
        expect(await view.findByText(cardText)).toBeInTheDocument()
        expect(view.queryByText(methodText)).not.toBeInTheDocument()
        fireEvent.click(view.getByRole('button', { name: 'a card selection' }))
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)

        mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { ...restored, data: { id: 'card_4242', card_token: 'tok' } } }
        view.rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
        await view.findByText('Ready to place your order')
        expect(view.queryByText(cardText)).not.toBeInTheDocument()
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
        expect(sourceIds).toEqual(['card_4242'])
      })

      it('with no saved cards: asks for a card, places nothing', async () => {
        const view = renderCheckout(restoredCart)
        await view.findByText(/Place Order/)
        act(() => mocks.paymentOptionsProps.setCardList({ cards: [] }))
        expect(await view.findByText(cardText)).toBeInTheDocument()
        expect(view.getByRole('button', { name: 'a card' })).toBeInTheDocument()
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)
      })
    })

    // the controller sends source_id (the card's id) for exactly these gateways
    // (Checkout controller, handlerClickPlaceOrder): none may confirm without it
    describe.each(['stripe', 'stripe_connect', 'stripe_connect_v2', 'stripe_direct'])('%s restored from the cart with no card selected', (gateway) => {
      const restored = { id: 28, gateway, paymethodId: 28, data: {}, paymethod: { id: 28, gateway } }
      const restoredCart = { ...baseCart, paymethod_id: 28, paymethod_data: {} }
      beforeEach(() => {
        mocks.sessionState = { ...mocks.sessionState, user: { id: 4, name: 'Ana' } }
        mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] }, paymethodSelected: restored }
        mocks.handlerClickPlaceOrder.mockResolvedValue({})
      })

      it('places nothing until the card is picked, then places once', async () => {
        const view = renderCheckout(restoredCart)
        await view.findByText(/Place Order/)
        expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(0)

        mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { ...restored, data: { id: 'card_4242' } } }
        view.rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
        await view.findByText('Ready to place your order')
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
      })

      it('an order with no balance needs no card', async () => {
        const view = renderCheckout({ ...restoredCart, balance: 0, total: 0 })
        await view.findByText('Ready to place your order')
        fireEvent.click(view.getByRole('button', { name: /Place Order/ }))
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
      })
    })
  })

  // implementation noteson a small screen the fixed bar covers the end of the list
  // that "Change" opens; the last option is what must end over the bar, even
  // when the start of the payment block leaves the viewport
  describe('mobile: "Change" scrolls so the last payment option ends over the fixed place order bar', () => {
    // the payment block spans 200–700; its first option sits at its top, the last at its bottom
    const changeWithBar = async (barRect, lastOptionBottom = 700) => {
      mocks.windowSize = { width: 390, height: 760 }
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      mocks.paymentOptionsContent = (
        <div>
          <button type='button' data-testid='first-option'>Cash</button>
          <button type='button' data-testid='last-option'>Card on Delivery</button>
        </div>
      )
      window.scrollBy = vi.fn()
      let bar
      const rects = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
        if (this.id === 'checkout-payment-content') return { top: 200, bottom: 700, height: 500 }
        if (this.dataset?.testid === 'first-option') return { top: 200, bottom: 260, height: 60 }
        if (this.dataset?.testid === 'last-option') return { top: lastOptionBottom - 60, bottom: lastOptionBottom, height: 60 }
        if (this === bar) return { ...barRect, height: barRect.bottom - barRect.top }
        return { top: 0, bottom: 0, height: 0 }
      })
      try {
        const { findByText } = renderCheckout({ ...baseCart, paymethod_id: 1 })
        bar = (await findByText(/Place Order/)).closest('button').parentElement
        fireEvent.click(await findByText('Change'))
        await act(async () => { await new Promise((resolve) => window.requestAnimationFrame(resolve)) })
      } finally {
        rects.mockRestore()
      }
    }

    it('scrolls by what the bar hides of the last option', async () => {
      await changeWithBar({ top: 640, bottom: 760 })
      expect(window.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 60 }))
    })

    it('a block taller than the room above the bar scrolls the whole way: the last option ends at the bar although the block starts above the viewport', async () => {
      // 700 − 440: the old clamp to the block's top (200) left 60 covered
      await changeWithBar({ top: 440, bottom: 760 })
      expect(window.scrollBy).toHaveBeenCalledTimes(1)
      expect(window.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 260 }))
    })

    it('a last option already over the bar does not scroll', async () => {
      await changeWithBar({ top: 640, bottom: 760 }, 600)
      expect(window.scrollBy).not.toHaveBeenCalled()
    })
  })

  it('with step 1 incomplete the CTA reads "Continue to payment", stays enabled, and clicking it submits the guest form instead of calling the controller', async () => {
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Continue to payment')).closest('button')
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(mocks.guestFormSubmitCount).toBe(1)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('lists what is missing under the button and a click on an item scrolls/focuses its target', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    const { findByText } = renderCheckout(baseCart)
    await findByText(/Still needed:/)
    const paymentItem = await findByText('a payment method')
    const scrollIntoView = vi.fn()
    const target = document.querySelector('[data-doc-section="checkout-payment-section"]')
    target.scrollIntoView = scrollIntoView
    fireEvent.click(paymentItem)
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth', block: 'center' }))
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('a fixable gap (no payment method) never disables the button; a hard block (invalid cart) does', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    const ready = renderCheckout(baseCart)
    const readyButton = (await ready.findByText('Place Order · $9.5')).closest('button')
    expect(readyButton).not.toBeDisabled()
    ready.unmount()

    const blocked = renderCheckout({ ...baseCart, uuid: 'cart-2', valid: false })
    const blockedButton = (await blocked.findByText('Place Order · $9.5')).closest('button')
    expect(blockedButton).toBeDisabled()
  })

  it('shows a spinner while submitting, keeps the primary look (round 2) and blocks a second click (the controller is called once)', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    let resolvePlace
    mocks.handlerClickPlaceOrder.mockImplementation(() => new Promise((resolve) => { resolvePlace = resolve }))
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    const resting = button.style.getPropertyValue('--ui-button-background')
    expect(resting).not.toBe('')
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    // round 2: only a hard block greys the button out; while merely
    // submitting it keeps its primary look (the piece's own fill, no disabled one), clicks blocked by
    // the handler instead
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(resting)
    expect(button.style.getPropertyValue('--ui-button-disabled-background')).toBe('')
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    await act(async () => { resolvePlace({ cart: baseCart }) })
  })

  it('the submitting Place Order is a busy Button: the spinner first, the same aria, not disabled, its own busy layout; at rest none of it', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    let resolvePlace
    mocks.handlerClickPlaceOrder.mockImplementation(() => new Promise((resolve) => { resolvePlace = resolve }))
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    expect(button.querySelector('[aria-hidden]')).toBeNull()
    expect(button).toHaveAttribute('aria-busy', 'false')
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button).not.toHaveAttribute('data-busy')
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(button.firstChild).toHaveAttribute('data-slot', 'button-spinner')
    expect(button.childNodes).toHaveLength(2)
    expect(button).toHaveAttribute('data-busy')
    await act(async () => { resolvePlace({ cart: baseCart }) })
  })

  it('shows the slow notice after 8s still submitting', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.handlerClickPlaceOrder.mockImplementation(() => new Promise(() => {}))
    const { findByText, getByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    // real timers for the render/find above (waitFor polls with them); fake
    // only for the 8 s mark, advanced and flushed synchronously
    vi.useFakeTimers()
    try {
      fireEvent.click(button)
      act(() => { vi.advanceTimersByTime(8000) })
      expect(getByText(/Still sending your order/)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('on error shows the inline message and "Try again"', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.handlerClickPlaceOrder.mockResolvedValue({ error: true, result: ['failed'] })
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    fireEvent.click(button)
    expect(await findByText(/Your order wasn.t placed/)).toBeInTheDocument()
    expect(await findByText('Try again')).toBeInTheDocument()
  })

  // round 2, issue 1: a rejected promise (network drop), not just a
  // `{ error: true }` result, must not hang the spinner
  it('a rejected controller call (round 2) still clears the spinner and shows "Try again"', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.handlerClickPlaceOrder.mockRejectedValue(new Error('network down'))
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    fireEvent.click(button)
    expect(await findByText('Try again')).toBeInTheDocument()
    expect(await findByText(/Your order wasn.t placed/)).toBeInTheDocument()
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'false')
  })

  it('keeps placement behind the CTA and blocks confirmation while a payment method is missing', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    expect(mocks.paymentOptionsProps.paySelected).toBeFalsy()
    expect(mocks.paymentOptionsProps.handlePlaceOrder).toBeUndefined()
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  // round 2, issue 4: a guest with nothing required AND nothing saved yet
  // (no name, no email, no phone) still gets the form open on entry
  it('a guest with no required fields and nothing saved yet still gets the form open on entry', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    renderCheckout(baseCart)
    await waitFor(() => expect(mocks.userDetailsProps).not.toBeNull())
    expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(true)
  })

  it('a guest with no required fields but already-saved details does not force the form open', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    renderCheckout(baseCart) // default session user already has name/email/phone
    await waitFor(() => expect(mocks.userDetailsProps).not.toBeNull())
    expect(mocks.userDetailsProps.isUserDetailsEdit).toBeFalsy()
  })

  it('an empty form with nothing required still allows Place Order, unchanged (round 2)', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    const { findByText } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalled()
  })

  // round 3, issue 2/3: required fields missing, nothing typed yet (clean):
  // Step 1 of 2, "your details" in the missing list, CTA "Continue to
  // payment", a click only submits the form (surfaces validation) — never
  // the controller
  it('required fields missing and the form clean: Step 1 of 2, "your details" listed, "Continue to payment", click never calls the controller', async () => {
    const { findByText } = renderCheckout(baseCart) // default checkoutFieldsState: first_name required_with_guest
    await findByText('Step 1 of 2')
    await findByText('your details')
    const button = (await findByText('Continue to payment')).closest('button')
    fireEvent.click(button)
    expect(mocks.guestFormSubmitCount).toBe(1)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  // round 3, issue 2: nothing the site requires — the "Optional" subtitle
  // shows while the form is open, progress reads "Ready", and an untouched
  // (clean) empty form still lets Place Order go straight through
  it('nothing required: shows the "Optional" subtitle while the form is open, progress reads Ready, and placing needs no input', async () => {
    mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    const { findByText } = renderCheckout(baseCart)
    await findByText('Optional · so the store can reach you about your order')
    await findByText('Ready to place your order')
    const button = (await findByText('Place Order · $9.5')).closest('button')
    fireEvent.click(button)
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalled()
  })

  // round 3, issue 2: the "Optional" subtitle never shows once something is
  // required — it would read as if filling the form were optional when it
  // is not
  it('the "Optional" subtitle never shows when a field is required', async () => {
    const { findByText, queryByText } = renderCheckout(baseCart) // default: first_name required
    await findByText('Step 1 of 2')
    expect(queryByText(/Optional/)).not.toBeInTheDocument()
  })

  it('requires separate confirmation after saving optional details for a free order', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.guestFormSaveOutcome = 'success'
    const { findByText } = renderCheckout({ ...baseCart, balance: 0 })
    await findByText('Place Order · $9.5')
    act(() => { mocks.userDetailsProps.onDirtyChange(true) })
    const button = (await findByText('Place Order · $9.5')).closest('button')
    fireEvent.click(button)
    expect(mocks.guestFormSubmitCount).toBe(1)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    fireEvent.click(button)
    await waitFor(() => expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1))
  })

  it('saves optional guest edits and opens payment before a separate order confirmation', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethodId: 1 }
    }
    const { findByText } = renderCheckout({ ...baseCart, paymethod_id: 1 })
    await findByText('Place Order · $9.5')
    expect(mocks.paymentOptionsProps.listOpen).toBe(false)
    act(() => { mocks.userDetailsProps.onDirtyChange(true) })
    const advance = (await findByText('Continue to payment')).closest('button')
    fireEvent.click(advance)
    expect(mocks.guestFormSubmitCount).toBe(1)
    // The form may unmount while it saves.
    act(() => { mocks.userDetailsProps.onDirtyChange(false) })
    expect(advance).toHaveTextContent('Continue to payment')
    expect(advance).toHaveAttribute('aria-busy', 'true')
    act(() => { mocks.userDetailsProps.handleSuccessUpdate() })
    expect(mocks.paymentOptionsProps.listOpen).toBe(true)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    fireEvent.click((await findByText('Place Order · $9.5')).closest('button'))
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
  })

  it('a guest paying with Stripe sees sign-up when confirming after the save', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 2, gateway: 'stripe', paymethod_id: 2 }
    }
    mocks.guestFormSaveOutcome = 'success'
    const { findByText } = renderCheckout(baseCart)
    await findByText('Place Order · $9.5')
    act(() => { mocks.userDetailsProps.onDirtyChange(true) })
    mocks.signUpFormProps = undefined
    fireEvent.click((await findByText('Continue to payment')).closest('button'))
    expect(mocks.signUpFormProps).toBeUndefined()
    fireEvent.click((await findByText('Place Order · $9.5')).closest('button'))
    await waitFor(() => expect(mocks.signUpFormProps?.isGuest).toBe(true))
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  it('a failed save (dirty, one click) never places the order and releases the spinner', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.guestFormSaveOutcome = 'failure'
    const { findByText } = renderCheckout(baseCart)
    await findByText('Place Order · $9.5')
    act(() => { mocks.userDetailsProps.onDirtyChange(true) })
    const button = (await findByText('Continue to payment')).closest('button')
    fireEvent.click(button)
    expect(mocks.guestFormSubmitCount).toBe(1)
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'))
  })

  // Canceling clears the form's dirty flag. Placement still requires its own click.
  it('canceling the open form (its own X) never places the order', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    const { findByText } = renderCheckout(baseCart)
    await findByText('Place Order · $9.5')
    act(() => { mocks.userDetailsProps.onDirtyChange(true) })
    const button = (await findByText('Continue to payment')).closest('button')
    fireEvent.click(button)
    expect(mocks.guestFormSubmitCount).toBe(1)
    // canceling: the form reports clean again without ever calling
    // handleSuccessUpdate or onSaved(true) — exactly what its own X does
    act(() => { mocks.userDetailsProps.onDirtyChange(false) })
    expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
  })

  // round 2, issue 5: the links render under the heading, not above it
  // (round 5: the step's title is "Your details", mockup B)
  it('the guest links render under the "Your details" heading (round 2: moved down)', async () => {
    const { findByText } = renderCheckout(baseCart)
    const heading = await findByText('Your details')
    const link = await findByText('Sign up for faster checkout')
    // eslint-disable-next-line no-bitwise
    expect(heading.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // round 2, issue 6: the missing list stacks with the button, never beside
  // it; round 5 (mockup B): "Still needed: …" reads under the button
  it('the missing list ("Still needed") reads after the button in document order (round 5)', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
    const { findByText } = renderCheckout(baseCart)
    const missingText = await findByText(/Still needed:/)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    // eslint-disable-next-line no-bitwise
    expect(button.compareDocumentPosition(missingText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(button.parentElement).toContainElement(missingText)
  })

  // round 5: while sending, the order context's own `loading` (the
  // controller sets it while placing) never greys the button out
  it('stays enabled (primary) while submitting even when the order context reports loading', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    let resolvePlace
    mocks.handlerClickPlaceOrder.mockImplementation(() => new Promise((resolve) => { resolvePlace = resolve }))
    const { findByText, rerender } = renderCheckout(baseCart)
    const button = (await findByText('Place Order · $9.5')).closest('button')
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    mocks.orderState = { ...mocks.orderState, loading: true }
    rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    expect(button).not.toBeDisabled()
    expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    await act(async () => { resolvePlace({ cart: baseCart }) })
  })

  it('on error, the inline message reads before the button in document order (round 2)', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.handlerClickPlaceOrder.mockResolvedValue({ error: true, result: ['failed'] })
    const { findByText } = renderCheckout(baseCart)
    fireEvent.click((await findByText('Place Order · $9.5')).closest('button'))
    const errorText = await findByText(/Your order wasn.t placed/)
    const button = (await findByText('Try again')).closest('button')
    // eslint-disable-next-line no-bitwise
    expect(errorText.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // round 2, issue 8: a network-level failure can hand the controller an
  // array with a blank message; it must not open an alert with an empty
  // bullet (the inline error + "Try again" already cover it)
  it('filters empty/whitespace error messages before opening the Customer Details alert; none left, it stays closed', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] }, errors: ['   '] }
    const { queryByTestId } = renderCheckout(baseCart)
    await waitFor(() => {})
    expect(queryByTestId('alert')).not.toBeInTheDocument()
  })

  // implementation notesa failed confirmation shows the inline notice with "Try again",
  // never the "Customer Details" alert over it; a data error still opens it
  it('a failed confirmation (technical error) opens no alert: the inline notice and "Try again" stay; a data error still opens the alert', async () => {
    mocks.controllerProps = {
      ...mocks.controllerProps,
      checkoutFieldsState: { loading: false, fields: [] },
      paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
    }
    mocks.handlerClickPlaceOrder.mockResolvedValue({ error: true, result: ['Internal error'] })
    const { findByText, queryByTestId, queryByText, rerender } = renderCheckout(baseCart)
    fireEvent.click((await findByText('Place Order · $9.5')).closest('button'))
    // the controller sets `errors` while placing, then the call resolves with the error
    mocks.controllerProps = { ...mocks.controllerProps, errors: ['Internal error'] }
    rerender(<Checkout cartUuid={baseCart.uuid} handleOrderRedirect={noop} handleCheckoutRedirect={noop} />)
    expect(await findByText(/Your order wasn.t placed/)).toBeInTheDocument()
    expect((await findByText('Try again')).closest('button')).not.toBeDisabled()
    expect(queryByTestId('alert')).not.toBeInTheDocument()
    expect(queryByText('Internal error')).not.toBeInTheDocument()
  })

  // implementation notesafter a 5xx or a dropped connection nobody knows whether the order exists;
  // the cart is read by its UUID before the button can send again
  describe('a failure that leaves the order unconfirmed', () => {
    const cash = { id: 1, gateway: 'cash', paymethod_id: 1 }
    // what the controller returns when placing the cart threw (a 502 or a dropped connection)
    const transportFailure = { error: true, result: { error: true, result: ['Internal error'] } }
    const setup = (props) => {
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] }, paymethodSelected: cash }
      return renderCheckout(baseCart, 2, props)
    }
    const place = (view) => fireEvent.click(view.getByRole('button', { name: /Place Order|Try again|Checking your order/ }))

    it('no second POST goes out until the cart is read; if it was placed, the order opens and nothing more is sent', async () => {
      mocks.handlerClickPlaceOrder.mockResolvedValue(transportFailure)
      let answer
      mocks.readCart.mockImplementation(() => new Promise((resolve) => { answer = resolve }))
      const handleOrderRedirect = vi.fn()
      const view = setup({ handleOrderRedirect })
      await view.findByText('Place Order · $9.5')
      place(view)
      await waitFor(() => expect(mocks.readCart).toHaveBeenCalledTimes(1))
      expect(view.getByRole('button', { name: /Checking your order/ })).toHaveAttribute('aria-busy', 'true')
      place(view)
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)

      await act(async () => { answer({ content: { error: false, result: { status: 1, order: { uuid: 'order-1' } } } }) })
      expect(handleOrderRedirect).toHaveBeenCalledWith('order-1')
      expect(view.queryByText(/wasn.t placed/)).not.toBeInTheDocument()
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    })

    it('a cart that was not placed says so and one retry sends once', async () => {
      mocks.handlerClickPlaceOrder.mockResolvedValueOnce(transportFailure).mockResolvedValue({})
      const view = setup()
      await view.findByText('Place Order · $9.5')
      place(view)
      expect(await view.findByText(/Your order wasn.t placed/)).toBeInTheDocument()
      expect(mocks.readCart).toHaveBeenCalledTimes(1)
      place(view)
      await waitFor(() => expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(2))
      expect(mocks.readCart).toHaveBeenCalledTimes(1)
    })

    it('a cart that cannot be read says the order could not be confirmed and sends nothing until it can', async () => {
      mocks.handlerClickPlaceOrder.mockResolvedValueOnce(transportFailure).mockResolvedValue({})
      mocks.readCart.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'))
      const view = setup()
      await view.findByText('Place Order · $9.5')
      place(view)
      expect(await view.findByText(/We couldn.t confirm your order/)).toBeInTheDocument()
      expect(view.queryByText(/Your order wasn.t placed/)).not.toBeInTheDocument()
      place(view)
      await waitFor(() => expect(mocks.readCart).toHaveBeenCalledTimes(2))
      await view.findByText(/We couldn.t confirm your order/)
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)

      place(view)
      await waitFor(() => expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(2))
      expect(mocks.readCart).toHaveBeenCalledTimes(3)
    })

    it('a cart pending on the payment gateway after a 502 is never sent again: Try again only reads it, and its order opens once placed', async () => {
      mocks.handlerClickPlaceOrder.mockResolvedValue(transportFailure)
      mocks.readCart
        .mockResolvedValueOnce({ content: { error: false, result: { status: 2 } } })
        .mockResolvedValueOnce({ content: { error: false, result: { status: 2 } } })
        .mockResolvedValueOnce({ content: { error: false, result: { status: 1, order: { uuid: 'order-2' } } } })
      const handleOrderRedirect = vi.fn()
      const view = setup({ handleOrderRedirect })
      await view.findByText('Place Order · $9.5')
      expect(view.getByText('Ready to place your order')).toBeInTheDocument()
      place(view)
      expect(await view.findByText(/still confirming your payment/)).toBeInTheDocument()
      // implementation notesthe header waits too; "Ready" would contradict the notice
      expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()
      expect(view.getByText('Confirming your payment…')).toBeInTheDocument()
      place(view)
      await waitFor(() => expect(mocks.readCart).toHaveBeenCalledTimes(2))
      await view.findByText(/still confirming your payment/)
      expect(view.queryByText('Ready to place your order')).not.toBeInTheDocument()
      expect(view.getByText('Confirming your payment…')).toBeInTheDocument()
      place(view)
      await waitFor(() => expect(handleOrderRedirect).toHaveBeenCalledWith('order-2'))
      expect(mocks.readCart).toHaveBeenCalledTimes(3)
      expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
    })

    // implementation notes (N2): Square places the cart inside its own dialog; Checkout hands the dialog the same
    // read by UUID, so a 502 there is not followed by a second POST before the cart is read
    // what PaymentOptions hands the dialog (Checkout's reconcile and place-sent hooks)
    const squareDialog = (props) => (
      <PaymentOptionSquare
        body={{ paymethod_id: 1, amount: 10, cartUuid: baseCart.uuid }}
        data={{}}
        onPlaceOrderClick={props.onPlaceOrderClick}
        reconcileOrder={props.reconcileOrder}
        onPlaceSent={props.onPlaceSent}
      />
    )

    const activate = (button) => { if (!button.disabled) fireEvent.click(button) }

    describe('Square (the real dialog and controller, a fake SDK)', () => {
      afterEach(() => {
        delete window.Square
        document.querySelectorAll('script[src*=squarecdn]').forEach((script) => script.remove())
      })
      it('after a 502, 2 → 2 → 1 sends one POST, reads the cart three times and opens the order once', async () => {
        const placeCart = vi.fn().mockResolvedValue({ error: true, result: ['Internal error'] })
        mocks.orderActions = { ...mocks.orderActions, placeCart }
        window.Square = { payments: () => ({ card: async () => ({ attach: async () => {}, tokenize: async () => ({ status: 'OK', token: 'fake-card' }) }) }) }
        mocks.readCart
          .mockResolvedValueOnce({ content: { error: false, result: { status: 2 } } })
          .mockResolvedValueOnce({ content: { error: false, result: { status: 2 } } })
          .mockResolvedValueOnce({ content: { error: false, result: { status: 1, order: { uuid: 'order-3' } } } })
        mocks.paymentOptionsContent = squareDialog
        const handleOrderRedirect = vi.fn()
        const view = setup({ handleOrderRedirect })
        act(() => document.querySelector('script[src*=squarecdn]').onload())
        fireEvent.click(await view.findByRole('tab', { name: 'Card payments' }))
        const button = document.getElementById('card-button')
        await waitFor(() => expect(button).not.toBeDisabled())

        await act(async () => activate(button))
        expect(placeCart).toHaveBeenCalledTimes(1)
        expect(mocks.readCart).not.toHaveBeenCalled()

        await act(async () => activate(button))
        await act(async () => activate(button))
        expect(mocks.readCart).toHaveBeenCalledTimes(2)
        expect(placeCart).toHaveBeenCalledTimes(1)
        expect(handleOrderRedirect).not.toHaveBeenCalled()

        await act(async () => activate(button))
        expect(mocks.readCart).toHaveBeenCalledTimes(3)
        expect(handleOrderRedirect).toHaveBeenCalledWith('order-3')
        expect(handleOrderRedirect).toHaveBeenCalledTimes(1)
        expect(placeCart).toHaveBeenCalledTimes(1)
      })

      it('a read that fails, or a cart still open, leaves the next attempt allowed', async () => {
        const placeCart = vi.fn().mockResolvedValue({ error: true, result: ['Internal error'] })
        mocks.orderActions = { ...mocks.orderActions, placeCart }
        window.Square = { payments: () => ({ card: async () => ({ attach: async () => {}, tokenize: async () => ({ status: 'OK', token: 'fake-card' }) }) }) }
        mocks.readCart
          .mockRejectedValueOnce(new Error('offline'))
          .mockResolvedValueOnce({ content: { error: false, result: { status: 0 } } })
        mocks.paymentOptionsContent = squareDialog
        const view = setup()
        act(() => document.querySelector('script[src*=squarecdn]').onload())
        fireEvent.click(await view.findByRole('tab', { name: 'Card payments' }))
        const button = document.getElementById('card-button')
        await waitFor(() => expect(button).not.toBeDisabled())

        await act(async () => activate(button))
        expect(placeCart).toHaveBeenCalledTimes(1)
        await act(async () => activate(button))
        expect(placeCart).toHaveBeenCalledTimes(1)
        expect(button).not.toBeDisabled()
        await act(async () => activate(button))
        expect(mocks.readCart).toHaveBeenCalledTimes(2)
        expect(placeCart).toHaveBeenCalledTimes(2)
      })
    })

    // implementation notesthe real SDK over a simulated XHR (a POST of the cart always answers a 502; a GET answers the next
    // item of `answers`, a 502 when there is none), the real Square controller and the main button. Whichever way
    // placed the cart last, a second POST from either one first reads the cart by its UUID.
    describe('the main button and Square share one unknown-outcome state', () => {
      const sdk = new Ordering({ url: 'https://invalid.example', project: 'simulated' })
      let requests
      let tokenize
      afterEach(() => {
        vi.unstubAllGlobals()
        delete window.Square
        document.querySelectorAll('script[src*=squarecdn]').forEach((script) => script.remove())
      })
      const posts = () => requests.filter(([method]) => method === 'POST').length
      const open = async (answers, { tokenError = false } = {}) => {
        requests = []
        vi.stubGlobal('XMLHttpRequest', class {
          open (method, url) { this.method = method; this.url = url }
          setRequestHeader () {}
          send () {
            requests.push([this.method, new URL(this.url).pathname.split('/').at(-1)])
            const answer = this.method === 'GET' ? answers.shift() : null
            this.status = answer ? 200 : 502
            this.response = answer ? JSON.stringify({ error: false, result: answer }) : '<html>Failure</html>'
            queueMicrotask(() => this.onload())
          }
        })
        mocks.readCart.mockImplementation(() => sdk.carts(baseCart.uuid).get())
        mocks.orderActions = { ...mocks.orderActions, placeCart: async (uuid, payload) => (await sdk.carts(uuid).place(payload)).content }
        // the main button's controller: it hands back the SDK's own failure as `result`
        mocks.handlerClickPlaceOrder.mockImplementation(async () => ({ error: true, result: (await sdk.carts(baseCart.uuid).place({ paymethod_id: 1 })).content }))
        tokenize = vi.fn().mockResolvedValue({ status: 'OK', token: 'fake-card' })
        if (tokenError) tokenize.mockRejectedValueOnce(new Error('Card input invalid'))
        window.Square = { payments: () => ({ card: async () => ({ attach: async () => {}, tokenize }) }) }
        mocks.paymentOptionsContent = squareDialog
        const handleOrderRedirect = vi.fn()
        const view = setup({ handleOrderRedirect })
        act(() => document.querySelector('script[src*=squarecdn]').onload())
        fireEvent.click(await view.findByRole('tab', { name: 'Card payments' }))
        const button = document.getElementById('card-button')
        await waitFor(() => expect(button).not.toBeDisabled())
        const ctaName = /Place Order|Try again|Checking your order/
        return {
          view,
          handleOrderRedirect,
          square: () => act(async () => activate(button)),
          // the main button, once the previous read of the cart has ended
          main: async () => {
            await waitFor(() => expect(view.getByRole('button', { name: ctaName })).not.toHaveAttribute('aria-busy', 'true'))
            await act(async () => fireEvent.click(view.getByRole('button', { name: ctaName })))
          }
        }
      }

      it('a Square 502, then the main button: it reads the cart first (2 → 2 → 1), sends nothing and opens the order', async () => {
        const { square, main, handleOrderRedirect } = await open([{ status: 2 }, { status: 2 }, { status: 1, order: { uuid: 'order-4' } }])
        await square()
        expect(requests).toEqual([['POST', 'place']])
        await main()
        await main()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['GET', 'cart-1']])
        expect(handleOrderRedirect).not.toHaveBeenCalled()
        await main()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['GET', 'cart-1'], ['GET', 'cart-1']])
        expect(handleOrderRedirect).toHaveBeenCalledExactlyOnceWith('order-4')
        expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
      })

      it('a Square 502, then the main button finds the cart still open: one more POST goes out, after the read', async () => {
        const { square, main } = await open([{ status: 0 }])
        await square()
        await main()
        expect(requests.slice(0, 3)).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['POST', 'place']])
        expect(posts()).toBe(2)
        expect(mocks.handlerClickPlaceOrder).toHaveBeenCalledTimes(1)
      })

      it('a read that fails sends nothing, from the main button or from Square', async () => {
        const { square, main } = await open([])
        await square()
        await main()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1']])
        await main()
        await square()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['GET', 'cart-1'], ['GET', 'cart-1']])
        expect(posts()).toBe(1)
        expect(tokenize).toHaveBeenCalledTimes(1)
        expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
      })

      it('the main button fails and its read fails: Square reads the cart before its first send', async () => {
        const { square, main } = await open([null, { status: 2 }])
        await main()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1']])
        await square()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['GET', 'cart-1']])
        expect(tokenize).not.toHaveBeenCalled()
      })

      it('a token that failed sent nothing: the retry reads no cart, tokenizes and places normally', async () => {
        const { square, view } = await open([], { tokenError: true })
        await square()
        await view.findByText('Card input invalid')
        expect(requests).toEqual([])
        await square()
        expect(requests).toEqual([['POST', 'place']])
        expect(tokenize).toHaveBeenCalledTimes(2)
        expect(view.queryByText(/couldn.t confirm your order/)).not.toBeInTheDocument()
      })

      it('a Square 502 then a retry inside Square: one POST, three reads, and the order opens by its UUID', async () => {
        const { square, handleOrderRedirect } = await open([{ status: 2 }, { status: 2 }, { status: 1, order: { uuid: 'square-order' } }])
        await square()
        await square()
        await square()
        await square()
        expect(requests).toEqual([['POST', 'place'], ['GET', 'cart-1'], ['GET', 'cart-1'], ['GET', 'cart-1']])
        expect(handleOrderRedirect).toHaveBeenCalledExactlyOnceWith('square-order')
        expect(tokenize).toHaveBeenCalledTimes(1)
      })
    })

    it('a rejection from the API (no transport failure) is not read again: "wasn\'t placed" and retry', async () => {
      mocks.handlerClickPlaceOrder.mockResolvedValueOnce({ error: true, result: undefined })
      const view = setup()
      await view.findByText('Place Order · $9.5')
      place(view)
      expect(await view.findByText(/Your order wasn.t placed/)).toBeInTheDocument()
      expect(mocks.readCart).not.toHaveBeenCalled()
    })
  })

  it('a non-empty error still opens the alert exactly as today', async () => {
    mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] }, errors: ['Network error'] }
    const { findByTestId } = renderCheckout(baseCart)
    expect(await findByTestId('alert')).toHaveTextContent('Network error')
  })

  // implementation notes round 4 (proposal B): the fixed left-column zone order and
  // the step cards' collapsed/open mechanics
  describe('round 4: proposal B layout', () => {
    it('desktop zone order: progress, context, step 1, step 2 — the summary card (right) carries the CTA last', async () => {
      const { findByText, container } = renderCheckout(baseCart)
      await findByText('Continue to payment')
      const zones = ['checkout-progress', 'checkout-context', 'checkout-step-details', 'checkout-step-payment']
        .map((key) => container.querySelector(`[data-doc-section="${key}"]`))
      zones.forEach((node) => expect(node).not.toBeNull())
      for (let i = 1; i < zones.length; i++) {
        // eslint-disable-next-line no-bitwise
        expect(zones[i - 1].compareDocumentPosition(zones[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
      const summary = container.querySelector('[data-doc-section="checkout-summary"]')
      expect(summary).not.toBeNull()
      const cta = container.querySelector('[data-doc-control="checkout-place-order"]')
      expect(summary.contains(cta)).toBe(true)
      // the CTA is the summary card's last doc-section/control
      const summaryPieces = Array.from(summary.querySelectorAll('[data-doc-section], [data-doc-control]'))
      expect(summaryPieces[summaryPieces.length - 1]).toBe(cta)
    })

    it('step 2 stays mounted (hidden) while step 1 is not done; the header shows a plain method summary, not Change/Required', async () => {
      const { findByText, container } = renderCheckout(baseCart)
      await findByText('Continue to payment')
      // PaymentOptions is rendered (its own preselect/cash logic keeps
      // running) even though the step reads as collapsed
      expect(mocks.paymentOptionsProps).not.toBeNull()
      const step2 = container.querySelector('[data-doc-section="checkout-step-payment"]')
      expect(step2).toHaveTextContent('Choose a payment method')
      const hiddenContent = step2.querySelector('[hidden]')
      expect(hiddenContent).not.toBeNull()
      expect(container.querySelector('[data-doc-section="checkout-payment-section"]')).toBeTruthy()
    })

    it('once step 1 is done, step 2 opens with today\'s Change button (no hidden content, no plain summary)', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const { findByText, container } = renderCheckout({ ...baseCart, paymethod_id: 1 })
      await findByText('Place Order · $9.5')
      const step2 = container.querySelector('[data-doc-section="checkout-step-payment"]')
      expect(step2.querySelector('[hidden]')).toBeNull()
      expect(step2).toHaveTextContent('Change')
      expect(step2).not.toHaveTextContent('Choose a payment method')
    })

    it('the CTA reads "Place order · $<total>" once step 1 is done (not the bare "Place Order")', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const { findByText } = renderCheckout(baseCart)
      expect(await findByText('Place Order · $9.5')).toBeInTheDocument()
    })

    it('a delivery order\'s context card reads "Deliver to" and shows the address (AddressDetails), not the business block', async () => {
      const { findByText, container } = renderCheckout({ ...baseCart, business: { ...baseCart.business, slug: 'demo-store' } }, 1)
      await findByText('Deliver to')
      const context = container.querySelector('[data-doc-section="checkout-context"]')
      expect(context.querySelector('[data-testid="address-details-stub"]')).toBeInTheDocument()
      expect(context.querySelector('[data-doc-section="checkout-business-details"]')).toBeNull()
      expect(mocks.addressDetailsProps).not.toBeNull()
    })

    it('the progress says the order type and its moment; the context card "Pickup at {business} · {moment}"', async () => {
      const { findByText, container } = renderCheckout(baseCart)
      expect(await findByText('Pickup · ASAP')).toBeInTheDocument()
      const context = container.querySelector('[data-doc-section="checkout-context"]')
      expect(context.querySelector('[data-doc-section="checkout-business-details"]')).toHaveTextContent('Pickup at Demo Store · ASAP')
      // no logo in the context card: the summary's store row has it
      expect(context.querySelector('img')).toBeNull()
    })

    it('an eat-in order\'s context card says so', async () => {
      const { findByText } = renderCheckout(baseCart, 3)
      expect(await findByText('Eat in at Demo Store · ASAP')).toBeInTheDocument()
    })

    it('step 1: "Edit" in the card\'s header while the form is closed; "Cancel" there while it is open over saved details; never the form\'s own X', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      const { findByRole, container, queryByRole } = renderCheckout(baseCart) // saved details, nothing required
      const step1 = container.querySelector('[data-doc-section="checkout-step-details"]')
      const edit = await findByRole('button', { name: 'Edit' })
      expect(step1.firstElementChild).toContainElement(edit)
      expect(edit).toHaveAttribute('data-doc-control', 'checkout-step-details-edit')
      expect(mocks.userDetailsProps.hideSectionHeading).toBe(true)
      fireEvent.click(edit)
      await waitFor(() => expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(1))
      // the form reports itself open (UserDetails' setIsOpenUserData)
      act(() => { mocks.userDetailsProps.setIsOpenUserData(true) })
      const cancel = await findByRole('button', { name: 'Cancel' })
      expect(queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(cancel).toHaveAttribute('data-doc-control', 'checkout-customer-cancel')
      expect(mocks.userDetailsProps.cancelEditNudge).toBe(0)
      fireEvent.click(cancel)
      await waitFor(() => expect(mocks.userDetailsProps.cancelEditNudge).toBe(1))
      act(() => { mocks.userDetailsProps.setIsOpenUserData(false) })
      expect(await findByRole('button', { name: 'Edit' })).toHaveFocus()
      expect(edit).toHaveAttribute('data-slot', 'button')
      expect(cancel).toHaveAttribute('data-slot', 'button')
    })

    // implementation notesthe form only draws the fields the order type configures
    it('step 1 of a signed-in customer: no configured fields, no "Edit" and the summary stays; with a configured field, "Edit" opens the form and "Cancel" closes it', async () => {
      mocks.sessionState = { user: { id: 5, name: 'Ana', lastname: 'García', email: 'ana@example.com' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      const empty = renderCheckout(baseCart)
      await empty.findByText('Your details')
      expect(empty.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(mocks.userDetailsProps.CollapsedSummaryComponent).toBeTruthy()
      empty.unmount()

      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [{ order_type_id: 2, enabled: true, required: false, validation_field: { code: 'name' } }] }
      }
      const configured = renderCheckout(baseCart)
      fireEvent.click(await configured.findByRole('button', { name: 'Edit' }))
      await waitFor(() => expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(1))
      act(() => { mocks.userDetailsProps.setIsOpenUserData(true) })
      fireEvent.click(await configured.findByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(mocks.userDetailsProps.cancelEditNudge).toBe(1))
    })

    it('step 1: a guest with nothing saved yet gets no "Cancel" over the open form', async () => {
      mocks.sessionState = { user: { guest_id: 'guest-1' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      const { findByText, queryByText } = renderCheckout(baseCart)
      await findByText('Your details')
      act(() => { mocks.userDetailsProps.setIsOpenUserData(true) })
      expect(queryByText('Cancel')).not.toBeInTheDocument()
      expect(queryByText('Edit')).not.toBeInTheDocument()
    })

    it('the wallet sits in the payment step, under the methods — not in the summary card', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      mocks.configState = { ...mocks.configState, configs: { ...mocks.configState.configs, cash_wallet: { value: '1' }, wallet_cash_enabled: { value: '1' } } }
      const wallet = { ...baseCart, business: { ...baseCart.business, configs: [{ key: 'wallet_cash_enabled', value: '1' }] } }
      const { findByRole, container } = renderCheckout(wallet)
      const title = await findByRole('heading', { level: 3, name: 'Wallet' })
      const step2 = container.querySelector('[data-doc-section="checkout-step-payment"]')
      expect(step2).toContainElement(title)
      // eslint-disable-next-line no-bitwise
      expect(step2.querySelector('[data-doc-section="checkout-payment-section"]').compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(container.querySelector('[data-doc-section="checkout-summary"]')).not.toContainElement(title)
    })

    it('step 2 is "Payment"', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const { findByRole } = renderCheckout({ ...baseCart, paymethod_id: 1 })
      expect(await findByRole('button', { name: /^Payment$/ })).toBeInTheDocument()
      expect(await findByRole('region', { name: 'Payment' })).toBeInTheDocument()
    })

    it('a required driver tip renders inside the summary card, not as a standalone section', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: {
          loading: false,
          fields: [{ order_type_id: 1, enabled: true, required_with_guest: true, validation_field: { code: 'driver_tip' } }]
        }
      }
      mocks.configState = { ...mocks.configState, configs: { ...mocks.configState.configs, driver_tip_options: { value: [5, 10] } } }
      const { findByText, container } = renderCheckout(baseCart, 1)
      await findByText('Deliver to')
      const summary = container.querySelector('[data-doc-section="checkout-summary"]')
      expect(summary.querySelector('[data-doc-section="checkout-driver-tips"]')).toBeInTheDocument()
    })
  })
  // implementation notes round 5 review: nothing lost against 13d35dfa
  describe('round 5 review: no information or function lost', () => {
    it('the theme hides "customer" and a field is missing: payment stays open and the CTA opens the UserDetails modal', async () => {
      // default: first_name required for the guest, not saved
      const { findByText, container, getByText } = renderCheckout(baseCart, 2, { theme: customerHidden() })
      const button = (await findByText('Place Order · $9.5')).closest('button')
      expect(container.querySelector('[data-doc-section="checkout-step-details"]')).toBeNull()
      const step2 = container.querySelector('[data-doc-section="checkout-step-payment"]')
      expect(step2.querySelector('[hidden]')).toBeNull()
      expect(step2.querySelector('[data-doc-section="checkout-payment-section"]')).not.toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.click(button)
      expect((await screen.findByRole('dialog')).getAttribute('data-slot')).toBe('dialog-content')
      expect(mocks.userDetailsProps.isCheckoutPlace).toBe(true)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
      // "your details" in the missing list opens it too (no card to scroll to)
      expect(getByText('your details')).toBeInTheDocument()
    })

    it('the theme hides "customer": "your details" in the missing list opens the UserDetails modal', async () => {
      const { findByText } = renderCheckout(baseCart, 2, { theme: customerHidden() })
      fireEvent.click(await findByText('your details'))
      expect((await screen.findByRole('dialog')).getAttribute('data-slot')).toBe('dialog-content')
    })

    it('customer mode with only the email pending counts step 1 as done (handlePlaceOrder\'s own exception); the progress shows', async () => {
      mocks.sessionState = { user: { id: 1, name: 'Agent', email: 'agent@example.com' }, loading: false, auth: true, token: 'tok' }
      mocks.customerState = { user: { id: 5, name: 'Bea' } }
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [{ order_type_id: 2, enabled: true, required: true, validation_field: { code: 'email' } }] }
      }
      const { findByText, queryByText, container } = renderCheckout(baseCart, 2, { isCustomerMode: true })
      expect(await findByText('Step 2 of 2')).toBeInTheDocument()
      expect(queryByText('Continue to payment')).not.toBeInTheDocument()
      expect(queryByText('your details')).not.toBeInTheDocument()
      expect(container.querySelector('[data-doc-section="checkout-step-payment"] [hidden]')).toBeNull()
    })

    it('kiosk: the step 1 card has no numbered circle, and no progress', async () => {
      const { findByText, container } = renderCheckout(baseCart, 2, { useKioskApp: true })
      await findByText("What's your name?")
      const header = container.querySelector('[data-doc-section="checkout-step-details"]').firstElementChild
      expect(header.firstElementChild.tagName).toBe('H2')
      expect(container.querySelector('[data-doc-section="checkout-progress"]')).toBeNull()
    })

    it('a failed payment (cart status 4) and the saved card with its delete stay visible while step 2\'s body waits for step 1', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { id: 3, gateway: 'braintree', paymethod_id: 3 } }
      const cart = { ...baseCart, status: 4, paymethod_id: 3, paymethod_data: { card: { brand: 'visa', last4: '4242' } } }
      const { findByText, getByLabelText, container } = renderCheckout(cart) // default: step 1 incomplete
      await findByText('Continue to payment')
      const step2 = container.querySelector('[data-doc-section="checkout-step-payment"]')
      expect(step2.querySelector('[hidden]')).not.toBeNull()
      const warning = await findByText('The payment has not been successful, please try again')
      expect(warning.closest('[hidden]')).toBeNull()
      expect(step2).toContainElement(warning)
      const remove = getByLabelText('Delete card')
      expect(remove.closest('[hidden]')).toBeNull()
      expect(getByLabelText('Delete card').closest('[data-doc-section="checkout-step-payment"]')).toBe(step2)
      // shown once (not also inside the hidden body)
      expect(container.querySelectorAll('[aria-label="Delete card"]')).toHaveLength(1)
    })

    it('after "Edit", an error that reopens the form (handlePlaceOrder\'s userErrors) still reopens it', async () => {
      // a logged-in user whose saved phone is invalid: userErrors, nothing required
      mocks.sessionState = { user: { id: 1, name: 'Ana', email: 'ana@example.com', cellphone: '123', country_phone_code: '44' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = {
        ...mocks.controllerProps,
        // a configured field: with none there is nothing to edit and no "Edit"
        checkoutFieldsState: { loading: false, fields: [{ order_type_id: 2, enabled: true, required: false, validation_field: { code: 'mobile_phone' } }] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const { findByText, getByText, findByTestId } = renderCheckout(baseCart)
      fireEvent.click(await findByText('Edit'))
      await waitFor(() => expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(1))
      fireEvent.click(getByText('Place Order · $9.5').closest('button'))
      await waitFor(() => expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(2))
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
      // implementation notesa data error is the one that opens the "Customer Details" alert
      expect(await findByTestId('alert')).toBeInTheDocument()
    })

    it('a free order with step 1 incomplete: step 2\'s folded header says no payment is needed', async () => {
      const { findByText, container } = renderCheckout({ ...baseCart, balance: 0 })
      await findByText('Continue to payment')
      const header = container.querySelector('[data-doc-section="checkout-step-payment"]').firstElementChild
      expect(header).toHaveTextContent('No payment needed for this order.')
      expect(header).not.toHaveTextContent('Choose a payment method')
    })

    it('step 1\'s collapsed line has every part of the name', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      renderCheckout(baseCart)
      await waitFor(() => expect(mocks.userDetailsProps?.CollapsedSummaryComponent).toBeTruthy())
      const Collapsed = mocks.userDetailsProps.CollapsedSummaryComponent
      const { getByText } = renderWithProviders(
        <Collapsed userData={{ name: 'Ana', middle_name: 'María', lastname: 'García', second_lastname: 'López', guest_email: 'ana@example.com' }} />
      )
      expect(getByText('Ana María García López · ana@example.com')).toBeInTheDocument()
    })

    it('small screens: while step 2\'s body waits, the bar lists "your details", not the payment hint', async () => {
      mocks.windowSize = { width: 375, height: 812 }
      const waiting = renderCheckout(baseCart) // step 1 incomplete, no method
      await waiting.findAllByText('your details')
      // the bar at the bottom (small screens) is the only CTA on screen
      expect(waiting.container.querySelectorAll('[data-doc-control="checkout-place-order"]')).toHaveLength(1)
      expect(waiting.container.querySelector('[data-doc-section="checkout-summary"] [data-doc-control="checkout-place-order"]')).toBeNull()
      expect(waiting.queryByText('Please, select a payment method to place order.')).not.toBeInTheDocument()
      waiting.unmount()

      mocks.controllerProps = { ...mocks.controllerProps, checkoutFieldsState: { loading: false, fields: [] } }
      const open = renderCheckout(baseCart) // step 1 done, no method
      expect(await open.findByText('Please, select a payment method to place order.')).toBeInTheDocument()
    })

    it('"Cancel" over an open form with something saved, even with a required field missing (as the form\'s X was)', async () => {
      // default: Ana's details saved, first_name required -> the form opens
      const { findByText } = renderCheckout(baseCart)
      await findByText('Continue to payment')
      act(() => { mocks.userDetailsProps.setIsOpenUserData(true) })
      const cancel = (await findByText('Cancel')).closest('button')
      expect(cancel).toHaveAttribute('data-doc-control', 'checkout-customer-cancel')
      fireEvent.click(cancel)
      await waitFor(() => expect(mocks.userDetailsProps.cancelEditNudge).toBe(1))
    })
  })

  // implementation notesits buttons are the base Button of the theme in scope (data-slot), and still do what they did
  describe('the base Button for the gate, the payment change and the delete card', () => {
    const fill = (el) => el.style.getPropertyValue('--ui-button-background')
    const braintreeCart = { ...baseCart, status: 4, paymethod_id: 3, paymethod_data: { card: { brand: 'visa', last4: '4242' } } }

    it('a guest not allowed to check out: Sign up and Login are pieces, Login its outline, and Sign up still opens the guest sign up', async () => {
      mocks.configState = { configs: {} }
      const { findByText } = renderCheckout(baseCart, 2, { theme: themeWithValues() })
      const signUp = (await findByText('Sign up')).closest('button')
      const login = (await findByText('Login')).closest('button')
      expect(signUp).toHaveAttribute('data-slot', 'button')
      expect(login).toHaveAttribute('data-slot', 'button')
      expect(fill(login)).not.toBe(fill(signUp))
      fireEvent.click(signUp)
      await waitFor(() => expect(mocks.signUpFormProps?.isGuest).toBe(true))
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    })

    it('the saved card\'s delete is an icon piece with its name and its base icon, and does not place the order', async () => {
      mocks.controllerProps = { ...mocks.controllerProps, paymethodSelected: { id: 3, gateway: 'braintree', paymethod_id: 3 } }
      const { findByText, getByLabelText } = renderCheckout(braintreeCart, 2, { theme: themeWithValues() })
      await findByText('Continue to payment')
      const remove = getByLabelText('Delete card')
      expect(remove).toHaveAttribute('data-slot', 'button')
      expect(remove).toHaveAttribute('type', 'button')
      expect(remove.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      fireEvent.click(remove)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    })

    it('"Change" is a piece and takes what the store set in slots.payment_change', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const change = async (theme) => {
        const view = renderCheckout({ ...baseCart, paymethod_id: 1 }, 2, { theme })
        await view.findByText('Place Order · $9.5')
        const button = view.getByText('Change').closest('button')
        expect(button).toHaveAttribute('data-slot', 'button')
        expect(button).toHaveAttribute('aria-controls', 'checkout-payment-content')
        const look = { fill: fill(button), height: button.style.getPropertyValue('--ui-button-height') }
        view.unmount()
        return look
      }
      const stored = await change(themeWithValues())
      const configured = await change(themeWithValues((values) => {
        values.components.checkout.slots.payment_change = { ...values.components.checkout.slots.payment_change, color: 'danger', appearance: 'outline', size: 'lg' }
        return values
      }))
      expect(configured.fill).not.toBe(stored.fill)
      expect(configured.height).not.toBe(stored.height)
    })

    it('"Change" ignores the slot\'s shape: shape icon does not turn it into an icon button', async () => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const change = async (theme) => {
        const view = renderCheckout({ ...baseCart, paymethod_id: 1 }, 2, { theme })
        await view.findByText('Place Order · $9.5')
        const button = view.getByText('Change').closest('button')
        const look = { className: button.className, style: button.getAttribute('style'), text: button.textContent }
        view.unmount()
        return look
      }
      const stored = await change(themeWithValues())
      const iconSlot = await change(themeWithValues((values) => {
        values.components.checkout.slots.payment_change = { ...values.components.checkout.slots.payment_change, shape: 'icon' }
        return values
      }))
      expect(iconSlot.text).toBe('Change')
      expect(iconSlot).toEqual(stored)
    })

    // the slot of the store reaches the place order piece; out of the limits the secondary wins over its color
    const withSlot = (slot, patch) => themeWithValues((values) => {
      values.components.checkout.slots[slot] = { ...values.components.checkout.slots[slot], ...patch }
      return values
    })
    const placeOrder = async (theme, cart = baseCart) => {
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [] },
        paymethodSelected: { id: 1, gateway: 'cash', paymethod_id: 1 }
      }
      const view = renderCheckout(cart, 2, { theme })
      await waitFor(() => expect(view.container.querySelector('[data-doc-control="checkout-place-order"]')).not.toBeNull())
      const button = view.container.querySelector('[data-doc-control="checkout-place-order"]')
      expect(button).toHaveAttribute('data-slot', 'button')
      const look = { fill: fill(button), height: button.style.getPropertyValue('--ui-button-height'), full: button.className.includes('ui:w-full') }
      view.unmount()
      return look
    }
    const danger = { color: 'danger', appearance: 'outline', size: 'sm' }

    it('place_order (the page) takes the store\'s size, color and appearance, and is the column\'s full width', async () => {
      const stored = await placeOrder(themeWithValues())
      const configured = await placeOrder(withSlot('place_order', danger))
      expect(stored.full).toBe(true)
      expect(configured.fill).not.toBe(stored.fill)
      expect(configured.height).not.toBe(stored.height)
    })

    it('place_order_mobile (the bar of a small screen) takes its own slot, not place_order\'s', async () => {
      mocks.windowSize = { width: 375, height: 812 }
      const stored = await placeOrder(themeWithValues())
      const mobile = await placeOrder(withSlot('place_order_mobile', danger))
      const page = await placeOrder(withSlot('place_order', danger))
      expect(mobile.fill).not.toBe(stored.fill)
      expect(mobile.height).not.toBe(stored.height)
      expect(page).toEqual(stored)
      expect(stored.full).toBe(true)
    })

    it('out of the order\'s limits the secondary color wins over the store\'s color and appearance', async () => {
      const over = { ...baseCart, valid_maximum: false }
      const stored = await placeOrder(themeWithValues(), over)
      const configured = await placeOrder(withSlot('place_order', danger), over)
      const valid = await placeOrder(themeWithValues())
      expect(configured.fill).toBe(stored.fill)
      expect(stored.fill).not.toBe(valid.fill)
      // the size is still the slot's
      expect(configured.height).not.toBe(stored.height)
    })
  })

  // implementation notesa signed-in customer with something missing got no message
  // from "Continue to payment" (the guest form is the only one it submitted)
  describe('a signed-in customer with a required field missing', () => {
    const signedIn = () => {
      mocks.sessionState = { user: { id: 1, name: 'Ana', email: 'ana@example.com' }, loading: false, auth: true, token: 'tok' }
      mocks.controllerProps = {
        ...mocks.controllerProps,
        checkoutFieldsState: { loading: false, fields: [{ order_type_id: 2, enabled: true, required: true, validation_field: { code: 'lastname' } }] }
      }
    }
    const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)) })

    it('closed form: "Continue to payment" opens it and submits it once, so it says what is missing; the controller is not called', async () => {
      signedIn()
      const { findByText, container } = renderCheckout(baseCart)
      const button = (await findByText('Continue to payment')).closest('button')
      expect(container.querySelector('[data-doc-control="profile-form"]')).toBeNull()
      fireEvent.click(button)
      await waitFor(() => expect(mocks.profileFormSubmitCount).toBe(1))
      expect(container.querySelector('[data-doc-section="checkout-customer-details"] [data-doc-control="profile-form"]')).not.toBeNull()
      await settle()
      expect(mocks.profileFormSubmitCount).toBe(1)
      expect(mocks.guestFormSubmitCount).toBe(0)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    })

    it('opening the form with "Edit" submits nothing; the click on "Continue to payment" over the open form submits it once', async () => {
      signedIn()
      const { findByText, container } = renderCheckout(baseCart)
      fireEvent.click(await findByText('Edit'))
      await waitFor(() => expect(container.querySelector('[data-doc-control="profile-form"]')).not.toBeNull())
      await settle()
      expect(mocks.profileFormSubmitCount).toBe(0)
      fireEvent.click((await findByText('Continue to payment')).closest('button'))
      await settle()
      expect(mocks.profileFormSubmitCount).toBe(1)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    })

    it('unsaved input (dirty): the click submits the open form to save it, never places the order, and releases the button', async () => {
      signedIn()
      const { findByText, container } = renderCheckout(baseCart)
      fireEvent.click(await findByText('Edit'))
      await waitFor(() => expect(container.querySelector('[data-doc-control="profile-form"]')).not.toBeNull())
      act(() => { mocks.userDetailsProps.onDirtyChange(true) })
      const button = (await findByText('Continue to payment')).closest('button')
      fireEvent.click(button)
      await settle()
      expect(mocks.profileFormSubmitCount).toBe(1)
      expect(mocks.guestFormSubmitCount).toBe(0)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
      expect(button).not.toHaveAttribute('aria-busy', 'true')
      // not nudged open again: the form was open already
      expect(mocks.userDetailsProps.isUserDetailsEdit).toBe(1)
    })

    it('a guest still submits only the guest form, once', async () => {
      const { findByText } = renderCheckout(baseCart)
      fireEvent.click((await findByText('Continue to payment')).closest('button'))
      await settle()
      expect(mocks.guestFormSubmitCount).toBe(1)
      expect(mocks.profileFormSubmitCount).toBe(0)
      expect(mocks.handlerClickPlaceOrder).not.toHaveBeenCalled()
    })
  })
})
