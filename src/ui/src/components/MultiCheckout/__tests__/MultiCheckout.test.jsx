import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { checkoutCartFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { sampleBusiness } from '../../__tests__/helpers/ordersTestMocks'
import { MultiCheckout } from '../index'

const handleGroupPlaceOrder = vi.hoisted(() => vi.fn())
const orderMocks = vi.hoisted(() => ({
  state: { options: { type: 1 }, carts: {} },
  actions: { refreshOrderOptions: () => {} }
}))
const permissionMocks = vi.hoisted(() => ({
  config: { configs: {} },
  session: { user: { id: 1 }, loading: false }
}))
const paymentMocks = vi.hoisted(() => ({ props: null }))
const historyMocks = vi.hoisted(() => ({ goBack: vi.fn() }))
const windowMocks = vi.hoisted(() => ({ size: { width: 1024, height: 768 } }))

vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => windowMocks.size }))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderMocks.state, orderMocks.actions]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [permissionMocks.config]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [permissionMocks.session, { login: vi.fn() }]
}))
vi.mock('~ui/src/components/MultiCartsPaymethodsAndWallets', () => ({
  MultiCartsPaymethodsAndWallets: (props) => {
    paymentMocks.props = props
    return null
  }
}))

const verticalMocks = vi.hoisted(() => ({ byBusiness: {} }))

vi.mock('~ui/hooks/useBusinessVerticals', () => ({
  useBusinessVerticals: () => verticalMocks.byBusiness
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useHistory: () => ({ push: vi.fn(), replace: vi.fn(), goBack: historyMocks.goBack })
  }
})

