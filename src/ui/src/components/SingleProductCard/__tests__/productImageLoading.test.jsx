import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { resetImageLoadCache } from '../../Image/useImageLoad'
import { themeColor } from '~/utils/themeColors'
import { SingleProductCard } from '../index'

// The photo of a card is painted only once it is whole: a photo
// drawn as it arrives stayed half painted (a thin strip, the rest blank) when
// the download was slow or cut. While it loads the box shows the theme's
// loading placeholder; when it fails, the theme's placeholder image; when that
// fails too, the placeholder fill. Never an empty box.

const state = vi.hoisted(() => ({ props: {} }))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: ({ height, width }) => <div data-testid='skeleton' data-height={height} data-width={width} />
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
vi.mock('~components/components/SingleProductCard', () => ({
  SingleProductCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      product={{ id: 1, name: 'Burger', price: 9, images: 'https://img.test/burger.jpg' }}
      isSoldOut={false}
      isSkeleton={false}
      productAddedToCartLength={0}
      {...state.props}
      {...rest}
    />
  )
}))

const PHOTO = 'https://img.test/burger.jpg'

// every `new Image()`, to answer by hand
const downloads = []
class FakeImage {
  constructor () { this.naturalWidth = 0; this.decode = undefined; this.requested = []; downloads.push(this) }
  set src (value) { this.requested.push(value) }
  get src () { return this.requested.at(-1) }
}
const forUrl = (url) => downloads.filter((d) => d.requested[0] === url && d.onload)
const arrive = (url) => act(() => { forUrl(url).at(-1).naturalWidth = 86; forUrl(url).at(-1).onload() })
// the photo fails, and so does its retry
const failBoth = (url) => {
  act(() => { forUrl(url).at(-1).onerror() })
  act(() => { forUrl(`${url}?img_retry=1`).at(-1).onerror() })
}

const theme = (visibility = {}, base = {}) => themeWithValues((values) => {
  Object.assign(values.components.product_card.base, { image_size: 100 }, base)
  Object.assign(values.visibility, { 'product.dummy_image': true, ...visibility })
  return values
})

let unmount
const render = (t, props = {}) => {
  state.props = props
  window.__CONFIG__ = {}
  try {
    const out = renderWithProviders(<SingleProductCard {...props} />, { theme: t })
    unmount = out.unmount
    return out
  } finally {
    delete window.__CONFIG__
  }
}
const placeholderUrl = (t) => t.values.images['placeholder.product']
const logo = (container) => container.querySelector('.image')
const bg = (container) => logo(container).style.backgroundImage

