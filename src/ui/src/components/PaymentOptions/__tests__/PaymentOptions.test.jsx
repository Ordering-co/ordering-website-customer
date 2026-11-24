import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { paymethodFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { PaymentOptions } from '../index'

const session = vi.hoisted(() => ({ user: {} }))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/PaymentOptionCash', () => ({
  PaymentOptionCash: () => <div data-testid='payment-cash'>Cash</div>
}))
vi.mock('~ui/src/components/PaymentOptionStripe', () => ({
  PaymentOptionStripe: ({ foldOnSelect, gateway, publicKey }) => (
    <div data-testid='payment-stripe' data-fold={String(!!foldOnSelect)} data-gateway={gateway} data-public-key={publicKey}>Stripe</div>
  )
}))
vi.mock('~ui/src/components/PaymentOptionCard', () => ({
  PaymentOptionCard: () => <div data-testid='payment-card'>Card</div>
}))
vi.mock('~ui/src/components/StripeElementsForm', () => ({
  StripeElementsForm: () => null
}))
vi.mock('~ui/src/components/StripeRedirectForm', () => ({
  StripeRedirectForm: () => null
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, btnTitle, onClickButton, children }) => (
    <div>
      <h3>{content}</h3>
      {onClickButton && <button onClick={onClickButton}>{btnTitle}</button>}
      {children}
    </div>
  )
}))
vi.mock('~ui/src/components/PaymentOptionPaypal', () => ({
  PaymentOptionPaypal: () => null
}))
vi.mock('~ui/src/components/PaymentOptionSquare', () => ({
  PaymentOptionSquare: () => null
}))
vi.mock('~ui/src/components/PaymentOptionEpayco', () => ({
  PaymentOptionEpayco: () => null
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, title, children }) => (open ? <div>{title}{children}</div> : null)
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: () => null
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ token: 'token', user: session.user }]
}))

vi.mock('~components/components/PaymentOptions', () => ({
  PaymentOptions: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={{ total: 20 }}
      paymethodsList={{ loading: false, paymethods: [paymethodFixture, { id: 2, name: 'Card', gateway: 'stripe' }] }}
      paymethodSelected={paymethodFixture}
      paymethodData={{}}
      isOpenMethod={{}}
      handlePaymentMethodClick={vi.fn()}
      {...rest}
    />
  )
}))

const connectV2Paymethod = {
  id: 85,
  name: 'Stripe Connect v2',
  gateway: 'stripe_connect_v2',
  credentials: { publishable: 'pk_connect' }
}
const stripePaymethod = {
  id: 2,
  name: 'Card',
  gateway: 'stripe',
  credentials: { publishable: 'pk_stripe' }
}
const connectV2List = { loading: false, paymethods: [paymethodFixture, stripePaymethod, connectV2Paymethod] }

