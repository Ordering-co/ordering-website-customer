import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault, schemaEntry } from '~/utils/themeSchema'
import { galleryArrowOptions, galleryMaxHeight } from '../styles'
import THEME_COMPILED from '~/theme.compiled.json'
import { withModalBase } from './productModalTheme'

// The main swiper says what it got as its navigation
const swipers = vi.hoisted(() => ({ navigation: [], onBeforeInit: null }))

vi.mock('swiper/react', () => ({
  Swiper: ({ children, navigation, className, onBeforeInit }) => {
    if (className === 'mySwiper2') {
      swipers.navigation.push(navigation)
      swipers.onBeforeInit = onBeforeInit
    }
    return <div data-testid={className}>{children}</div>
  },
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({
  Navigation: class Navigation {},
  Pagination: class Pagination {},
  Thumbs: class Thumbs {}
}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ children }) => <div data-testid='product-option'>{children}</div>
}))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))

const productState = vi.hoisted(() => ({ current: null }))

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: productState.current, loading: false, error: null }}
      productCart={{}}
      business={{ id: 1, name: 'Store' }}
      handleSave={vi.fn()}
      increment={vi.fn()}
      decrement={vi.fn()}
      handleChangeSuboptionState={vi.fn()}
      errors={[]}
      isSoldOut={false}
      editMode={false}
      {...rest}
    />
  )
}))

const { ProductForm } = await import('../index')

