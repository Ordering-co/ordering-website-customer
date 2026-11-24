import { getThemeComponent, getThemeCss } from './themeCss'

const isPlain = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * The theme seen from inside a group (`header`,
 * `product_option`…). Each component the group changes
 * (`components.<group>.scope.<component>`, the whole component as the API
 * serves it: the global one with the group's changes) replaces the global
 * one, in its values and in its CSS (`cssScope`, read by getThemeCss); the
 * rest stay. The same theme when the group changes nothing.
 */
export const scopedTheme = (theme, group) => {
  const scope = getThemeComponent(theme, group)?.scope
  if (!isPlain(scope)) return theme
  // (an empty entry, as the schema declares what a group may change, changes
  // nothing)
  const changed = Object.entries(scope).filter(([, component]) => isPlain(component) && Object.keys(component).length > 0)
  if (!changed.length) return theme
  const css = getThemeCss(theme, group).scope
  return {
    ...theme,
    values: {
      ...theme.values,
      components: { ...theme.values.components, ...Object.fromEntries(changed) }
    },
    cssScope: { ...theme.cssScope, ...Object.fromEntries(changed.map(([name]) => [name, css[name]])) }
  }
}

export const SLOT_AXES = ['size', 'variant', 'appearance', 'color', 'shape']

/**
 * One piece of a group (`components.<group>.slots.<slot>`): the
 * component it is and the size, variant, appearance, color and shape the
 * theme chose for it (null: the component's default). Null when the theme
 * lacks the slot.
 */
export const themeSlot = (theme, group, slot) => {
  const value = getThemeComponent(theme, group)?.slots?.[slot]
  if (!isPlain(value)) return null
  const resolved = { component: typeof value.component === 'string' ? value.component : null }
  SLOT_AXES.forEach((axis) => {
    resolved[axis] = typeof value[axis] === 'string' && value[axis] ? value[axis] : null
  })
  return resolved
}

/**
 * The options of a button slot, with the public names of the design system's
 * `Button` (`size`, `color`, `appearance`, `shape`: spread them on it; the
 * legacy `Button` takes the `$` ones of `slotButtonProps`) and of the
 * `*ThemeRules` helpers: what the slot chose, else `defaults` (the look the
 * piece has without a slot). One slot, one call: the checkout's `place_order`
 * and `place_order_mobile` are two slots with their own options, and a state
 * the caller decides (a disabled order) stays the caller's.
 */
export const slotButtonOptions = (theme, group, slot, defaults = {}) => {
  const value = themeSlot(theme, group, slot)
  return {
    ...defaults,
    ...(value?.color && { color: value.color }),
    ...(value?.appearance && { appearance: value.appearance }),
    ...(value?.size && { size: value.size }),
    ...(value?.shape && { shape: value.shape })
  }
}

/**
 * The props of a button slot for a `Button`: its size, color and appearance
 * (transient, only read). Empty without a slot.
 */
export const slotButtonProps = (theme, group, slot) => {
  const value = themeSlot(theme, group, slot)
  if (!value) return {}
  return {
    ...(value.size && { $size: value.size }),
    ...(value.color && { $color: value.color }),
    ...(value.appearance && { $appearance: value.appearance })
  }
}

/** The size a slot chose, else `fallback`. */
export const slotSize = (theme, group, slot, fallback) => themeSlot(theme, group, slot)?.size || fallback
