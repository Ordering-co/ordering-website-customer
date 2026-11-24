import React, { useId, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { Choice, ChoiceActions, ChoiceIndicator } from '~ui/src/design-system/components/Choice'

import { addressTagIcon } from './tags'
import { themeHidden } from '~/utils/themeVisibility'
import {
  ItemBox,
  ItemMain,
  TagIcon,
  ItemText,
  AddressLine,
  AddressNote,
  ItemActions,
  AddressActionSlot,
  AddressChoiceRows,
  AddressChoiceGroup,
  AddressChoiceActionsLayer,
  AddressChoiceActions
} from './styles'

const CardOption = React.forwardRef((props, ref) => <Choice ref={ref} variant='card-actions' as={ItemBox} $selectable {...props} />)
CardOption.displayName = 'CardOption'

/**
 * The actions of a saved address (`{ control, icon, label,
 * disabled, danger, onClick }`), icon buttons of the theme that do not pick
 * the address; `describedBy`: the id of the address they act on. As a
 * `placeholder`, the same buttons with nothing of theirs but their size (no
 * name, no doc control, no handler, out of the tab order): the room of the
 * actions in an option (its ItemActions hides them).
 */
const ActionButtons = ({ actions, describedBy, placeholder, addressId }) => actions.map(action => placeholder
  ? (
    // the room only: hidden from assistive technology and the tab order; the piece asks an icon button for a
    // name, so it carries the address's (the real action, over it, has its own)
    <Button
      key={action.control}
      shape='icon'
      size='md'
      appearance='ghost'
      color={action.danger ? 'danger' : 'neutral'}
      type='button'
      aria-hidden='true'
      aria-labelledby={addressId}
      tabIndex={-1}
      disabled={action.disabled}
    >
      <Icon name={action.icon} />
    </Button>
    )
  : (
    <AddressActionSlot key={action.control} $disabled={action.disabled}>
      <Button
        shape='icon'
        size='md'
        appearance='ghost'
        color={action.danger ? 'danger' : 'neutral'}
        type='button'
        data-doc-control={action.control}
        aria-label={action.label}
        aria-describedby={describedBy}
        disabled={action.disabled}
        onClick={(e) => {
          e.stopPropagation()
          action.onClick()
        }}
      >
        <Icon name={action.icon} />
      </Button>
    </AddressActionSlot>
    ))

/**
 * A saved address of the user, the same item in the address
 * picker and in the profile's saved places: the icon of its tag (the address
 * form's), the address, its `label` (the tag's name, or "Current location")
 * and `details` (zipcode, internal number) below, and its `actions` (`{
 * control, icon, label, disabled, danger, onClick }`) as icon buttons of the
 * theme, which do not pick the address.
 *
 * `selectable`: an option of a single choice list (SavedAddressChoices: the
 * item is presentational in its radiogroup, its text the radio, `selected`
 * when it is the chosen address). An option keeps only the room of its
 * actions (hidden): a radiogroup owns radios alone, so the list renders the
 * actions out of it, over that room. Otherwise a card, its actions its own.
 * `onSelect`: the click on the item (and Enter or Space on its radio);
 * without it the item picks nothing. For the list: `hovered` (its actions
 * have the pointer), `radioRef` and `radioProps` (tab stop, focus, keys
 * other than Enter and Space), `addressId` (the id of the address line). The
 * rest of the props (`data-doc-*`) go to the item.
 */
export const SavedAddressItem = (props) => {
  const {
    address,
    label,
    details,
    selectable,
    selected,
    onSelect,
    actions = [],
    hovered,
    radioRef,
    radioProps = {},
    addressId,
    ...rest
  } = props

  const theme = useTheme()
  const canSelect = typeof onSelect === 'function'
  // address.icons hides the form's tag selector: without it the addresses
  // carry no tag of the user's, so no item shows the tag's icon
  const hideTagIcon = themeHidden(theme, 'address.icons')

  // In a picker the item's text is the radio; its actions stay out of it
  const { onKeyDown: onRadioKeyDown, ...radioRest } = radioProps
  const optionProps = selectable
    ? {
        role: 'radio',
        'aria-checked': !!selected,
        tabIndex: 0,
        ...radioRest,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!canSelect) return
            e.preventDefault()
            onSelect()
            return
          }
          onRadioKeyDown && onRadioKeyDown(e)
        }
      }
    : {}

  // an option is painted by the Choice card (its radio is the text, its actions are the list's); a card keeps components.card
  const Box = selectable ? CardOption : ItemBox
  return (
    <Box
      $clickable={canSelect}
      onClick={canSelect ? () => onSelect() : undefined}
      // an option is a radio of its group, not an item of a list
      role={selectable ? 'none' : undefined}
      {...(selectable && { selected: !!selected, hovered: !!hovered, interactive: canSelect })}
      {...rest}
    >
      <ItemMain ref={selectable ? radioRef : undefined} {...optionProps}>
        {selectable && <ChoiceIndicator checked={!!selected} />}
        {!hideTagIcon && (
          <TagIcon>
            <Icon name={addressTagIcon(address?.tag)} />
          </TagIcon>
        )}
        <ItemText>
          <AddressLine id={addressId}>{address?.address}</AddressLine>
          {label && <AddressNote>{label}</AddressNote>}
          {details && <AddressNote>{details}</AddressNote>}
        </ItemText>
      </ItemMain>
      {actions.length > 0 && (selectable
        ? (
          <ItemActions aria-hidden='true' $placeholder>
            <ActionButtons actions={actions} placeholder addressId={addressId} />
          </ItemActions>
          )
        : (
          <ItemActions>
            <ActionButtons actions={actions} />
          </ItemActions>
          ))}
    </Box>
  )
}

