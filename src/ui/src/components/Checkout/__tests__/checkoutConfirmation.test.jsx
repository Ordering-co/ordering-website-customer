import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Checkout } from '../index'

const noop = () => {}
const fixture = vi.hoisted(() => ({
  place: vi.fn(),
  saveUser: vi.fn(),
  login: vi.fn()
}))

const Session = React.createContext()
const Api = React.createContext()
const Orders = React.createContext()
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => React.useContext(Session) }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => React.useContext(Api) }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => React.useContext(Orders) }))
vi.mock('~components/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ on: noop, off: noop, getId: noop })
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ loading: false, fields: {} }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: config }, { refreshConfigs: noop }]
}))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: (props) => <button onClick={() => props.handleSuccessSignup({ id: 77, name: 'Ana' })}>Complete simulated sign-up</button>
}))

const config = {
  guest_checkout_enabled: { value: '1' },
  allowed_order_types_guest_checkout: { value: 'pickup' }
}
const response = result => ({ content: { result, error: false } })
const user = { id: 9, guest_id: 'guest-9', guest_email: 'ana@example.test' }
const nameField = { order_type_id: 2, enabled: true, required_with_guest: true, validation_field: { code: 'name', name: 'Name', type: 'text' } }
const cash = { id: 1, name: 'Cash', gateway: 'cash', enabled: true }
const stripe = { id: 28, name: 'Stripe', gateway: 'stripe', enabled: true }
const business = {
  id: 1,
  name: 'Demo',
  slug: 'demo',
  vertical: 'food',
  paymethods: [
    { paymethod_id: 1, enabled: true, paymethod: cash, data: {} },
    { paymethod_id: 28, enabled: true, paymethod: stripe, data: { publishable: 'pk_test_demo' } }
  ]
}
const cart = {
  uuid: 'cart-demo',
  business_id: 1,
  business,
  status: 0,
  taxes: [],
  balance: 9.5,
  total: 9.5,
  subtotal: 9.5,
  paymethod_id: 1,
  valid: true,
  valid_products: true,
  valid_address: true,
  valid_minimum: true,
  valid_maximum: true,
  products: [{ id: 10, name: 'Test food', code: 'p1', price: 9.5 }]
}

const setup = ({ customerHidden = false, fields = [nameField], initialUser = user, validationResponse, extraPaymethods = [] } = {}) => {
  window.scrollTo = noop
  fixture.place.mockResolvedValue({ error: true, result: ['Simulated place endpoint'] })
  fixture.saveUser.mockImplementation(async changes => response({ ...initialUser, ...changes }))
  vi.stubGlobal('fetch', vi.fn(async url => ({
    json: async () => {
      if (url.endsWith('/validation_field_order_types') && validationResponse) return validationResponse()
      return { result: url.endsWith('/validation_field_order_types') ? fields : [], error: false }
    }
  })))
  const api = {
    project: 'sandbox',
    root: 'https://ordering.invalid',
    businesses: () => ({ select: () => ({ parameters: () => ({ get: async () => response({ ...business, paymethods: [...business.paymethods, ...extraPaymethods] }) }) }) }),
    users: () => ({ save: fixture.saveUser }),
    setAccessToken: () => api,
    paymentCards: () => ({ get: async () => response([{ id: 'card-test', brand: 'visa', last4: '4242' }]) })
  }
  const orderState = { options: { type: 2 }, carts: { 'businessId:1': cart }, loading: false }
  const actions = { changePaymethod: vi.fn(), placeCart: fixture.place, refreshOrderOptions: noop, confirmCart: noop }
  const Provider = ({ children }) => {
    const [sessionUser, setUser] = React.useState(initialUser)
    return (
      <Session.Provider value={[{ auth: true, loading: false, token: 'simulated', user: sessionUser }, {
        changeUser: setUser, login: async ({ user }) => { fixture.login(user); setUser(user) }
      }]}>
        <Api.Provider value={[api]}>
          <Orders.Provider value={[orderState, actions]}>{children}</Orders.Provider>
        </Api.Provider>
      </Session.Provider>
    )
  }
  const theme = themeWithValues(values => {
    if (customerHidden) values.pages.checkout.sections.find(section => section.key === 'customer').visible = false
  })
  return renderWithProviders(<Provider><Checkout cartUuid={cart.uuid} /></Provider>, { theme })
}
beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.unstubAllGlobals())

