import { animation, transition } from '@orderingco/ordering-theme-engine/css'
import { getThemeCss } from './themeCss'

// The system's "reduce motion" (an accessibility setting of the device): the
// theme never overrides it.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches
  } catch (_) {
    return false
  }
}

/** Whether the identity lets anything animate (`tokens.motion_style.enabled`). */
export const themeMotionEnabled = (theme) => theme.values.tokens.motion_style.enabled

/**
 * The easing of the app's motion: the identity's
 * (`tokens.motion_style.easing`), as CSS.
 */
export const motionEasing = (theme) => theme.css.tokens.motion_style.easing

/**
 * How a component animates, `{ ms, easing }`, or null when it
 * does not: the identity's switch (`tokens.motion_style.enabled`), its own
 * `base.animated` and a speed (`base.speed`), resolved in its view
 * (getThemeCss). The system's reduce motion is applied where it runs (CSS
 * media query, `prefersReducedMotion`).
 */
export const themeMotion = (theme, component) => getThemeCss(theme, component)?.motion ?? null

/**
 * The transition of a component's `properties` as the theme
 * says: none when it does not animate, else its speed and easing, only when
 * the system does not ask to reduce motion (`transition` of the engine's
 * css, built once per motion and properties).
 */
export const motionCss = (theme, component, properties) => transition(themeMotion(theme, component), properties)

/**
 * How long and how a component's transition runs, as the two CSS values a
 * class reads (`duration`, `easing`): its speed and easing when it animates, `0ms`
 * when it does not (the identity's easing then). Reduced motion is the
 * class's business (`motion-safe:` in Tailwind, as motionCss does).
 */
export const motionTiming = (theme, component) => {
  const motion = themeMotion(theme, component)
  return motion ? { duration: `${motion.ms}ms`, easing: motion.easing } : { duration: '0ms', easing: motionEasing(theme) }
}

/**
 * A keyframes animation of a component (`name` + what follows
 * its duration and easing, e.g. `'1 forwards'`) when it animates and the
 * system does not reduce motion; `animation: none` otherwise. Only for
 * animations whose end state is also the element's resting CSS.
 */
export const motionAnimationCss = (theme, component, name, rest = '') => animation(themeMotion(theme, component), name, rest)

/**
 * The ms a component's animation takes right now (0 when it
 * does not animate or the system reduces motion), for code that waits for it.
 */
export const motionMs = (theme, component) => {
  const motion = themeMotion(theme, component)
  return motion && !prefersReducedMotion() ? motion.ms : 0
}

/**
 * The `behavior` of a scroll the app makes (arrows, scroll to an error):
 * smooth unless the system reduces motion or the identity turns motion off.
 */
export const scrollBehavior = (theme) => {
  if (prefersReducedMotion()) return 'auto'
  if (!themeMotionEnabled(theme)) return 'auto'
  return 'smooth'
}

// What changes between a control's states (hover, pressed, selected, focus):
// colors and shadow, never its place or size.
export const STATE_PROPERTIES = ['background-color', 'color', 'border-color', 'box-shadow', 'opacity']

/**
 * How a control changes between its states: at once, or a fade
 * of its colors and shadow when the theme animates it (`base.animated`).
 * Never a movement.
 */
export const stateMotionCss = (theme, component) => motionCss(theme, component, STATE_PROPERTIES)

// The same for the control's icon (its color and fill)
export const iconMotionCss = (theme, component) => motionCss(theme, component, ['color', 'fill'])

// Keyframes the GlobalStyle defines, for the
// helpers that return plain CSS (an opening menu or modal fades in).
export const FADE_IN_KEYFRAMES = 'theme-fade-in'

/**
 * The ms of a scroll the app animates itself (a list back to its top):
 * the identity's slow speed (`tokens.motion.slow`), 0 (at once) when the
 * identity turns motion off or the system reduces motion.
 */
export const scrollMs = (theme) => {
  if (prefersReducedMotion()) return 0
  if (!themeMotionEnabled(theme)) return 0
  return theme.values.tokens.motion.slow
}

/**
 * The ms a carousel (Swiper) takes to change slide: the identity's base
 * speed (`tokens.motion.base`), 0 when the identity turns motion off or the
 * system reduces motion. With `component` (a carousel of the theme, e.g. `promo_carousel`), its own
 * motion instead (`base.animated` / `base.speed`): 0, at once, when it does
 * not animate.
 */
export const swiperSpeed = (theme, component) => {
  if (prefersReducedMotion()) return 0
  if (component) return themeMotion(theme, component)?.ms || 0
  if (!themeMotionEnabled(theme)) return 0
  return theme.values.tokens.motion.base
}
