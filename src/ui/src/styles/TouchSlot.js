import styled from 'styled-components'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeBreakpoint.mjs'
import { focusRingReach } from './Focus'

const COARSE_POINTER = '(pointer: coarse)'
export const MOBILE_TOUCH_QUERY = `${COARSE_POINTER}, (width < ${MOBILE_WEB_MAX_WIDTH}px), (any-pointer: coarse)`

// A separate lane for a piece that already supplies its own touch target.
export const TouchSlot = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  min-inline-size: 0;

  @media ${({ $mobile }) => $mobile ? MOBILE_TOUCH_QUERY : COARSE_POINTER} {
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`

// How far (px) the touch area of a control reaches out of its painted box at the sides of a box that clips: the 44 px
// floor minus the 20 px of the smallest control in a row (a text link), halved, rounded up.
const TOUCH_REACH = 12

/**
 * For a box that clips its content (overflow hidden): room at its sides, on touch, for the touch areas of the
 * controls at its edges (a stepper, an Edit link), so it cuts none of them. Like `focusRingRoomCss` it reaches out
 * by that room (negative margin) and pads its content back by as much: the content keeps its place and width.
 * Write it after `focusRingRoomCss`, whose room it widens.
 */
export const touchRoomXCss = (theme) => {
  const room = Math.max(TOUCH_REACH, focusRingReach(theme))
  return `@media ${MOBILE_TOUCH_QUERY} { margin-inline: -${room}px; padding-inline: ${room}px; }`
}
