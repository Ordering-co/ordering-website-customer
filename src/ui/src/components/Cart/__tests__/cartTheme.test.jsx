import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault, schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { CheckoutAction, OrderBill } from '../styles'
import { ContentInfo, PriceContainer } from '../../BusinessItemAccordion/styles'
import { WrapperProductImage } from '../../ProductItemAccordion/styles'
import { MobileCartActions, MobileCartViewWrapper } from '../../BusinessProductsListing/styles'
import { CartPopover } from '../../CartPopover'

vi.mock('react-popper', () => ({
  usePopper: () => ({
    styles: { popper: {}, arrow: {} },
    attributes: { popper: {}, arrow: {} }
  })
}))
vi.mock('~ui/src/components/CartContent', () => ({
  CartContent: () => <div data-testid='cart-content' />
}))

const withCart = (base = {}) => themeWithValues((values) => {
  Object.assign(values.components.cart.base, base)
  return values
})

const cssOf = (theme, Component, props = {}) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props} />)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

describe('cart: its props (components.cart)', () => {
  it('the schema: the drawer, the texts, the line image, the footer and the bar, and the Clear cart slot', () => {
    const base = (prop) => schemaEntry(`components.cart.base.${prop}`)
    expect(base('drawer_width')).toMatchObject({ type: 'number', value: 500 })
    expect(base('line_image_size')).toMatchObject({ type: 'number', value: 65 })
    expect(base('bill_text')).toMatchObject({ type: 'text', value: '{typography.body}' })
    expect(base('total_text')).toMatchObject({ type: 'text', value: '{typography.body_lg}' })
    // the bar itself (padding, shadow) is components.bottom_nav's; only its price is the cart's
    expect(base('bar_price')).toMatchObject({ type: 'text', value: '{typography.body_lg}' })
    expect(schemaKeys('components.cart.base').filter((key) => key.startsWith('bar_'))).toEqual(['bar_price'])
    expect(schemaDefault('components.cart.slots.clear')).toEqual({ component: 'button', size: 'md', appearance: 'ghost', color: 'danger', shape: null })
  })

  // the drawer is the base Sheet from the right: the store's width reaches its portal
  it('the drawer\'s width: 500px by default, the theme\'s otherwise', async () => {
    const width = async (theme) => {
      const utils = renderWithProviders(<CartPopover open auth location={{ pathname: '/' }} onClose={vi.fn()} />, { theme })
      const sheet = await utils.findByRole('dialog', { name: 'Your cart' })
      expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
      expect(sheet).toHaveAttribute('data-side', 'right')
      const value = sheet.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-modal-width')
      utils.unmount()
      return value
    }
    expect(await width(defaultTheme)).toBe('500px')
    expect(await width(themeWithValues())).toBe('500px')
    expect(await width(withCart({ drawer_width: 420 }))).toBe('420px')
  })

  it('the bill, its total and the checkout price take their texts, keeping their weight', () => {
    const bill = cssOf(withCart({
      bill_text: { size: 11, line: 1.18, weight: 900 },
      total_text: { size: 21, line: 1.1, weight: 100 }
    }), OrderBill)
    expect(bill).toMatch(/ table\{[^}]*font-size:11px;line-height:1\.18;/)
    expect(bill).toMatch(/ table\.total tr td\{[^}]*font-size:21px;line-height:1\.1;/)
    expect(bill).not.toContain('font-weight:900;')
    expect(bill).not.toContain('font-weight:100;')
    expect(cssOf(withCart({ checkout_text: { size: 25, line: 1.16 } }), CheckoutAction)).toMatch(/ p\{[^}]*font-size:25px;line-height:1\.16;/)
  })

  it('the business of the cart (business_name) and the sticky footer (checkout_text, footer_background)', () => {
    expect(cssOf(withCart({ business_name: { size: 26, line: 1.15, weight: 700 } }), ContentInfo)).toMatch(/ h3\{[^}]*font-size:26px;line-height:1\.15;font-weight:700;/)
    const footer = cssOf(withCart({ checkout_text: { size: 22, line: 1.27 }, footer_background: '#ABCDEF' }), PriceContainer, { isStickyFooter: true })
    expect(footer).toMatch(/ p\.total\{[^}]*font-size:22px;line-height:1\.27;/)
    expect(footer).toContain('background:#ABCDEF;')
  })

  it('the image of a cart line: line_image_size from 411px, 50 / 55px at most below', () => {
    const rules = cssOf(withCart({ line_image_size: 80 }), WrapperProductImage)
    expect(rules).toMatch(/width:min\(80px,48px\);.*@media \(min-width:361px\)\{[^}]*width:min\(80px,56px\);/s)
    expect(rules).toMatch(/@media \(min-width:411px\)\{[^}]*width:80px;/)
    // a line without stepper keeps its 95px
    expect(cssOf(withCart({ line_image_size: 80 }), WrapperProductImage, { hideQuantitySelector: true })).not.toContain('80px')
  })

  it('the cart bar of the store: its padding and its shadow (cast up) are bottom_nav\'s, its price the cart\'s', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.components.bottom_nav.base, { padding_y: 6, padding_x: 9, shadow: { x: 0, y: 4, blur: 8, spread: 0, color: '#000000', opacity: 0.5 } })
      Object.assign(values.components.cart.base, { bar_price: { size: 19, line: 1.11, weight: 200 } })
      return values
    })
    const bar = cssOf(theme, MobileCartViewWrapper)
    expect(bar).toContain('padding:6px 9px;')
    expect(bar).toContain('box-shadow:0px -4px 8px 0px rgba(0,0,0,0.5);')
    const actions = cssOf(theme, MobileCartActions)
    expect(actions).toMatch(/ span\{[^}]*font-size:19px;line-height:1\.11;/)
    expect(actions).not.toContain('font-weight:200;')
  })
})