describe('PaymentOptions (methods unavailable)', () => {
  it('shows and retries the checkout business error while the secondary list still waits for a business', async () => {
    const retryBusinessDetails = vi.fn()
    const retryPaymethods = vi.fn()
    const { getByRole, queryAllByTestId } = renderWithProviders(
      <PaymentOptions
        businessDetailsError={new Error('Business unavailable')}
        retryBusinessDetails={retryBusinessDetails}
        paymethodsList={{ loading: true, paymethods: [], error: null }}
        paymethodSelected={null}
        retryPaymethods={retryPaymethods}
      />
    )
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    expect(getByRole('heading', { name: 'An error has occurred' })).toBeVisible()
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Try again' })) })
    expect(retryBusinessDetails).toHaveBeenCalledOnce()
    expect(retryPaymethods).not.toHaveBeenCalled()
  })

  it.each([
    ['omitted', { loading: false }],
    ['empty', { loading: false, paymethods: [] }]
  ])('shows the no-methods state when the list is %s', (_label, paymethodsList) => {
    const { getByText, queryByRole } = renderWithProviders(
      <PaymentOptions paymethodsList={paymethodsList} paymethodSelected={null} />
    )
    expect(getByText('No payment methods!')).toBeVisible()
    expect(queryByRole('radio')).not.toBeInTheDocument()
  })

  it('shows the translated error and retries the provider request', async () => {
    const retryPaymethods = vi.fn()
    const { getByRole, queryByRole, queryByText } = renderWithProviders(
      <PaymentOptions
        paymethodsList={{ loading: false, paymethods: [], error: [{ message: 'Provider unavailable' }] }}
        paymethodSelected={null}
        retryPaymethods={retryPaymethods}
      />
    )
    expect(getByRole('heading', { name: 'An error has occurred' })).toBeVisible()
    expect(queryByText('No payment methods!')).not.toBeInTheDocument()
    expect(queryByRole('radio')).not.toBeInTheDocument()
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Try again' })) })
    expect(retryPaymethods).toHaveBeenCalledOnce()
  })

  it.each(['selected method', 'payment heading', 'another control'])('keeps or restores focus after recovery (%s)', async (target) => {
    let resolveRetry
    const retryPaymethods = vi.fn(() => new Promise(resolve => { resolveRetry = resolve }))
    const paymentDisclosureRef = React.createRef()
    const error = { loading: false, paymethods: [], error: ['Provider unavailable'] }
    const loading = { loading: true, paymethods: [], error: null }
    const available = { loading: false, paymethods: [paymethodFixture], error: null }
    const contents = (paymethodsList, paymethodSelected = null) => (
      <>
        <h2><button ref={paymentDisclosureRef}>Payment</button></h2>
        <PaymentOptions
          paymethodsList={paymethodsList}
          paymethodSelected={paymethodSelected}
          retryPaymethods={retryPaymethods}
          paymentDisclosureRef={paymentDisclosureRef}
        />
        <button>Other control</button>
      </>
    )
    const { getByRole, rerender } = renderWithProviders(contents(error))
    const retry = getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    rerender(contents(loading))
    expect(getByRole('button', { name: 'Try again' })).toBe(retry)
    expect(retry).toHaveFocus()
    expect(retry).toHaveAttribute('aria-busy', 'true')

    await act(async () => {
      rerender(contents(error))
      resolveRetry()
    })
    expect(getByRole('button', { name: 'Try again' })).toBe(retry)
    expect(retry).toHaveFocus()
    expect(retry.closest('[role="group"]')).toBeNull()
    expect(getByRole('status')).toHaveTextContent('An error has occurred')

    fireEvent.click(retry)
    rerender(contents(loading))
    if (target === 'another control') getByRole('button', { name: 'Other control' }).focus()
    await act(async () => {
      rerender(contents(available, target === 'selected method' ? paymethodFixture : null))
      resolveRetry()
    })
    expect(getByRole('status')).toHaveTextContent('Payment Methods')
    if (target === 'selected method') expect(getByRole('button', { name: 'Cash' })).toHaveFocus()
    if (target === 'payment heading') expect(paymentDisclosureRef.current).toHaveFocus()
    if (target === 'another control') expect(getByRole('button', { name: 'Other control' })).toHaveFocus()
  })
})

