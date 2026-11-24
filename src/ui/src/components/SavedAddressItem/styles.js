import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { DEFAULT_CONTROL_SIZE, themeIconSize, themePart, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { choiceVars } from '~ui/src/design-system/components/choice-surface'

/* The space between two saved addresses, the same in the address
   picker and in the profile's saved places. 15px is the value the user chose
   for this list (the theme's space scale has md 12 / lg 16, neither of them),
   so it is a named constant of its own, not a theme token. */
export const ADDRESS_ITEM_GAP = 15

/* The size of an item, the same in a picker and in a card: an
   option of the app's choice lists (its padding, the choice list's gap
   between its parts, at least the height of components.choice's md size).
   A card without a border of its own keeps the room of the choice's border
   (transparent), so both boxes measure the same; the look (background,
   border, selected) is each one's. */
const cardChoiceSize = (theme) => {
  // (components.card.base.border is null when the card has none)
  const border = themeValue(theme, 'card', 'base.border')
  return [
    `min-height: ${getThemeCss(theme, 'choice').sizes[DEFAULT_CONTROL_SIZE].height};`,
    border ? '' : `border: ${choiceVars(theme)['--ui-choice-border-width']} solid transparent;`
  ].join('\n')
}

/**
 * A saved address. As an option of a single choice list (the
 * address picker and the profile's saved places: components.choice,
 * `$choice`; `$selected` takes its selected state); otherwise a card
 * (components.card) of the same size (see cardChoiceSize). The items are
 * ADDRESS_ITEM_GAP apart either way, stretched to the list's width.
 * `$clickable`: the item answers the click (it picks the address).
 * `$hover`: an option whose actions (over it, out of its radiogroup) have the
 * pointer, hovered as if the pointer were on it.
 */
export const ItemBox = styled.li`
  display: flex;
  align-items: center;
  align-self: stretch;
  box-sizing: border-box;
  list-style: none;
  /* (the profile's saved places center their text) */
  text-align: start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin: 0 0 ${ADDRESS_ITEM_GAP}px;

  /* the Choice card (an option) paints its own box, padding and states; a card keeps components.card */
  ${({ theme, $selectable }) => !$selectable && css`
    padding: ${themeSpace(theme, 'sm')} ${themeSpace(theme, 'lg')};
    color: ${themeColor(theme, 'text')};
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    ${cardChoiceSize(theme)}
  `}

  /* an option already selected that picks nothing (the profile's default
     address) keeps the arrow */
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
`

/* The part of the item that picks it (in a picker, the radio
   of the choice; its actions stay apart), the rest of the row */
export const ItemMain = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

/* The icon of the address's tag (the address form's), in the
   primary color, of the theme's md icon size */
export const TagIcon = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  color: ${({ theme }) => primaryText(theme)};
  svg {
    width: ${({ theme }) => themeIconSize(theme, 'md')};
    height: ${({ theme }) => themeIconSize(theme, 'md')};
  }
`

// The address and, below, its tag (or label) and details
export const ItemText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

// The address identifies the item: it wraps to 2 lines before it is cut,
// never on one line with "…" (the row's grid height is auto, so it grows).
const clampTwoLines = `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
`

/* The address, in bold, up to 2 lines, the text of a choice
   (components.choice, else the theme's body) in a picker and in a card */
export const AddressLine = styled.span.attrs(({ children, title }) => ({
  title: title ?? (typeof children === 'string' ? children : undefined)
}))`
  ${clampTwoLines}
  ${({ theme }) => themeText(theme, 'body', { component: 'choice', props: ['size', 'line', 'weight'], weight: 600 })}
`

// The tag (or label) and the details of the address, secondary
// text (the theme's small body, muted), up to 2 lines each
export const AddressNote = styled.span.attrs(({ children, title }) => ({
  title: title ?? (typeof children === 'string' ? children : undefined)
}))`
  ${clampTwoLines}
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body', { props: ['size', 'line'] })}
`

/* The actions of the item, the theme's small space apart.
   `$placeholder`: in an option, the room of its actions (the same buttons,
   hidden: not seen, not reachable, out of the accessibility tree), so the
   option keeps the size and the layout of an item with its actions; the
   actions themselves are the list's, over it (see AddressChoiceActions). */
export const ItemActions = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  ${({ $placeholder }) => $placeholder && 'visibility: hidden;'}
`

/* The box of an action of the item (an icon button of the theme: components.button,
   icon shape, md; delete in the danger color). It takes the pointer back over
   the actions' layer (AddressChoiceActionsLayer), but not for a disabled
   action: its click reaches the item. */
export const AddressActionSlot = styled.span`
  display: flex;
  align-self: center;
  pointer-events: ${({ $disabled }) => $disabled ? 'none' : 'auto'};
`

/* A single choice list of saved addresses (the address picker,
   the profile's saved places), two layers on the same rows ($rows, one per
   address): the radiogroup with the options, and over it the actions of each
   option, out of the radiogroup (a radiogroup only owns radios). The list's
   width, as the options. */
export const AddressChoiceRows = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  ${({ $rows }) => $rows > 0 && `grid-template-rows: repeat(${$rows}, auto);`}
  align-self: stretch;
`

// A layer of the list, on all of its rows (its own items one per row)
const choiceLayer = `
  display: grid;
  grid-column: 1;
  grid-row: 1 / -1;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: subgrid;
  min-width: 0;
`

// The options (SavedAddressItem, role radiogroup)
export const AddressChoiceGroup = styled.ul`
  ${choiceLayer}
  list-style: none;
  margin: 0;
  padding: 0;
`

/* The actions of the options, over them; the pointer goes
   through the layer to the options, but for the actions that answer it
   (AddressActionSlot) */
export const AddressChoiceActionsLayer = styled.div`
  ${choiceLayer}
  z-index: 1;
  pointer-events: none;
`

/* The actions of an option, on its row, the same space below as the option (ChoiceActions
   gives the box's padding and the room of its border, at the end and centered) */
export const AddressChoiceActions = styled.div`
  margin: 0 0 ${ADDRESS_ITEM_GAP}px;
`