it('cash saves details without placing, and the separate confirmation calls placeCart once', async () => {
  const view = setup()
  const name = await view.findByPlaceholderText('Name')
  fireEvent.input(name, { target: { value: 'Ana' } })
  fireEvent.click(view.getByRole('button', { name: 'Continue to payment' }))
  await waitFor(() => expect(fixture.saveUser).toHaveBeenCalledTimes(1))
  const place = await view.findByRole('button', { name: /Place Order/ })
  expect(fixture.place).not.toHaveBeenCalled()
  fireEvent.click(place)
  await waitFor(() => expect(fixture.place).toHaveBeenCalledTimes(1))
})

it('implementation notes resumes Stripe setup after signup and places only after confirmation', async () => {
  const view = setup()
  const name = await view.findByPlaceholderText('Name')
  fireEvent.input(name, { target: { value: 'Ana' } })
  fireEvent.click(view.getByRole('button', { name: 'Continue to payment' }))
  await view.findByRole('button', { name: /Place Order/ })
  expect(fixture.place).not.toHaveBeenCalled()
  const stripeChoice = await view.findByText('Stripe', { exact: true })
  fireEvent.click(stripeChoice)
  const signUp = await view.findByRole('button', { name: 'Complete simulated sign-up' })
  expect(fixture.place).not.toHaveBeenCalled()
  fireEvent.click(signUp)
  await waitFor(() => expect(signUp).not.toBeInTheDocument())
  expect(fixture.place).not.toHaveBeenCalled()
  expect(await view.findByRole('button', { name: 'Stripe', pressed: true })).toBeInTheDocument()
  const card = await view.findByRole('radio', { name: /4242/ })
  fireEvent.click(card)
  const place = await view.findByRole('button', { name: /Place Order/ })
  expect(fixture.place).not.toHaveBeenCalled()
  fireEvent.click(place)
  await waitFor(() => expect(fixture.place).toHaveBeenCalledTimes(1))
  expect(fixture.place.mock.calls[0][1]).toMatchObject({
    paymethod_id: 28,
    paymethod_data: { source_id: 'card-test' }
  })
})

it('implementation notes blocks confirmation while the fields request is pending', async () => {
  let resolveFields
  const pending = new Promise(resolve => { resolveFields = resolve })
  const view = setup({ validationResponse: () => pending })
  const cta = view.container.querySelector('[data-doc-control="checkout-place-order"]')
  await view.findByRole('button', { name: 'Cash', pressed: true })
  await act(async () => fireEvent.click(cta))
  expect(fixture.place).not.toHaveBeenCalled()
  expect(cta).toBeDisabled()
  expect(cta).toHaveTextContent('Loading')
  await act(async () => resolveFields({ error: false, result: [nameField] }))
  expect(cta).toBeEnabled()
  expect(cta).toHaveTextContent('Continue to payment')
  expect(fixture.place).not.toHaveBeenCalled()
})

it('implementation notes offers a retry after a fields error and accepts a successful empty list', async () => {
  const loadFields = vi.fn()
    .mockResolvedValueOnce({ error: true, result: ['Fixture failure'] })
    .mockResolvedValueOnce({ error: false, result: [] })
  const view = setup({ validationResponse: loadFields })
  const cta = view.container.querySelector('[data-doc-control="checkout-place-order"]')
  await view.findByRole('button', { name: 'Cash', pressed: true })
  expect(loadFields).toHaveBeenCalledTimes(1)
  expect(cta).toHaveTextContent('Try again')
  expect(fixture.place).not.toHaveBeenCalled()
  fireEvent.click(cta)
  await waitFor(() => expect(loadFields).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(cta).toHaveTextContent('Place Order'))
  expect(fixture.place).not.toHaveBeenCalled()
  fireEvent.click(cta)
  await waitFor(() => expect(fixture.place).toHaveBeenCalledTimes(1))
})

