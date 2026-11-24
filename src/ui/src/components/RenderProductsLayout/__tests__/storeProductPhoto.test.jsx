import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { resetImageLoadCache } from '../../Image/useImageLoad'
import { themeColor } from '~/utils/themeColors'
import { StoreProductCard, StoreProductRow, StoreProductTile } from '../StoreProduct'

// The photo of a product of the store menu is painted only once it is whole: a photo drawn as it
// arrives stayed half painted (a thin strip, the rest blank) when the download was slow or cut. While it loads the
// box shows the theme's loading placeholder; when it fails, the theme's placeholder image; when that fails too, the
// placeholder fill. Never an empty box, and never a box of another size.

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: ({ height, width }) => <div data-testid='skeleton' data-height={height} data-width={width} />
}))

const PHOTO = 'https://img.test/burger.jpg'
const product = { id: 1, name: 'Burger', price: 9, images: PHOTO }

// the three designs of a photo: the row (direct menu), the tile (showcase, featured) and the card (classic)
const variants = {
  row: (props) => <StoreProductRow {...props} />,
  tile: (props) => <StoreProductTile {...props} />,
  card: (props) => <StoreProductCard {...props} />
}

// every `new Image()`, to answer by hand
const downloads = []
class FakeImage {
  constructor () { this.naturalWidth = 0; this.decode = undefined; this.requested = []; downloads.push(this) }
  set src (value) { this.requested.push(value) }
  get src () { return this.requested.at(-1) }
}
const forUrl = (url) => downloads.filter((d) => d.requested[0] === url && d.onload)
const arrive = (url) => act(() => { forUrl(url).at(-1).naturalWidth = 86; forUrl(url).at(-1).onload() })
// the picture fails, and so does its retry
const failBoth = (url) => {
  act(() => { forUrl(url).at(-1).onerror() })
  act(() => { forUrl(`${url}?img_retry=1`).at(-1).onerror() })
}

const theme = (visibility = {}) => themeWithValues((values) => {
  Object.assign(values.visibility, { 'product.dummy_image': true, 'product.favorite': false, ...visibility })
  return values
})
const placeholderUrl = (t) => t.values.images['placeholder.product']

let current
const render = (variant, t, props = {}) => {
  cleanup()
  current = renderWithProviders(variants[variant]({ product, currentCart: {}, onProductClick: vi.fn(), onProductAdd: vi.fn(), ...props }), { theme: t })
  return current
}
const photo = (container) => container.querySelector('[data-image-state]')
const bg = (container) => photo(container).style.backgroundImage

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

