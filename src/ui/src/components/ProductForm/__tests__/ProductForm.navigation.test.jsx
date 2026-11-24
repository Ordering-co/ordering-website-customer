import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
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
// Each option is its section (the id the navigation scrolls to), as the real one
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, children }) => <div id={`id_${option.id}`} data-testid={`option-${option.id}`}>{children}</div>
}))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({ ProductOptionSubOption: () => null }))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
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

const form = vi.hoisted(() => ({ errors: {}, options: {} }))

const product = {
  ...productFixture,
  ingredients: [{ id: 5, name: 'Cheese' }],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 2, rank: 2, name: 'Sauce', suboptions: [] },
      { id: 1, rank: 1, name: 'Base', suboptions: [] },
      { id: 3, rank: 3, name: 'Hidden', suboptions: [] }
    ]
  }]
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
      errors={form.errors}
      isSoldOut={false}
      editMode={false}
      maxProductQuantity={5}
      showOption={(option) => option.id !== 3}
      {...rest}
      productCart={{ quantity: 1, options: form.options, ingredients: {} }}
    />
  )
}))

const { ProductForm } = await import('../index')

// The values of components.product_modal, set here (not from the schema's
// defaults) so the tests read the same before and after a re-sync
const productModal = (values, modal) => {
  values.components.product_modal = modal
  return values
}
// the bar shows unless visibility product.navigation hides it
const withNavigation = (navigation, slot = { component: 'tabs', size: 'md', variant: 'underline' }) => themeWithValues((values) => {
  values.components.product_modal.base.layout = 'sheet'
  values.visibility['product.navigation'] = navigation
  return productModal(values, {
    ...values.components.product_modal,
    slots: { navigation: slot }
  })
})
// the tabs (showcase and card): a row of text, not chips
const withTabs = () => themeWithValues((values) => {
  values.components.product_modal.base.layout = 'showcase'
  values.visibility['product.navigation'] = true
  return values
})
const withoutNavigation = () => themeWithValues((values) => {
  values.components.product_modal.base.layout = 'sheet'
  delete values.visibility['product.navigation']
  return values
})

const rect = (top, height = 0) => () => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top })

// The form inside what scrolls it (the product modal's body)
const renderForm = (theme) => {
  const utils = renderWithProviders(
    <div data-testid='dialog' style={{ overflowY: 'auto' }}>
      <ProductForm />
    </div>,
    { theme }
  )
  const dialog = utils.getByTestId('dialog')
  dialog.scrollTo = vi.fn()
  dialog.getBoundingClientRect = rect(100, 600)
  return { ...utils, dialog }
}

const navigation = (utils) => utils.queryByRole('navigation', { name: 'Product options' })

beforeEach(() => {
  form.errors = {}
  form.options = {}
})

