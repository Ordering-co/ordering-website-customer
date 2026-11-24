import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'

// implementation notes, layout `steps` (option B of the product modal): the groups are an
// accordion with one open at a time, each folded group says what was chosen, a
// required one completed with a tap opens the next, and the image folds into a
// compact bar. What `sheet` does is left to the other tests of this folder.

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
// The option is its own section (the id the form scrolls to) and its header, as the real one with `step`
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, step, error, children }) => (
    <div
      id={`id_${option.id}`}
      data-testid={`option-${option.id}`}
      data-open={step ? String(step.open) : undefined}
      data-summary={step?.summary}
      data-done={step ? String(!!step.done) : undefined}
      data-error={String(!!error)}
    >
      <button type='button' ref={step?.headerRef} aria-expanded={step ? step.open : undefined} onClick={step?.onToggle}>{option.name}</button>
      {children}
    </div>
  )
}))
// A tap on a sub-option: it changes the state and, when it completes the group, says so as the real one does
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({
  ProductOptionSubOption: ({ option, suboption, onChange, setIsScrollAvailable }) => (
    <button
      type='button'
      data-testid={`pick-${suboption.id}`}
      onClick={() => {
        onChange({ selected: true }, suboption, option)
        if (form.completes) setIsScrollAvailable(true)
      }}
    >
      {`pick ${suboption.name}`}
    </button>
  )
}))
vi.mock('~ui/src/components/ProductIngredient', () => ({
  ProductIngredient: ({ ingredient, state, onChange }) => (
    <button type='button' onClick={() => onChange({ selected: !state?.selected }, ingredient)}>{`toggle ${ingredient.name}`}</button>
  )
}))
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

const form = vi.hoisted(() => ({ errors: {}, editMode: false, cart: {}, completes: true, hiddenShown: false, onChange: null }))

const sub = (id, name, rank = 1) => ({ id, name, rank, enabled: true })
const product = {
  ...productFixture,
  ingredients: [{ id: 50, name: 'Onion' }, { id: 51, name: 'Pickles' }],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 2, rank: 2, name: 'Sauce', min: 1, max: 1, suboptions: [sub(21, 'Mayo'), sub(22, 'Ketchup', 2)] },
      { id: 1, rank: 1, name: 'Base', min: 1, max: 1, suboptions: [sub(11, 'Bun')] },
      { id: 4, rank: 4, name: 'Extras', min: 0, max: 3, allow_suboption_quantity: true, suboptions: [sub(41, 'Cheese'), sub(42, 'Bacon', 2)] },
      { id: 5, rank: 5, name: 'Pizza', min: 0, max: 2, with_half_option: true, suboptions: [sub(51, 'Pepperoni'), sub(52, 'Olives', 2)] },
      { id: 3, rank: 3, name: 'Side', min: 1, max: 1, respect_to: 11, suboptions: [sub(31, 'Fries')] }
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
      handleChangeSuboptionState={(...args) => form.onChange?.(...args)}
      handleChangeIngredientState={vi.fn()}
      isSoldOut={false}
      maxProductQuantity={5}
      showOption={(option) => option.id !== 3 || form.hiddenShown}
      {...rest}
      errors={form.errors}
      editMode={form.editMode}
      productCart={{ quantity: 1, total: 21, options: {}, ingredients: {}, ...form.cart }}
    />
  )
}))

const { ProductForm } = await import('../index')

const steps = (base = {}) => withModalBase(defaultTheme, { layout: 'steps', ...base })

// the scroll container is the dialog's body; its heights are the test's
const tree = (props) => (
  <div data-testid='dialog' style={{ overflowY: 'auto' }}>
    <ProductForm {...props} />
  </div>
)

