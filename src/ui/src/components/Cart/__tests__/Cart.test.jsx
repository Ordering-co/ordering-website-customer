import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { businessFixture, cartFixture, productFixture } from '../../__tests__/helpers/cartTestMocks'
import { useEvent } from '~components/contexts/EventContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Cart } from '../index'

vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: { id: 42 } }]
}))

vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { checkout: { coupon: { enabled: true }, comments: { enabled: true } } } }]
}))

vi.mock('~ui/src/components/BusinessItemAccordion', () => ({
  BusinessItemAccordion: ({ children, uuid, handleClickCheckout, checkoutButtonDisabled }) => (
    <div data-testid='business-accordion'>
      <button data-testid='business-checkout' disabled={checkoutButtonDisabled} onClick={() => handleClickCheckout?.(uuid)} />
      {children}
    </div>
  )
}))
vi.mock('~ui/src/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ product }) => <div>{product?.name}</div>
}))
vi.mock('~ui/src/components/CouponControl', () => ({ CouponControl: () => null }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))
vi.mock('~ui/src/components/UpsellingPage', () => ({ UpsellingPage: () => null }))
vi.mock('~ui/src/components/CartStoresListing', () => ({ CartStoresListing: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/MomentContent', () => ({ MomentContent: () => null }))
vi.mock('~ui/src/components/ServiceForm', () => ({ ServiceForm: () => null }))
vi.mock('~ui/src/components/TaxInformation', () => ({ TaxInformation: () => null }))
vi.mock('~ui/src/components/TaxBillRows', () => ({ TaxBillRows: () => null }))
vi.mock('~ui/src/components/FeeBillRows', () => ({ FeeBillRows: () => null }))
vi.mock('~ui/src/components/RewardsBanner', () => ({ RewardsBanner: () => null }))
vi.mock('../CartStudentAlert', () => ({ CartStudentAlert: () => null }))

const cart = {
  ...cartFixture,
  business: businessFixture,
  valid_products: true,
  valid_schedule: true,
  valid_maximum: true,
  valid_minimum: true,
  valid_address: true,
  total: 9.5,
  products: [{ ...productFixture, code: 'BRG-1' }],
  taxes: []
}

vi.mock('~components/components/Cart', () => ({
  Cart: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={cart}
      currentCartUuid='cart-1'
      isProducts
      clearCart={vi.fn()}
      changeQuantity={vi.fn()}
      getProductMax={vi.fn()}
      offsetDisabled={false}
      removeProduct={vi.fn()}
      onClickCheckout={vi.fn()}
      isCheckout={false}
      isCartPending={false}
      showDiscountInCart
      {...rest}
    />
  )
}))

describe('Cart', () => {
  // implementation notesan offer's information is a base Dialog named by the offer and its rate
  it('an offer\'s Information opens a base Dialog titled by the offer; its close closes it', async () => {
    renderWithProviders(<Cart cart={{ ...cart, offers: [{ id: 5, name: 'Promo', target: 1, rate_type: 1, rate: 10 }] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Information' }))
    const dialog = await screen.findByRole('dialog', { name: /Promo \(10%\)/ })
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renders cart subtotal and product list', () => {
    const { getByText } = renderWithProviders(<Cart cart={cart} />)
    expect(getByText('Subtotal')).toBeInTheDocument()
    expect(getByText('Total')).toBeInTheDocument()
  })

  it('recovers and edits an existing cart comment for the current customer', () => {
    const handleChangeComment = vi.fn()
    renderWithProviders(<Cart cart={{ ...cart, comment: 'No salt' }} handleChangeComment={handleChangeComment} />)
    const field = screen.getByRole('textbox', { name: 'Comments' })
    expect(field).toHaveValue('No salt')
    fireEvent.change(field, { target: { value: 'No salt, please' } })
    expect(handleChangeComment).toHaveBeenCalledWith('No salt, please', 42)
  })

  it('renders full free-delivery progress after products and before the order bill', () => {
    renderWithProviders(
      <Cart
        cart={cart}
        freeDeliveryProgress={{
          status: 'progress',
          minimum: 25,
          currentAmount: 10,
          remainingAmount: 15,
          progressPercent: 40
        }}
      />
    )

    const progress = screen.getByText('Add $15 for free delivery')
    const subtotal = screen.getByText('Subtotal')
    expect(progress.compareDocumentPosition(subtotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(progress.closest('[data-variant]')).toHaveAttribute('data-variant', 'full')
  })

  it('visibility cart.free_delivery_progress hides its progress', () => {
    const theme = themeWithValues((values) => { values.visibility['cart.free_delivery_progress'] = false; return values })
    renderWithProviders(
      <Cart cart={cart} freeDeliveryProgress={{ status: 'progress', minimum: 25, currentAmount: 10, remainingAmount: 15, progressPercent: 40 }} />,
      { theme }
    )
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.queryByText('Add $15 for free delivery')).toBeNull()
  })

  describe('pending cart', () => {
    const [{ configs }] = useConfig()
    const [events] = useEvent()
    const [orderState] = useOrder()
    const pendingCart = { ...cart, uuid: 'cart-1', valid: true, status: 2 }

    const setup = (carts, pending = pendingCart) => {
      configs.checkout_multi_business_enabled = { value: '1' }
      orderState.carts = carts
      events.emit.mockClear()
      return renderWithProviders(<Cart cart={pending} isCartPending showUpsellingInBusinessInfo />)
    }

    afterEach(() => {
      delete configs.checkout_multi_business_enabled
      orderState.carts = {}
    })

    it('sends a pending cart to its own checkout when multi checkout is enabled', () => {
      setup({ 'businessId:1': pendingCart })
      fireEvent.click(screen.getByTestId('business-checkout'))
      expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'checkout', params: { cartUuid: 'cart-1' } })
      expect(events.emit).not.toHaveBeenCalledWith('go_to_page', expect.objectContaining({ page: 'multi_checkout' }))
    })

    it('sends pending carts placed together to their multi checkout', () => {
      const grouped = { ...pendingCart, group: { uuid: 'group-1' } }
      setup({
        'businessId:1': grouped,
        'businessId:2': { ...grouped, uuid: 'cart-2', business_id: 2 }
      }, grouped)
      fireEvent.click(screen.getByTestId('business-checkout'))
      expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'multi_checkout', params: { cartUuid: 'group-1' } })
    })

    it('does not offer to clear a pending cart', () => {
      setup({ 'businessId:1': pendingCart })
      expect(screen.queryByText('Clear cart')).not.toBeInTheDocument()
    })
  })

  it('leaves Clear cart to the cart\'s header in the upselling layout, unless the cart has no header', () => {
    const { unmount } = renderWithProviders(<Cart cart={cart} showUpsellingInBusinessInfo />)
    expect(screen.queryByText('Clear cart')).toBeNull()
    unmount()
    renderWithProviders(<Cart cart={cart} showUpsellingInBusinessInfo forceHideBusiness />)
    expect(screen.getByText('Clear cart')).toBeInTheDocument()
  })

  it('shows unlocked text and preserves the existing checkout action', () => {
    const onClickCheckout = vi.fn()
    renderWithProviders(
      <Cart
        cart={{ ...cart, valid: true }}
        freeDeliveryProgress={{ status: 'unlocked' }}
        onClickCheckout={onClickCheckout}
      />
    )

    // the progress is a status (the comment's saving region is another one, empty)
    expect(screen.getByText('Free delivery unlocked').closest('[role="status"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }))
    expect(onClickCheckout).toHaveBeenCalledTimes(1)
  })

  it("a business's own checkout goes to its cart's checkout, also with multi-business checkout and other carts in its group", () => {
    const [{ configs }] = useConfig()
    const [orderState] = useOrder()
    const [events] = useEvent()
    const previousCarts = orderState.carts
    configs.checkout_multi_business_enabled = { value: '1' }
    orderState.carts = {
      a: { ...cart, valid: true, status: 0, group: { uuid: 'g1' } },
      b: { ...cart, uuid: 'cart-2', valid: true, status: 0, group: { uuid: 'g1' } }
    }
    events.emit.mockClear()
    try {
      renderWithProviders(<Cart cart={cart} />)
      fireEvent.click(screen.getByTestId('business-checkout'))
      expect(events.emit).toHaveBeenCalledWith('go_to_page', { page: 'checkout', params: { cartUuid: cart.uuid } })
      expect(events.emit).not.toHaveBeenCalledWith('go_to_page', expect.objectContaining({ page: 'multi_checkout' }))
    } finally {
      delete configs.checkout_multi_business_enabled
      orderState.carts = previousCarts
    }
  })

  describe('invalid cart', () => {
    const momentMessage = 'Selected schedule time is invalid, please select a schedule into the business schedule interval.'
    const closedMessage = 'The business is closed at the moment'
    const addressMessage = 'Selected address is invalid, please select a closer address.'
    const invalidPreorderCart = { ...cart, valid: false, valid_preorder: false, products: [{ code: 'FISH-1', name: 'Fish Over Rice Platter' }] }

    it('keeps the products visible, explains the reason and blocks checkout', () => {
      renderWithProviders(<Cart cart={invalidPreorderCart} />)
      expect(screen.getByText('Fish Over Rice Platter')).toBeInTheDocument()
      expect(screen.getByText(momentMessage)).toBeInTheDocument()
      expect(screen.getByTestId('business-checkout')).toBeDisabled()
    })

    it('reports a closed business instead of the schedule time it implies', () => {
      renderWithProviders(<Cart cart={{ ...invalidPreorderCart, valid_schedule: false }} />)
      expect(screen.getByText(closedMessage)).toBeInTheDocument()
      expect(screen.queryByText(momentMessage)).not.toBeInTheDocument()
    })

    it('reports an address out of coverage', () => {
      renderWithProviders(<Cart cart={{ ...cart, valid: false, valid_address: false }} />)
      expect(screen.getByText(addressMessage)).toBeInTheDocument()
    })

    it('reports every reason of the cart, each in its own message', () => {
      const { container } = renderWithProviders(<Cart cart={{ ...invalidPreorderCart, valid_address: false }} />)
      expect([...container.querySelectorAll("[data-doc-section='cart-invalid-reason']")].map(el => el.textContent)).toEqual([momentMessage, addressMessage])
    })

    it('paints the reason as a danger alert of the theme, not a live message', () => {
      const theme = themeWithValues((values) => { values.components.alert.variants.danger.background = '#FDEBEB'; return values })
      renderWithProviders(<Cart cart={invalidPreorderCart} />, { theme })
      const reason = screen.getByText(momentMessage)
      expect(reason).not.toHaveAttribute('role')
      expect(window.getComputedStyle(reason).backgroundColor).toBe('rgb(253, 235, 235)')
    })

    it('leaves a valid cart without reasons and with checkout available', () => {
      renderWithProviders(<Cart cart={{ ...cart, valid: true }} />)
      expect(screen.queryByText(momentMessage)).not.toBeInTheDocument()
      expect(screen.queryByText(closedMessage)).not.toBeInTheDocument()
      expect(screen.getByTestId('business-checkout')).not.toBeDisabled()
    })

    it('does not block a pending cart', () => {
      renderWithProviders(<Cart cart={{ ...invalidPreorderCart, status: 2 }} isCartPending />)
      expect(screen.queryByText(momentMessage)).not.toBeInTheDocument()
      expect(screen.getByTestId('business-checkout')).not.toBeDisabled()
    })

    it('leaves the reasons to the checkout page warnings', () => {
      renderWithProviders(<Cart cart={invalidPreorderCart} isCheckout />)
      expect(screen.queryByText(momentMessage)).not.toBeInTheDocument()
    })
  })
})

// implementation notesthe Clear cart and Checkout of the cart are the design system's Button
describe('the cart\'s own buttons (design system Button)', () => {
  const LOOK = ['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color']
  const expectLook = (theme, button, options) => {
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('data-slot', 'button')
    const vars = componentVars(theme, 'button', options)
    LOOK.forEach((name) => expect(button.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
  }
  const clearOf = (theme) => {
    const utils = renderWithProviders(<Cart cart={cart} showUpsellingInBusinessInfo forceHideBusiness />, { theme })
    const button = utils.getByText('Clear cart').closest('button')
    return { utils, button }
  }

  it('Clear cart is the button of cart.slots.clear, a md ghost danger without it (the legacy transparent red)', () => {
    const slot = themeWithValues((values) => { values.components.cart.slots.clear = { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: 'icon' }; return values })
    const own = clearOf(slot)
    expectLook(slot, own.button, { color: 'secondary', appearance: 'outline', size: 'lg' })
    // (the text shape: its side padding, not the icon's square)
    expect(own.button.className).toContain('ui:px-(--ui-button-padding-x)')
    own.utils.unmount()
    const bare = themeWithValues((values) => { values.components.cart.slots.clear = { component: 'button', size: null, appearance: null, color: null, shape: null }; return values })
    const none = clearOf(bare)
    expectLook(bare, none.button, { color: 'danger', appearance: 'ghost', size: 'md' })
    none.utils.unmount()
    const theme = themeWithValues()
    expectLook(theme, clearOf(theme).button, { color: 'danger', appearance: 'ghost', size: 'md' })
  })

  it('Checkout is a md primary, the secondary (disabled) below the minimum, and a main action', () => {
    const theme = themeWithValues()
    const onClickCheckout = vi.fn()
    const valid = renderWithProviders(<Cart cart={{ ...cart, valid: true }} onClickCheckout={onClickCheckout} />, { theme })
    const checkout = valid.getByRole('button', { name: 'Checkout' })
    expectLook(theme, checkout, { color: 'primary', appearance: 'solid', size: 'md' })
    expect(checkout).not.toBeDisabled()
    fireEvent.click(checkout)
    expect(onClickCheckout).toHaveBeenCalledTimes(1)
    valid.unmount()

    const below = renderWithProviders(<Cart cart={{ ...cart, valid: true, minimum: 20 }} onClickCheckout={vi.fn()} />, { theme })
    const short = below.getByText(/^Minimum subtotal order/).closest('button')
    expectLook(theme, short, { color: 'secondary', appearance: 'solid', size: 'md' })
    expect(short).toBeDisabled()
    below.unmount()

    // cta: at full width when the theme says so (components.button.base.cta_full_width)
    const full = themeWithValues((values) => { values.components.button.base.cta_full_width = true; return values })
    const wide = renderWithProviders(<Cart cart={{ ...cart, valid: true }} onClickCheckout={vi.fn()} />, { theme: full })
    expect(wide.getByRole('button', { name: 'Checkout' }).className).toMatch(/(^| )ui:w-full( |$)/)
    // the row's width is its slot's (CheckoutButtonSlot: the Button fills it, no rule of the row reaches the piece)
    const slot = wide.getByRole('button', { name: 'Checkout' }).parentElement
    expect(getComputedStyle(slot).width).toBe('100%')
    // and it shrinks next to the total (the piece alone does not: the row would overflow)
    expect(getComputedStyle(slot).flexShrink).toBe('1')
    expect(wide.getByRole('button', { name: 'Checkout' }).className).toMatch(/(^| )ui:w-full( |$)/)
    wide.unmount()
    // without cta_full_width the Checkout is half of the row
    const half = renderWithProviders(<Cart cart={{ ...cart, valid: true }} onClickCheckout={vi.fn()} />, { theme })
    expect(getComputedStyle(half.getByRole('button', { name: 'Checkout' }).parentElement).width).toBe('50%')
  })
})
