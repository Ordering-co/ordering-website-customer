import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { ProfessionalBusinessFilter } from '../index'

// implementation notesthe Min / Max price fields are the design system's Input and the sort, in the
// same row, its Select.

vi.mock('~ui/src/components/SearchBar', () => ({ SearchBar: () => <input data-testid='search' /> }))

describe('ProfessionalBusinessFilter: Min and Max are the base Input', () => {
  it('each is named by its label, takes components.input and reports its digits', () => {
    const theme = themeWithValues()
    const onChange = vi.fn()
    const { getByLabelText } = renderWithProviders(
      <ProfessionalBusinessFilter business={{}} sortByOptions={[]} handleChangeSearch={vi.fn()} handleChangePriceFilterValues={onChange} priceFilterValues={{ min: '2', max: '' }} />,
      { theme }
    )
    const look = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
    ;[['Min.', 'professional-price-min', 'min'], ['Max.', 'professional-price-max', 'max']].forEach(([label, id, key]) => {
      const field = getByLabelText(label)
      expect(field).toHaveAttribute('data-slot', 'input')
      expect(field).toHaveAttribute('id', id)
      expect(field.style.getPropertyValue('--ui-input-height')).toBe(look['--ui-input-height'])
      fireEvent.change(field, { target: { value: '15' } })
      expect(onChange).toHaveBeenLastCalledWith(key, '15')
    })
    expect(getByLabelText('Min.')).toHaveValue('2')
  })

  it('the price field widens from 500 px in characters (11ch), not in px', () => {
    const { getByLabelText } = renderWithProviders(
      <ProfessionalBusinessFilter business={{}} sortByOptions={[]} handleChangeSearch={vi.fn()} handleChangePriceFilterValues={vi.fn()} priceFilterValues={{}} />
    )
    // the slot of the field is sized, never the input of the base Input
    // (past the field's own wrapper, the touch strip of the base Input)
    const slot = getByLabelText('Min.').closest('[data-slot=input-touch]').parentElement
    const css = cssFor(slot).replace(/\s/g, '')
    expect(css).toMatch(/@media\(min-width:500px\)\{[^}]*width:11ch/)
    expect(css).not.toMatch(/input\{/)
    expect(cssFor(slot.parentElement).replace(/\s/g, '')).not.toMatch(/input\{/)
  })

  it('a key that is not a digit or a point does not type', () => {
    const { getByLabelText } = renderWithProviders(
      <ProfessionalBusinessFilter business={{}} sortByOptions={[]} handleChangeSearch={vi.fn()} handleChangePriceFilterValues={vi.fn()} priceFilterValues={{}} />
    )
    const field = getByLabelText('Min.')
    expect(fireEvent.keyPress(field, { key: 'a', code: 'KeyA', charCode: 97 })).toBe(false)
    expect(fireEvent.keyPress(field, { key: '5', code: 'Digit5', charCode: 53 })).toBe(true)
  })

  // (jsdom has no PointerEvent: a mouse event that carries the pointer's fields, as Select.test does)
  class FakePointerEvent extends MouseEvent {
    constructor (type, init = {}) {
      super(type, init)
      this.pointerType = init.pointerType
    }
  }
  beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
  afterEach(() => vi.unstubAllGlobals())

  it('the sort is the base Select: named, showing the chosen option, and it reports a new one', async () => {
    const theme = themeWithValues()
    const onSort = vi.fn()
    renderWithProviders(
      <ProfessionalBusinessFilter business={{}} sortByValue='rank' sortByOptions={[{ value: 'rank', content: 'Rank' }, { value: 'price', content: 'Price' }]} handleChangeSortBy={onSort} handleChangeSearch={vi.fn()} handleChangePriceFilterValues={vi.fn()} priceFilterValues={{}} />,
      { theme }
    )
    const sort = screen.getByRole('combobox')
    expect(sort).toHaveAttribute('data-slot', 'select-trigger')
    expect(sort).toHaveAccessibleName('Sort By')
    expect(sort).toHaveTextContent('Rank')
    expect(sort.style.getPropertyValue('--ui-input-height')).toBe(componentVars(theme, 'input', { variant: 'default', radius: 'md' })['--ui-input-height'])
    sort.focus()
    fireEvent.keyDown(sort, { key: 'ArrowDown' })
    await screen.findByRole('listbox')
    await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Price' }).hasAttribute('data-highlighted')).toBe(true))
    fireEvent.keyDown(document.activeElement, { key: 'Enter' })
    await waitFor(() => expect(onSort).toHaveBeenCalledWith('price'))
  })
})