describe('ProductForm option navigation', () => {
  it('shows a nav of buttons: Ingredients and the options shown, by rank', () => {
    const utils = renderForm(withNavigation(true))
    const nav = navigation(utils)
    expect(nav).toBeInTheDocument()
    expect(nav.tagName).toBe('NAV')
    // marked as a sticky bar: what a scroll in the form lands under
    expect(nav).toHaveAttribute('data-sticky-top')
    const tabs = within(nav).getAllByRole('button')
    expect(tabs.map(tab => tab.textContent)).toEqual(['Ingredients', 'Base', 'Sauce'])
    tabs.forEach(tab => expect(tab).toHaveAttribute('type', 'button'))
  })

  it('are chips of the theme, of the size slots.navigation says (md without one)', () => {
    const height = (theme) => {
      const utils = renderForm(theme)
      const value = within(navigation(utils)).getAllByRole('button')[0].style.getPropertyValue('--ui-chip-height')
      utils.unmount()
      return value
    }
    expect(height(withNavigation(true, { component: 'tabs', size: 'sm', variant: 'underline' }))).toBe('32px')
    expect(height(withNavigation(true, { component: 'tabs', size: null, variant: null }))).toBe('40px')
  })

  it('sticky, of the dialog\'s background, its chips scrolling sideways at their width', () => {
    const utils = renderForm(withNavigation(true))
    const nav = navigation(utils)
    const navClass = nav.className.split(' ').pop()
    const rowClass = within(nav).getByRole('button', { name: 'Ingredients' }).parentElement.className.split(' ').pop()
    const css = injectedCss().replace(/\s+/g, ' ')
    expect(css).toMatch(new RegExp(`\\.${navClass}\\{[^}]*position: ?sticky;[^}]*z-index: ?2;`))
    expect(css).toMatch(new RegExp(`\\.${rowClass}\\{[^}]*overflow-x: ?auto;`))
    within(nav).getAllByRole('button').forEach(chip => expect(chip).toHaveAttribute('data-slot', 'chip'))
  })

  it('hidden when the theme hides it (visibility product.navigation); the schema default shows it', () => {
    const hidden = renderForm(withNavigation(false))
    expect(navigation(hidden)).toBeNull()
    hidden.unmount()
    expect(navigation(renderForm(withoutNavigation()))).toBeInTheDocument()
  })

  it('a tab scrolls the container so its section lands right under the bar, and is the current one', () => {
    const utils = renderForm(withNavigation(true))
    const nav = navigation(utils)
    Object.defineProperty(nav, 'offsetHeight', { configurable: true, value: 48 })
    utils.dialog.scrollTop = 30
    utils.getByTestId('option-2').getBoundingClientRect = rect(400)

    const sauce = within(nav).getByRole('button', { name: 'Sauce' })
    fireEvent.click(sauce)
    // 30 scrolled + 400 - 100 (the dialog's top) - 48 (the bar)
    expect(utils.dialog.scrollTo).toHaveBeenCalledWith({ top: 282, behavior: expect.any(String) })
    expect(sauce).toHaveAttribute('aria-current', 'true')
    expect(sauce).toHaveAttribute('data-selected')
    // it says where the reader is, it is not a toggle
    expect(sauce).not.toHaveAttribute('aria-pressed')
    within(nav).getAllByRole('button').filter(tab => tab !== sauce)
      .forEach(tab => expect(tab).not.toHaveAttribute('aria-current'))
  })

  it('sticks at the top of what scrolls, stopping short of the modal\'s close at its end', () => {
    const utils = renderForm(withNavigation(true))
    const nav = navigation(utils)
    // nothing pins the top of the dialog's body any more (the close is at the corner, not a bar)
    expect(nav.style.top).toBe('')
    const navClass = nav.className.split(' ').pop()
    const css = injectedCss().replace(/\s+/g, ' ')
    expect(css).toMatch(new RegExp(`\\.${navClass}\\{[^}]*padding-inline-end: ?calc\\([^;]*\\);`))

    Object.defineProperty(nav, 'offsetHeight', { configurable: true, value: 48 })
    utils.getByTestId('option-1').getBoundingClientRect = rect(400)
    fireEvent.click(within(nav).getByRole('button', { name: 'Base' }))
    // 400 - 100 - 48 (the bar)
    expect(utils.dialog.scrollTo).toHaveBeenCalledWith({ top: 252, behavior: expect.any(String) })
  })

  describe('the tabs (showcase and card layouts)', () => {
    it('count the choices made in each section, in its name and beside it; none is not shown', () => {
      form.options = { 'id:1': { suboptions: { 7: { quantity: 1 }, 8: { quantity: 1 } } } }
      const utils = renderForm(withTabs())
      const nav = navigation(utils)
      const base = within(nav).getByRole('tab', { name: 'Base, 2 selected' })
      expect(base).toHaveTextContent('Base2')
      expect(within(base).getByText('2')).toHaveAttribute('aria-hidden', 'true')
      // a section with nothing chosen keeps its plain name
      const sauce = within(nav).getByRole('tab', { name: 'Sauce' })
      expect(sauce).not.toHaveAttribute('aria-label')
      expect(sauce.textContent).toBe('Sauce')
      expect(within(nav).getByRole('tab', { name: 'Ingredients' })).toBeInTheDocument()
    })

    it('have no arrow (the row fades out instead) and keep the line that slides under the current tab', () => {
      const utils = renderForm(withTabs())
      const nav = navigation(utils)
      expect(within(nav).queryByRole('button', { name: 'Next' })).toBeNull()
      expect(nav.querySelector('[data-slot=tabs-indicator]')).not.toBeNull()
      expect(nav.querySelector('[data-slot=tabs]')).toHaveAttribute('data-variant', 'underline')
    })
  })

  describe('scroll-spy', () => {
    let raf
    beforeEach(() => {
      raf = window.requestAnimationFrame
      window.requestAnimationFrame = (frame) => {
        frame(0)
        return 1
      }
    })
    afterEach(() => {
      window.requestAnimationFrame = raf
    })

    it('marks the section under the bar as the current tab', () => {
      const utils = renderForm(withNavigation(true))
      const nav = navigation(utils)
      Object.defineProperty(nav, 'offsetHeight', { configurable: true, value: 48 })
      // the bar's bottom: 100 + 48
      utils.container.querySelector('#ingredients').getBoundingClientRect = rect(-200)
      utils.getByTestId('option-1').getBoundingClientRect = rect(140)
      utils.getByTestId('option-2').getBoundingClientRect = rect(500)
      fireEvent.scroll(utils.dialog)
      expect(within(nav).getByRole('button', { name: 'Base' })).toHaveAttribute('aria-current', 'true')

      utils.getByTestId('option-1').getBoundingClientRect = rect(-100)
      utils.getByTestId('option-2').getBoundingClientRect = rect(148)
      fireEvent.scroll(utils.dialog)
      expect(within(nav).getByRole('button', { name: 'Sauce' })).toHaveAttribute('aria-current', 'true')
    })

    it('stops listening on unmount', () => {
      const utils = renderForm(withNavigation(true))
      const remove = vi.spyOn(utils.dialog, 'removeEventListener')
      utils.unmount()
      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  it('the error scroll leaves the group below the bar', () => {
    form.errors = { 'id:1': true }
    const utils = renderForm(withNavigation(true))
    Object.defineProperty(navigation(utils), 'offsetHeight', { configurable: true, value: 48 })
    utils.getByTestId('option-1').getBoundingClientRect = rect(400)
    fireEvent.click(utils.container.querySelector('[data-doc-control="add-product-to-cart"]'))
    // 400 - 100 - 20 (the error offset) - 48 (the bar)
    expect(utils.dialog.scrollTo).toHaveBeenCalledWith({ top: 232, behavior: expect.any(String) })
  })
})
