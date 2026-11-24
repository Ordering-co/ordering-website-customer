import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SingleProductCard } from '../index'
import { WrapLogo } from '../styles'

// The photo's box has its final size from the first render: the
// card does not jump when its content (the photo) arrives.

const observed = vi.hoisted(() => ({ value: false }))
const state = vi.hoisted(() => ({ props: {} }))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: ({ height, width }) => <div data-testid='skeleton' data-height={height} data-width={width} />
}))
vi.mock('~ui/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => [{ current: null }, observed.value]
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null)
}))
vi.mock('~components/components/SingleProductCard', () => ({
  SingleProductCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={{ id: 1, name: 'Burger', price: 9, images: 'burger.jpg' }}
      isSoldOut={false}
      isSkeleton={false}
      productAddedToCartLength={0}
      {...state.props}
      {...rest}
    />
  )
}))

const sized = (base = {}, visibility = {}) => themeWithValues((values) => {
  Object.assign(values.components.product_card.base, { image_size: 100, favorite_image_size: 120, order_image_size: 64, ...base })
  Object.assign(values.visibility, visibility)
  return values
})

// the card's own rules (the ones of its row, `> div`)
const rowRule = (container) => {
  // the card's generated class, before its `product-card`
  const cls = container.querySelector('.product-card').className.split(' ').at(-2)
  return (injectedCss().match(new RegExp(`\\.${cls} > div\\{[^}]*\\}`, 'g')) || []).join('')
}

afterEach(cleanup)

const render = (theme, props = {}, isObserved = false) => {
  cleanup()
  observed.value = isObserved
  state.props = props
  return renderWithProviders(<SingleProductCard {...props} />, { theme })
}

describe('product card: the photo box is reserved before its content arrives', () => {
  it('not observed yet: the row is there and as tall as the theme\'s image (image_size), then the same observed', () => {
    const before = render(sized(), {}, false)
    expect(before.container.querySelector('.product-card > div')).not.toBeNull()
    expect(before.container.querySelector('.image')).toBeNull()
    expect(rowRule(before.container)).toContain('min-height:100px;')
    const after = render(sized(), {}, true)
    expect(after.container.querySelector('.image')).not.toBeNull()
    expect(rowRule(after.container)).toContain('min-height:100px;')
  })

  it('the skeleton is the size of the image of the card (plain, favorite, order), none when the image is hidden', () => {
    // the box of the image is the one skeleton with a height (the rest are lines)
    const box = (props, theme = sized()) => render(theme, { isSkeleton: true, ...props }, true).queryAllByTestId('skeleton').find((el) => el.dataset.height)
    expect(box({})).toHaveAttribute('data-height', '100')
    expect(box({ isFavorite: true })).toHaveAttribute('data-width', '120')
    expect(box({ fromOrders: true })).toHaveAttribute('data-width', '64')
    expect(box({}, sized({}, { 'product.image': false }))).toBeUndefined()
  })

  it('a hidden image reserves none on a favorite; a plain card keeps its text as tall as the image', () => {
    const theme = sized({}, { 'product.image': false })
    expect(rowRule(render(theme, { isFavorite: true }).container)).not.toContain('min-height')
    expect(rowRule(render(theme, {}).container)).toContain('min-height:100px;')
  })

  it('the carousels\' cards reserve their image (featured: image_size, featured_image_size from 768px; order it again: 4:3 of its width)', () => {
    const theme = sized({ featured_image_size: 180, previous_image_width: 200 })
    const featured = rowRule(render(theme, { isFeatured: true }).container)
    expect(featured).toContain('min-height:100px;')
    expect(featured).toContain('min-height:180px;')
    expect(rowRule(render(theme, { isPreviously: true }).container)).toContain('min-height:150px;')
  })

  it('the "More" card (no image row) reserves none', () => {
    expect(rowRule(render(sized(), { useCustomFunctionality: true, customText: 'More' }).container)).not.toContain('min-height')
  })

  it('the box keeps its size with no image, a placeholder or a photo that fails (no isBgimage)', () => {
    const { container } = renderWithProviders(<WrapLogo data-testid='logo' />, { theme: sized() })
    const rules = cssFor(container.firstChild)
    expect(rules).toContain('height:100px;')
    expect(rules).toMatch(/\.image\{min-height:100px;/)
  })
})
