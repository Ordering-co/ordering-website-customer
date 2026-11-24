import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault, schemaKeys } from '~/utils/themeSchema'
import { CardContainer, CardInfo, PriceWrapper, QuantityContainer, SoldOut, TitleWrapper, WrapTags } from '../styles'
import { SingleProductCard } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => [{ current: null }, true]
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null)
}))

const product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', tags: [{ id: 1, name: 'Vegan', image: '/vegan.png' }] }

vi.mock('~components/components/SingleProductCard', () => ({
  SingleProductCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={product}
      onProductClick={vi.fn()}
      isSoldOut={false}
      isSkeleton={false}
      productAddedToCartLength={0}
      handleFavoriteProduct={vi.fn()}
      {...rest}
    />
  )
}))

const withCard = (base = {}, slots = {}) => themeWithValues((values) => {
  Object.assign(values.components.product_card.base, base)
  Object.assign(values.components.product_card.slots, slots)
  return values
})

const cssOf = (theme, Component, props = {}, children = null) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props}>{children}</Component>)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

describe('product card: its props (components.product_card)', () => {
  it('the schema: the slots of the count, the sold out badge and the action', () => {
    const slots = {
      quantity_badge: { component: 'badge', size: 'md', variant: 'primary' },
      sold_out_badge: { component: 'badge', size: 'md', variant: 'inverse' },
      action: { component: 'button', size: 'md', appearance: 'solid', color: 'secondary', shape: null }
    }
    expect([...schemaKeys('components.product_card.slots')].sort()).toEqual(Object.keys(slots).sort())
    Object.entries(slots).forEach(([slot, value]) => expect(schemaDefault(`components.product_card.slots.${slot}`)).toEqual(value))
  })

  it('the padding: the md space by default, the theme\'s otherwise', () => {
    expect(cssOf(themeWithValues(), CardContainer)).toContain('padding:12px;')
    expect(cssOf(withCard({ padding: 6 }), CardContainer)).toContain('padding:6px;')
  })

  it('the name and the description take their colors; the description its lines', () => {
    expect(cssOf(withCard({ name_color: '#111111' }), TitleWrapper)).toContain('color:#111111;')
    const info = cssOf(withCard({ description_color: '#222222', description_lines: 3 }), CardInfo)
    expect(info).toMatch(/\.description\{[^}]*color:#222222;-webkit-line-clamp:3;/)
    // a card of one line keeps its one
    expect(cssOf(withCard({ description_lines: 3 }), CardInfo, { oneLine: true })).not.toContain('-webkit-line-clamp:3;')
  })

  it('the price before the offer: its text and color', () => {
    const rules = cssOf(withCard({ offer_price: { size: 15, line: 1.27, weight: 900 }, offer_price_color: '#333333' }), PriceWrapper)
    expect(rules).toMatch(/\.off-price\{[^}]*font-size:15px;line-height:1\.27;[^}]*color:#333333;/)
    expect(rules).not.toContain('font-weight:900;')
  })

  it('the tags\' size', () => {
    expect(cssOf(withCard({ tag_size: 28 }), WrapTags)).toMatch(/ img\{[^}]*width:28px;height:28px;/)
  })

  it('the badges take their slots (variant and size)', () => {
    const theme = withCard({}, {
      quantity_badge: { component: 'badge', size: 'sm', variant: 'danger' },
      sold_out_badge: { component: 'badge', size: 'sm', variant: 'warning' }
    })
    const badge = theme.values.components.badge
    const quantity = cssOf(theme, QuantityContainer)
    expect(quantity).toContain(`background:${badge.variants.danger.background};`)
    expect(quantity).toContain(`height:${badge.sizes.sm.height}px;`)
    const soldOut = cssOf(theme, SoldOut)
    expect(soldOut).toContain(`background:${badge.variants.warning.background};`)
  })

  it('by default the badges are today\'s (primary and inverse, md)', () => {
    const theme = themeWithValues()
    const badge = theme.values.components.badge
    expect(cssOf(theme, QuantityContainer)).toContain(`background:${badge.variants.primary.background};`)
    expect(cssOf(theme, SoldOut)).toContain(`background:${badge.variants.inverse.background};`)
    expect(cssOf(theme, SoldOut)).toContain(`height:${badge.sizes.md.height}px;`)
  })
})

describe('product card: visibility and the cart image', () => {
  it('product.tags hides the tags (the default shows them)', () => {
    let utils = renderWithProviders(<SingleProductCard />, { theme: themeWithValues() })
    expect(utils.getByAltText('Vegan')).toBeInTheDocument()
    utils.unmount()
    utils = renderWithProviders(<SingleProductCard />, { theme: themeWithValues((values) => { values.visibility['product.tags'] = false; return values }) })
    expect(utils.queryByAltText('Vegan')).toBeNull()
  })

  it('in a cart view, the image follows cart.products.image', () => {
    const theme = themeWithValues((values) => { values.visibility['cart.products.image'] = false; return values })
    const utils = renderWithProviders(<SingleProductCard viewString='checkout' />, { theme })
    const logo = utils.container.querySelector('.image').parentElement
    expect(cssFor(logo)).toContain('max-width:0px;')
    utils.unmount()
    const shown = renderWithProviders(<SingleProductCard viewString='checkout' />)
    expect(cssFor(shown.container.querySelector('.image').parentElement)).not.toContain('max-width:0px;')
  })

  it('the "Order" action takes slots.action', () => {
    const theme = withCard({}, { action: { component: 'button', size: 'sm', appearance: 'outline', color: 'primary', shape: null } })
    const utils = renderWithProviders(<SingleProductCard isFavorite />, { theme })
    const order = utils.container.querySelector('.order-button [data-slot=button-decoration]')
    expect(order).not.toBeNull()
    const primary = theme.values.components.button.variants.primary.outline
    expect(order.style.getPropertyValue('--ui-button-border')).toBe(`1px solid ${primary.border.color}`)
    expect(order.style.getPropertyValue('--ui-button-height')).toBe(`${theme.values.components.button.sizes.sm.height}px`)
  })
})
