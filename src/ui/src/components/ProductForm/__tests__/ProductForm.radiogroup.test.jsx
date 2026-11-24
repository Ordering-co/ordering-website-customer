import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'

// implementation notesa single-choice option is one radiogroup, named by the option, in both layouts;
// the multiple choices have none. Real option and sub-option rows; the controllers are the test's.

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

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
// The option passes its props through
vi.mock('~components/components/ProductOption', () => ({
  ProductOption: ({ UIComponent, ...rest }) => <UIComponent {...rest} />
}))
// The row's controller: its state is the cart's, a choice calls the form's handler
vi.mock('~components/components/ProductOptionSuboption', () => ({
  ProductOptionSuboption: ({ UIComponent, ...rest }) => {
    const { option, suboption, productCart, onChange } = rest
    const state = productCart.options[`id:${option.id}`]?.suboptions[`id:${suboption.id}`] || { selected: false, quantity: 0, position: 'whole' }
    return (
      <UIComponent
        {...rest}
        state={state}
        balance={0}
        toggleSelect={() => onChange({ selected: !state.selected, quantity: 1, position: 'whole' }, suboption, option)}
        increment={vi.fn()}
        decrement={vi.fn()}
        changePosition={vi.fn()}
        setIsScrollAvailable={vi.fn()}
      />
    )
  }
}))

const sub = (id, name, rank) => ({ id, name, rank, enabled: true })
const product = {
  ...productFixture,
  ingredients: [],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 1, rank: 1, name: 'Size', min: 1, max: 1, suboptions: [sub(11, 'Small', 1), sub(12, 'Large', 2)] },
      { id: 2, rank: 2, name: 'Toppings', min: 0, max: 3, suboptions: [sub(21, 'Cheese', 1), sub(22, 'Bacon', 2)] }
    ]
  }]
}

// the controller: the choices live here, the errors follow them
vi.mock('~components/components/ProductForm', async () => {
  const React = await import('react')
  return {
    ProductForm: ({ UIComponent, ...rest }) => {
      const [picked, setPicked] = React.useState({})
      const handleChangeSuboptionState = (state, suboption, option) => setPicked((current) => {
        const next = { ...current }
        if (state.selected) next[option.id] = [...(option.max === 1 ? [] : next[option.id] || []), suboption.id]
        else next[option.id] = (next[option.id] || []).filter((id) => id !== suboption.id)
        return next
      })
      const options = {}
      Object.entries(picked).forEach(([optionId, ids]) => {
        options[`id:${optionId}`] = { suboptions: Object.fromEntries(ids.map((id) => [`id:${id}`, { id, selected: true, quantity: 1, position: 'whole' }])) }
      })
      return (
        <UIComponent
          productObject={{ product, loading: false, error: null }}
          business={{ id: 1, name: 'Store' }}
          handleSave={vi.fn()}
          increment={vi.fn()}
          decrement={vi.fn()}
          handleChangeSuboptionState={handleChangeSuboptionState}
          handleChangeIngredientState={vi.fn()}
          isSoldOut={false}
          maxProductQuantity={5}
          showOption={() => true}
          {...rest}
          errors={(picked[1] || []).length ? {} : { 'id:1': true }}
          productCart={{ quantity: 1, total: 21, options, ingredients: {} }}
        />
      )
    }
  }
})

const { ProductForm } = await import('../index')

const render = (layout) => renderWithProviders(
  <div style={{ overflowY: 'auto' }}><ProductForm /></div>,
  { theme: layout === 'steps' ? withModalBase(defaultTheme, { layout: 'steps' }) : defaultTheme }
)

describe.each(['sheet', 'steps'])('single choice as one radiogroup (%s)', (layout) => {
  it('one radiogroup, named by the option, with its rows; the multiple choice has none', () => {
    const ui = render(layout)
    expect(ui.getAllByRole('radiogroup')).toHaveLength(1)
    const group = ui.getByRole('radiogroup', { name: 'Size' })
    expect(group).toHaveAttribute('data-slot', 'radio-group')
    ui.getAllByRole('radio').forEach((radio) => expect(group).toContainElement(radio))
    expect(ui.getAllByRole('radio')).toHaveLength(2)
    // the group is the option's own box of rows, with its error marker
    expect(group).toHaveClass('error')
  })

  it('choosing another row unselects the one before, as it always did', () => {
    const ui = render(layout)
    fireEvent.click(ui.getByRole('radio', { name: /Small/ }))
    expect(ui.getByRole('radio', { name: /Small/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(ui.getByRole('radio', { name: /Large/ }))
    expect(ui.getByRole('radio', { name: /Large/ })).toHaveAttribute('aria-checked', 'true')
    expect(ui.getByRole('radio', { name: /Small/ })).toHaveAttribute('aria-checked', 'false')
    expect(ui.getByRole('radiogroup', { name: 'Size' })).not.toHaveClass('error')
  })

  it('the arrows move between the rows of the group and a change on the next one chooses it', async () => {
    const ui = render(layout)
    fireEvent.click(ui.getByRole('radio', { name: /Small/ }))
    ui.getByRole('radio', { name: /Small/ }).focus()
    await act(async () => { fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' }) })
    expect(ui.getByRole('radio', { name: /Large/ })).toHaveFocus()
    // what an arrow does in a browser: a click on the radio's hidden input
    fireEvent.click(ui.container.querySelectorAll('input[type="radio"]')[1])
    expect(ui.getByRole('radio', { name: /Large/ })).toHaveAttribute('aria-checked', 'true')
    expect(ui.getByRole('radio', { name: /Small/ })).toHaveAttribute('aria-checked', 'false')
  })
})
