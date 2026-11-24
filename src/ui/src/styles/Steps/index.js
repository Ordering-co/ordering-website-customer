import { getThemeComponent, getThemeCss } from '~/utils/themeCss'

/* The steps of a flow (components.steps): the marker of each step (the number
   of the date and time steps, the points of the custom order's route) in its
   state, and the line that joins them. */

// The states of a step: done, the one in progress, one still to come
export const STEP_STATES = ['complete', 'active', 'idle']
export const DEFAULT_STEP_SIZE = 'md'

/**
 * The resolved look of a step's marker of components.steps, its base with the
 * size and the state over it (`{ size, radius, text, background, color, border,
 * connector, connector_opacity }`); an unknown size is md, an unknown state
 * is idle.
 */
const stepsProps = (steps, { state = 'idle', size = DEFAULT_STEP_SIZE } = {}) => {
  const key = STEP_STATES.includes(state) ? state : 'idle'
  return {
    ...steps.base,
    ...(steps.sizes[size] || steps.sizes[DEFAULT_STEP_SIZE]),
    ...steps.variants.default.states[key]
  }
}

export const stepsTheme = (theme, options) => stepsProps(getThemeComponent(theme, 'steps'), options)

// The same look as CSS (its view)
const stepsLook = (theme, options) => stepsProps(getThemeCss(theme, 'steps'), options)

/**
 * The declarations of a step's marker (`state` complete | active | idle, `size`
 * sm | md): a box of its size (the border inside it, so every state measures
 * the same), rounding, colors, border and the text of its number.
 */
export const stepMarkerCss = (theme, { state, size } = {}) => {
  const look = stepsLook(theme, { state, size })
  const box = look.size
  return [
    'box-sizing: border-box;',
    'flex-shrink: 0;',
    `width: ${box}; min-width: ${box}; height: ${box};`,
    `border-radius: ${look.radius};`,
    `background: ${look.background};`,
    `color: ${look.color};`,
    `border: ${look.border};`,
    look.text.css
  ].join('\n')
}

/**
 * The line between two steps (`connector`, a border, and its
 * `connector_opacity`) along `side` (`left` for a vertical line, `top` for a
 * horizontal one).
 */
export const stepConnectorCss = (theme, side = 'left') => {
  const look = stepsLook(theme)
  return `border: none; border-${side}: ${look.connector};\nopacity: ${look.connector_opacity};`
}
