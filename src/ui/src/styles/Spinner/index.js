import styled from 'styled-components'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { SPINNER_SLOW_TURN, SPINNER_TURN } from '../Rules'

/* A spinner (components.spinner): a ring that turns while something loads,
   its arc in `base.color` over its `base.track`. Sizes sm (in a button),
   md (in a block) and lg (a whole screen), each its diameter and its ring's
   thickness. It is decorative: the text or the region that loads says it
   (aria-busy, a status). With reduced motion the sm one (in a button, whose
   label and aria-busy say it loads) stays still; md and lg, often alone on
   screen, turn slowly so they still read as loading. */

export const SPINNER_SIZES = ['sm', 'md', 'lg']

/**
 * `{ diameter, thickness, color, track }` of a spinner's size (an unknown size
 * is md).
 */
const spinnerProps = (spinner, size) => {
  const { diameter, thickness } = spinner.sizes[SPINNER_SIZES.includes(size) ? size : 'md']
  return { diameter, thickness, color: spinner.base.color, track: spinner.base.track }
}

export const spinnerTheme = (theme, size = 'md') => spinnerProps(getThemeComponent(theme, 'spinner'), size)

// One turn, and the slow one of md and lg with reduced motion
const TURN = 'theme-spinner-turn'

/**
 * The declarations of a spinner of `size` (see spinnerTheme): a ring of its
 * diameter, its thickness in the track color with the arc on top, turning
 * (with reduced motion: sm still, md and lg slowly).
 */
export const spinnerCss = (theme, size) => {
  // (the same as CSS: its view)
  const { diameter, thickness, color, track } = spinnerProps(getThemeCss(theme, 'spinner'), size)
  return `
    display: inline-block;
    box-sizing: border-box;
    flex: none;
    width: ${diameter};
    height: ${diameter};
    min-width: ${diameter};
    min-height: ${diameter};
    border: ${thickness} solid ${track};
    border-top-color: ${color};
    border-radius: 50%;
    background: none;
    box-shadow: none;
    animation: ${TURN} ${SPINNER_TURN} linear infinite;
    @media (prefers-reduced-motion: reduce) {
      ${size === 'sm' ? 'animation: none;' : `animation-duration: ${SPINNER_SLOW_TURN};`}
    }
    @keyframes ${TURN} {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
}

/**
 * spinnerCss over a spot's own spinner (`&& { … }`).
 */
export const spinnerRules = (theme, size) => `&& { ${spinnerCss(theme, size)} }`

/**
 * A spinner: `$size` sm | md (default) | lg, hidden from assistive tech.
 * components.spinner.
 */
export const Spinner = styled.span.attrs({ 'aria-hidden': 'true' })`
  ${({ theme, $size }) => spinnerRules(theme, $size)}
`
