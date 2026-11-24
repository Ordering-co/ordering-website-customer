import { cssBorder, cssShadow, cssText as engineCssText } from '@orderingco/ordering-theme-engine/css'
import { rgbOf } from '@orderingco/ordering-theme-engine/colors'

/**
 * CSS helpers for a version 2 theme. The theme's values are CSS already in
 * its view (`theme.css`, toCss of `@orderingco/ordering-theme-engine/css`,
 * built by appTheme.js): getThemeCss reads a component there; the engine's
 * conversions (cssBorder, cssShadow, cssText) are for a value the code
 * composes itself.
 */

export { cssBorder, cssShadow }

// Compare what CSS paints, including RGBA channels independent of color syntax.
const paintedBorder = (border) => {
  const [size, style, ...color] = (border ?? '').trim().toLowerCase().split(/\s+/)
  const width = Number.parseFloat(size)
  const rgba = rgbOf(color.join(' '))
  if (!(width > 0) || !rgba?.a || style === 'none' || style === 'hidden') return null
  return [width, style, rgba.r, rgba.g, rgba.b, rgba.a]
}

// A distinct focus border can stand in for the keyboard ring only if it paints.
export const hasOwnFocusBorder = (restingBorder, focusBorder) => {
  const focus = paintedBorder(focusBorder)
  if (!focus) return false
  const resting = paintedBorder(restingBorder)
  return !resting || focus.some((value, index) => value !== resting[index])
}

// Overlay resolved axes one state at a time. An explicit null clears the
// inherited property while preserving siblings and absent overrides.
export const overlayThemeProps = (props, overrides) => ({
  ...props,
  ...overrides,
  states: Object.fromEntries([...new Set([...Object.keys(props.states), ...Object.keys(overrides.states)])]
    .map(state => [state, { ...props.states[state], ...overrides.states[state] }]))
})

// Characters that end a declaration, open or close a block, or open a string
// in the CSS styled-components builds. A value carrying one (an unresolved
// alias such as `{color.primary}`, `red; } body { …`) would leak into the
// surrounding rules instead of being one invalid declaration.
const UNSAFE_CSS_VALUE = /[{};<>'"\\]/

/**
 * Whether a theme value can be interpolated into CSS as one declaration value:
 * finite numbers and strings without block/declaration delimiters. An invalid
 * but safe value (`azul`) is dropped by the browser and the previous (local)
 * declaration still applies.
 */
export const isSafeCssValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && !UNSAFE_CSS_VALUE.test(value)
}

/**
 * The value when it is safe to interpolate into CSS (see isSafeCssValue),
 * otherwise null so the caller emits nothing and the local CSS applies.
 */
export const cssValue = (value) => (isSafeCssValue(value) && String(value).trim() ? value : null)

// A size the primitives compute with (switch track, checkbox box, icon).
export const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * A text style `{ size, line, weight, letter_spacing?, transform?, family? }`
 * the code composes itself → its CSS declarations (cssText of the engine's
 * css: `line` a unitless ratio, the weight the nearest its font has; the
 * family declared only when the style names one). `font` is the catalog id
 * it is painted with when the style names none. A theme's own text styles
 * are CSS already in its view (`.css` of a CssText).
 */
export const cssText = (text, font) => engineCssText(text, font)?.css ?? ''

/**
 * Resolved values of one component of the theme, or null when the theme does
 * not define it. For what the code computes with (numbers, nulls, options);
 * what it paints is in getThemeCss.
 */
export const getThemeComponent = (theme, name) => {
  const component = theme?.values?.components?.[name]
  return component && typeof component === 'object' ? component : null
}

/**
 * One component of the theme as CSS (its view, `theme.css`): every value
 * converted by its type, a length `'12px'`, a border `'1px solid #…'` or
 * `'none'`, a shadow a CssShadow (`css`, `down`, `up`, `right`, `left`,
 * `drop`, `reach`), a text style a CssText (`css` and each part), a color as
 * it is; `motion` is `{ ms, easing }` or null. Inside a group
 * (scopedTheme), the group's own component.
 */
export const getThemeCss = (theme, name) => theme.cssScope?.[name] ?? theme.css.components[name]

// The breakpoint below which the web applies `platforms.mobile_web`
export { MOBILE_WEB_MAX_WIDTH } from './themeBreakpoint.mjs'

/**
 * Overrides of one component for small screens (`platforms.mobile_web`). The
 * API sends `platforms` unapplied; the web applies `mobile_web` below
 * MOBILE_WEB_MAX_WIDTH.
 */
export const getThemeMobileOverrides = (theme, name) => {
  const component = theme?.values?.platforms?.mobile_web?.components?.[name]
  return component && typeof component === 'object' ? component : null
}

/** The same overrides as CSS (the view's `platforms.mobile_web`), or null. */
export const getThemeMobileCss = (theme, name) => theme.css.platforms.mobile_web?.components?.[name] ?? null

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * Props of one variant (and size and shape) of a component of the theme, merged over
 * its base (`variant` is a name or a path such as `['primary', 'outline']`):
 * base → variant → size → shape. `states` stays apart. Returns null when the
 * component is missing.
 */
export const resolveThemeProps = (component, { variant, size, shape } = {}) => {
  if (!isPlainObject(component)) return null
  // A variant is a key (`variants[name]`) or a path (`variants[color][appearance]`).
  const variantProps = Array.isArray(variant)
    ? variant.reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), component.variants)
    : variant ? component.variants?.[variant] : null
  const sizeProps = size ? component.sizes?.[size] : null
  const shapeProps = shape ? component.shapes?.[shape] : null
  const { states, ...variantRest } = isPlainObject(variantProps) ? variantProps : {}
  return {
    ...(isPlainObject(component.base) ? component.base : {}),
    ...variantRest,
    ...(isPlainObject(sizeProps) ? sizeProps : {}),
    ...(isPlainObject(shapeProps) ? shapeProps : {}),
    states: isPlainObject(states) ? states : {}
  }
}