const renderSteps = (theme = steps(), props = {}) => {
  const utils = renderWithProviders(tree(props), { theme })
  const dialog = utils.getByTestId('dialog')
  dialog.scrollTo = vi.fn()
  // the controller computes the errors again when the cart changes
  const update = (changes = {}) => act(() => {
    Object.assign(form, changes)
    utils.rerender(tree(props))
  })
  const group = (id) => utils.getByTestId(`option-${id}`)
  const open = () => ['1', '2', '3', '4'].filter(id => utils.queryByTestId(`option-${id}`)?.dataset.open === 'true')
  const header = (name) => utils.getByRole('button', { name })
  const add = () => utils.container.querySelector('[data-doc-control="add-product-to-cart"]')
  return { ...utils, dialog, update, group, open, header, add }
}

beforeEach(() => {
  form.errors = { 'id:1': true, 'id:2': true }
  form.editMode = false
  form.cart = {}
  form.completes = true
  form.hiddenShown = false
  form.onChange = null
})

describe('steps: one group open at a time', () => {
  it('opens the first required group still to choose, folded the rest', () => {
    const ui = renderSteps()
    expect(ui.open()).toEqual(['1'])
    expect(ui.header('Base')).toHaveAttribute('aria-expanded', 'true')
    expect(ui.header('Sauce')).toHaveAttribute('aria-expanded', 'false')
  })

  it('opening a group folds the one that was open; pressing the open one folds it', () => {
    const ui = renderSteps()
    fireEvent.click(ui.header('Sauce'))
    expect(ui.open()).toEqual(['2'])
    fireEvent.click(ui.header('Extras'))
    expect(ui.open()).toEqual(['4'])
    fireEvent.click(ui.header('Extras'))
    expect(ui.open()).toEqual([])
  })

  it('the ingredients and the instructions are groups of the same accordion, after the options', () => {
    const ui = renderSteps()
    const names = Array.from(ui.container.querySelectorAll('button[aria-expanded]')).map(button => button.textContent)
    expect(names).toEqual(['Base', 'Sauce', 'Extras', 'Pizza', 'Ingredients', 'Additional instructions'])
    fireEvent.click(ui.header('Ingredients'))
    expect(ui.open()).toEqual([])
    expect(ui.header('Ingredients')).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(ui.header('Additional instructions'))
    expect(ui.header('Ingredients')).toHaveAttribute('aria-expanded', 'false')
    expect(ui.header('Additional instructions')).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the markers of the form: layout, ids of the groups, the ingredients and the instructions', () => {
    const ui = renderSteps()
    expect(ui.container.querySelector('[data-doc-section="product-customization"]')).toHaveAttribute('data-doc-layout', 'steps')
    expect(ui.container.querySelector('#id_1')).toBeInTheDocument()
    expect(ui.container.querySelector('#ingredients[data-doc-section="product-ingredients"]')).toBeInTheDocument()
    expect(ui.container.querySelector('[data-doc-section="product-instructions"]')).toBeInTheDocument()
  })

  it('without the chips of the navigation: the groups are the navigation', () => {
    const ui = renderSteps()
    expect(ui.queryByRole('navigation', { name: 'Product options' })).toBeNull()
  })

  it('a change keeps the group open the customer is in, even if it is no longer the first to choose', () => {
    form.completes = false
    const ui = renderSteps()
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: { 'id:2': true } })
    expect(ui.open()).toEqual(['1'])
  })
})