// (not the shared menu fixture: its module mocks swiper/react too)
const productFixture = { id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg' }
const withGallery = { ...productFixture, gallery: [{ file: 'side.jpg' }] }

const renderForm = (theme, product = withGallery) => {
  productState.current = product
  swipers.navigation = []
  return renderWithProviders(<ProductForm />, { theme })
}

describe('ProductForm gallery (T3 and its arrows)', () => {
  it('the arrows are icon buttons of the theme with a name, handed to Swiper', () => {
    const utils = renderForm(themeWithValues())
    const prev = utils.getByRole('button', { name: 'Previous' })
    const next = utils.getByRole('button', { name: 'Next' })
    expect(prev.querySelector('svg')).toHaveClass('lucide-chevron-left')
    expect(next.querySelector('svg')).toHaveClass('lucide-chevron-right')
    // inside the main swiper (its container end), not over the thumbnails
    expect(utils.getByTestId('mySwiper2')).toContainElement(prev)
    // Swiper's navigation: the two buttons, set when it starts
    expect(typeof swipers.navigation[swipers.navigation.length - 1]).toBe('object')
    const swiper = { params: { navigation: { prevEl: null, nextEl: null } } }
    swipers.onBeforeInit(swiper)
    expect(swiper.params.navigation.prevEl).toBe(prev)
    expect(swiper.params.navigation.nextEl).toBe(next)
  })

  it('one photo has no arrows', () => {
    const utils = renderForm(themeWithValues(), productFixture)
    expect(utils.queryByRole('button', { name: 'Previous' })).toBeNull()
    expect(swipers.navigation[swipers.navigation.length - 1]).toBe(false)
  })

  it('the gallery is 4:3 with cover at every width', () => {
    const utils = renderForm(themeWithValues())
    const css = cssFor(utils.getByTestId('mySwiper2').parentElement)
    expect(css).toMatch(/\.mySwiper2\{height:auto;max-height:45vh;max-height:45dvh;aspect-ratio:4 \/ 3;\}/)
    expect(css).toMatch(/\.mySwiper2 \.swiper-slide img\{object-fit:cover;/)
  })
})

describe('the gallery inside a Drawer', () => {
  const twoPhotos = { ...productFixture, gallery: [{ file: 'side.jpg' }, { file: 'top.jpg' }] }
  it('in the steps panel (closes sideways) its swipers are marked for the Drawer to leave their drag alone', () => {
    const utils = renderForm(withModalBase(themeWithValues(), { layout: 'steps' }), twoPhotos)
    const marked = utils.getByTestId('mySwiper2').closest('[data-base-ui-swipe-ignore]')
    expect(marked).not.toBeNull()
    expect(marked).toContainElement(utils.getByTestId('product-thumb'))
  })

  it('elsewhere (the phone sheet closes downwards) a drag down on the photo closes it: not marked', () => {
    const utils = renderForm(themeWithValues(), twoPhotos)
    expect(utils.getByTestId('mySwiper2').closest('[data-base-ui-swipe-ignore]')).toBeNull()
  })
})

describe('the gallery arrows (product_modal.slots.gallery_arrow)', () => {
  const withSlot = (slot) => themeWithValues((values) => {
    values.components.product_modal.slots = { ...values.components.product_modal.slots, gallery_arrow: slot }
    return values
  })

  it('the schema default is today\'s arrow: a solid neutral icon button, sm', () => {
    expect(schemaDefault('components.product_modal.slots.gallery_arrow')).toEqual({ component: 'button', size: 'sm', appearance: 'solid', color: 'neutral', shape: 'icon' })
    expect(galleryArrowOptions(themeWithValues())).toEqual({ size: 'sm', color: 'neutral', appearance: 'solid', shape: 'icon' })
  })

  it('galleryArrowOptions: what the slot chose; a slot the theme lacks keeps the default', () => {
    expect(galleryArrowOptions(withSlot({ component: 'button', size: 'lg', appearance: 'outline', color: 'primary', shape: 'icon' })))
      .toEqual({ size: 'lg', color: 'primary', appearance: 'outline', shape: 'icon' })
    expect(galleryArrowOptions(withSlot(null))).toEqual({ size: 'sm', color: 'neutral', appearance: 'solid', shape: 'icon' })
  })

  it('the arrows take the slot\'s size', () => {
    const height = (theme) => {
      const { getByRole, unmount } = renderForm(theme)
      const value = getByRole('button', { name: 'Previous' }).style.getPropertyValue('--ui-button-height')
      unmount()
      return value
    }
    expect(height(themeWithValues())).toBe(`${themeWithValues().values.components.button.sizes.sm.height}px`)
    expect(height(withSlot({ component: 'button', size: 'lg', appearance: 'solid', color: 'neutral', shape: 'icon' })))
      .toBe(`${themeWithValues().values.components.button.sizes.lg.height}px`)
  })
})

describe('the gallery thumbnails (visibility product.gallery_thumbs)', () => {
  const threePhotos = { ...productFixture, gallery: [{ file: 'side.jpg' }, { file: 'top.jpg' }] }
  const thumbs = (theme, product = threePhotos) => {
    const utils = renderForm(theme, product)
    const shown = !!utils.queryByTestId('product-thumb')
    utils.unmount()
    return shown
  }

  it('the schema: visible by default', () => {
    expect(schemaDefault('visibility.product.gallery_thumbs')).toBe(true)
  })

  it('from 3 photos by default; the theme can hide them', () => {
    expect(thumbs(themeWithValues())).toBe(true)
    expect(thumbs(themeWithValues(), withGallery)).toBe(false)
    expect(thumbs(themeWithValues((values) => {
      values.visibility['product.gallery_thumbs'] = false
      return values
    }))).toBe(false)
  })
})

describe('a gallery photo that fails to load', () => {
  const withDummy = () => themeWithValues((values) => {
    values.images['placeholder.product'] = 'https://cdn.test/dummy-product.jpg'
    values.visibility = { ...values.visibility, 'product.dummy_image': true }
    return values
  })

  it('shows the theme\'s product placeholder (images placeholder.product) when visibility.product.dummy_image is on, never the broken image', () => {
    const utils = renderForm(withDummy(), productFixture)
    const img = utils.getByTestId('mySwiper2').querySelector('img')
    expect(img.getAttribute('src')).toBe('burger.jpg')
    fireEvent.error(img)
    expect(utils.getByTestId('mySwiper2').querySelector('img').getAttribute('src')).toBe('https://cdn.test/dummy-product.jpg')
    // the placeholder failing too: no image at all
    fireEvent.error(utils.getByTestId('mySwiper2').querySelector('img'))
    expect(utils.getByTestId('mySwiper2').querySelector('img')).toBeNull()
  })

  it('no placeholder (visibility.product.dummy_image off by default): no image at all once it fails', () => {
    const utils = renderForm(themeWithValues((values) => {
      values.images['placeholder.product'] = 'https://cdn.test/dummy-product.jpg'
      return values
    }), productFixture)
    const img = utils.getByTestId('mySwiper2').querySelector('img')
    fireEvent.error(img)
    expect(utils.getByTestId('mySwiper2').querySelector('img')).toBeNull()
  })
})

describe('the product modal on a short screen', () => {
  it('the gallery takes at most product_modal.base.gallery_max_height % of the visible height (45 by default)', () => {
    expect(schemaEntry('components.product_modal.base.gallery_max_height')).toMatchObject({ type: 'number', value: 45 })
    expect(galleryMaxHeight(themeWithValues())).toBe(45)
    const theme = themeWithValues((values) => { values.components.product_modal.base.gallery_max_height = 60; return values })
    expect(galleryMaxHeight(theme)).toBe(60)
    // a number out of its range is clamped; one that is not a number is the default
    const [min, max] = THEME_COMPILED.values.components.product_modal.base.gallery_max_height.$rule
    ;[[0, min], [120, max], ['50', 45], [null, 45]].forEach(([value, expected]) => {
      const bad = themeWithValues((values) => { values.components.product_modal.base.gallery_max_height = value; return values })
      expect(galleryMaxHeight(bad)).toBe(expected)
    })
  })

  it('the gallery\'s max height is the theme\'s, in vh and dvh', () => {
    const theme = themeWithValues((values) => { values.components.product_modal.base.gallery_max_height = 60; return values })
    const utils = renderForm(theme, productFixture)
    const css = Array.from(document.querySelectorAll('style')).map((el) => el.textContent).join('\n').replace(/\s+/g, '')
    expect(css).toContain('max-height:60vh;max-height:60dvh;')
    utils.unmount()
  })

  it('the action bar is a child of the whole form, after the product\'s info (its sticky bottom holds over all of it)', () => {
    const actionsParent = (theme) => {
      const utils = renderForm(theme, productFixture)
      const actions = utils.container.querySelector('[data-doc-section="product-actions"]')
      const details = utils.container.querySelector('[data-doc-section="product-details"]')
      const form = utils.container.querySelector('.product-container')
      const info = details.parentElement
      const result = {
        // the form's column (ProductMain: no box on a phone) holds the info and the bar, in the form
        inForm: actions.parentElement.parentElement === form,
        inInfo: actions.parentElement === info,
        afterInfo: info.nextElementSibling === actions
      }
      utils.unmount()
      return result
    }
    expect(actionsParent(themeWithValues())).toEqual({ inForm: true, inInfo: false, afterInfo: true })
  })

  it('the form is as tall as its content (no viewport cap that would end the sticky bar)', () => {
    const maxHeight = (theme) => {
      const utils = renderForm(theme, productFixture)
      // its generated class (not the product-container one)
      const el = utils.container.querySelector('.product-container')
      const css = cssFor({ className: el.className.split(' ').filter(cls => cls !== 'product-container').join(' ') })
      utils.unmount()
      return css
    }
    expect(maxHeight(themeWithValues())).toMatch(/max-height:none;/)
  })
})
