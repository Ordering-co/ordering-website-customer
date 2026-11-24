/**
 * The box of a control of the theme (a button, a field): its background,
 * color, border, shadow, radius, height and text. `props` are its values
 * (merged by resolveThemeProps, a state, a phone override) and decide what
 * it declares; `look` is the same props in its view (getThemeCss, merged the
 * same way), what it paints. Only what `props` has is declared, so a partial
 * one (a state, a phone override) keeps the rest:
 *
 * - `border: null` keeps the border's width with a transparent color, so the
 *   control does not change size;
 * - `shadow: null` is no shadow (`none`);
 * - `height` is a minimum height (consumers that size the control keep
 *   working) unless `fixedHeight` is set;
 * - `colorKey` names the prop of its text color (a field's `text_color`).
 */
export const boxCss = (props, look, { colorKey = 'color', fixedHeight = false } = {}) => {
  if (!props) return ''
  const rules = []
  const has = (key) => props[key] !== null && props[key] !== undefined
  if (has('background')) rules.push(`background: ${look.background};`)
  if (has(colorKey)) rules.push(`color: ${look[colorKey]};`)
  if (props.border === null) rules.push('border-color: transparent;')
  else if (has('border')) rules.push(`border: ${look.border};`)
  if (props.shadow !== undefined) rules.push(`box-shadow: ${look.shadow.css};`)
  if (has('radius')) rules.push(`border-radius: ${look.radius};`)
  if (has('height')) rules.push(fixedHeight ? `height: ${look.height};` : `min-height: ${look.height};`)
  if (has('text')) rules.push(look.text.css)
  return rules.join('\n')
}