beforeEach(() => {
  downloads.length = 0
  resetImageLoadCache()
  vi.stubGlobal('Image', FakeImage)
  window.Image = FakeImage
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('product card: the photo is painted only once it is whole', () => {
  it('while it loads: the theme\'s loading placeholder in the box and no background image', () => {
    const { container, queryAllByTestId } = render(theme())
    expect(logo(container)).toHaveAttribute('data-image-state', 'loading')
    expect(bg(container)).toBe('')
    // inside the image box, filling it
    const skeleton = logo(container).querySelector('[data-testid="skeleton"]')
    expect(skeleton).not.toBeNull()
    expect(skeleton).toHaveAttribute('data-width', '100%')
    expect(skeleton).toHaveAttribute('data-height', '100%')
    expect(queryAllByTestId('skeleton')).toHaveLength(1)
  })

  it('once it is whole: the background image is the photo, no skeleton, the box keeps its class', () => {
    const { container, queryAllByTestId } = render(theme())
    arrive(PHOTO)
    expect(logo(container)).toHaveAttribute('data-image-state', 'loaded')
    expect(bg(container)).toBe(`url("${PHOTO}")`)
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    expect(logo(container)).toHaveClass('image')
    // nothing of the new state leaks to the page as an attribute
    expect(logo(container).hasAttribute('fallbackimage')).toBe(false)
  })

  it('the featured and the order-it-again cards paint it the same way', () => {
    for (const props of [{ isFeatured: true }, { isPreviously: true }]) {
      downloads.length = 0
      resetImageLoadCache()
      const { container } = render(theme(), props)
      expect(bg(container)).toBe('')
      arrive(PHOTO)
      expect(bg(container)).toBe(`url("${PHOTO}")`)
      unmount()
    }
  })

  it('a sold out card keeps its tint on the photo and on its placeholder', () => {
    const { container } = render(theme(), { isSoldOut: true })
    expect(logo(container).style.filter).toBe('brightness(70%)')
    arrive(PHOTO)
    expect(logo(container).style.filter).toBe('brightness(70%)')
    expect(bg(container)).toBe(`url("${PHOTO}")`)
  })

  it('the photo fails (and its retry): the theme\'s placeholder takes its place, painted when whole', () => {
    const t = theme()
    const { container, queryAllByTestId } = render(t)
    failBoth(PHOTO)
    // the placeholder is on its way: still the loading state, never a blank box
    expect(logo(container)).toHaveAttribute('data-image-state', 'loading')
    expect(bg(container)).toBe('')
    expect(queryAllByTestId('skeleton')).toHaveLength(1)
    arrive(placeholderUrl(t))
    expect(logo(container)).toHaveAttribute('data-image-state', 'loaded')
    expect(bg(container)).toBe(`url("${placeholderUrl(t)}")`)
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
  })

  it('the photo fails and so does the placeholder: the box keeps the placeholder fill (the border color), not blank', () => {
    const t = theme()
    const { container, queryAllByTestId } = render(t)
    failBoth(PHOTO)
    failBoth(placeholderUrl(t))
    const box = logo(container)
    expect(box).toHaveAttribute('data-image-state', 'placeholder')
    expect(box.style.backgroundImage).toBe('')
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    // the fill is the theme's, still (no animation)
    const cls = box.className.split(' ').at(-2)
    const css = injectedCss().replace(/\s+/g, '')
    expect(css).toContain(`.${cls}[data-image-state='placeholder']{background-color:${themeColor(t, 'border')};`.replace(/\s+/g, ''))
    expect(css).not.toMatch(new RegExp(`\\.${cls}\\[data-image-state='placeholder'\\]\\{[^}]*animation`))
  })

  it('the theme hides the placeholder: a photo that fails leaves the placeholder fill at once (nothing to fall back to)', () => {
    const t = theme({ 'product.dummy_image': false })
    const { container } = render(t)
    failBoth(PHOTO)
    expect(logo(container)).toHaveAttribute('data-image-state', 'placeholder')
    expect(bg(container)).toBe('')
    // only the photo and its retry were requested
    expect(downloads.map((d) => d.requested[0])).toEqual([PHOTO, `${PHOTO}?img_retry=1`])
  })

  it('a product with no photo shows the theme\'s placeholder; if that fails too, the fill', () => {
    const t = theme()
    const { container } = render(t, { product: { id: 2, name: 'Soup', price: 4, images: null } })
    expect(logo(container)).toHaveAttribute('data-image-state', 'loading')
    arrive(placeholderUrl(t))
    expect(bg(container)).toBe(`url("${placeholderUrl(t)}")`)
    unmount()
    downloads.length = 0
    resetImageLoadCache()
    const again = render(t, { product: { id: 2, name: 'Soup', price: 4, images: null } })
    failBoth(placeholderUrl(t))
    expect(logo(again.container)).toHaveAttribute('data-image-state', 'placeholder')
  })

  it('a hidden image downloads nothing', () => {
    const { container } = render(theme({ 'product.image': false }))
    expect(downloads).toHaveLength(0)
    expect(logo(container)).toHaveAttribute('data-image-state', 'placeholder')
  })

  it('the box does not change between states: the same size rules, loading, loaded, failed', () => {
    const t = theme({}, { image_size: 100 })
    const rules = (container) => {
      const wrap = logo(container).parentElement
      const cls = wrap.className.split(' ').at(-1)
      return { cls, css: (injectedCss().match(new RegExp(`\\.${cls}[^{]*\\{[^}]*\\}`, 'g')) || []).join('') }
    }
    const loading = render(t)
    const sizeWhileLoading = rules(loading.container)
    expect(sizeWhileLoading.css).toContain('height:100px;')
    arrive(PHOTO)
    const sizeLoaded = rules(loading.container)
    expect(sizeLoaded).toEqual(sizeWhileLoading)
    unmount()

    downloads.length = 0
    resetImageLoadCache()
    const failed = render(t)
    failBoth(PHOTO)
    failBoth(placeholderUrl(t))
    expect(logo(failed.container)).toHaveAttribute('data-image-state', 'placeholder')
    expect(rules(failed.container)).toEqual(sizeWhileLoading)
    // the skeleton is out of the flow: it adds no size of its own
    expect(injectedCss().replace(/\s+/g, '')).toMatch(/\.image-skeleton\{position:absolute;inset:0;/)
  })
})
