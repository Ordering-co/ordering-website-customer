import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [] }}
      changeQuantity={vi.fn()}
      onDeleteProduct={vi.fn()}
      onEditProduct={vi.fn()}
      {...rest}
    />
  )
}))

// the window's width the row reads (the setup mocks it at 1024)
const screen = vi.hoisted(() => ({ width: 1024 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: screen.width, height: 768 }) }))
afterEach(() => { screen.width = 1024 })

// a product of an order: no `valid` (a cart's flag)
const orderLine = { ...productFixture, quantity: 2, price: 9.5, total: 19 }
const cartLine = (extra) => ({ ...productFixture, quantity: 2, price: 9.5, total: 19, valid_quantity: true, valid_menu: true, ...extra })

const linePrice = (utils) => utils.container.querySelector('.prod-price')

describe('the line\'s price', () => {
  const theme = themeWithValues()

  it('an order\'s product (details / confirmation) shows its line price, also on a phone', () => {
    screen.width = 1024
    const wide = renderWithProviders(<ProductItemAccordion product={orderLine} hideQuantitySelector={false} isOrderDetails />, { theme })
    expect(linePrice(wide)).not.toBeNull()
    expect(linePrice(wide).textContent).toMatch(/19/)
    wide.unmount()

    screen.width = 390
    const phone = renderWithProviders(<ProductItemAccordion product={orderLine} hideQuantitySelector={false} isOrderDetails />, { theme })
    expect(linePrice(phone)).not.toBeNull()
    phone.unmount()
  })

  it('the checkout\'s cart product: a valid one shows it, an invalid one does not (as before)', () => {
    screen.width = 1024
    const valid = renderWithProviders(<ProductItemAccordion product={cartLine({ valid: true })} hideQuantitySelector={false} isCheckout isCartProduct />, { theme })
    expect(linePrice(valid)).not.toBeNull()
    valid.unmount()

    const invalid = renderWithProviders(<ProductItemAccordion product={cartLine({ valid: false })} hideQuantitySelector={false} isCheckout isCartProduct />, { theme })
    expect(linePrice(invalid)).toBeNull()
    invalid.unmount()

    const unflagged = renderWithProviders(<ProductItemAccordion product={cartLine({})} hideQuantitySelector={false} isCheckout isCartProduct />, { theme })
    expect(linePrice(unflagged)).toBeNull()
    unflagged.unmount()
  })
})

describe('the checkout\'s line price on a phone (410px and under)', () => {
  const phoneCheckout = (theme, product) => {
    screen.width = 390
    return renderWithProviders(<ProductItemAccordion product={product} hideQuantitySelector={false} isCheckout isCartProduct />, { theme })
  }

  it('shows it, once, beside the name; an invalid product still shows none', () => {
    const utils = phoneCheckout(themeWithValues(), cartLine({ valid: true }))
    expect(linePrice(utils)).not.toBeNull()
    expect(linePrice(utils).textContent).toMatch(/19/)
    expect(utils.container.querySelectorAll('.prod-price')).toHaveLength(1)
    utils.unmount()
    expect(linePrice(phoneCheckout(themeWithValues(), cartLine({ valid: false })))).toBeNull()
  })
})