describe('PaymentOptions', () => {
  beforeEach(() => {
    session.user = {}
  })

  it('renders payment methods list', () => {
    const { getAllByText, getByText } = renderWithProviders(<PaymentOptions />)
    expect(getAllByText('Cash').length).toBeGreaterThan(0)
    expect(getByText('Card')).toBeInTheDocument()
  })

  it('does not show the saved cards list for a method without cards', () => {
    const { queryByTestId } = renderWithProviders(<PaymentOptions />)
    expect(queryByTestId('payment-stripe')).not.toBeInTheDocument()
  })

  it('opens stripe_connect_v2 as a method that asks for a card', () => {
    const handlePaymethodClick = vi.fn()
    const { getByText } = renderWithProviders(
      <PaymentOptions
        cart={{ total: 20, balance: 20 }}
        paymethodsList={connectV2List}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
      />
    )
    fireEvent.click(getByText('Stripe Connect v2'))
    expect(handlePaymethodClick).toHaveBeenCalledWith(connectV2Paymethod, true)
  })

  it('sends a guest to sign up instead of opening stripe_connect_v2', () => {
    session.user = { guest_id: 'guest-1' }
    const handlePaymethodClick = vi.fn()
    const handleOpenGuestSignup = vi.fn()
    const { getByText } = renderWithProviders(
      <PaymentOptions
        cart={{ total: 20, balance: 20 }}
        paymethodsList={connectV2List}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
        handleOpenGuestSignup={handleOpenGuestSignup}
      />
    )
    fireEvent.click(getByText('Stripe Connect v2'))
    expect(handleOpenGuestSignup).toHaveBeenCalled()
    expect(handlePaymethodClick).not.toHaveBeenCalled()
  })

  it('lists the saved cards of stripe_connect_v2 inline with its own key', () => {
    const { getByTestId } = renderWithProviders(
      <PaymentOptions
        paymethodsList={connectV2List}
        paymethodSelected={null}
        isOpenMethod={{ paymethod: connectV2Paymethod }}
      />
    )
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-gateway', 'stripe_connect_v2')
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-public-key', 'pk_connect')
  })

  it('keeps the key of the paymethod already selected in the cart', () => {
    const { getByTestId } = renderWithProviders(
      <PaymentOptions
        paymethodsList={connectV2List}
        paymethodSelected={null}
        setPaymethodData={vi.fn()}
        paySelected={{
          id: 85,
          gateway: 'stripe_connect_v2',
          paymethod: connectV2Paymethod,
          data: { id: 'card_1', card: { brand: 'visa', last4: '4242' } }
        }}
      />
    )
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-gateway', 'stripe_connect_v2')
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-public-key', 'pk_connect')
  })

  it('shows the cards of the method just opened over the one selected before', () => {
    const { getByTestId } = renderWithProviders(
      <PaymentOptions
        paymethodsList={connectV2List}
        paymethodSelected={null}
        setPaymethodData={vi.fn()}
        isOpenMethod={{ paymethod: stripePaymethod }}
        paySelected={{ id: 85, gateway: 'stripe_connect_v2', paymethod: connectV2Paymethod, data: { id: 'card_1' } }}
      />
    )
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-gateway', 'stripe')
    expect(getByTestId('payment-stripe')).toHaveAttribute('data-public-key', 'pk_stripe')
  })
})

const completeTheme = (showIndicator = true) => themeWithValues((values) => {
  values.components.choice.base.show_indicator = showIndicator
  values.components.choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  return values
})

// The rows of the methods list: actions that look like the theme's choice (the arrows do not move them)
const methodRows = ({ container }) => Array.from(container.querySelectorAll('[data-doc-control="payment-method"]'))

describe('PaymentOptions (the theme\'s choice list)', () => {
  it('each method is an option of a single choice list: selected state, indicator, logo and name', () => {
    const rendered = renderWithProviders(<PaymentOptions />, { theme: completeTheme() })
    const [cash, card] = methodRows(rendered)
    expect(cash.tagName).toBe('BUTTON')
    expect(cash).toHaveAttribute('aria-pressed', 'true')
    expect(cash).toHaveAttribute('data-doc-control', 'payment-method')
    expect(cash).toHaveAttribute('data-doc-payment-gateway', 'cash')
    expect(cash).toHaveTextContent('Cash')
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(cash).toHaveAttribute('data-checked')
    expect(card).not.toHaveAttribute('data-checked')
    // the selected look is the theme's (components.choice), written on the row
    expect(cash.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(cash.querySelectorAll('[data-slot="choice-indicator"]')).toHaveLength(1)
    expect(cash.querySelectorAll('[data-slot="choice-icon"]')).toHaveLength(1)
    expect(cash.children).toHaveLength(3) // indicator, logo, name
  })

  it('picking an option calls the controller; disabled options do not', () => {
    const handlePaymethodClick = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions cart={{ balance: 20 }} handlePaymethodClick={handlePaymethodClick} />,
      { theme: completeTheme() }
    )
    fireEvent.click(methodRows(rendered)[1])
    expect(handlePaymethodClick).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), true)
    rendered.rerender(<PaymentOptions cart={{ balance: 20 }} handlePaymethodClick={handlePaymethodClick} isDisabled />)
    expect(methodRows(rendered)[1]).toBeDisabled()
  })

  it('show_indicator false hides the indicator', () => {
    const rendered = renderWithProviders(<PaymentOptions />, { theme: completeTheme(false) })
    expect(methodRows(rendered)[0].querySelectorAll('[data-slot="choice-indicator"]')).toHaveLength(0)
  })
})