// The keys that move the focus between the options, to the option they reach
const ARROW_STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/**
 * The saved addresses as a single choice list (the address
 * picker, the profile's saved places): `options` (`{ key, address, label,
 * details, selected, onSelect, actions, itemProps, actionsProps }`, in order)
 * and the rest of the props (the name: `aria-label` / `aria-labelledby`) to
 * the radiogroup. Nothing without options.
 *
 * The radiogroup owns the options' radios alone; the actions of each option
 * are a layer of their own over the options, on the same rows (CSS grid,
 * subgrid rows), at the place of the option's hidden actions: the row looks
 * as an item with its actions. Each action is described by its address.
 *
 * Keyboard: the group is one tab stop (the option last focused, else the
 * selected one, else the first); the arrows (and Home / End) move the focus
 * between the options without picking; Enter or Space picks. Tab then goes
 * through the actions, row by row. The pointer on an option's actions keeps
 * the option hovered.
 */
export const SavedAddressChoices = ({ options = [], ...groupProps }) => {
  const baseId = useId()
  const radios = useRef({})
  const [focusedKey, setFocusedKey] = useState(null)
  const [hoveredKey, setHoveredKey] = useState(null)

  if (!options.length) return null

  const count = options.length
  const keys = options.map((option) => option.key)
  const selectedIndex = options.findIndex((option) => option.selected)
  const stop = keys.includes(focusedKey)
    ? focusedKey
    : keys[Math.max(selectedIndex, 0)]
  const addressIdOf = (index) => `${baseId}-address-${index}`

  const moveFocus = (index) => (e) => {
    const target = e.key === 'Home'
      ? 0
      : e.key === 'End'
        ? count - 1
        : ARROW_STEPS[e.key] !== undefined ? (index + ARROW_STEPS[e.key] + count) % count : null
    if (target === null) return
    e.preventDefault()
    radios.current[keys[target]]?.focus()
  }

  return (
    <AddressChoiceRows $rows={count}>
      <AddressChoiceGroup role='radiogroup' {...groupProps}>
        {options.map(({ key, itemProps, actionsProps, ...option }, index) => (
          <SavedAddressItem
            key={key}
            {...itemProps}
            {...option}
            selectable
            hovered={hoveredKey === key}
            addressId={addressIdOf(index)}
            radioRef={(el) => { radios.current[key] = el }}
            radioProps={{
              tabIndex: key === stop ? 0 : -1,
              onFocus: () => setFocusedKey(key),
              onKeyDown: moveFocus(index)
            }}
          />
        ))}
      </AddressChoiceGroup>
      <AddressChoiceActionsLayer>
        {options.map(({ key, actions = [], actionsProps }, index) => (
          <ChoiceActions
            as={AddressChoiceActions}
            key={key}
            {...actionsProps}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                setHoveredKey(key)
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') {
                setHoveredKey((current) => current === key ? null : current)
              }
            }}
          >
            {actions.length > 0 && (
              <ItemActions>
                <ActionButtons actions={actions} describedBy={addressIdOf(index)} />
              </ItemActions>
            )}
          </ChoiceActions>
        ))}
      </AddressChoiceActionsLayer>
    </AddressChoiceRows>
  )
}