it('implementation notes saves details in the fallback modal and returns to Payment before confirmation', async () => {
  const view = setup({ customerHidden: true })
  await view.findByText('your details', { exact: true })
  const place = await view.findByRole('button', { name: /Place Order/ })
  fireEvent.click(place)
  const name = await view.findByPlaceholderText('Name')
  fireEvent.input(name, { target: { value: 'Ana' } })
  fireEvent.click(view.getByRole('button', { name: /^Continue$/i }))
  await waitFor(() => expect(name).not.toBeInTheDocument())
  expect(fixture.saveUser).toHaveBeenCalledTimes(1)
  expect(fixture.place).not.toHaveBeenCalled()
  expect(view.getByRole('button', { name: 'Cash', pressed: true })).toBeInTheDocument()
  await waitFor(() => expect(view.getByRole('button', { name: 'Payment', exact: true })).toHaveFocus())
  fireEvent.click(place)
  await waitFor(() => expect(fixture.place).toHaveBeenCalledTimes(1))
  expect(fixture.place.mock.calls[0][1].paymethod_id).toBe(1)
})

it('implementation notes resumes the requested provider setup after saving required details', async () => {
  vi.stubGlobal('paypal', { Buttons: { driver: () => null } })
  const paypal = { id: 3, name: 'PayPal', gateway: 'paypal', enabled: true }
  const view = setup({
    customerHidden: true,
    extraPaymethods: [{ paymethod_id: paypal.id, enabled: true, paymethod: paypal, data: { client_id: 'test' } }]
  })
  fireEvent.click(await view.findByRole('button', { name: 'Payment', exact: true }))
  fireEvent.click(await view.findByRole('button', { name: 'PayPal', exact: true }))
  const name = await view.findByPlaceholderText('Name')
  fireEvent.input(name, { target: { value: 'Ana' } })
  fireEvent.click(view.getByRole('button', { name: /^Continue$/i }))
  expect(await view.findByRole('heading', { name: 'Pay with PayPal' })).toBeInTheDocument()
  expect(fixture.saveUser).toHaveBeenCalledTimes(1)
  expect(fixture.place).not.toHaveBeenCalled()
})

it('implementation notes coalesces simultaneous submits and allows retry after validation and save failures', async () => {
  let finishSave
  fixture.saveUser.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve }))
  const view = setup()
  const name = await view.findByPlaceholderText('Name')
  const continueToPayment = view.getByRole('button', { name: 'Continue to payment' })
  fireEvent.click(continueToPayment)
  await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'))
  expect(fixture.saveUser).not.toHaveBeenCalled()
  fireEvent.input(name, { target: { value: 'Ana' } })
  await act(async () => {
    name.form.requestSubmit()
    fireEvent.click(continueToPayment)
  })
  expect(fixture.saveUser).toHaveBeenCalledTimes(1)

  await act(async () => finishSave({ content: { error: true, error_codes: ['name.required'] } }))
  const retryName = await view.findByPlaceholderText('Name')
  await waitFor(() => expect(retryName).toHaveAttribute('aria-invalid', 'true'))
  fireEvent.input(retryName, { target: { value: 'Ana María' } })
  fireEvent.click(await view.findByRole('button', { name: 'Continue to payment' }))
  await view.findByRole('button', { name: /Place Order/ })
  expect(fixture.saveUser).toHaveBeenCalledTimes(2)
  expect(fixture.place).not.toHaveBeenCalled()
})

it('implementation notes validates the missing name and malformed email through the checkout CTA', async () => {
  const emailField = { ...nameField, validation_field: { code: 'email', name: 'Email', type: 'email' } }
  const view = setup({
    fields: [nameField, emailField],
    initialUser: { id: user.id, guest_id: user.guest_id }
  })
  const name = await view.findByPlaceholderText('Name')
  const email = view.getByPlaceholderText('Email')
  fireEvent.input(email, { target: { value: 'not-an-email' } })
  expect(email.validity.typeMismatch).toBe(true)
  const nativeInvalid = vi.fn()
  email.addEventListener('invalid', nativeInvalid)
  fireEvent.click(view.getByRole('button', { name: 'Continue to payment' }))
  expect(nativeInvalid).not.toHaveBeenCalled()
  await waitFor(() => expect(name).toHaveAccessibleDescription(/Name is required/i))
  expect(email).toHaveAccessibleDescription(/Invalid email address/i)
  expect(name).toHaveAttribute('aria-invalid', 'true')
  expect(email).toHaveAttribute('aria-invalid', 'true')
  expect(name).toHaveFocus()
  expect(fixture.saveUser).not.toHaveBeenCalled()
  expect(fixture.place).not.toHaveBeenCalled()
})
