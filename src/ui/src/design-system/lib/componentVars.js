import { getThemeComponent, getThemeCss, getThemeMobileCss, getThemeMobileOverrides, resolveThemeProps, overlayThemeProps } from '~/utils/themeCss'
import { motionTiming } from '~/utils/themeMotion'
import { DEFAULT_CONTROL_SIZE, themeRadius } from '~/utils/themeTokens'

const isPlain = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const kebab = (name) => name.replace(/_/g, '-')

// A shadow of the view has its `css` and the sides; a text style its `css` and its parts.
const isShadow = (value) => isPlain(value) && typeof value.css === 'string' && 'down' in value
const isText = (value) => isPlain(value) && typeof value.css === 'string' && 'size' in value
const TEXT_PARTS = ['size', 'line', 'weight', 'family', 'letter_spacing', 'transform']

// What of a view's value is CSS: a length, a color, a border, a number, a
// shadow, the parts of a text style. Booleans, nulls and nested blocks are
// not (nothing is declared for a value the theme leaves null).
const declare = (name, value, vars) => {
  if (typeof value === 'string' && value) vars[name] = value
  else if (typeof value === 'number' && Number.isFinite(value)) vars[name] = String(value)
  else if (isShadow(value)) vars[name] = value.css
  else if (isText(value)) TEXT_PARTS.forEach((part) => value[part] != null && (vars[`${name}-${kebab(part)}`] = String(value[part])))
}

// Resolve the base component and its child within one platform. A state's
// null is the resting look, even if the CSS view paints it as `none`.
const resolveLayer = (theme, component, inherits, selection, css, values) => {
  const read = (get) => {
    const own = resolveThemeProps(get(theme, component), selection)
    const base = inherits && resolveThemeProps(get(theme, inherits), selection)
    return own && base ? overlayThemeProps(base, own) : own ?? base
  }
  const look = read(css)
  if (!look) return null
  const own = read(values)
  look.states = Object.fromEntries(Object.entries(look.states).map(([state, props]) => [
    state, Object.fromEntries(Object.entries(props)
      .filter(([key]) => own?.states[state]?.[key] !== undefined)
      .map(([key, value]) => [key, own.states[state][key] === null ? null : value]))
  ]))
  return look
}

// One effective CSS view for the piece's classes and any geometry derived from them.
export const resolveComponentLook = (theme, component, { size, shape, variant, color, appearance, inherits } = {}) => {
  const view = getThemeCss(theme, component)
  if (!view) return null
  const path = variant ?? ([color, appearance].filter(Boolean).length ? [color, appearance].filter(Boolean) : undefined)
  const selection = { variant: path, size: view.sizes?.[size] ? size : DEFAULT_CONTROL_SIZE, shape: view.shapes?.[shape] ? shape : null }
  const props = resolveLayer(theme, component, inherits, selection, getThemeCss, getThemeComponent)
  const phone = theme.platform && resolveLayer(theme, component, inherits, selection, getThemeMobileCss, getThemeMobileOverrides)
  return phone ? overlayThemeProps(props, phone) : props
}

/**
 * The look of one component of the theme as CSS variables for the `style` of
 * its element: `--ui-<component>-<property>` (`--ui-button-height`,
 * `--ui-button-padding-x`, `--ui-button-icon-size`, `--ui-button-radius`,
 * `--ui-button-background`, `--ui-button-text-size`…), a state's as
 * `--ui-<component>-<state>-<property>` (`--ui-button-pressed-background`),
 * and `--ui-<component>-motion-duration` / `-motion-easing`. The piece's
 * classes read them (`ui:h-(--ui-button-height)`): no value is written in the
 * piece, and the theme's own order decides which wins (`base` → variant → size
 * → shape, then the phone's overrides below the phone cut).
 *
 * Pass the theme styled-components gives (`useTheme()`), not the app's global
 * one: inside a group (`ComponentScope`, `scopedTheme`) it is the group's
 * component that is read, and the context crosses portals, so a dialog opened
 * from inside a group takes the group's look when it sets these variables on
 * its own element, which `:root` variables cannot do.
 *
 * `selection`: `size` (a size of the component; the default one when it lacks
 * it), `shape`, and the variant, as `variant` (a name or a path) or as
 * `color` + `appearance` (`variants[color][appearance]`, the button's).
 * `radius`: the Identity level the component rounds with when the theme gives
 * it no `radius` of its own (`themeRadius(theme, radius, component)`).
 * `inherits`: an optional base component, also used as the variable namespace.
 * Resolve both desktop components first, then both mobile overrides.
 * A property the theme leaves null is not declared: read it with a fallback
 * (`var(--ui-button-hover-background, var(--ui-button-pressed-background))`).
 */
export const componentVars = (theme, component, { size, shape, variant, color, appearance, radius, inherits, look } = {}) => {
  const props = look ?? resolveComponentLook(theme, component, { size, shape, variant, color, appearance, inherits })
  if (!props) return {}

  const prefix = `--ui-${kebab(inherits ?? component)}`
  const vars = {}
  // (`speed` is the motion's: the variables below say it)
  const { states, speed, ...own } = props
  Object.entries(own).forEach(([key, value]) => declare(`${prefix}-${kebab(key)}`, value, vars))
  Object.entries(states).forEach(([state, look]) => Object.entries(look).forEach(([key, value]) => declare(`${prefix}-${kebab(state)}-${kebab(key)}`, value, vars)))
  if (!('radius' in own) && radius) vars[`${prefix}-radius`] = themeRadius(theme, radius, component)
  const { duration, easing } = motionTiming(theme, component)
  vars[`${prefix}-motion-duration`] = duration
  vars[`${prefix}-motion-easing`] = easing
  return vars
}
