import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { SavedAddressChoices, SavedAddressItem } from '../index'

// implementation notesthe actions of a saved address are the design system's icon Button (md, ghost:
// neutral to edit, danger to delete) with the base Icon; the hidden room of an option is the same
// button, out of the accessibility tree.

const theme = themeWithValues()
const address = { id: 1, address: '123 Main St', tag: 'office' }
const actions = (onEdit = vi.fn(), onRemove = vi.fn()) => [
  { control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: onEdit },
  { control: 'address-delete', icon: 'trashFilled', label: 'Remove', danger: true, onClick: onRemove }
]
const look = (color) => componentVars(theme, 'button', { size: 'md', shape: 'icon', color, appearance: 'ghost' })
const varOf = (el, name) => el.style.getPropertyValue(name)

const renderItem = (props = {}) => renderWith(theme, (
  <ul><SavedAddressItem address={address} label='Office' {...props} /></ul>
))

describe('SavedAddressItem: actions are the base icon Button', () => {
  it('edit is neutral, delete is danger; named, typed, with a base Icon', () => {
    const { getByLabelText } = renderItem({ actions: actions() })
    ;[['Edit address', 'neutral', 'lucide-pencil'], ['Remove', 'danger', 'lucide-trash-2']].forEach(([name, color, glyph]) => {
      const button = getByLabelText(name)
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button.className).toContain('ui:w-(--ui-button-height)')
      expect(varOf(button, '--ui-button-color')).toBe(look(color)['--ui-button-color'])
      expect(varOf(button, '--ui-button-height')).toBe(look(color)['--ui-button-height'])
      expect(button.querySelector(`svg.${glyph}`)).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('a click does not reach the item; the handler runs', () => {
    const onSelect = vi.fn()
    const onEdit = vi.fn()
    const { getByLabelText } = renderItem({ onSelect, actions: actions(onEdit) })
    fireEvent.click(getByLabelText('Edit address'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('a disabled action is disabled on the piece and its box lets the pointer through to the item', () => {
    const list = actions()
    list[1].disabled = true
    const { getByLabelText } = renderItem({ actions: list })
    const remove = getByLabelText('Remove')
    expect(remove).toBeDisabled()
    expect(cssFor(remove.parentElement)).toContain('pointer-events:none')
    expect(cssFor(getByLabelText('Edit address').parentElement)).toContain('pointer-events:auto')
  })

  it('the room of an option is the same button, aria-hidden, out of the tab order, without a handler', () => {
    const onEdit = vi.fn()
    const { getByTestId } = renderItem({ selectable: true, addressId: 'line-1', 'data-testid': 'item', actions: actions(onEdit) })
    const room = [...getByTestId('item').querySelectorAll('button')]
    expect(room).toHaveLength(2)
    room.forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('aria-hidden', 'true')
      expect(button).toHaveAttribute('tabindex', '-1')
      expect(button).not.toHaveAttribute('data-doc-control')
    })
    expect(varOf(room[1], '--ui-button-color')).toBe(look('danger')['--ui-button-color'])
    fireEvent.click(room[0])
    expect(onEdit).not.toHaveBeenCalled()
  })
})

describe('SavedAddressChoices: the actions over the options', () => {
  it('each is the base Button, described by its address, in a box that answers the pointer', () => {
    const options = [address, { id: 2, address: '9 Elm Rd', tag: 'home' }].map((a) => ({
      key: a.id, address: a, actions: actions(), actionsProps: { 'data-testid': `actions-${a.id}` }
    }))
    const { getByTestId, getByRole } = renderWith(theme, <SavedAddressChoices aria-label='Saved' options={options} />)
    const edit = within(getByTestId('actions-2')).getByLabelText('Edit address')
    expect(edit).toHaveAttribute('data-slot', 'button')
    expect(edit).toHaveAccessibleDescription('9 Elm Rd')
    expect(cssFor(edit.parentElement)).toContain('pointer-events:auto')
    expect(within(getByRole('radiogroup')).queryAllByRole('button')).toHaveLength(0)
  })
})
