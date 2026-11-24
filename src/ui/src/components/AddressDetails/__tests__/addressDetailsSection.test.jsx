import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { addressFixture } from '../../__tests__/helpers/cartTestMocks'
import { AddressDetails } from '../index'

const orderState = { options: { type: 1, address: {} } }

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState, {}]
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~components/components/AddressDetails', () => ({
  AddressDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      addressToShow={addressFixture.address}
      googleMapsUrl='https://maps.example.com/static.png'
      apiKey='test-key'
      isCartPending={false}
      {...rest}
    />
  )
}))

const theme = themeWithValues()

describe('delivery address in the checkouts', () => {
  it('the change action is the icon button of the title row and opens the addresses', () => {
    const { getByLabelText, getByTestId } = renderWithProviders(<AddressDetails />, { theme })
    const change = getByLabelText('Change address')
    expect(change.tagName).toBe('BUTTON')
    expect(change).toHaveAttribute('type', 'button')
    expect(change).toHaveAttribute('data-doc-control', 'checkout-address-change')
    // the title is a section of the checkout's h1: an h2 (the h4 look)
    expect(change.parentElement.querySelector('h2')).toHaveTextContent('Delivery Address')
    expect(change.parentElement.lastElementChild).toBe(change)
    expect(change.querySelector('.lucide-pencil')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(change)
    expect(getByTestId('address-list')).toBeInTheDocument()
  })

  it('the address is a body line and the section section_gap apart from the ones around it', () => {
    const { getByText, getByLabelText } = renderWithProviders(<AddressDetails />, { theme })
    const line = getByText('123 Main St')
    expect(line.tagName).toBe('P')
    expect(cssFor(line)).toMatch(/font-size:14px;line-height:1\.71;font-weight:400;[^}]*margin:0;/)
    expect(cssFor(getByLabelText('Change address').parentElement)).toContain('margin-bottom:8px')
    expect(cssFor(line.closest('[data-doc-section="checkout-fulfillment-address"]'))).toContain('margin:24px 0;')
  })

  it('takes the section_gap of components.checkout (its multi variant has none: the base\'s on the multi-checkout too)', () => {
    const gapTheme = themeWithValues((values) => {
      values.components.checkout.base.section_gap = 32
      values.components.checkout.variants.multi.section_gap = 16
      return values
    })
    expect(gapTheme.values.components.checkout.variants.multi.section_gap).toBeUndefined()
    const { getByText, rerender } = renderWithProviders(<AddressDetails />, { theme: gapTheme })
    const section = () => getByText('123 Main St').closest('[data-doc-section="checkout-fulfillment-address"]')
    expect(cssFor(section())).toContain('margin:32px 0;')
    rerender(<AddressDetails isMultiCheckout openCarts={[]} />)
    expect(cssFor(section())).toContain('margin:32px 0;')
  })

  it('a pending cart has no change action', () => {
    const { queryByLabelText } = renderWithProviders(<AddressDetails isCartPending />, { theme })
    expect(queryByLabelText('Change address')).toBeNull()
  })

  it('show map is a link button of components.link that shows the map', () => {
    const { getByText, queryByText } = renderWithProviders(<AddressDetails />, { theme })
    const link = getByText('Show map')
    expect(link.tagName).toBe('BUTTON')
    expect(link).toHaveAttribute('type', 'button')
    expect(link.style.getPropertyValue('--ui-link-color')).not.toBe('')
    expect(link.style.alignSelf).toBe('flex-start')
    fireEvent.click(link)
    expect(document.getElementById('google-maps-image')).toBeInTheDocument()
    expect(queryByText('Show map')).toBeNull()
  })
})

describe('static map markers (T8)', () => {
  const controllerUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=500x190&scale=2&maptype=roadmap&markers=color:red%7C1,2&markers=label:S%7Ccolor:0xFF0000%7C3,4&key=k'
  const logo = 'https://res.cloudinary.com/acme/image/upload/v1/logo.png'
  const openMap = (utils) => {
    fireEvent.click(utils.getByText('Show map'))
    return document.getElementById('google-maps-image').getAttribute('src')
  }

  it('the business with its logo as a 64px PNG, the customer in the primary color without a usable map.customer', () => {
    const utils = renderWithProviders(<AddressDetails googleMapsUrl={controllerUrl} cart={{ business: { logo } }} />, { theme })
    const src = openMap(utils)
    const primary = theme.values.tokens.color.primary.replace('#', '').toUpperCase()
    expect(src).toContain(`&markers=color:0x${primary}%7C1,2`)
    expect(src).toContain('&markers=anchor:bottom%7Cicon:https://res.cloudinary.com/acme/image/upload/w_64,h_64,c_fit,f_png/v1/logo.png%7C3,4')
    expect(src).not.toContain('color:red')
  })
})

describe('the customer\'s address section by order type', () => {
  afterEach(() => { orderState.options.type = 1 })

  it('pickup (2) renders nothing: the customer address is only for delivery and catering delivery', () => {
    orderState.options.type = 2
    const { queryByText } = renderWithProviders(<AddressDetails />, { theme })
    expect(queryByText('123 Main St')).toBeNull()
  })
})