describe('PaymentOptions (folding in the checkout)', () => {
  const stripe = { id: 2, name: 'Card', gateway: 'stripe' }

  it('a chosen method folds the list to it, with what it needs below (the cash amount)', () => {
    const rendered = renderWithProviders(
      <PaymentOptions listOpen={false} onListOpenChange={vi.fn()} />,
      { theme: completeTheme() }
    )
    const options = methodRows(rendered)
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Cash')
    expect(options[0]).toHaveAttribute('aria-pressed', 'true')
    expect(rendered.getByTestId('payment-cash')).toBeInTheDocument()
    expect(rendered.getAllByRole('group')[0]).toHaveAccessibleName('Payment Methods')
  })

  it('picking the chosen one opens the list again; the open list shows them all', () => {
    const onListOpenChange = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions listOpen={false} onListOpenChange={onListOpenChange} />,
      { theme: completeTheme() }
    )
    fireEvent.click(methodRows(rendered)[0])
    expect(onListOpenChange).toHaveBeenCalledWith(true)
    rendered.rerender(<PaymentOptions listOpen onListOpenChange={onListOpenChange} />)
    expect(methodRows(rendered)).toHaveLength(2)
  })

  it('picking another method takes it and folds the list', () => {
    const onListOpenChange = vi.fn()
    const handlePaymethodClick = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions listOpen cart={{ balance: 20 }} handlePaymethodClick={handlePaymethodClick} onListOpenChange={onListOpenChange} />,
      { theme: completeTheme() }
    )
    fireEvent.click(methodRows(rendered)[1])
    expect(handlePaymethodClick).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), true)
    expect(onListOpenChange).toHaveBeenCalledWith(false)
  })

  it.each([
    { id: 5, name: 'Google Pay', gateway: 'google_pay' },
    { id: 6, name: 'Square', gateway: 'square' },
    { id: 7, name: 'PayPal', gateway: 'paypal' },
    { id: 8, name: 'Stripe Direct', gateway: 'stripe_direct' }
  ])('picking the shown $gateway again opens its window again, to retry the payment', (method) => {
    const onListOpenChange = vi.fn()
    const handlePaymethodClick = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions
        listOpen={false}
        cart={{ balance: 20 }}
        requiredFields={[]}
        paymethodsList={{ loading: false, paymethods: [paymethodFixture, method] }}
        paymethodSelected={method}
        paymethodData={{ id: 'src_1' }}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={onListOpenChange}
      />,
      { theme: completeTheme() }
    )
    const options = methodRows(rendered)
    expect(options).toHaveLength(1)
    fireEvent.click(options[0])
    expect(handlePaymethodClick).toHaveBeenCalledWith(method, true)
    expect(onListOpenChange).toHaveBeenCalledWith(false)
    expect(onListOpenChange).not.toHaveBeenCalledWith(true)
  })

  it('picking the shown Stripe again only opens the list: its cards stay chosen below', () => {
    const onListOpenChange = vi.fn()
    const handlePaymethodClick = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions
        listOpen={false}
        cart={{ balance: 20 }}
        paymethodSelected={stripe}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={onListOpenChange}
      />,
      { theme: completeTheme() }
    )
    fireEvent.click(methodRows(rendered)[0])
    expect(onListOpenChange).toHaveBeenCalledWith(true)
    expect(handlePaymethodClick).not.toHaveBeenCalled()
  })

  it('picking the shown cash again keeps its amount: it only opens the list', () => {
    const handlePaymethodClick = vi.fn()
    const rendered = renderWithProviders(
      <PaymentOptions listOpen={false} cart={{ balance: 20 }} handlePaymethodClick={handlePaymethodClick} onListOpenChange={vi.fn()} />,
      { theme: completeTheme() }
    )
    fireEvent.click(methodRows(rendered)[0])
    expect(handlePaymethodClick).not.toHaveBeenCalled()
  })

  it('a method being set up (Stripe and its cards) is the one the list folds to; its cards fold too', () => {
    const rendered = renderWithProviders(
      <PaymentOptions listOpen={false} onListOpenChange={vi.fn()} isOpenMethod={{ paymethod: stripe }} />,
      { theme: completeTheme() }
    )
    const options = methodRows(rendered)
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Card')
    expect(rendered.getByTestId('payment-stripe')).toHaveAttribute('data-fold', 'true')
  })

  it('reports the method being set up so the checkout can ask for its card', () => {
    const onOpenMethodChange = vi.fn()
    renderWithProviders(<PaymentOptions onOpenMethodChange={onOpenMethodChange} isOpenMethod={{ paymethod: stripe }} />, { theme: completeTheme() })
    expect(onOpenMethodChange).toHaveBeenLastCalledWith(stripe)
  })

  it('without the checkout props (other screens) nothing folds', () => {
    expect(methodRows(renderWithProviders(<PaymentOptions />, { theme: completeTheme() }))).toHaveLength(2)
  })
})

