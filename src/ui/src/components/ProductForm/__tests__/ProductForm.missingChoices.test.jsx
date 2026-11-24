import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'

// implementation noteswhat the add button and the option navigation say about the
// required groups still to choose (components.product_modal.base.missing_choices)

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
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
// Each option is its section (the id the navigation scrolls to), as the real one
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, children }) => <div id={`id_${option.id}`}>{children}</div>
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

const form = vi.hoisted(() => ({ errors: {}, editMode: false, cart: {} }))

const product = {
  ...productFixture,
  ingredients: [],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 2, rank: 2, name: 'Sauce', min: 1, suboptions: [] },
      { id: 1, rank: 1, name: 'Base', min: 1, suboptions: [] },
      { id: 4, rank: 4, name: 'Extras', min: 0, suboptions: [] },
      { id: 3, rank: 3, name: 'Hidden', min: 1, suboptions: [] }
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
      isSoldOut={false}
      maxProductQuantity={5}
      showOption={(option) => option.id !== 3}
      {...rest}
      errors={form.errors}
      editMode={form.editMode}
      productCart={{ quantity: 1, total: 21, options: {}, ingredients: {}, ...form.cart }}
    />
  )
}))

describe('shared product window controls', () => {
  it.each(['card', 'showcase', 'sheet', 'steps'])('%s has a collapsed note, pending status and a total in the add button', (layout) => {
    const ui = renderForm(themed({ base: { layout } }))
    expect(ui.container.querySelector('.product-container')).toHaveAttribute('data-doc-layout', layout)
    expect(ui.queryByRole('textbox', { name: 'Additional instructions' })).toBeNull()
    const note = ui.getByRole('button', { name: 'Additional instructions' })
    expect(note).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(note)
    expect(ui.getByRole('textbox', { name: 'Additional instructions' })).toBeVisible()
    expect(ui.status()).toHaveTextContent('Still to choose: Base and 1 more')
    expect(ui.add()).toHaveTextContent('$21')
  })
})

const { ProductForm } = await import('../index')

const themed = ({ base = {}, visibility = {} } = {}) => withModalBase(
  themeWithValues((values) => Object.assign(values.visibility, visibility) && values),
  base
)

const renderForm = (theme = themed({ base: { layout: 'sheet' } })) => {
  const utils = renderWithProviders(
    <div data-testid='dialog' style={{ overflowY: 'auto' }}>
      <ProductForm />
    </div>,
    { theme }
  )
  const dialog = utils.getByTestId('dialog')
  dialog.scrollTo = vi.fn()
  // errors change as the customer chooses: the controller computes them again
  const setErrors = (errors) => act(() => {
    form.errors = errors
    utils.rerender(<div data-testid='dialog' style={{ overflowY: 'auto' }}><ProductForm /></div>)
  })
  const add = () => utils.container.querySelector('[data-doc-control="add-product-to-cart"]')
  const status = () => utils.container.querySelector('[data-doc-section="product-missing-choices"]')
  const chip = (name) => within(utils.getByRole('navigation', { name: 'Product options' })).getByRole('button', { name: new RegExp(`^${name}`) })
  return { ...utils, dialog, setErrors, add, status, chip }
}

beforeEach(() => {
  form.errors = { 'id:1': true, 'id:2': true }
  form.editMode = false
  form.cart = {}
})

describe('missing_choices jump (the default)', () => {
  it('the button keeps saying Add to cart; the line over it is a polite status, present before the first attempt', () => {
    const ui = renderForm()
    expect(ui.add()).toHaveTextContent('Add to cart')
    expect(ui.status()).toHaveAttribute('role', 'status')
    expect(ui.status()).toHaveAttribute('aria-live', 'polite')
    expect(ui.status()).toHaveTextContent('Still to choose: Base and 1 more')
  })

  it('a click takes the customer to the first group missing and then says what is still to choose (the first, and how many more)', () => {
    const ui = renderForm()
    fireEvent.click(ui.add())
    expect(ui.dialog.scrollTo).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toHaveAttribute('id', 'id_1')
    expect(ui.status()).toHaveTextContent('Still to choose: Base and 1 more')
    expect(ui.add()).toHaveTextContent('Add to cart')
  })

  it('with one group missing it names only that one; with nothing missing the line is empty again', () => {
    const ui = renderForm()
    fireEvent.click(ui.add())
    ui.setErrors({ 'id:2': true })
    expect(ui.status()).toHaveTextContent(/^Still to choose: Sauce$/)
    ui.setErrors({})
    expect(ui.status()).toBeEmptyDOMElement()
  })

  it('edit mode says Update, the same way', () => {
    form.editMode = true
    const ui = renderForm()
    expect(ui.add()).toHaveTextContent('Update')
  })

  it('a value of the theme it does not know is jump', () => {
    const ui = renderForm(themed({ base: { missing_choices: 'banner' } }))
    expect(ui.add()).toHaveTextContent('Add to cart')
    fireEvent.click(ui.add())
    expect(ui.status()).toHaveTextContent('Still to choose: Base and 1 more')
  })
})

