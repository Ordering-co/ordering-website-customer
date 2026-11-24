import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

// The thumbnails' swiper says the space it got between its slides
const swipers = vi.hoisted(() => ({ thumbGap: [] }))

vi.mock('swiper/react', () => ({
  Swiper: ({ children, className, spaceBetween }) => {
    if (className === 'product-thumb') swipers.thumbGap.push(spaceBetween)
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
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => <div data-testid='product-share' /> }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ loading: false, options: { type: 1 } }]
}))
vi.mock('~components/utils/orderTypeAddress', () => ({
  parseUnaddressedOrderTypes: () => [],
  shouldRequireOrderAddress: () => false
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => ({ studentId: null })
}))

const product = {
  id: 10,
  name: 'Burger',
  description: 'Juicy',
  price: 9.5,
  images: 'burger.jpg',
  gallery: [{ file: 'a.jpg' }, { file: 'b.jpg' }],
  calories: 500,
  in_offer: true,
  offer_price: 12,
  tags: [{ id: 1, name: 'Vegan', image: 'vegan.png' }],
  ingredients: [],
  extras: []
}

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      handleSave={vi.fn()}
      increment={vi.fn()}
      decrement={vi.fn()}
      handleChangeSuboptionState={vi.fn()}
      errors={{}}
      isSoldOut={false}
      editMode={false}
      maxProductQuantity={5}
      showOption={() => true}
      {...rest}
      productCart={{ quantity: 1, options: {}, ingredients: {} }}
    />
  )
}))

const { ProductForm } = await import('../index')

const renderForm = (theme) => {
  swipers.thumbGap = []
  return renderWithProviders(<ProductForm />, { theme })
}

// The main rule of the element's own generated class (its declarations, not
// those of its children)
const mainRule = (el) => {
  const cls = Array.from(el.classList).filter((name) => !/^sc-/.test(name) && !['add', 'disabled', 'soldout'].includes(name))
  return injectedCss().split('}').filter((rule) => cls.some((name) => rule.includes(`.${name}{`))).join('}')
}

const withModal = (base = {}, extra = (values) => values) => themeWithValues((values) => {
  Object.assign(values.components.product_modal.base, base)
  return extra(values)
})

describe('product modal: the parts the theme hides (visibility)', () => {
  const hideAll = (values) => {
    ['product.share', 'product.meta', 'product.tags', 'product.instructions'].forEach((key) => { values.visibility[key] = false })
    return values
  }

  it('the schema: share, meta, tags and instructions, visible by default', () => {
    ;['share', 'meta', 'tags', 'instructions'].forEach((part) => {
      expect(schemaDefault(`visibility.product.${part}`)).toBe(true)
    })
  })

  it('by default every part shows', () => {
    const utils = renderForm(themeWithValues())
    expect(utils.getByTestId('product-share')).toBeInTheDocument()
    expect(utils.container.querySelector('[data-doc-section="product-meta"]')).not.toBeNull()
    expect(utils.container.querySelector('[data-doc-section="product-tags"]')).not.toBeNull()
    expect(utils.container.querySelector('[data-doc-section="product-instructions"]')).not.toBeNull()
  })

  it('hidden, they do not render', () => {
    const utils = renderForm(themeWithValues(hideAll))
    expect(utils.queryByTestId('product-share')).toBeNull()
    expect(utils.container.querySelector('[data-doc-section="product-meta"]')).toBeNull()
    expect(utils.container.querySelector('[data-doc-section="product-tags"]')).toBeNull()
    expect(utils.container.querySelector('[data-doc-section="product-instructions"]')).toBeNull()
    // the rest of the product stays
    expect(utils.getByText('Burger')).toBeInTheDocument()
  })
})