describe.each(Object.keys(variants))('store menu photo (%s): painted only once it is whole', (variant) => {
  it('while it loads: the theme\'s loading placeholder fills the box and there is no background image', () => {
    const { container, queryAllByTestId } = render(variant, theme())
    expect(photo(container)).toHaveAttribute('data-image-state', 'loading')
    expect(bg(container)).toBe('')
    const skeleton = photo(container).querySelector('[data-testid="skeleton"]')
    expect(skeleton).toHaveAttribute('data-width', '100%')
    expect(skeleton).toHaveAttribute('data-height', '100%')
    expect(queryAllByTestId('skeleton')).toHaveLength(1)
  })

  it('once it is whole: the photo is the background image, no skeleton; the "+" stays in the box', () => {
    const { container, queryAllByTestId, getByRole } = render(variant, theme())
    arrive(PHOTO)
    expect(photo(container)).toHaveAttribute('data-image-state', 'loaded')
    expect(bg(container)).toBe(`url("${PHOTO}")`)
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    expect(photo(container).contains(getByRole('button', { name: /Add to cart/ }))).toBe(true)
  })

  it('the photo fails (and its retry): the theme\'s placeholder takes its place, painted when whole', () => {
    const t = theme()
    const { container, queryAllByTestId } = render(variant, t)
    failBoth(PHOTO)
    // the placeholder is on its way: still the loading state, never a blank box
    expect(photo(container)).toHaveAttribute('data-image-state', 'loading')
    expect(bg(container)).toBe('')
    expect(queryAllByTestId('skeleton')).toHaveLength(1)
    arrive(placeholderUrl(t))
    expect(photo(container)).toHaveAttribute('data-image-state', 'loaded')
    expect(bg(container)).toBe(`url("${placeholderUrl(t)}")`)
  })

  it('the photo fails and so does the placeholder: the box keeps the placeholder fill (the border color), still', () => {
    const t = theme()
    const { container, queryAllByTestId } = render(variant, t)
    failBoth(PHOTO)
    failBoth(placeholderUrl(t))
    const box = photo(container)
    expect(box).toHaveAttribute('data-image-state', 'placeholder')
    expect(box.style.backgroundImage).toBe('')
    expect(queryAllByTestId('skeleton')).toHaveLength(0)
    const cls = box.className.split(' ').at(-1)
    const css = injectedCss().replace(/\s+/g, '')
    expect(css).toContain(`.${cls}[data-image-state='placeholder']{background-color:${themeColor(t, 'border')};`)
    expect(css).not.toMatch(new RegExp(`\\.${cls}\\[data-image-state='placeholder'\\]\\{[^}]*animation`))
  })

  it('the theme hides the placeholder: a photo that fails leaves the fill at once (only the photo and its retry are asked)', () => {
    const { container } = render(variant, theme({ 'product.dummy_image': false }))
    failBoth(PHOTO)
    expect(photo(container)).toHaveAttribute('data-image-state', 'placeholder')
    expect(downloads.map((d) => d.requested[0])).toEqual([PHOTO, `${PHOTO}?img_retry=1`])
  })

  it('a product with no photo shows the theme\'s placeholder; if that fails too, the fill', () => {
    const t = theme()
    const noPhoto = { ...product, images: null }
    const { container } = render(variant, t, { product: noPhoto })
    expect(photo(container)).toHaveAttribute('data-image-state', 'loading')
    arrive(placeholderUrl(t))
    expect(bg(container)).toBe(`url("${placeholderUrl(t)}")`)
    downloads.length = 0
    resetImageLoadCache()
    const again = render(variant, t, { product: noPhoto })
    failBoth(placeholderUrl(t))
    expect(photo(again.container)).toHaveAttribute('data-image-state', 'placeholder')
  })

  it('a sold out product keeps its tag in the box and its disabled look in every state', () => {
    const sold = { ...product, inventoried: true, quantity: 0 }
    const t = theme()
    const { container, getByText } = render(variant, t, { product: sold })
    const sizeRules = (box) => (injectedCss().match(new RegExp(`\\.${box.className.split(' ').at(-1)}[^{]*\\{[^}]*\\}`, 'g')) || []).join('')
    const loading = sizeRules(photo(container))
    expect(loading).toContain('opacity:')
    expect(photo(container).contains(getByText('Sold out'))).toBe(true)
    failBoth(PHOTO)
    failBoth(placeholderUrl(t))
    expect(sizeRules(photo(container))).toBe(loading)
    expect(photo(container).contains(getByText('Sold out'))).toBe(true)
  })

  it('the box does not change between states: the same size rules loading, loaded and failed; the skeleton is out of the flow', () => {
    const t = theme()
    const rules = (box) => {
      const cls = box.className.split(' ').at(-1)
      return { cls, css: (injectedCss().match(new RegExp(`\\.${cls}[^{]*\\{[^}]*\\}`, 'g')) || []).join('').replace(/\[data-image-state=[^\]]*\]\{[^}]*\}/g, '') }
    }
    const loading = render(variant, t)
    const whileLoading = rules(photo(loading.container))
    expect(whileLoading.css).toMatch(/aspect-ratio|width:/)
    arrive(PHOTO)
    expect(rules(photo(loading.container))).toEqual(whileLoading)

    downloads.length = 0
    resetImageLoadCache()
    const failed = render(variant, t)
    failBoth(PHOTO)
    failBoth(placeholderUrl(t))
    expect(rules(photo(failed.container))).toEqual(whileLoading)
    expect(injectedCss().replace(/\s+/g, '')).toMatch(/\.photo-skeleton\{position:absolute;inset:0;/)
  })

  it('a hidden image downloads nothing and draws no box', () => {
    const { container } = render(variant, theme({ 'product.image': false }))
    expect(downloads).toHaveLength(0)
    expect(photo(container)).toBeNull()
  })
})

describe('the photo keeps not taking clicks (the card\'s button below gets them)', () => {
  it('pointer-events none in every state', () => {
    const { container } = render('row', theme())
    const cls = photo(container).className.split(' ').at(-1)
    expect(injectedCss().replace(/\s+/g, '')).toMatch(new RegExp(`\\.${cls}\\{[^}]*pointer-events:none;`))
  })
})
