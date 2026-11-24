import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SingleProductCard } from '../index'
import { WrapLogo, CardInfo, SoldOut, QuantityContainer, RibbonBox, productImageSizes } from '../styles'

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

const onProductClick = vi.hoisted(() => vi.fn())

vi.mock('~components/components/SingleProductCard', () => ({
  SingleProductCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={productFixture}
      onProductClick={onProductClick}
      isSoldOut={false}
      isSkeleton={false}
      productAddedToCartLength={0}
      handleFavoriteProduct={vi.fn()}
      {...rest}
    />
  )
}))

const themed = themeWithValues()
const renderCard = (theme, props = {}) => renderWithProviders(<SingleProductCard {...props} />, { theme })
const INTERACTIVE = 'a[href], button, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'

describe('SingleProductCard: stretched link', () => {
  beforeEach(() => onProductClick.mockClear())

  it('the name is the one button that opens the product, inside the h3', () => {
    const { getByRole, container } = renderCard(themed)
    const heading = getByRole('heading', { level: 3 })
    const link = within(heading).getByRole('button', { name: 'Burger' })
    expect(link).toHaveAttribute('data-card-link')
    expect(link).toHaveAttribute('type', 'button')
    // the card itself is not a control
    expect(container.querySelector('.product-card')).not.toHaveAttribute('role')
    fireEvent.click(link)
    expect(onProductClick).toHaveBeenCalledTimes(1)
  })

  it('a click on the card box (not the name) does nothing: no onClick on a div', () => {
    const { container } = renderCard(themed)
    fireEvent.click(container.querySelector('.product-card'))
    expect(onProductClick).not.toHaveBeenCalled()
  })

  it('the favorite is a toggle button of its own (aria-pressed, a name) that does not open the product', async () => {
    const { getByRole, findByRole, queryByRole } = renderCard(themed)
    const favorite = getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(favorite)
    expect(onProductClick).not.toHaveBeenCalled()
    // a guest's favorite opens the login in the base dialog, whose close closes it
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('no control holds another one', () => {
    const { container } = renderCard(themed)
    container.querySelectorAll(INTERACTIVE).forEach((el) => {
      expect(el.querySelector(INTERACTIVE)).toBeNull()
    })
    expect(container.querySelectorAll('[data-card-link]')).toHaveLength(1)
  })

  it('a favorite card: "Order now" is only the look of the action (not focusable, hidden), the name opens it', () => {
    const { getByRole, getByText } = renderCard(themed, { isFavorite: true })
    const order = getByText('Order now').closest('[data-slot=button-decoration]')
    expect(order.tagName).toBe('SPAN')
    expect(order).not.toHaveAttribute('tabindex')
    expect(order).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(getByRole('button', { name: 'Burger' }))
    expect(onProductClick).toHaveBeenCalledTimes(1)
  })

  it('a card that only shows its product (no onProductClick): no button on its name', () => {
    const { getByRole, queryByRole } = renderCard(themed, { onProductClick: undefined })
    expect(getByRole('heading', { level: 3 })).toHaveTextContent('Burger')
    expect(queryByRole('button', { name: 'Burger' })).toBeNull()
  })
})

describe('product card images (components.product_card sizes)', () => {
  const sized = themeWithValues((values) => {
    Object.assign(values.components.product_card.base, {
      image_size: 100,
      featured_image_size: 200,
      previous_image_width: 300,
      favorite_image_size: 120,
      order_image_size: 64
    })
    // its width on phones (platforms.mobile_web)
    values.platforms.mobile_web.components.product_card.base.previous_image_width = 200
    return values
  })
  const css = (theme, props) => {
    const { getByTestId, unmount } = renderWith(theme, <WrapLogo data-testid='logo' isBgimage {...props} />)
    const rules = cssFor(getByTestId('logo'))
    unmount()
    return rules
  }

  it('the schema defaults are today\'s sizes', () => {
    expect(productImageSizes(themeWithValues())).toEqual({ card: 130, featured: 246, previous: 326, previousMobile: 226, favorite: 140, order: 88 })
  })

  it('each layout follows the theme: plain, featured, order it again (4:3), favorite, order', () => {
    expect(css(sized, {})).toMatch(/max-width:100px;max-height:100px;height:100px;width:100px;/)
    expect(css(sized, { isFeatured: true })).toMatch(/@media \(min-width:768px\)\{[^}]*width:200px;max-width:200px;height:200px;/)
    const previously = css(sized, { isPreviously: true })
    expect(previously).toMatch(/width:200px;max-width:200px;height:150px;max-height:150px;/)
    expect(previously).toMatch(/@media \(min-width:576px\)\{[^}]*width:300px;max-width:300px;height:225px;/)
    expect(css(sized, { isFavorite: true })).toMatch(/width:120px;max-width:120px;height:120px;/)
    expect(css(sized, { fromOrders: true })).toMatch(/width:64px;max-width:64px;height:64px;/)
  })

  it('the text of a plain card leaves the room of its image', () => {
    const { getByTestId } = renderWith(sized, <CardInfo data-testid='info' isBgimage='x.jpg' />)
    expect(cssFor(getByTestId('info'))).toMatch(/min-height:100px;width:calc\(100% - 100px\);/)
  })
})

describe('product card badges and ribbon', () => {
  it('sold out is the inverse badge, square on the card edge, bold as today, the pointer goes through', () => {
    const { getByText } = renderWith(themed, <SoldOut>Sold out</SoldOut>)
    const rules = cssFor(getByText('Sold out'))
    expect(rules).toContain('height:24px;')
    expect(rules).toContain('border-top-right-radius:0;')
    expect(rules).toContain('font-weight:bold;')
    expect(rules).toContain('pointer-events:none;')
  })

  it('the quantity is a primary count badge ringed by the surface', () => {
    const { getByText } = renderWith(themed, <QuantityContainer>2</QuantityContainer>)
    const rules = cssFor(getByText('2'))
    expect(rules).toContain('min-width:24px;')
    expect(rules).toContain('border-radius:9999px;')
    expect(rules).toContain('pointer-events:none;')
  })

  it('the ribbon takes the theme\'s inner space and keeps the data\'s color', () => {
    const { getByText } = renderWith(themed, <RibbonBox bgColor='#123456'>New</RibbonBox>)
    const rules = cssFor(getByText('New'))
    expect(rules).toContain('background-color:#123456;')
    expect(rules).toContain('padding:2px 8px;')
    expect(rules).toContain('border-radius:0;')
  })
})