// implementation notes (B): with several methods and none chosen, the checkout
// preselects the first non-popup one instead of leaving payment unready
describe('PaymentOptions (B: preselecting a method with several available)', () => {
  const cardDelivery = { id: 2, name: 'Card on Delivery', gateway: 'card_delivery' }
  const methods = { loading: false, paymethods: [paymethodFixture, cardDelivery] }

  it('still auto-selects the only non-popup method when alone (unchanged)', () => {
    const handlePaymethodClick = vi.fn()
    renderWithProviders(
      <PaymentOptions
        cart={{ balance: 20 }}
        paymethodsList={{ loading: false, paymethods: [paymethodFixture] }}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
      />
    )
    expect(handlePaymethodClick).toHaveBeenCalledWith(paymethodFixture)
  })

  it('preselects the first (by id) non-popup method in the checkout when several are available and none is chosen', () => {
    const handlePaymethodClick = vi.fn()
    renderWithProviders(
      <PaymentOptions
        listOpen
        cart={{ balance: 20 }}
        paymethodsList={methods}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={vi.fn()}
      />
    )
    expect(handlePaymethodClick).toHaveBeenCalledWith(paymethodFixture)
  })

  it('does not fight a later manual choice', () => {
    const handlePaymethodClick = vi.fn()
    const { rerender } = renderWithProviders(
      <PaymentOptions
        listOpen
        cart={{ balance: 20 }}
        paymethodsList={methods}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={vi.fn()}
      />
    )
    expect(handlePaymethodClick).toHaveBeenCalledTimes(1)
    handlePaymethodClick.mockClear()
    rerender(
      <PaymentOptions
        listOpen
        cart={{ balance: 20 }}
        paymethodsList={methods}
        paymethodSelected={cardDelivery}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={vi.fn()}
      />
    )
    expect(handlePaymethodClick).not.toHaveBeenCalled()
  })

  // implementation notes round 2: `supportedMethods` is a new array every render, so
  // several re-renders before `paymethodSelected` catches up must still
  // call the preselect only once per mount (the ref guard)
  it('preselects at most once per mount even across several re-renders before paymethodSelected catches up', () => {
    const handlePaymethodClick = vi.fn()
    const { rerender } = renderWithProviders(
      <PaymentOptions
        listOpen
        cart={{ balance: 20 }}
        paymethodsList={methods}
        paymethodSelected={null}
        handlePaymethodClick={handlePaymethodClick}
        onListOpenChange={vi.fn()}
      />
    )
    expect(handlePaymethodClick).toHaveBeenCalledTimes(1)
    // re-renders with the exact same (still null) selection, as React would
    // produce while the parent's state has not caught up yet
    for (let i = 0; i < 3; i++) {
      rerender(
        <PaymentOptions
          listOpen
          cart={{ balance: 20 }}
          paymethodsList={methods}
          paymethodSelected={null}
          handlePaymethodClick={handlePaymethodClick}
          onListOpenChange={vi.fn()}
        />
      )
    }
    expect(handlePaymethodClick).toHaveBeenCalledTimes(1)
  })

  it('never preselects outside the checkout, in customer mode, in kiosk, or once the cart already carries a paymethod', () => {
    const outsideCheckout = vi.fn()
    renderWithProviders(
      <PaymentOptions cart={{ balance: 20 }} paymethodsList={methods} paymethodSelected={null} handlePaymethodClick={outsideCheckout} />
    )
    expect(outsideCheckout).not.toHaveBeenCalled()

    const customerMode = vi.fn()
    renderWithProviders(
      <PaymentOptions listOpen isCustomerMode cart={{ balance: 20 }} paymethodsList={methods} paymethodSelected={null} handlePaymethodClick={customerMode} onListOpenChange={vi.fn()} />
    )
    expect(customerMode).not.toHaveBeenCalled()

    const kiosk = vi.fn()
    renderWithProviders(
      <PaymentOptions listOpen useKioskApp cart={{ balance: 20 }} paymethodsList={methods} paymethodSelected={null} handlePaymethodClick={kiosk} onListOpenChange={vi.fn()} />
    )
    expect(kiosk).not.toHaveBeenCalled()

    const cartHasPaymethod = vi.fn()
    renderWithProviders(
      <PaymentOptions listOpen cart={{ balance: 20, paymethod_id: 2 }} paymethodsList={methods} paymethodSelected={null} handlePaymethodClick={cartHasPaymethod} onListOpenChange={vi.fn()} />
    )
    expect(cartHasPaymethod).not.toHaveBeenCalled()
  })
})