vi.mock('~components/components/MultiCheckout', () => ({
  MultiCheckout: ({ UIComponent, ...rest }) => (
    <UIComponent
      openCarts={[{ ...checkoutCartFixture, business: sampleBusiness }]}
      cartGroup={{ loading: false, result: { status: 'pending', balance: 15.5 } }}
      walletState={{ error: null }}
      checkoutFieldsState={{ loading: false, fields: [] }}
      loyaltyPlansState={{ result: [] }}
      paymethodSelected={{ id: 1, gateway: 'cash', paymethod_id: 1 }}
      handleGroupPlaceOrder={handleGroupPlaceOrder}
      onRedirectPage={vi.fn()}
      placing={false}
      isUserEdit={false}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/Cart', () => ({
  Cart: () => <div data-testid='cart-stub' />
}))

// the forms of the login and sign up dialogs hand them their title (ModalHeading)
vi.mock('~ui/src/components/LoginForm', async () => {
  const { ModalHeading } = await import('~ui/src/components/Overlay/ModalHeading')
  return { LoginForm: () => <div data-testid='login-form'><ModalHeading>Log in</ModalHeading></div> }
})
vi.mock('~ui/src/components/SignUpForm', async () => {
  const { ModalHeading } = await import('~ui/src/components/Overlay/ModalHeading')
  return { SignUpForm: () => <div data-testid='signup-form'><ModalHeading>Create account</ModalHeading></div> }
})

vi.mock('~ui/src/components/DriverTips', () => ({
  DriverTips: () => null
}))

vi.mock('~ui/src/components/CheckoutStudentDetails', () => ({
  CheckoutStudentDetails: ({ cart, onStudentAssigned }) => (
    <button type='button' data-testid='student-details-stub' onClick={() => onStudentAssigned(7)}>{cart?.uuid} {cart?.business?.slug}</button>
  )
}))

const secondSchoolCart = {
  ...checkoutCartFixture,
  uuid: 'school-cart-2',
  business_id: 3,
  business: { ...sampleBusiness, id: 3, slug: 'second-school', vertical: 'school' },
  student_id: null
}

const schoolBusiness = { ...sampleBusiness, vertical: 'school' }
const schoolCartWithoutStudent = { ...checkoutCartFixture, uuid: 'school-cart', business_id: 1, business: schoolBusiness, student_id: null }
const schoolCartWithStudent = { ...schoolCartWithoutStudent, student_id: 7 }
const foodCart = { ...checkoutCartFixture, uuid: 'food-cart', business_id: 2, business: { ...sampleBusiness, id: 2, vertical: 'food' } }

// the page on the theme of the schema's defaults
const renderPage = (ui) => renderWithProviders(ui, { theme: defaultTheme })

describe('MultiCheckout', () => {
  beforeEach(() => {
    handleGroupPlaceOrder.mockReset()
    orderMocks.state = { options: { type: 1 }, carts: {} }
    permissionMocks.config = { configs: {} }
    permissionMocks.session = { user: { id: 1 }, loading: false }
    paymentMocks.props = null
    verticalMocks.byBusiness = {}
    windowMocks.size = { width: 1024, height: 768 }
  })

  it('renders checkout title and place order action', () => {
    const { getByText } = renderPage(<MultiCheckout cartUuid={checkoutCartFixture.uuid} />)
    expect(getByText('Checkout')).toBeInTheDocument()
    expect(getByText('Place Order')).toBeInTheDocument()
  })

  it('offers an exit when the single cart in a group has an unusable identifier', () => {
    const onRedirectPage = vi.fn()
    const handleSearchRedirect = vi.fn()
    const { getByRole } = renderPage(
      <MultiCheckout cartUuid='group-1' openCarts={[{ ...foodCart, uuid: 'undefined' }]} onRedirectPage={onRedirectPage} handleSearchRedirect={handleSearchRedirect} />
    )
    expect(onRedirectPage).not.toHaveBeenCalled()
    fireEvent.click(getByRole('button', { name: 'Go to Businesses' }))
    expect(handleSearchRedirect).toHaveBeenCalledOnce()
  })

  it('hands a usable single cart to checkout with a normalized identifier', () => {
    const onRedirectPage = vi.fn()
    renderPage(<MultiCheckout cartUuid='group-1' openCarts={[{ ...foodCart, uuid: ' food-cart ' }]} onRedirectPage={onRedirectPage} />)
    expect(onRedirectPage).toHaveBeenCalledWith({ page: 'checkout', params: { cartUuid: 'food-cart' } })
  })

  it('keeps place order enabled for non-school carts', () => {
    const { getByText, queryByTestId } = renderPage(
      <MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />
    )
    expect(getByText('Place Order').closest('button')).not.toBeDisabled()
    expect(queryByTestId('student-details-stub')).not.toBeInTheDocument()
  })

  // implementation noteswhile it places, the button is a busy Button (spinner,
  // aria-busy, its color kept), not a disabled one, and the click adds nothing
  it('while placing: the spinner and aria-busy, not disabled, "Placing" and a click that places nothing', () => {
    const { getByText } = renderPage(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} placing />)
    const button = getByText('Placing').closest('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button.firstChild).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(button)
    expect(handleGroupPlaceOrder).not.toHaveBeenCalled()
  })

  it('not placing: no spinner and no aria-busy; the group still loading disables it', () => {
    const { getByText, rerender } = renderPage(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />)
    const button = getByText('Place Order').closest('button')
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button.querySelector('[aria-hidden]')).toBeNull()
    rerender(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} cartGroup={{ loading: true, result: null }} />)
    expect(getByText('Place Order').closest('button')).toBeDisabled()
  })

  // implementation notesthe one Place Order is the base Button; its slot changes with the width and the store's options reach it
  it('place order is a full width piece that takes place_order (page) and place_order_mobile (a small screen) of the store', () => {
    const danger = { color: 'danger', appearance: 'outline', size: 'sm' }
    const withSlot = (slot) => themeWithValues((values) => {
      values.components.checkout.slots[slot] = { ...values.components.checkout.slots[slot], ...danger }
      return values
    })
    const look = (theme, width) => {
      windowMocks.size = { width, height: 768 }
      const view = renderWithProviders(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />, { theme })
      const button = view.container.querySelector('[data-doc-control="multi-checkout-place-order"]')
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.className).toContain('ui:w-full')
      const result = { fill: button.style.getPropertyValue('--ui-button-background'), height: button.style.getPropertyValue('--ui-button-height') }
      view.unmount()
      return result
    }
    const stored = look(themeWithValues(), 1024)
    expect(look(withSlot('place_order'), 1024).fill).not.toBe(stored.fill)
    expect(look(withSlot('place_order'), 1024).height).not.toBe(stored.height)
    // the other slot does not reach the page's button, and the phone's does reach the phone's
    expect(look(withSlot('place_order_mobile'), 1024)).toEqual(stored)
    const storedPhone = look(themeWithValues(), 375)
    expect(look(withSlot('place_order_mobile'), 375).fill).not.toBe(storedPhone.fill)
    expect(look(withSlot('place_order'), 375)).toEqual(storedPhone)
  })

  it('blocks place order and explains when a school cart has no student', () => {
    const { getByText, getByTestId } = renderPage(
      <MultiCheckout cartUuid={schoolCartWithoutStudent.uuid} openCarts={[foodCart, schoolCartWithoutStudent]} />
    )
    const button = getByText('Place Order').closest('button')
    expect(button).toBeDisabled()
    expect(getByText('Please select a student to place the order.')).toBeInTheDocument()
    expect(getByTestId('student-details-stub')).toHaveTextContent('school-cart')
    fireEvent.click(button)
    expect(handleGroupPlaceOrder).not.toHaveBeenCalled()
  })

  it('opens the gate once the school cart reports a successful assign', () => {
    const { getByText, getByTestId } = renderPage(
      <MultiCheckout cartUuid={schoolCartWithoutStudent.uuid} openCarts={[schoolCartWithoutStudent]} />
    )
    const button = getByText('Place Order').closest('button')
    expect(button).toBeDisabled()
    fireEvent.click(getByTestId('student-details-stub'))
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(handleGroupPlaceOrder).toHaveBeenCalled()
  })

  it('renders one selector per school cart and waits for all of them', () => {
    const { getByText, getAllByTestId } = renderPage(
      <MultiCheckout cartUuid={schoolCartWithStudent.uuid} openCarts={[schoolCartWithStudent, secondSchoolCart]} />
    )
    const button = getByText('Place Order').closest('button')
    const selectors = getAllByTestId('student-details-stub')
    expect(selectors).toHaveLength(2)
    expect(selectors[0]).toHaveTextContent('school-cart')
    expect(selectors[1]).toHaveTextContent('school-cart-2')
    expect(button).toBeDisabled()
    fireEvent.click(selectors[1])
    expect(button).not.toBeDisabled()
  })

  it('detects the school from the order context when the cart group omits the vertical', () => {
    const groupCart = { ...checkoutCartFixture, uuid: 'school-cart', business_id: 1, business: { id: 1, name: 'School' } }
    orderMocks.state = {
      options: { type: 1 },
      carts: { 'businessId:1': { ...groupCart, business: { id: 1, slug: 'the-school', vertical: 'school' }, student_id: null } }
    }
    const { getByText, getByTestId } = renderPage(
      <MultiCheckout cartUuid={groupCart.uuid} openCarts={[groupCart]} />
    )
    expect(getByTestId('student-details-stub')).toHaveTextContent('the-school')
    expect(getByText('Place Order').closest('button')).toBeDisabled()
  })

  it('detects the school from the business lookup when neither payload carries the vertical', () => {
    const groupCart = { ...checkoutCartFixture, uuid: 'school-cart', business_id: 3169, business: { id: 3169, slug: 'los_carrisos' }, student_id: null }
    verticalMocks.byBusiness = { 3169: 'school' }
    const { getByText, getByTestId } = renderPage(
      <MultiCheckout cartUuid={groupCart.uuid} openCarts={[groupCart]} />
    )
    expect(getByTestId('student-details-stub')).toHaveTextContent('los_carrisos')
    expect(getByText('Place Order').closest('button')).toBeDisabled()
  })

  it('trusts the order context student when the cart group omits it', () => {
    const groupCart = { ...checkoutCartFixture, uuid: 'school-cart', business_id: 1, business: { id: 1, name: 'School' } }
    orderMocks.state = {
      options: { type: 1 },
      carts: { 'businessId:1': { ...groupCart, business: { id: 1, slug: 'the-school', vertical: 'school' }, student_id: 9 } }
    }
    const { getByText } = renderPage(
      <MultiCheckout cartUuid={groupCart.uuid} openCarts={[groupCart]} />
    )
    expect(getByText('Place Order').closest('button')).not.toBeDisabled()
  })

  it('allows place order once every school cart has a student', () => {
    const { getByText, queryByText } = renderPage(
      <MultiCheckout cartUuid={schoolCartWithStudent.uuid} openCarts={[foodCart, schoolCartWithStudent]} />
    )
    expect(getByText('Place Order').closest('button')).not.toBeDisabled()
    expect(queryByText('Please select a student to place the order.')).not.toBeInTheDocument()
  })

  it('blocks persisted guest checkout when the feature is disabled', () => {
    permissionMocks.session = { user: { guest_id: 'guest-1' }, loading: false }
    const { getByText, queryByText } = renderWithProviders(
      <MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />
    )
    const button = getByText('Place Order').closest('button')
    expect(button).toBeDisabled()
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(handleGroupPlaceOrder).not.toHaveBeenCalled()
  })

  it('revalidates a retained multi-checkout payment callback after permission revocation', () => {
    permissionMocks.session = { user: { guest_id: 'guest-1' }, loading: false }
    permissionMocks.config = {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'delivery' }
      }
    }
    const { getByText, rerender } = renderWithProviders(
      <MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />
    )
    expect(getByText('Continue as guest')).toBeInTheDocument()
    const retainedPlaceOrder = paymentMocks.props.handlePlaceOrder

    permissionMocks.config = { configs: {} }
    rerender(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />)
    retainedPlaceOrder()

    expect(handleGroupPlaceOrder).not.toHaveBeenCalled()
    expect(getByText('Place Order').closest('button')).toBeDisabled()
  })

  // implementation notesthe guest gate and the back action are the base Button, and still do what they did
  it('draws back, sign up, login and continue as guest with the base Button of the theme in scope', () => {
    historyMocks.goBack.mockClear()
    permissionMocks.session = { user: { guest_id: 'guest-1' }, loading: false }
    permissionMocks.config = {
      configs: {
        guest_checkout_enabled: { value: '1' },
        allowed_order_types_guest_checkout: { value: 'delivery' }
      }
    }
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />,
      { theme: themeWithValues() }
    )
    const back = getByLabelText('Back')
    expect(back).toHaveAttribute('data-slot', 'button')
    expect(back).toHaveAttribute('type', 'button')
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(back)
    expect(historyMocks.goBack).toHaveBeenCalledTimes(1)
    ;['Sign up', 'Login', 'Continue as guest'].forEach((label) => {
      expect(getByText(label).closest('button')).toHaveAttribute('data-slot', 'button')
    })
    // login is the outline of sign up, the guest the outline of the inverse: their fills differ from the solid primary
    const fill = (label) => getByText(label).closest('button').style.getPropertyValue('--ui-button-background')
    expect(fill('Login')).not.toBe(fill('Sign up'))
    expect(fill('Continue as guest')).not.toBe(fill('Sign up'))
    fireEvent.click(getByText('Continue as guest'))
    expect(queryByText('Continue as guest')).not.toBeInTheDocument()
  })

  // implementation notesthe login and sign up dialogs are the base Dialog, at the theme's xl
  it('Login and Sign up open a base Dialog named by its form; its close closes it', async () => {
    permissionMocks.session = { user: { guest_id: 'guest-1' }, loading: false }
    permissionMocks.config = { configs: { guest_checkout_enabled: { value: '1' }, allowed_order_types_guest_checkout: { value: 'delivery' } } }
    renderWithProviders(<MultiCheckout cartUuid={foodCart.uuid} openCarts={[foodCart]} />, { theme: themeWithValues() })
    for (const [button, title, form] of [['Login', 'Log in', 'login-form'], ['Sign up', 'Create account', 'signup-form']]) {
      fireEvent.click(screen.getByText(button))
      const dialog = await screen.findByRole('dialog', { name: title })
      expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
      expect(dialog).toContainElement(screen.getByTestId(form))
      expect(document.querySelector('#app-modals .popup-component')).toBeNull()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
      await waitFor(() => expect(screen.queryByTestId(form)).toBeNull())
    }
  })

  it('refreshes the cart group when the driver tip in the order context changes', () => {
    const getMultiCart = vi.fn()
    const groupCart = { ...foodCart, driver_tip: 0 }
    orderMocks.state = { options: { type: 1 }, carts: { 'businessId:2': { ...groupCart } } }
    const { rerender } = renderPage(
      <MultiCheckout cartUuid='group-1' openCarts={[groupCart]} getMultiCart={getMultiCart} />
    )
    expect(getMultiCart).not.toHaveBeenCalled()
    orderMocks.state = { options: { type: 1 }, carts: { 'businessId:2': { ...groupCart, driver_tip: 3.3 } } }
    rerender(<MultiCheckout cartUuid='group-1' openCarts={[groupCart]} getMultiCart={getMultiCart} />)
    expect(getMultiCart).toHaveBeenCalledTimes(1)
  })

  it('does not refresh the cart group while the order context is loading', () => {
    const getMultiCart = vi.fn()
    const groupCart = { ...foodCart, driver_tip: 0 }
    orderMocks.state = { options: { type: 1 }, carts: { 'businessId:2': { ...groupCart } } }
    const { rerender } = renderPage(
      <MultiCheckout cartUuid='group-1' openCarts={[groupCart]} getMultiCart={getMultiCart} />
    )
    orderMocks.state = { options: { type: 1 }, loading: true, carts: { 'businessId:2': { ...groupCart, driver_tip: 3.3 } } }
    rerender(<MultiCheckout cartUuid='group-1' openCarts={[groupCart]} getMultiCart={getMultiCart} />)
    expect(getMultiCart).not.toHaveBeenCalled()
    orderMocks.state = { options: { type: 1 }, carts: { 'businessId:2': { ...groupCart, driver_tip: 3.3 } } }
    rerender(<MultiCheckout cartUuid='group-1' openCarts={[groupCart]} getMultiCart={getMultiCart} />)
    expect(getMultiCart).toHaveBeenCalledTimes(1)
  })
})
