import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { DEFAULT_CONTROL_SIZE, themeControlHeight } from '~/utils/themeTokens'
import { motionCss, themeMotionEnabled } from '~/utils/themeMotion'
import { PROGRESS_PULSE } from '../Rules'

// The states a bar can take (`variants.default.states`)
export const PROGRESS_STATES = ['active', 'complete', 'pending', 'canceled']

// A bar's value as a percentage: 0–100, anything else is 0
export const clampProgress = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, number))
}

/**
 * The resolved look of a bar of components.progress, its base with its state's
 * values over it (`{ track, fill, radius, border, shadow, animated, pulse,
 * height }`); without a known state, the base's.
 */
export const progressTheme = (theme, { size = DEFAULT_CONTROL_SIZE, state } = {}) => {
  const component = getThemeComponent(theme, 'progress')
  return {
    ...component.base,
    ...(PROGRESS_STATES.includes(state) && component.variants.default.states[state]),
    height: themeControlHeight(theme, 'progress', size)
  }
}

// A soft pulse of the fill while the bar is active (opacity only: the theme's
// colors stay)
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

// The same look as CSS (its view), resolved with its size and state
const progressLook = (theme, { size = DEFAULT_CONTROL_SIZE, state } = {}) => {
  const view = getThemeCss(theme, 'progress')
  return {
    ...view.base,
    ...(PROGRESS_STATES.includes(state) && view.variants.default.states[state]),
    height: (view.sizes[size] || view.sizes[DEFAULT_CONTROL_SIZE]).height
  }
}

// The look of a part, resolved from the theme with its size and state
const withLook = ({ theme, $size, $state }) => ({ $look: progressLook(theme, { size: $size, state: $state }) })

// The track: its height, color, border, shadow and rounding; it clips the fill
const Track = styled.div.attrs(withLook)`
  position: relative;
  display: block;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  ${({ $look }) => `
    height: ${$look.height};
    background: ${$look.track};
    border: ${$look.border};
    border-radius: ${$look.radius};
    box-shadow: ${$look.shadow.css};
  `}
`

// The fill: as tall as the track, rounded at both ends; its width is the
// value (inline, so a new value adds no class)
const Fill = styled.div.attrs(withLook)`
  height: 100%;
  max-width: 100%;
  ${({ $look }) => `
    background: ${$look.fill};
    border-radius: ${$look.radius};
  `}
  /* its width moves as the theme says (progress animated / speed, and the
     identity's motion), else at once */
  ${({ theme }) => motionCss(theme, 'progress', ['width'])}
  ${({ theme, $look }) => $look.pulse === true && themeMotionEnabled(theme) && css`
    animation: ${pulse} ${PROGRESS_PULSE} ease-in-out infinite;
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`

/**
 * A bar that shows progress or information (`value`, 0–100) in
 * components.progress: `size` (sm | md | lg, md by default) takes its height,
 * `state` (active | complete | pending | canceled) its colors and pulse over
 * the base's. Only the bar: the screen keeps its own labels and icons. Pass
 * `aria-label` or `aria-labelledby` to name it.
 */
export const ProgressBar = ({ value, size = DEFAULT_CONTROL_SIZE, state, ...props }) => {
  const now = clampProgress(value)
  return (
    <Track
      role='progressbar'
      aria-valuenow={now}
      aria-valuemin={0}
      aria-valuemax={100}
      $size={size}
      $state={state}
      {...props}
    >
      <Fill $size={size} $state={state} style={{ width: `${now}%` }} />
    </Track>
  )
}