describe('PaymentOptions: the card of Stripe Direct / Connect', () => {
  const directSelected = { id: 3, name: 'Stripe Direct', gateway: 'stripe_direct' }
  const directCard = { card: { brand: 'visa', last4: '4242' } }

  it('is the selected option of the cards of Stripe, under its title, with Change', () => {
    const { getByRole, getByText } = renderWithProviders(
      <PaymentOptions paymethodSelected={directSelected} paymethodData={directCard} />,
      { theme: completeTheme() }
    )
    const card = getByRole('radio', { name: 'XXXX-XXXX-XXXX-4242' })
    expect(card).toHaveAttribute('aria-checked', 'true')
    expect(getByRole('heading', { name: 'Card' })).toBeInTheDocument()
    expect(getByText('Change').tagName).toBe('BUTTON')
  })
})

describe('PaymentOptions: what Stripe Redirect pays with', () => {
  const redirectSelected = { id: 4, name: 'Stripe Redirect', gateway: 'stripe_redirect' }
  const redirectData = { type: 'ideal', owner: { name: 'Ana', email: 'ana@example.com' } }

  it('the selected option (the bank method, the holder and the email) under its title, with Change', () => {
    const { getByRole, getByText } = renderWithProviders(
      <PaymentOptions paymethodSelected={redirectSelected} paymethodData={redirectData} />,
      { theme: completeTheme() }
    )
    const option = getByRole('radio', { name: /iDEAL/ })
    expect(option).toHaveAttribute('aria-checked', 'true')
    expect(getByText('Ana · ana@example.com')).toBeInTheDocument()
    expect(getByRole('heading', { name: 'Select a payment method' })).toBeInTheDocument()
    expect(getByText('Change').tagName).toBe('BUTTON')
  })
})

// visibility.checkout.payment_methods.logo: the logo before each method's name
describe('PaymentOptions: the methods\' logos', () => {
  const logos = (theme) => {
    const rendered = renderWithProviders(<PaymentOptions />, { theme })
    const counts = methodRows(rendered).map((option) => option.children.length)
    rendered.unmount()
    return counts
  }

  it('shown by default; the theme hides them, leaving indicator and name', () => {
    expect(logos(completeTheme())).toEqual([3, 3])
    const hidden = themeWithValues((values) => {
      values.visibility['checkout.payment_methods.logo'] = false
      return values
    })
    const [cash] = methodRows(renderWithProviders(<PaymentOptions />, { theme: hidden }))
    expect(cash.children).toHaveLength(2) // indicator, name
    expect(cash.querySelector('[data-testid="icon-cash"]')).toBeNull()
    expect(cash).toHaveTextContent('Cash')
  })
})

// Card on delivery is a stroke icon that inherits the row's color (implementation notes B1): a fixed gray picture
// vanished on a store whose row has the same gray
describe('PaymentOptions: the card on delivery pictogram', () => {
  it('is a Lucide stroke icon with the inherited color, not an image with its own gray', () => {
    const delivery = { id: 2, name: 'Card on Delivery', gateway: 'card_delivery' }
    const rendered = renderWithProviders(
      <PaymentOptions paymethodsList={{ loading: false, paymethods: [delivery] }} />,
      { theme: completeTheme() }
    )
    const logo = methodRows(rendered)[0].querySelector('[data-slot="choice-icon"]')
    expect(logo.querySelector('img')).toBeNull()
    const icon = logo.querySelector('svg')
    expect(icon).toHaveClass('lucide-credit-card')
    expect(icon).toHaveAttribute('stroke', 'currentColor')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