describe('product modal: its props (components.product_modal)', () => {
  it('the gallery ratio: 4:3 by default, the theme\'s, also on small screens unless it sets one of their own', () => {
    let utils = renderForm(themeWithValues())
    expect(cssFor(utils.getByTestId('mySwiper2').parentElement)).toContain('aspect-ratio:4 / 3;')
    utils.unmount()
    // the desktop ratio on phones too: no small-screen rule of its own
    utils = renderForm(withModal({ gallery_ratio: '16:9' }))
    let css = injectedCss()
    expect(css).toMatch(/\.mySwiper2\{height:auto;max-height:45vh;max-height:45dvh;aspect-ratio:16 \/ 9;\}/)
    expect(css).not.toMatch(/@media \(max-width:576px\)\{[^}]*\.mySwiper2\{aspect-ratio/)
    utils.unmount()
    utils = renderForm(withModal({ gallery_ratio: '1:1' }, (values) => {
      values.platforms.mobile_web.components.product_modal = { base: { gallery_ratio: '16:9' } }
      return values
    }))
    css = injectedCss()
    expect(css).toMatch(/\.mySwiper2\{height:auto;max-height:45vh;max-height:45dvh;aspect-ratio:1 \/ 1;\}/)
    expect(css).toMatch(/@media \(max-width:576px\)\{[^}]*\.mySwiper2\{aspect-ratio:16 \/ 9;\}/)
  })

  it('the thumbnails: their gap and height', () => {
    renderForm(withModal({ thumb_gap: 8, thumb_size: 90 }))
    expect(swipers.thumbGap[swipers.thumbGap.length - 1]).toBe(8)
    expect(injectedCss()).toMatch(/\.product-thumb \.swiper-slide img\{max-height:90px;\}/)
  })

  it('the name, description, price, offer and meta take their text and color', () => {
    const utils = renderForm(withModal({
      name_color: '#101010',
      description_color: '#202020',
      price_color: '#303030',
      offer_price_color: '#404040',
      meta_color: '#505050',
      price: { size: 27, line: 1.15, weight: 300 }
    }))
    const css = injectedCss()
    ;['#101010', '#202020', '#303030', '#404040', '#505050'].forEach((color) => expect(css).toContain(`color:${color};`))
    // the price keeps its bold (700): only size, line and family come from the theme
    const price = cssFor(utils.container.querySelector('.offer-price').parentElement)
    expect(price).toMatch(/> p\{[^}]*font-size:27px;line-height:1\.15;/)
    expect(price).not.toContain('font-weight:300;')
    expect(price).toContain('font-weight:700;')
  })

  it('the tags, the comment field and the action bar', () => {
    const utils = renderForm(withModal({ tag_size: 44, comment_height: 90, actions_sticky: false }))
    const tag = utils.container.querySelector('[data-doc-section="product-tags"] img')
    const tagCss = cssFor(tag.parentElement)
    expect(tagCss).toContain('width:44px;')
    expect(tagCss).toContain('height:44px;')
    expect(utils.container.querySelector('[data-doc-section="product-instructions"] textarea')).toHaveStyle({ height: '90px' })
    const bar = mainRule(utils.container.querySelector('[data-doc-section="product-actions"]'))
    expect(bar.lastIndexOf('position:relative;')).toBeGreaterThan(bar.lastIndexOf('position:sticky;'))
  })

  it('by default the action bar stays pinned', () => {
    const utils = renderForm(themeWithValues())
    const bar = mainRule(utils.container.querySelector('[data-doc-section="product-actions"]'))
    expect(bar).toContain('position:sticky;')
    expect(bar).not.toContain('position:relative;')
  })

  it('slots: the Add button takes the slot\'s color and appearance and defaults to lg, solid, primary without a slot', () => {
    const themed = themeWithValues((values) => {
      values.components.product_modal.slots.add = { component: 'button', size: 'md', appearance: 'outline', color: 'secondary', shape: 'icon' }
      return values
    })
    const slotted = renderForm(themed).container.querySelector('[data-doc-control="add-product-to-cart"]')
    const expected = componentVars(themed, 'button', { size: 'md', color: 'secondary', appearance: 'outline' })
    Object.entries(expected).forEach(([name, value]) => expect(slotted.style.getPropertyValue(name)).toBe(value))
    // the slot's shape is not an add button's: it stays a text button
    expect(slotted).not.toHaveClass('ui:w-(--ui-button-height)')

    const plain = themeWithValues((values) => {
      delete values.components.product_modal.slots.add
      return values
    })
    const defaulted = renderForm(plain).container.querySelector('[data-doc-control="add-product-to-cart"]')
    const lg = componentVars(plain, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    Object.entries(lg).forEach(([name, value]) => expect(defaulted.style.getPropertyValue(name)).toBe(value))
  })

  it('slots: the Add button and the stepper take the theme\'s size', () => {
    const theme = themeWithValues((values) => {
      values.components.product_modal.slots.add = { component: 'button', size: 'sm', appearance: 'solid', color: 'primary', shape: null }
      values.components.product_modal.slots.quantity = { component: 'stepper', size: 'sm' }
      return values
    })
    const utils = renderForm(theme)
    const add = utils.container.querySelector('[data-doc-control="add-product-to-cart"]')
    const sm = theme.values.components.button.sizes.sm.height
    const lg = theme.values.components.button.sizes.lg.height
    // the base Button: the size's height is written as its variable, not as a generated class
    expect(add).toHaveAttribute('data-slot', 'button')
    expect(add.style.getPropertyValue('--ui-button-height')).toBe(`${sm}px`)
    expect(add.style.getPropertyValue('--ui-button-height')).not.toBe(`${lg}px`)
    const stepper = utils.getByRole('group')
    // the base Stepper writes its size's height as a variable on its root
    expect(stepper.style.getPropertyValue('--ui-stepper-height')).toBe(`${theme.values.components.stepper.sizes.sm.height}px`)
  })
})