describe('steps: what a folded group says', () => {
  it('the sub-options chosen, in order, with the quantity when there is one; its state', () => {
    form.errors = { 'id:2': true }
    form.cart = {
      options: {
        'id:1': { suboptions: { 'id:11': { selected: true, quantity: 1 } } },
        'id:4': { suboptions: { 'id:42': { selected: true, quantity: 2 }, 'id:41': { selected: true, quantity: 1 } } }
      }
    }
    const ui = renderSteps()
    expect(ui.group(1)).toHaveAttribute('data-summary', 'Bun')
    expect(ui.group(1)).toHaveAttribute('data-done', 'true')
    expect(ui.group(2)).toHaveAttribute('data-done', 'false')
    expect(ui.group(4)).toHaveAttribute('data-summary', 'Cheese, Bacon ×2')
  })

  it('a pizza says which half each topping is on', () => {
    form.errors = {}
    form.cart = {
      options: {
        'id:5': { suboptions: { 'id:51': { selected: true, quantity: 1, position: 'left' }, 'id:52': { selected: true, quantity: 1, position: 'whole' } } }
      }
    }
    const ui = renderSteps()
    expect(ui.getByTestId('option-5')).toHaveAttribute('data-summary', 'Pepperoni (Left half), Olives (Whole)')
    form.cart = { options: { 'id:5': { suboptions: { 'id:51': { selected: true, quantity: 1, position: 'right' } } } } }
    ui.update()
    expect(ui.getByTestId('option-5')).toHaveAttribute('data-summary', 'Pepperoni (Right half)')
  })

  it('the ingredients taken out and the note', () => {
    form.errors = {}
    form.cart = { ingredients: { 'id:50': { selected: false }, 'id:51': { selected: true } }, comment: 'no salt' }
    const ui = renderSteps()
    expect(ui.getByText('Without Onion')).toBeInTheDocument()
    expect(ui.getByText('Note added')).toBeInTheDocument()
  })

  it('editing from the cart: everything done is folded, each with its summary', () => {
    form.editMode = true
    form.errors = {}
    form.cart = { options: { 'id:1': { suboptions: { 'id:11': { selected: true, quantity: 1 } } }, 'id:2': { suboptions: { 'id:22': { selected: true, quantity: 1 } } } } }
    const ui = renderSteps()
    expect(ui.open()).toEqual([])
    expect(ui.group(1)).toHaveAttribute('data-summary', 'Bun')
    expect(ui.group(2)).toHaveAttribute('data-summary', 'Ketchup')
    expect(ui.add()).toHaveTextContent('Update')
  })
})

describe('steps: auto-advance', () => {
  it('a required group completed with a tap folds and the next required one opens, with the focus on its header', async () => {
    const ui = renderSteps()
    fireEvent.click(ui.getByTestId('pick-11'))
    // the controller's errors follow the tap
    ui.update({ errors: { 'id:2': true } })
    expect(ui.open()).toEqual(['2'])
    await waitFor(() => expect(ui.header('Sauce')).toHaveFocus())
  })

  it('does not advance when the tap does not complete the group (it did not reach its limit)', () => {
    form.completes = false
    const ui = renderSteps()
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: { 'id:2': true } })
    expect(ui.open()).toEqual(['1'])
  })

  it('does not advance while the group still has its error', () => {
    const ui = renderSteps()
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: { 'id:1': true, 'id:2': true } })
    expect(ui.open()).toEqual(['1'])
  })

  it('an optional group reaching its limit stays open', () => {
    form.errors = {}
    const ui = renderSteps()
    fireEvent.click(ui.header('Extras'))
    fireEvent.click(ui.getByTestId('pick-41'))
    ui.update({ errors: {} })
    expect(ui.open()).toEqual(['4'])
  })

  it('with nothing left to choose all fold and the focus stays on the group just done', async () => {
    form.errors = { 'id:1': true }
    const ui = renderSteps()
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: {} })
    expect(ui.open()).toEqual([])
    await waitFor(() => expect(ui.header('Base')).toHaveFocus())
  })

  it('goes to the next required one after it, then to one before it', () => {
    form.errors = { 'id:1': true, 'id:2': true }
    const ui = renderSteps()
    fireEvent.click(ui.header('Sauce'))
    fireEvent.click(ui.getByTestId('pick-21'))
    // Sauce done: the next required pending is Base, before it
    ui.update({ errors: { 'id:1': true } })
    expect(ui.open()).toEqual(['1'])
  })

  it('a group that appears because of a choice (respect_to) is the next one to choose', () => {
    form.errors = { 'id:1': true }
    const ui = renderSteps()
    expect(ui.queryByTestId('option-3')).toBeNull()
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ hiddenShown: true, errors: { 'id:3': true } })
    expect(ui.open()).toEqual(['3'])
  })

  it('brings the group into view under the compact bar when it is out of view', async () => {
    const ui = renderSteps()
    const group = ui.group(2)
    group.getBoundingClientRect = () => ({ top: -40, bottom: 60, height: 100 })
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: { 'id:2': true } })
    await waitFor(() => expect(ui.dialog.scrollTo).toHaveBeenCalledTimes(1))
  })

  it('with reduced motion the scroll is not smooth', async () => {
    const original = window.matchMedia
    window.matchMedia = (query) => ({ matches: query.includes('reduce'), addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })
    try {
      const ui = renderSteps()
      ui.group(2).getBoundingClientRect = () => ({ top: -40, bottom: 60, height: 100 })
      fireEvent.click(ui.getByTestId('pick-11'))
      ui.update({ errors: { 'id:2': true } })
      await waitFor(() => expect(ui.dialog.scrollTo).toHaveBeenCalledTimes(1))
      expect(ui.dialog.scrollTo.mock.calls[0][0].behavior).toBe('auto')
    } finally {
      window.matchMedia = original
    }
  })
})

