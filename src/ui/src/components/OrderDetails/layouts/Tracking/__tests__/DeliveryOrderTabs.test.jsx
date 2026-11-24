import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { DeliveryOrderTabs } from '../DeliveryOrderTabs'
import { defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parsePrice: (value) => `$${Number(value).toFixed(2)}` }]
}))
const order = {
  id: 1,
  delivery_type: 1,
  customer: { name: 'Ana', lastname: 'Lopez', address: 'Calle 1 #23', cellphone: '+51888' },
  driver: { name: 'Luis', lastname: 'Perez', cellphone: '+51999', vehicle: { name: 'Moto', plate: 'ABC-123' } },
  summary: { subtotal: 20, discount: 0, total: 25, driver_tip: 2, delivery_price: 3, service_fee: 0 },
  taxes: [{ id: 9, type: 2, rate: 18, target: 'product', name: 'IGV', summary: { tax: 3.6 } }],
  fees: [],
  offers: [],
  products: [{ id: 1, name: 'Burger', price: 10 }],
  paymethod: { name: 'Pago Post' },
  paymethod_data: { card: { brand: 'visa', last4: '4242' } }
}

const renderTabs = (overrides = {}, props = {}) => renderWithProviders(
  <DeliveryOrderTabs order={{ ...order, ...overrides }} productList={<div data-testid='product-list' />} productsCount={1} {...props} />,
  { theme: defaultTheme }
)