describe('missing_choices guide', () => {
  const guide = (base = {}, visibility = {}) => themed({ base: { missing_choices: 'guide', ...base }, visibility })

  it('while a group is missing the button says Choose <first group>, and retains the status above it', () => {
    const ui = renderForm(guide())
    expect(ui.add()).toHaveTextContent('Choose Base')
    expect(ui.add()).not.toHaveTextContent('Add to cart')
    expect(ui.status()).toHaveTextContent('Still to choose: Base and 1 more')
  })

  it('a click goes to that group (the same jump, with its error shown) and the label follows what is left', () => {
    const ui = renderForm(guide())
    fireEvent.click(ui.add())
    expect(ui.dialog.scrollTo).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toHaveAttribute('id', 'id_1')
    ui.setErrors({ 'id:2': true })
    expect(ui.add()).toHaveTextContent('Choose Sauce')
    ui.setErrors({})
    expect(ui.add()).toHaveTextContent('Add to cart')
  })

  it('with nothing missing it is Add to cart, or Update when editing, and a click adds', () => {
    form.errors = {}
    form.editMode = true
    const ui = renderForm(guide())
    expect(ui.add()).toHaveTextContent('Update')
    fireEvent.click(ui.add())
    expect(ui.dialog.scrollTo).not.toHaveBeenCalled()
  })

  it.each(['card', 'showcase', 'sheet', 'steps', 'wizard'])('works with the layout %s too', (layout) => {
    const ui = renderForm(guide({ layout }))
    expect(ui.add()).toHaveTextContent('Choose Base')
    expect(ui.container.querySelector('[data-doc-section="product-customization"]')).toHaveAttribute('data-doc-layout', layout === 'wizard' ? 'card' : layout)
  })

  it('the total stays in the button (visibility product.add_price)', () => {
    const ui = renderForm(guide({}, { 'product.add_price': true }))
    expect(ui.add()).toHaveTextContent('Choose Base')
    expect(ui.add()).toHaveTextContent('$21')
  })
})

describe('the navigation chips', () => {
  it('one chip per section shown, a required group with its choice made is complete, a pending one has no status yet', () => {
    form.errors = { 'id:2': true }
    const ui = renderForm()
    expect(ui.chip('Base')).toHaveAttribute('data-status', 'complete')
    expect(ui.chip('Sauce')).not.toHaveAttribute('data-status')
    // optional: none; the hidden one has no chip
    expect(ui.chip('Extras')).not.toHaveAttribute('data-status')
    expect(within(ui.getByRole('navigation', { name: 'Product options' })).queryByRole('button', { name: /Hidden/ })).toBeNull()
  })

  it('after the first attempt the pending ones are missing (and say it to assistive technology)', () => {
    const ui = renderForm()
    fireEvent.click(ui.add())
    expect(ui.chip('Base')).toHaveAttribute('data-status', 'missing')
    expect(ui.chip('Base')).toHaveTextContent('Base, Required')
    ui.setErrors({ 'id:2': true })
    expect(ui.chip('Base')).toHaveAttribute('data-status', 'complete')
    expect(ui.chip('Base')).toHaveTextContent('Base, Completed')
    expect(ui.chip('Sauce')).toHaveAttribute('data-status', 'missing')
  })
})

describe('the quantity messages beside the stepper', () => {
  const notes = (ui) => ui.container.querySelector('[data-doc-section="product-actions"] .price')

  beforeEach(() => {
    form.cart = { quantity: 2 }
    product.minimum_per_order = 3
    return () => { delete product.minimum_per_order }
  })

  it('with the price shown they stay by the quantity, not in the button', () => {
    const ui = renderForm(themed({ visibility: { 'product.add_price': true } }))
    expect(notes(ui)).toHaveTextContent('Minimum 3 to order')
    expect(ui.add()).not.toHaveTextContent('Minimum')
  })

  it('with the price hidden they are not shown, as before', () => {
    expect(notes(renderForm(themed({ visibility: { 'product.add_price': false } })))).toBeNull()
  })
})

it.each(['card', 'showcase', 'sheet', 'steps'])('M3: %s opens saved notes for reading when sold out', (layout) => {
  form.cart = { comment: 'No salt' }
  form.editMode = true
  const ui = renderWithProviders(<ProductForm isSoldOut />, { theme: themed({ base: { layout } }) })
  const note = ui.getByRole('button', { name: 'Additional instructions' })
  expect(note).toBeEnabled()
  fireEvent.click(note)
  const input = ui.getByRole('textbox', { name: 'Additional instructions' })
  expect(input).toHaveValue('No salt')
  expect(input).toHaveAttribute('readonly')
})

it('M5: a saved choice above the current max is not a missing required choice', () => {
  form.editMode = true
  form.cart = { options: { 'id:1': { suboptions: { 'id:11': { quantity: 1 }, 'id:12': { quantity: 1 } } } } }
  const base = product.extras[0].options.find(option => option.id === 1)
  base.max = 1
  try {
    const ui = renderForm(themed({ base: { layout: 'card', missing_choices: 'guide' } }))
    expect(ui.status()).toHaveTextContent(/^Still to choose: Sauce$/)
    expect(ui.add()).toHaveTextContent('Choose Sauce')
    ui.setErrors({ 'id:1': true })
    expect(ui.status()).toBeEmptyDOMElement()
    expect(ui.add()).toHaveTextContent('Update')
    fireEvent.click(ui.add())
    expect(ui.dialog.scrollTo).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toHaveAttribute('id', 'id_1')
  } finally {
    delete base.max
  }
})