describe('steps: missing_choices', () => {
  it('jump: the button says Add to cart; a click opens the first group missing, with its error shown', async () => {
    const ui = renderSteps()
    fireEvent.click(ui.header('Extras'))
    expect(ui.open()).toEqual(['4'])
    expect(ui.add()).toHaveTextContent('Add to cart')
    fireEvent.click(ui.add())
    expect(ui.open()).toEqual(['1'])
    expect(ui.group(1)).toHaveAttribute('data-error', 'true')
    await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'id_1'))
    expect(ui.dialog.scrollTo).toHaveBeenCalled()
    expect(ui.container.querySelector('[data-doc-section="product-missing-choices"]')).toHaveTextContent('Still to choose: Base and 1 more')
  })

  it('guide: the button says Choose <group> and a click opens that group', async () => {
    const ui = renderSteps(steps({ missing_choices: 'guide' }))
    expect(ui.add()).toHaveTextContent('Choose Base')
    fireEvent.click(ui.header('Sauce'))
    expect(ui.open()).toEqual(['2'])
    fireEvent.click(ui.add())
    expect(ui.open()).toEqual(['1'])
    await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'id_1'))
    ui.update({ errors: { 'id:2': true } })
    expect(ui.add()).toHaveTextContent('Choose Sauce')
  })

  it('nothing missing: a click adds and no group is opened', async () => {
    form.errors = {}
    const ui = renderSteps()
    await act(async () => { fireEvent.click(ui.add()) })
    expect(ui.dialog.scrollTo).not.toHaveBeenCalled()
  })
})

describe('steps: the store closed or the product sold out', () => {
  it('everything starts folded and the groups can be opened to read them', () => {
    const ui = renderSteps(steps(), { schedulePending: true })
    expect(ui.open()).toEqual([])
    fireEvent.click(ui.header('Base'))
    expect(ui.open()).toEqual(['1'])
    fireEvent.click(ui.header('Sauce'))
    expect(ui.open()).toEqual(['2'])
  })
})

