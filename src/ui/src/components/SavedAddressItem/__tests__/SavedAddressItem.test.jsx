import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '../../../design-system/lib/componentVars'
import { SavedAddressChoices, SavedAddressItem } from '../index'
import { ADDRESS_ITEM_GAP } from '../styles'
import { ADDRESS_TAG_ICONS, addressTagIcon } from '../tags'
import { Icon } from '~ui/src/design-system/components/Icon'

// The rules of the styled-components classes of an element (the Choice card adds Tailwind classes after them)
const cssFor = (el) => {
  const classes = el.className.split(' ').filter(Boolean)
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}`))).join('}')
}
const SM = '6px'
const LG = '17px'

// The tag's icon and the actions' are the base Icon (a real svg); the actions are the base Button
const tagIcon = (container) => container.querySelector('span[aria-hidden="true"]:not([data-slot]) > svg')
const glyphOf = (name) => renderWith(themeWithValues(), <Icon name={name} />).container.querySelector('svg').innerHTML

const theme = (mutate = () => {}) => themeWithValues((values) => {
  values.components.card.base = {
    ...values.components.card.base,
    background: '#FAFAFA',
    border: { width: 2, color: '#123456', style: 'dashed' },
    radius: 14,
    shadow: { x: 3, y: 3, blur: 0, spread: 0, color: '#000000', opacity: 1 }
  }
  const choice = values.components.choice
  choice.base.background = '#FFFFFF'
  choice.base.border = null
  choice.base.radius = 8
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  values.tokens.icon = { ...values.tokens.icon, md: 22 }
  values.tokens.space = { ...values.tokens.space, sm: 6, md: 11, lg: 17 }
  values.tokens.color.primary = '#AA0011'
  values.tokens.color.primary_text = '#990010'
  values.tokens.color.text_muted = '#777777'
  mutate(values)
  return values
})

const address = { id: 1, address: '123 Main St', tag: 'office' }
const buttonStyle = (el) => el.getAttribute('style')
const buttonVar = (el, name) => el.style.getPropertyValue(name)

const renderItem = (props = {}, t = theme()) => renderWith(t, (
  <ul>
    <SavedAddressItem
      data-testid='item'
      data-doc-control='address-item'
      address={address}
      label='Office'
      {...props}
    />
  </ul>
))

describe('SavedAddressItem', () => {
  it('as a card: components.card (its box and font role)', () => {
    const { getByTestId } = renderItem()
    const item = getByTestId('item')
    expect(item.tagName).toBe('LI')
    expect(item).toHaveAttribute('data-doc-control', 'address-item')
    expect(item.querySelector('[role="radio"]')).toBeNull()
    const css = cssFor(item)
    expect(css).toContain('background:#FAFAFA')
    expect(css).toContain('border:2px dashed #123456')
    expect(css).toContain('border-radius:14px')
    expect(css).toContain('box-shadow:3px 3px 0px 0px')
    expect(css).toContain(`margin:0 0 ${ADDRESS_ITEM_GAP}px`)
    // not a choice: none of its selected state
    expect(css).not.toContain('#FFEBE0')
  })

  it('the address wraps to 2 lines before it is cut, never on one line with "…"; its text is the title', () => {
    const long = { id: 2, address: '1234 Some Very Long Street Name, Apartment 56B, Building C' }
    const { getByText } = renderItem({ address: long, label: 'Home', details: 'Ring the bell twice, leave at the door' })
    const line = getByText(long.address)
    expect(line.getAttribute('title')).toBe(long.address)
    const lineCss = cssFor(line).replace(/\s+/g, '')
    expect(lineCss).toMatch(/-webkit-line-clamp:2;/)
    expect(lineCss).not.toMatch(/white-space:nowrap/)
    const note = getByText('Ring the bell twice, leave at the door')
    expect(note.getAttribute('title')).toBe('Ring the bell twice, leave at the door')
  })

  // The same address in both: the size of a choice list's option (its
  // padding, gap, md height), the choice's text, the theme's icon and button
  // (the base Button's variables, in the element's style)
  // (an option's buttons are the room of its actions, hidden: the same ones)
  const sizeOf = (getByTestId, getByText) => {
    const item = getByTestId('item')
    const tag = tagIcon(item).parentElement
    return {
      item: cssFor(item),
      main: cssFor(tag.parentElement),
      tag: cssFor(tag),
      line: cssFor(getByText('123 Main St')),
      note: cssFor(getByText('Office')),
      action: buttonStyle(item.querySelector('button'))
    }
  }
  const sizeTheme = () => theme((values) => {
    values.components.choice.base.text = { size: 15, line: 1.47, weight: 400 }
    values.components.choice.sizes.md.height = 44
  })
  const actions = [{ control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: vi.fn() }]

  it('in a picker and in the profile the item has the same size: a choice option\'s padding, gap and height', () => {
    const t = sizeTheme()
    const mdIcon = componentVars(t, 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' })
    const card = renderItem({ actions }, t)
    const cardSize = sizeOf(card.getByTestId, card.getByText)
    card.unmount()
    const pick = renderItem({ actions, selectable: true, onSelect: vi.fn() }, t)
    const choiceSize = sizeOf(pick.getByTestId, pick.getByText)

    // the card spells the choice's size out; the option is the Choice card, which takes it from components.choice
    expect(cardSize.item).toContain(`padding:${SM} ${LG}`)
    expect(cardSize.item).toContain('min-height:44px')
    expect(pick.getByTestId('item')).toHaveAttribute('data-slot', 'choice')
    expect(pick.getByTestId('item').style.getPropertyValue('--ui-choice-height')).toBe('44px')
    expect(pick.getByTestId('item').className).toContain('ui:px-lg')
    ;[cardSize, choiceSize].forEach((size) => {
      // the space inside an option (radio / icon to label), not the space between options
      expect(size.item).toContain(`gap:${SM}`)
      expect(size.main).toContain(`gap:${SM}`)
      expect(size.tag).toContain('width:22px;height:22px')
      // the address in the choice's text, its weight bold
      expect(size.line).toContain('font-size:15px;line-height:1.47;font-weight:600')
      expect(size.note).toContain('font-size:14px;line-height:1.71')
      // the button's md icon shape
      expect(size.action).toContain(`--ui-button-height: ${mdIcon['--ui-button-height']}`)
      expect(size.action).toContain(`--ui-button-icon-size: ${mdIcon['--ui-button-icon-size']}`)
    })
    // the parts are the same (only the box's look differs)
    expect(cardSize.main).toBe(choiceSize.main)
    expect(cardSize.tag).toBe(choiceSize.tag)
    expect(cardSize.line).toBe(choiceSize.line)
    expect(cardSize.note).toBe(choiceSize.note)
    expect(cardSize.action).toBe(choiceSize.action)
  })

  it('a card without a border keeps the room of the choice\'s border (transparent); with one, its own', () => {
    const noBorder = theme((values) => {
      values.components.card.base.border = null
      values.components.choice.variants.default.states.selected.border.width = 2
    })
    const { getByTestId, unmount } = renderItem({}, noBorder)
    const css = cssFor(getByTestId('item'))
    expect(css).toContain('border:2px solid transparent')
    expect(css.lastIndexOf('border:2px solid transparent')).toBeGreaterThan(css.lastIndexOf('border:none'))
    unmount()
    // the card's own border stays (the test theme's dashed one)
    const own = renderItem()
    expect(cssFor(own.getByTestId('item'))).not.toContain('transparent')
  })

  it('the items are 15px apart (the user\'s value, not the theme\'s md or lg), as an option or a card', () => {
    expect(ADDRESS_ITEM_GAP).toBe(15)
    ;[{}, { selectable: true, onSelect: vi.fn() }].forEach((props) => {
      const { getByTestId, unmount } = renderItem(props)
      const css = cssFor(getByTestId('item'))
      expect(css).toContain('margin:0 0 15px')
      // nothing of the theme's spaces (md 11, lg 17) on the item
      expect(css).not.toMatch(/margin(-bottom)?:[^;]*(11|17)px/)
      unmount()
    })
  })

  it('as an option, the item is presentational (its radio belongs to the list\'s radiogroup); a card stays a list item', () => {
    const option = renderItem({ selectable: true, onSelect: vi.fn() })
    expect(option.getByTestId('item')).toHaveAttribute('role', 'none')
    option.unmount()
    expect(renderItem().getByTestId('item')).not.toHaveAttribute('role')
  })

  it('an option without onSelect (the profile\'s default address) keeps the arrow over the choice\'s pointer', () => {
    const { getByTestId } = renderItem({ selectable: true, selected: true })
    expect(cssFor(getByTestId('item'))).toContain('cursor:default')
    expect(getByTestId('item').className).toContain('ui:cursor-default')
    expect(getByTestId('item').onclick).toBeFalsy()
  })

  it('in a picker: an option of a single choice list, its radio checked when selected', () => {
    const { getByTestId, getByRole } = renderItem({ selectable: true, selected: true, onSelect: vi.fn() })
    // the Choice card paints it from components.choice: its selected state, border and radius
    const item = getByTestId('item')
    expect(item).toHaveAttribute('data-checked')
    expect(item.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(item.style.getPropertyValue('--ui-choice-chosen-border')).toBe('1px solid #FF5500')
    expect(item.style.getPropertyValue('--ui-choice-radius')).toBe('8px')
    const radio = getByRole('radio')
    expect(radio).toHaveAttribute('aria-checked', 'true')
    expect(radio).toHaveTextContent('123 Main St')
    // the theme's indicator, checked
    expect(radio.querySelector('[data-slot="choice-indicator"][data-checked]')).not.toBeNull()
  })

  it('an option not selected: its resting box, the radio off', () => {
    const { getByTestId, getByRole } = renderItem({ selectable: true, selected: false, onSelect: vi.fn() })
    expect(getByTestId('item')).not.toHaveAttribute('data-checked')
    expect(getByRole('radio')).toHaveAttribute('aria-checked', 'false')
    expect(getByRole('radio').querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(getByRole('radio').querySelector('[data-slot="choice-indicator"][data-checked]')).toBeNull()
  })

  it('without the theme\'s indicator the option shows none', () => {
    const noIndicator = theme((values) => { values.components.choice.base.show_indicator = false })
    const { getByRole } = renderItem({ selectable: true, selected: true }, noIndicator)
    expect(getByRole('radio').querySelector('[data-slot="choice-indicator"]')).toBeNull()
  })

  it('the icon of each tag is the address form\'s, in the primary as text (primary_text), of the theme\'s md icon size', () => {
    Object.entries(ADDRESS_TAG_ICONS).forEach(([tag, icon]) => {
      const { container, unmount } = renderItem({ address: { ...address, tag } })
      expect(tagIcon(container).innerHTML).toBe(glyphOf(icon))
      unmount()
    })
    const { container } = renderItem()
    const box = tagIcon(container).parentElement
    expect(box).toHaveAttribute('aria-hidden', 'true')
    const css = cssFor(box)
    expect(css).toContain('color:#990010')
    expect(css).toContain('width:22px;height:22px')
  })

  it('address.icons hidden (no tag selector in the form): no tag icon', () => {
    const t = theme((values) => { values.visibility = { ...values.visibility, 'address.icons': false } })
    const { container, getByText } = renderItem({}, t)
    expect(tagIcon(container)).toBeNull()
    expect(getByText('123 Main St')).toBeInTheDocument()
  })

  it('an address without a tag (or with one the form lacks) takes the "other" icon', () => {
    expect(addressTagIcon(undefined)).toBe(ADDRESS_TAG_ICONS.other)
    expect(addressTagIcon('beach')).toBe(ADDRESS_TAG_ICONS.other)
    expect(addressTagIcon('favorite')).toBe(ADDRESS_TAG_ICONS.other)
    const { container } = renderItem({ address: { id: 2, address: 'No tag' } })
    expect(tagIcon(container).innerHTML).toBe(glyphOf(ADDRESS_TAG_ICONS.other))
  })

  it('the address, then its label and details, secondary text', () => {
    const { getByText } = renderItem({ details: '4B 10001' })
    const lines = [...getByText('123 Main St').parentElement.children].map((el) => el.textContent)
    expect(lines).toEqual(['123 Main St', 'Office', '4B 10001'])
    expect(cssFor(getByText('Office'))).toContain('color:#777777')
    expect(cssFor(getByText('123 Main St'))).toContain('font-weight:600')
  })

  it('no details line when there are none', () => {
    const { getByText } = renderItem({ details: '' })
    expect(getByText('123 Main St').parentElement.children).toHaveLength(2)
  })

  it('the click (and Enter / Space on the radio) picks the address', () => {
    const onSelect = vi.fn()
    const { getByTestId, getByRole } = renderItem({ selectable: true, onSelect })
    fireEvent.click(getByTestId('item'))
    fireEvent.keyDown(getByRole('radio'), { key: 'Enter' })
    fireEvent.keyDown(getByRole('radio'), { key: ' ' })
    fireEvent.keyDown(getByRole('radio'), { key: 'a' })
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('an option keeps only the room of its actions: the same buttons, hidden, unnamed, out of the tab order and of the accessibility tree', () => {
    const onEdit = vi.fn()
    const { getByTestId, queryAllByRole } = renderItem({
      selectable: true,
      onSelect: vi.fn(),
      actions: [
        { control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: onEdit },
        { control: 'address-delete', icon: 'trashFilled', label: 'Remove', disabled: true, danger: true, onClick: vi.fn() }
      ]
    })
    const item = getByTestId('item')
    const room = item.querySelectorAll('button')
    expect(room).toHaveLength(2)
    const box = room[0].parentElement
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(cssFor(box)).toContain('visibility:hidden')
    room.forEach((button) => {
      expect(button).toHaveAttribute('tabindex', '-1')
      expect(button).toHaveAttribute('aria-hidden', 'true')
      expect(button).not.toHaveAttribute('aria-label')
      expect(button).not.toHaveAttribute('data-doc-control')
    })
    // as the actions: the same icons, the disabled one disabled, delete in danger
    expect(room[0].querySelector('svg.lucide-pencil')).not.toBeNull()
    expect(room[1]).toBeDisabled()
    expect(buttonVar(room[1], '--ui-button-color')).toBe(componentVars(theme(), 'button', { size: 'md', shape: 'icon', color: 'danger', appearance: 'ghost' })['--ui-button-color'])
    room.forEach((button) => expect(button).toHaveAttribute('data-slot', 'button'))
    expect(queryAllByRole('button')).toHaveLength(0)
    fireEvent.click(room[0])
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('a card keeps its actions in the item (no radiogroup to stay out of)', () => {
    const onEdit = vi.fn()
    const { getByTestId, getByLabelText } = renderItem({
      actions: [{ control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: onEdit }]
    })
    expect(getByTestId('item')).toContainElement(getByLabelText('Edit address'))
    fireEvent.click(getByLabelText('Edit address'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('the actions are icon buttons of the theme: named, data-doc-control, disabled, delete in danger', () => {
    const { getByLabelText } = renderItem({
      actions: [
        { control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: vi.fn() },
        { control: 'address-delete', icon: 'trashFilled', label: 'Remove', disabled: true, danger: true, onClick: vi.fn() }
      ]
    })
    const edit = getByLabelText('Edit address')
    const remove = getByLabelText('Remove')
    expect(edit.tagName).toBe('BUTTON')
    expect(edit).toHaveAttribute('type', 'button')
    expect(edit).toHaveAttribute('data-doc-control', 'address-edit')
    expect(edit.querySelector('svg.lucide-pencil')).not.toBeNull()
    expect(remove).toHaveAttribute('data-doc-control', 'address-delete')
    expect(remove).toBeDisabled()
    // the base icon Button (md, ghost): neutral to edit, danger to delete
    ;[[edit, 'neutral'], [remove, 'danger']].forEach(([button, color]) => {
      const vars = componentVars(theme(), 'button', { size: 'md', shape: 'icon', color, appearance: 'ghost' })
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.className).toContain('ui:w-(--ui-button-height)')
      expect(buttonVar(button, '--ui-button-color')).toBe(vars['--ui-button-color'])
      expect(buttonVar(button, '--ui-button-height')).toBe(vars['--ui-button-height'])
    })
    expect(buttonVar(edit, '--ui-button-color')).not.toBe(buttonVar(remove, '--ui-button-color'))
    // the pointer: an enabled action answers it (over the actions' layer), a disabled one lets the click reach the item
    expect(cssFor(edit.parentElement)).toContain('pointer-events:auto')
    expect(cssFor(remove.parentElement)).toContain('pointer-events:none')
  })

  it('a card without onSelect does not answer the click', () => {
    const { getByTestId } = renderItem()
    expect(cssFor(getByTestId('item'))).toContain('cursor:default')
    expect(getByTestId('item').onclick).toBeFalsy()
  })
})

describe('SavedAddressChoices: a radiogroup of the options alone, their actions over them', () => {
  const HOME = { id: 1, address: '123 Main St', tag: 'home' }
  const OFFICE = { id: 2, address: '9 Elm Rd', tag: 'office' }
  const PARK = { id: 3, address: '7 Park Ave', tag: 'favorite' }

  const optionsOf = ({ selected = 1, handlers = {} } = {}) => [HOME, OFFICE, PARK].map((address) => ({
    key: address.id,
    address,
    label: address.tag,
    selected: address.id === selected,
    onSelect: handlers.select ? () => handlers.select(address.id) : undefined,
    itemProps: { 'data-doc-control': 'address-item', 'data-testid': `item-${address.id}` },
    actionsProps: { 'data-doc-control': 'address-item-actions', 'data-testid': `actions-${address.id}` },
    actions: [
      { control: 'address-edit', icon: 'pencil', label: 'Edit address', onClick: () => handlers.edit?.(address.id) },
      { control: 'address-delete', icon: 'trashFilled', label: 'Remove', danger: true, disabled: address.id === selected, onClick: () => handlers.remove?.(address.id) }
    ]
  }))

  const renderList = (props = {}, t = theme()) => renderWith(t, (
    <SavedAddressChoices aria-label='Saved addresses' options={optionsOf(props)} />
  ))

  it('the radiogroup owns the radios alone: no button in it for assistive technology, named radios checked as selected', () => {
    const { getByRole } = renderList()
    const group = getByRole('radiogroup', { name: 'Saved addresses' })
    // what the accessibility tree shows of the group: the radios, nothing else
    expect(within(group).queryAllByRole('button')).toHaveLength(0)
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(radios[1]).toHaveAccessibleName('9 Elm Rd office')
    // every element of the group with a role is a radio (its items are presentational)
    ;[...group.querySelectorAll('[role]')].forEach((el) => expect(['radio', 'none']).toContain(el.getAttribute('role')))
    // the only buttons in its DOM are the hidden room of the actions
    ;[...group.querySelectorAll('button')].forEach((button) => {
      expect(button.closest('[aria-hidden="true"]')).not.toBeNull()
      expect(button).toHaveAttribute('tabindex', '-1')
      expect(button).not.toHaveAttribute('aria-label')
    })
  })

  it('the actions are out of the group, row by row, named, described by their address, and fire their handlers alone', () => {
    const handlers = { select: vi.fn(), edit: vi.fn(), remove: vi.fn() }
    const { getByRole, getAllByRole, getByTestId } = renderList({ handlers })
    const group = getByRole('radiogroup')
    const buttons = getAllByRole('button')
    expect(buttons).toHaveLength(6)
    buttons.forEach((button) => expect(group.contains(button)).toBe(false))
    // in the visual order: each row's edit, then its delete
    expect(buttons.map((b) => `${b.getAttribute('aria-label')}:${document.getElementById(b.getAttribute('aria-describedby')).textContent}`)).toEqual([
      'Edit address:123 Main St', 'Remove:123 Main St',
      'Edit address:9 Elm Rd', 'Remove:9 Elm Rd',
      'Edit address:7 Park Ave', 'Remove:7 Park Ave'
    ])
    expect(buttons[2]).toHaveAccessibleDescription('9 Elm Rd')
    expect(buttons.map((b) => b.getAttribute('data-doc-control'))).toEqual(['address-edit', 'address-delete', 'address-edit', 'address-delete', 'address-edit', 'address-delete'])
    // the selected address cannot be deleted
    expect(buttons[1]).toBeDisabled()
    const actions = getByTestId('actions-2')
    expect(actions).toHaveAttribute('data-doc-control', 'address-item-actions')
    fireEvent.click(within(actions).getByLabelText('Edit address'))
    fireEvent.click(within(actions).getByLabelText('Remove'))
    expect(handlers.edit).toHaveBeenCalledWith(2)
    expect(handlers.remove).toHaveBeenCalledWith(2)
    expect(handlers.select).not.toHaveBeenCalled()
  })

  it('the click on an option, and Enter or Space on its radio, pick its address', () => {
    const select = vi.fn()
    const { getByTestId, getAllByRole } = renderList({ handlers: { select } })
    fireEvent.click(getByTestId('item-3'))
    expect(select).toHaveBeenLastCalledWith(3)
    fireEvent.keyDown(getAllByRole('radio')[1], { key: 'Enter' })
    expect(select).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(getAllByRole('radio')[2], { key: ' ' })
    expect(select).toHaveBeenLastCalledWith(3)
    expect(select).toHaveBeenCalledTimes(3)
  })

  it('one tab stop for the group (the selected option, else the first); the arrows, Home and End move the focus without picking', () => {
    const select = vi.fn()
    const { getAllByRole, unmount } = renderList({ selected: 2, handlers: { select } })
    const radios = getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])

    radios[1].focus()
    fireEvent.keyDown(radios[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(radios[2])
    // the tab stop follows the focus
    expect(getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '-1', '0'])
    fireEvent.keyDown(radios[2], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(radios[0])
    fireEvent.keyDown(radios[0], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(radios[2])
    fireEvent.keyDown(radios[2], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(radios[1])
    fireEvent.keyDown(radios[1], { key: 'Home' })
    expect(document.activeElement).toBe(radios[0])
    fireEvent.keyDown(radios[0], { key: 'End' })
    expect(document.activeElement).toBe(radios[2])
    expect(select).not.toHaveBeenCalled()
    unmount()

    const none = renderList({ selected: null })
    expect(none.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  it('the pointer on an option\'s actions keeps the option hovered (its hover background), as when they were in it', () => {
    const t = theme((values) => { values.components.choice.base.hover = '#ABCDEF' })
    const { getByTestId, getAllByLabelText } = renderList({}, t)
    const item = getByTestId('item-2')
    // the hover is the Choice card's, painted while the pointer is on the actions that are out of it
    expect(item).not.toHaveAttribute('data-hovered')

    const edit = getAllByLabelText('Edit address')[1]
    const pointer = (type, pointerType) => {
      fireEvent(edit, Object.assign(new MouseEvent(type, { bubbles: true }), { pointerType }))
    }

    fireEvent.mouseEnter(edit)
    expect(item).not.toHaveAttribute('data-hovered')
    pointer('pointerover', 'mouse')
    expect(item).not.toHaveAttribute('data-hovered')

    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true })
    try {
      pointer('pointerover', 'touch')
      expect(item).not.toHaveAttribute('data-hovered')
      pointer('pointerover', 'mouse')
      expect(item).toHaveAttribute('data-hovered')
      expect(getByTestId('item-3')).not.toHaveAttribute('data-hovered')
      pointer('pointerout', 'mouse')
      expect(item).not.toHaveAttribute('data-hovered')
    } finally {
      matchMedia.mockRestore()
    }
  })

  it('the rows: the option\'s box as a lone option\'s, its actions on its row with the box\'s padding, border room and 15px below', () => {
    const t = theme()
    const lone = renderItem({ selectable: true, selected: false, onSelect: vi.fn(), actions: optionsOf()[1].actions }, t)
    const loneCss = cssFor(lone.getByTestId('item'))
    const loneRoom = buttonStyle(lone.getByTestId('item').querySelector('button'))
    lone.unmount()

    const { getByTestId, getByRole } = renderList({ handlers: { select: vi.fn() } }, t)
    const item = getByTestId('item-2')
    // the box of a row: the same rules, 15px apart
    expect(cssFor(item)).toBe(loneCss)
    expect(cssFor(item)).toContain(`margin:0 0 ${ADDRESS_ITEM_GAP}px`)
    // the visible actions: the same buttons as the room they cover
    expect(buttonStyle(within(getByTestId('actions-2')).getByLabelText('Edit address'))).toBe(loneRoom)

    const actions = cssFor(getByTestId('actions-2'))
    expect(actions).toContain(`margin:0 0 ${ADDRESS_ITEM_GAP}px`)
    // the Choice actions box: the option's padding and the room of its border (1px, its selected one), at the end
    expect(getByTestId('actions-2')).toHaveAttribute('data-slot', 'choice-actions')
    expect(getByTestId('actions-2').className).toContain('ui:px-lg')
    expect(getByTestId('actions-2').className).toContain('ui:justify-end')
    expect(getByTestId('actions-2').style.getPropertyValue('--ui-choice-border-width')).toBe('1px')

    // two layers on the same rows: the radiogroup, the actions over it
    const group = getByRole('radiogroup')
    const layer = getByTestId('actions-2').parentElement
    expect(group.parentElement).toBe(layer.parentElement)
    expect(cssFor(group.parentElement)).toContain('grid-template-rows:repeat(3,auto)')
    ;[group, layer].forEach((el) => {
      const css = cssFor(el)
      expect(css).toContain('grid-row:1 / -1')
      expect(css).toContain('grid-template-rows:subgrid')
    })
    expect(cssFor(layer)).toContain('pointer-events:none')
    expect(cssFor(layer)).toContain('z-index:1')
    // the actions answer it (their boxes), not a rule over every button
    expect(cssFor(within(getByTestId('actions-2')).getByLabelText('Edit address').parentElement)).toContain('pointer-events:auto')
  })

  it('nothing without options (no empty radiogroup)', () => {
    const { container } = renderWith(theme(), <SavedAddressChoices aria-label='Saved addresses' options={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
