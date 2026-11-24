import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaEntry } from '~/utils/themeSchema'
import { THEME_DEFAULTS as defaults } from '~/utils/appTheme'
import { CardContainer, CardInfo, LastOrder, SkeletonCardInfo, SkeletonCardLogo, TitleWrapper, WrapLogo, productInfoGap } from '../styles'
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

let product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg' }

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

const withCard = (base = {}) => themeWithValues((values) => {
  Object.assign(values.components.product_card.base, base)
  return values
})
const rtl = (theme) => ({ ...theme, rtl: true })

const cssOf = (theme, Component, props = {}) => {
  const { getByTestId, unmount } = renderWith(theme, <Component data-testid='el' {...props} />)
  const rules = cssFor(getByTestId('el'))
  unmount()
  return rules
}

describe('product card: the space between the parts of its info (components.product_card.base.info_gap)', () => {
  it('the schema: a dimension of the space scale, the sm space by default (8px)', () => {
    const entry = schemaEntry('components.product_card.base.info_gap')
    // read as the space scale, like the card's padding
    expect(entry.type).toBe('space')
    expect(entry.type).toBe(schemaEntry('components.product_card.base.padding').type)
    expect(entry.value).toBe('{space.sm}')
    expect(defaults.components.product_card.base.info_gap).toBe(8)
    expect(productInfoGap(themeWithValues())).toBe('8px')
  })

  it('the info is a column apart by the gap, its parts without margins of their own', () => {
    const rules = cssOf(themeWithValues(), CardInfo)
    expect(rules).toContain('flex-direction:column;')
    expect(rules).toContain('gap:8px;')
    expect(rules).not.toContain('margin:3px')
    // a description has no paragraph margin
    expect(rules).toMatch(/ p\{margin:0;/)
  })

  it('the theme\'s gap wins', () => {
    expect(cssOf(withCard({ info_gap: 4 }), CardInfo)).toContain('gap:4px;')
    expect(cssOf(withCard({ info_gap: 0 }), CardInfo)).toContain('gap:0px;')
  })

  it('the name has no margin, whatever the page sets for its headings', () => {
    expect(cssOf(themeWithValues(), TitleWrapper)).toMatch(/&?\.[\w-]+\.[\w-]+ h3\{margin:0px;/)
  })

  it('"last ordered" has no side margin of its own', () => {
    expect(cssOf(themeWithValues(), LastOrder)).not.toContain('margin')
  })

  it('the image is apart from the info by the gap, on the side it faces (logical: RTL too)', () => {
    const theme = withCard({ info_gap: 6 })
    const plain = cssOf(theme, WrapLogo)
    expect(plain).toContain('margin-inline-start:6px;')
    expect(plain).not.toMatch(/margin-(left|right):/)
    expect(cssOf(rtl(theme), WrapLogo)).not.toMatch(/margin-(left|right):/)
    expect(cssOf(withCard({ info_gap: 6, image_position: 'left' }), WrapLogo)).toContain('margin-inline-end:6px;')
    // over the info (featured, order it again): the gap under it
    expect(cssOf(theme, WrapLogo, { isFeatured: true })).toContain('margin:0px 0px 6px 0px;')
    expect(cssOf(theme, WrapLogo, { isPreviously: true })).toContain('margin:0px 0px 6px 0px;')
    // a favorite: the gap toward the info, its xxxl space on the other side
    expect(cssOf(theme, WrapLogo, { isFavorite: true })).toMatch(/margin:0px;margin-inline-start:6px;margin-inline-end:48px;/)
    // a past order: its xxxl space toward the info
    expect(cssOf(theme, WrapLogo, { fromOrders: true })).toMatch(/margin:0px;margin-inline-start:48px;/)
    // a hidden image takes no space
    expect(cssOf(theme, WrapLogo, { hideImage: true })).toMatch(/width:0px;[^}]*margin:0px;/)
  })

  it('the skeleton has the card\'s spacing', () => {
    const info = cssOf(withCard({ info_gap: 6 }), SkeletonCardInfo)
    expect(info).toContain('gap:6px;')
    expect(info).not.toContain('margin:3px')
    expect(cssOf(rtl(withCard({ info_gap: 6 })), SkeletonCardLogo)).toContain('margin-inline-start:6px;')
  })

  it('a product without a description has no description part (no double gap)', () => {
    product = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg', description: '' }
    const { container, unmount } = renderWithProviders(<SingleProductCard />)
    expect(container.querySelector('.card-info .description')).toBeNull()
    unmount()
    product = { ...product, description: 'Juicy' }
    const { container: withDescription } = renderWithProviders(<SingleProductCard />)
    expect(withDescription.querySelector('.card-info .description').textContent).toBe('Juicy')
  })
})

describe('the product name wherever the card is', () => {
  it('is the theme\'s name over a page\'s own h3 rule (the search\'s): its typography and color, no margin', () => {
    const theme = themeWithValues((values) => {
      values.components.product_card.base.name = { ...values.tokens.typography.label, size: 17 }
      return values
    })
    const { container } = renderWith(theme, <TitleWrapper><h3>Cheeseburger</h3></TitleWrapper>)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).toMatch(/&&h3|\.[\w-]+\.[\w-]+h3\{margin:0px;[^}]*font-size:17px/)
  })

  it('the Add action spans the card, not its name (a button that opens the product)', () => {
    const { container } = renderWith(themeWithValues(), <CardContainer />)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).toMatch(/\.add-button,[^{}]*\.order-button\{display:block;width:100%;/)
  })
})
