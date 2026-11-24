import { detectOverflow } from '@popperjs/core'

// The established gap between an inline dropdown and its trigger.
export const OPTIONS_OFFSET = 7
// An option is never narrower than 13 characters of its own text (about 100 px at the menu's size).
export const SELECT_OPTION_MIN_WIDTH = '13ch'

// The space a list keeps from the edge of the screen
const SCREEN_MARGIN = 8
// A list is never shorter than this, though the screen is
const MIN_HEIGHT = 120

/**
 * Popper modifiers that give a list the height left between its control and
 * the edge of the screen on its side (below, or above when flipped), so a
 * long list scrolls instead of going off the screen (the list needs
 * `overflow-y: auto`). As popper-max-size-modifier does.
 */
export const maxHeightModifiers = [
  {
    name: 'maxHeight',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['offset', 'preventOverflow', 'flip'],
    fn ({ state, name }) {
      const overflow = detectOverflow(state)
      const [side] = state.placement.split('-')
      const height = state.rects.popper.height - overflow[side === 'top' ? 'top' : 'bottom']
      state.modifiersData[name] = { height }
    }
  },
  {
    name: 'applyMaxHeight',
    enabled: true,
    phase: 'beforeWrite',
    requires: ['maxHeight'],
    fn ({ state }) {
      const { height } = state.modifiersData.maxHeight
      state.styles.popper.maxHeight = `${Math.max(MIN_HEIGHT, Math.floor(height - SCREEN_MARGIN))}px`
    }
  }
]