describe('steps: the compact bar', () => {
  const sized = (ui, { image = 200, bar = 60 } = {}) => {
    const barElement = ui.container.querySelector('[data-doc-section="product-steps-bar"]')
    const imageElement = ui.getByTestId('swiper').parentElement.parentElement
    Object.defineProperty(barElement, 'offsetHeight', { configurable: true, value: bar })
    Object.defineProperty(imageElement, 'offsetHeight', { configurable: true, value: image })
    return barElement
  }
  const scrollTo = (ui, top) => act(() => {
    ui.dialog.scrollTop = top
    fireEvent.scroll(ui.dialog)
  })

  it('over the image it is transparent; once the image has gone by it is the compact bar with the name and the price', () => {
    const ui = renderSteps()
    const bar = sized(ui)
    expect(bar).toHaveAttribute('data-compact', 'false')
    expect(bar).toHaveAttribute('data-sticky-top')
    scrollTo(ui, 100)
    expect(bar).toHaveAttribute('data-compact', 'false')
    scrollTo(ui, 140)
    expect(bar).toHaveAttribute('data-compact', 'true')
    expect(within(bar).getByText('Burger')).toBeInTheDocument()
    expect(within(bar).getByText('$9.5')).toBeInTheDocument()
    scrollTo(ui, 0)
    expect(bar).toHaveAttribute('data-compact', 'false')
  })

  it('the favorite is also in the bar once compact (the one of the image stays)', () => {
    const ui = renderSteps()
    const bar = sized(ui)
    expect(within(bar).queryByRole('button', { name: /favorite/i })).toBeNull()
    scrollTo(ui, 150)
    expect(within(bar).getByRole('button', { name: /favorite/i })).toBeInTheDocument()
    expect(ui.getAllByRole('button', { name: /favorite/i })).toHaveLength(2)
  })

  it('one favorite at a time for the keyboard and assistive technology: the one in sight', () => {
    const ui = renderSteps()
    const bar = sized(ui)
    const favorites = () => ui.getAllByRole('button', { name: /favorite/i })
    expect(favorites()).toHaveLength(1)
    expect(favorites()[0]).not.toHaveAttribute('inert')
    scrollTo(ui, 150)
    const [inBar, image] = favorites()
    expect(bar).toContainElement(inBar)
    expect(inBar).not.toHaveAttribute('inert')
    expect(image).toHaveAttribute('inert')
    // both say the same state
    expect(image).toHaveAttribute('aria-pressed', 'false')
    expect(inBar).toHaveAttribute('aria-pressed', 'false')
    expect(inBar.querySelector('svg')).toBeInTheDocument()
    scrollTo(ui, 0)
    expect(favorites()).toHaveLength(1)
    expect(favorites()[0]).not.toHaveAttribute('inert')
  })

  it('without a favorite in the theme the bar has none', () => {
    const theme = withModalBase(themeWithValues((values) => Object.assign(values.visibility, { 'product.favorite': false }) && values), { layout: 'steps' })
    const ui = renderSteps(theme)
    const bar = sized(ui)
    scrollTo(ui, 150)
    expect(within(bar).queryByRole('button', { name: /favorite/i })).toBeNull()
  })

  it('the sheet layout has no such bar', () => {
    const ui = renderSteps(withModalBase(defaultTheme, { layout: 'sheet' }))
    expect(ui.container.querySelector('[data-doc-section="product-steps-bar"]')).toBeNull()
  })
})

describe('the sheet layout does not change', () => {
  it('its groups fold by themselves (no step), keep the navigation chips and the ingredients first', () => {
    const ui = renderSteps(withModalBase(defaultTheme, { layout: 'sheet' }))
    expect(ui.group(1)).not.toHaveAttribute('data-open')
    expect(ui.getByRole('navigation', { name: 'Product options' })).toBeInTheDocument()
    expect(ui.queryByRole('button', { name: 'toggle Onion' })).toBeInTheDocument()
    expect(ui.container.querySelector('[data-doc-section="product-step"]')).toBeNull()
    const ingredients = ui.container.querySelector('#ingredients')
    const options = ui.container.querySelector('[data-doc-section="product-options"]')
    expect(ingredients.compareDocumentPosition(options) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a tap that completes a group does not fold it', () => {
    const ui = renderSteps(withModalBase(defaultTheme, { layout: 'sheet' }))
    fireEvent.click(ui.getByTestId('pick-11'))
    ui.update({ errors: { 'id:2': true } })
    expect(ui.group(1)).not.toHaveAttribute('data-open')
  })
})
