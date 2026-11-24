import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderWidth, themeSpace, themeText } from '~/utils/themeTokens'
import { Button } from '~ui/src/design-system/components/Button'
import { fieldBoxProps } from '~ui/src/design-system/components/field-box'
import { srOnlyCss } from '~ui/src/styles/Rules'
import { fieldHeight } from '~ui/src/components/Header/styles'

// The capsule's own height (header.slots.order_type size, md by default):
// components.input at that size, so the capsule lines up with the row's
// other fields.
export const capsuleHeight = (theme) => fieldHeight(theme, 'order_type')

// The bar of the order types (the base RadioGroup segmented, with the select
// segments of its groups): it takes the room its container leaves, so on the
// capsule's own line (stacked) it spans it and elsewhere it is as wide as its
// segments.
export const OrderTypeBar = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

// A type's name: one line, "…" if it truly has no room (a long translation
// leaves the address its place), at most 18ch (the 140px it had).
export const OrderTypeLabel = styled.span`
  display: block;
  max-width: min(100%, 18ch);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const OrderTypesContainer = styled.div`
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  padding: 0;
`

export const AddressOrderTypeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: normal;
  min-width: 0;

  @media (min-width: 578px) {
    flex-direction: row;
    justify-content: space-between;
  }
  /* nothing to show (no order type to choose): no box */
  &:empty {
    display: none;
  }
`

// A single allowed order type: its icon and name, no control (nothing to
// choose). An sr-only prefix tells a screen reader this is not a button.
export const OrderTypeStatic = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin: 0;
  white-space: nowrap;
  ${({ theme }) => themeText(theme, 'label', { props: ['size', 'weight'] })}
  color: ${({ theme }) => themeColor(theme, 'text')};
`

// Visually hidden, read by a screen reader only.
export const VisuallyHidden = styled.span`
  ${srOnlyCss}
`

// The order context capsule (Cómo · Cuándo · Dónde): one surface with the
// look of components.input, its height the order_type slot's size. Its
// items (the tabs, the moment, the address) paint no box of their own.
export const OrderContextCapsule = styled.div.attrs(({ theme }) => ({ role: 'group', ...fieldBoxProps(theme) }))`
  display: flex;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
  height: ${({ theme }) => capsuleHeight(theme)}px;
  padding: 0 ${({ theme }) => themeSpace(theme, 'xs')};
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};

  /* mobile, with the address or too narrow for one line: the switcher full
     width on its own line, the rest (moment · address) on the next */
  ${({ $stacked, theme }) => $stacked && css`
    flex-direction: column;
    align-items: stretch;
    height: auto;
    padding: ${themeSpace(theme, 'xxs')};
    gap: ${themeSpace(theme, 'xxs')};
  `}
`

// The rest of the capsule (the moment, the address): a row of its own items,
// none with its own box, sharing what the capsule leaves the switcher.
export const CapsuleRest = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  /* the capsule centers its children (not stretch): without its own height
     this box collapses to its text's, and a vertical divider inside it (its
     own align-self: stretch) would stretch to that short box, not the
     capsule's — a sliver instead of a bar (implementation notes verify) */
  height: 100%;
  box-sizing: border-box;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};

  ${({ $stacked, theme }) => $stacked && css`
    height: ${capsuleHeight(theme)}px;
    /* the rule between the switcher's row and this one: a line (fixed), not a box's border */
    border-top: ${themeBorderWidth(theme, 'thin', { fixed: true })} solid ${themeColor(theme, 'border')};
    padding-top: ${themeSpace(theme, 'xxs')};
    /* The moment alone on its row (Pickup, no address, implementation notes): it spans
       the row and centers its content, as the switcher's two halves above it
       center theirs, instead of hugging the capsule's start edge. */
    > [data-doc-control='order-moment-open']:only-child {
      flex: 1 1 auto;
      justify-content: center;
    }
  `}
`

// A button piece of the capsule (the moment, the address): no box of its
// own (the capsule paints it), its icon, its value and a chevron, in the
// header tabs' text and icon size. The moment (`$moment`, ASAP) takes the
// inactive tabs' color, as in the header's row.
export const CapsuleButton = ({ $moment, children, ...props }) => (
  <Button {...props} appearance='capsule-item' capsuleItem={$moment ? 'moment' : 'address'} coarseTouch>
    {$moment ? <div>{children}</div> : children}
  </Button>
)
