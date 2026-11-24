import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { checkoutCartFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { cssFor, defaultTheme as theme } from '../../../styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '../../../../../utils/bundledImages'
import { OrderSuccessModal, PaymentOptions } from '../index'

// the real getIconCard (setupTests stubs it to null): the brand's image of the bundle
vi.mock('~ui/utils', async (importOriginal) => importOriginal())

describe('OrderSuccessModal', () => {
  it('renders creating-order title in checkout mode', () => {
    window.localStorage.setItem('business-address', JSON.stringify('123 Main St'))
    const cart = {
      ...checkoutCartFixture,
      business: { ...checkoutCartFixture.business, delivery_time: '01:30:00' }
    }
    const { getByText } = renderWithProviders(
      <OrderSuccessModal
        isCheckOut
        cart={cart}
        businessData={{ name: 'Demo Store', logo: 'logo.png', address: '123 Main St' }}
      />,
      { theme }
    )
    expect(getByText('We are creating your order!')).toBeInTheDocument()
    expect(getByText('123 Main St')).toBeInTheDocument()
    expect(getByText('1 Product')).toBeInTheDocument()
  })

  it('more than one product: the count says "Products"', () => {
    const cart = { ...checkoutCartFixture, products: [...checkoutCartFixture.products, { id: 11, name: 'Fries', price: 3 }] }
    const { getByText } = renderWithProviders(
      <OrderSuccessModal isCheckOut cart={cart} businessData={{ name: 'Demo Store', logo: 'logo.png' }} />,
      { theme }
    )
    expect(getByText('2 Products')).toBeInTheDocument()
  })

  it('the business logo is decorative: the business name is beside it', () => {
    window.localStorage.setItem('business-address', JSON.stringify('123 Main St'))
    const { container, getByText } = renderWithProviders(
      <OrderSuccessModal
        isCheckOut
        cart={checkoutCartFixture}
        businessData={{ name: 'Demo Store', logo: 'logo.png', address: '123 Main St' }}
      />,
      { theme }
    )
    expect(getByText('Demo Store')).toBeInTheDocument()
    expect(container.querySelector('img[src="logo.png"]')).toHaveAttribute('alt', '')
  })

  it('the card brand is its image (not its URL as text), named and fitted in 24×20', () => {
    const { container } = renderWithProviders(<PaymentOptions card={{ brand: 'Visa', last4: '4242' }} />, { theme })
    const icon = container.querySelector('.card-icon')
    expect(icon.textContent).toBe('')
    const img = icon.querySelector('img')
    expect(img).toHaveAttribute('src', BUNDLED_IMAGES.general.visa)
    expect(img).toHaveAttribute('alt', 'Visa')
    expect(img).toHaveAttribute('width', '24')
    expect(img).toHaveAttribute('height', '20')
    const rules = cssFor(container.firstChild)
    expect(rules).toMatch(/\.card-icon img\{width:24px;height:20px;object-fit:contain;\}/)
  })

  it('a card without a brand: the generic image, named "Card"', () => {
    const { container } = renderWithProviders(<PaymentOptions card={{ last4: '4242' }} />, { theme })
    const img = container.querySelector('.card-icon img')
    expect(img).toHaveAttribute('src', BUNDLED_IMAGES.general.credit)
    expect(img).toHaveAttribute('alt', 'Card')
  })
})
