import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { SingleProductCard } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

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

describe('SingleProductCard', () => {
  it('renders product name', () => {
    const { getByText } = renderWithProviders(<SingleProductCard />)
    expect(getByText('Burger')).toBeInTheDocument()
  })

  it('calls onProductClick when card is clicked', () => {
    onProductClick.mockClear()
    const { getByText } = renderWithProviders(<SingleProductCard />)
    fireEvent.click(getByText('Burger'))
    expect(onProductClick).toHaveBeenCalled()
  })

  it('a tag\'s image is named by the tag (nothing else on the card says it)', () => {
    const product = { ...productFixture, tags: [{ id: 1, name: 'Vegan', image: '/vegan.png' }, { id: 2, name: 'Spicy' }] }
    const { getByAltText, container } = renderWithProviders(<SingleProductCard product={product} />)
    expect(getByAltText('Vegan')).toHaveAttribute('src', '/vegan.png')
    // a tag without an image: no text in place of the missing picture
    const imgs = Array.from(container.querySelectorAll('img'))
    expect(imgs.filter((img) => img.getAttribute('alt') === 'Spicy')).toHaveLength(0)
    imgs.forEach((img) => expect(img.hasAttribute('alt')).toBe(true))
  })
})

// visibility product.dummy_image: a product without a photo, in a site served
// by the worker (production). The photo is painted once it is downloaded
//, so the pictures here load at once.
describe('SingleProductCard: the product dummy', () => {
  class LoadingImage {
    naturalWidth = 86
    set src (value) { this._src = value; queueMicrotask(() => this.onload?.()) }
    get src () { return this._src }
  }
  beforeEach(() => { vi.stubGlobal('Image', LoadingImage); window.Image = LoadingImage })
  afterEach(() => { vi.unstubAllGlobals() })

  const noPhoto = { ...productFixture, images: null }
  const render = (theme) => {
    window.__CONFIG__ = {}
    try {
      return renderWithProviders(<SingleProductCard product={noPhoto} />, { theme })
    } finally {
      delete window.__CONFIG__
    }
  }
  const showing = () => themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'product.dummy_image': true } }))

  it('the key decides (no dummy by default)', async () => {
    const theme = themeWithValues()
    const hidden = render(theme)
    await Promise.resolve()
    expect(hidden.container.innerHTML).not.toContain(theme.values.images['placeholder.product'])
    hidden.unmount()
    const shown = showing()
    const { container } = render(shown)
    await waitFor(() => expect(container.innerHTML).toContain(shown.values.images['placeholder.product']))
  })
})