describe('DeliveryOrderTabs', () => {
  it('shows the delivery fields and the driver with a call button by default', () => {
    const { getByText, container } = renderTabs()
    expect(getByText('Delivery address')).toBeInTheDocument()
    expect(getByText('Calle 1 #23')).toBeInTheDocument()
    expect(getByText('Ana Lopez')).toBeInTheDocument()
    expect(getByText('+51888')).toBeInTheDocument()
    expect(getByText('Luis Perez')).toBeInTheDocument()
    expect(getByText('Moto · Plate ABC-123')).toBeInTheDocument()
    expect(container.querySelector('a[data-doc-control="order-tracking-call-driver"][href="tel:+51999"]')).toBeTruthy()
  })

  it('respects the hidden flags', () => {
    const { queryByText, container } = renderTabs({}, { hideCustomerAddress: true, hideCustomerPhone: true, hideDriverName: true, hideDriverPhone: true })
    expect(queryByText('Calle 1 #23')).toBeNull()
    expect(queryByText('+51888')).toBeNull()
    expect(queryByText('Luis Perez')).toBeNull()
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('switches to the order tab with the totals, products and payment method', () => {
    const { getByText, getByTestId } = renderTabs()
    fireEvent.click(getByText('Your order'))
    expect(getByText('Total cost')).toBeInTheDocument()
    expect(getByText('Products')).toBeInTheDocument()
    expect(getByText('$20.00')).toBeInTheDocument()
    expect(getByText('IGV (18%)')).toBeInTheDocument()
    expect(getByText('$3.60')).toBeInTheDocument()
    expect(getByText('Delivery fee')).toBeInTheDocument()
    expect(getByText('$3.00')).toBeInTheDocument()
    expect(getByText('Driver tip')).toBeInTheDocument()
    expect(getByText('$25.00')).toBeInTheDocument()
    expect(getByTestId('product-list')).toBeInTheDocument()
    expect(getByText('Payment method')).toBeInTheDocument()
    expect(getByText('VISA ****4242')).toBeInTheDocument()
  })

  it('shows discounts, fees and the payment name when there is no card', () => {
    const { getByText } = renderTabs({
      summary: { subtotal: 20, discount: 2, subtotal_with_discount: 18, total: 18, service_fee: 1 },
      offer_type: 1,
      offer_rate: 10,
      taxes: [],
      fees: [{ id: 3, name: 'Servicio', fixed: 1, percentage: 0, summary: { fixed: 1 } }],
      paymethod_data: {}
    })
    fireEvent.click(getByText('Your order'))
    expect(getByText('Discount (10%)')).toBeInTheDocument()
    expect(getByText('- $2.00')).toBeInTheDocument()
    expect(getByText('Subtotal with discount')).toBeInTheDocument()
    expect(getByText('Servicio ($1.00)')).toBeInTheDocument()
    expect(getByText('Pago Post')).toBeInTheDocument()
  })

  it('hides the order comment and number outside courier projects', () => {
    const { getByText, queryByText } = renderTabs({ comment: 'McCombo grande' })
    fireEvent.click(getByText('Your order'))
    expect(queryByText('McCombo grande')).toBeNull()
    expect(queryByText('#1')).toBeNull()
  })

  it('shows the order number, products and comment without costs or payment for courier projects', () => {
    const { getByText, getByTestId, queryByText } = renderTabs({ comment: 'McCombo grande' }, { isCourierTracking: true })
    fireEvent.click(getByText('Your order'))
    expect(getByText('Order number')).toBeInTheDocument()
    expect(getByText('#1')).toBeInTheDocument()
    expect(getByTestId('product-list')).toBeInTheDocument()
    expect(getByText('Comment')).toBeInTheDocument()
    expect(getByText('McCombo grande')).toBeInTheDocument()
    expect(queryByText('Total cost')).toBeNull()
    expect(queryByText('Delivery fee')).toBeNull()
    expect(queryByText('$25.00')).toBeNull()
    expect(queryByText('Payment method')).toBeNull()
  })

  it('omits the comment block for courier projects when the order has no comment', () => {
    const { getByText, queryByText } = renderTabs({}, { isCourierTracking: true })
    fireEvent.click(getByText('Your order'))
    expect(queryByText('Comment')).toBeNull()
  })

  describe('the driver\'s photo is components.avatar of order_tracking driver_avatar_size (md)', () => {
    const renderThemed = (overrides = {}, props = {}) => renderWithProviders(
      <DeliveryOrderTabs order={{ ...order, ...overrides }} productList={<div />} productsCount={1} {...props} />,
      { theme: themeWithValues() }
    )

    it('decorative beside the name, the photo inside a box of md', () => {
      const { container } = renderThemed({ driver: { ...order.driver, photo: '/driver.jpg' } })
      const photo = container.querySelector('img[src="/driver.jpg"]')
      const avatar = photo.parentElement
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
      expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(themeWithValues().css.components.avatar.sizes.md.size)
      expect(container.querySelector('.avatar')).toBeNull()
    })

    it('named "Driver" when the name is hidden; the user icon without a photo', () => {
      const named = renderThemed({ driver: { ...order.driver, photo: '/driver.jpg' } }, { hideDriverName: true })
      expect(named.getByRole('img', { name: 'Driver' })).toBeInTheDocument()
      named.unmount()
      const { container } = renderThemed()
      // the base Icon of the avatar: decorative, the user glyph
      expect(container.querySelector('svg.lucide-user[aria-hidden="true"]')).toBeInTheDocument()
    })
  })
})

describe('DeliveryOrderTabs: confirmation.driver.plate', () => {
  const renderThemedTabs = (shown) => renderWithProviders(
    <DeliveryOrderTabs order={order} productList={<div />} productsCount={1} />,
    {
      theme: themeWithValues((values) => {
        values.visibility['confirmation.driver.plate'] = shown
        return values
      })
    }
  )

  it('shows the plate by default and hides it, the vehicle stays', () => {
    const shown = renderThemedTabs(true)
    expect(shown.getByText('Moto · Plate ABC-123')).toBeInTheDocument()
    shown.unmount()
    const { getByText, queryByText } = renderThemedTabs(false)
    expect(getByText('Moto')).toBeInTheDocument()
    expect(queryByText(/ABC-123/)).toBeNull()
  })
})

describe('DeliveryOrderTabs: confirmation.driver.photo', () => {
  const renderPhoto = (shown) => renderWithProviders(
    <DeliveryOrderTabs order={{ ...order, driver: { ...order.driver, photo: '/driver.jpg' } }} productList={<div />} productsCount={1} />,
    {
      theme: themeWithValues((values) => {
        values.visibility['confirmation.driver.photo'] = shown
        return values
      })
    }
  )

  it('shows the driver\'s photo by default and hides it, the name stays', () => {
    const shown = renderPhoto(true)
    expect(shown.container.querySelector('img[src="/driver.jpg"]')).not.toBeNull()
    shown.unmount()
    const { container, getByText } = renderPhoto(false)
    expect(container.querySelector('img[src="/driver.jpg"]')).toBeNull()
    expect(container.querySelector('svg.lucide-user')).toBeNull()
    expect(getByText('Luis Perez')).toBeInTheDocument()
  })
})

describe('DeliveryOrderTabs: components.order_tracking driver_avatar_size', () => {
  it('the driver\'s photo takes the size the theme sets', () => {
    const theme = themeWithValues((values) => {
      values.components.order_tracking.base.driver_avatar_size = 'xl'
      return values
    })
    const { container } = renderWithProviders(
      <DeliveryOrderTabs order={{ ...order, driver: { ...order.driver, photo: '/driver.jpg' } }} productList={<div />} productsCount={1} />,
      { theme }
    )
    const avatar = container.querySelector('img[src="/driver.jpg"]').parentElement
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.xl.size)
  })
})

describe('DeliveryOrderTabs: a tablist of two tabs and their panels', () => {
  it('each tab selected with its panel, which it names; one tab in the tab order', () => {
    const { getByRole, queryByRole } = renderTabs()
    const list = getByRole('tablist')
    const delivery = getByRole('tab', { name: 'Delivery' })
    const yours = getByRole('tab', { name: 'Your order' })
    expect(list.contains(delivery) && list.contains(yours)).toBe(true)
    expect(delivery).toHaveAttribute('aria-selected', 'true')
    expect(yours).toHaveAttribute('aria-selected', 'false')
    expect(delivery).toHaveAttribute('tabindex', '0')
    expect(yours).toHaveAttribute('tabindex', '-1')
    const panel = getByRole('tabpanel', { name: 'Delivery' })
    expect(delivery).toHaveAttribute('aria-controls', panel.id)
    fireEvent.click(yours)
    expect(yours).toHaveAttribute('aria-selected', 'true')
    expect(getByRole('tabpanel', { name: 'Your order' })).toBeInTheDocument()
    expect(queryByRole('tabpanel', { name: 'Delivery' })).toBeNull()
  })

  it('the arrow keys, Home and End move to the other tab and select it', async () => {
    const { getByRole } = renderTabs()
    const delivery = getByRole('tab', { name: 'Delivery' })
    const yours = getByRole('tab', { name: 'Your order' })
    delivery.focus()
    fireEvent.keyDown(delivery, { key: 'ArrowRight' })
    await waitFor(() => expect(yours).toHaveAttribute('aria-selected', 'true'))
    expect(document.activeElement).toBe(yours)
    fireEvent.keyDown(yours, { key: 'Home' })
    await waitFor(() => expect(delivery).toHaveAttribute('aria-selected', 'true'))
    fireEvent.keyDown(delivery, { key: 'ArrowLeft' })
    await waitFor(() => expect(yours).toHaveAttribute('aria-selected', 'true'))
    fireEvent.keyDown(yours, { key: 'End' })
    await waitFor(() => expect(yours).toHaveAttribute('aria-selected', 'true'))
  })
})
