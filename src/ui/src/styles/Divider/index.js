import styled from 'styled-components'
import { cssBorder, getThemeComponent, getThemeCss } from '~/utils/themeCss'

export const DIVIDER_VARIANTS = ['item', 'section', 'band', 'vertical']

// The border property of each edge of a row or a block. The app does not
// set `dir`: the inline edges follow theme.rtl, like the rest of its CSS.
// `left` / `right` keep a physical side for a spot that does not swap in RTL.
const edgeSide = (theme, edge) => {
  if (edge === 'top' || edge === 'left' || edge === 'right') return edge
  if (edge === 'inline-start') return theme?.rtl ? 'right' : 'left'
  if (edge === 'inline-end') return theme?.rtl ? 'left' : 'right'
  return 'bottom'
}

const LINE_STYLES = new Set(['solid', 'dashed', 'dotted'])

/**
 * The resolved variant of components.divider (`{ line, spacing, indent }`;
 * `line` null = no divider), or null for an unknown variant (the spot keeps
 * its current CSS). The line is fixed: it never follows
 * tokens.border_style.
 */
export const dividerTheme = (theme, variant) => {
  if (!DIVIDER_VARIANTS.includes(variant)) return null
  const { line, spacing, indent } = getThemeComponent(theme, 'divider').variants[variant]
  return { line, spacing, indent }
}

// The same variant as CSS (its view): `{ line, spacing, indent }`
const dividerLook = (theme, variant) => getThemeCss(theme, 'divider').variants[variant]

// `1px solid #E9ECEF` of a variant's line (its view's; `style` replaces its
// style), `none` without one.
const lineValue = (theme, variant, style) => {
  const { line } = dividerTheme(theme, variant)
  if (!line) return 'none'
  return LINE_STYLES.has(style) ? cssBorder({ ...line, style }) : dividerLook(theme, variant).line
}

/**
 * The border of a variant's line on one edge of a row or a block (`edge`:
 * bottom | top | inline-start | inline-end, bottom by default; the inline ones
 * by theme.rtl, or a fixed left | right): `border-bottom: 1px solid #E9ECEF;`,
 * or `border-bottom: none;` when the variant has no line. `style` keeps a style
 * of the spot (a dashed rule); `important` for a spot whose current border is
 * !important; `padding` makes the variant's spacing the padding on that edge (a
 * block whose padding is the room beside its line). Otherwise spacing and
 * indent are left to the caller: a row keeps its padding. A border cannot be
 * shortened: the indent is for standalone separators (dividerCss).
 */
export const dividerLineCss = (theme, variant, { edge = 'bottom', style, important = false, padding = false } = {}) => {
  const divider = dividerTheme(theme, variant)
  if (!divider) return ''
  const side = edgeSide(theme, edge)
  const rule = `border-${side}: ${lineValue(theme, variant, style)}${important ? ' !important' : ''};`
  return padding ? `${rule} padding-${side}: ${divider.line ? dividerLook(theme, variant).spacing : '0px'};` : rule
}

/**
 * A variant's spacing in px (`0px` for item), for a spot that spaces its
 * divided rows with its own margin; null otherwise.
 */
export const dividerSpacing = (theme, variant) => {
  return dividerTheme(theme, variant) ? dividerLook(theme, variant).spacing : null
}

/**
 * A standalone separator of a variant.
 * - section (and item): a hairline (the line on the top edge of an empty box),
 *   `spacing` above and below, shortened `indent` at each end;
 * - band: a full-width block `line.width` tall filled with `line.color`;
 * - vertical: the line on the inline-start edge, stretched to the height of its
 *   row and shortened `indent` at each end, `spacing` at each side. No line:
 *   nothing is drawn and the spacing collapses (display none). `inline: false`
 *   leaves the width and inline margins of a horizontal separator to the spot
 *   (a bleed past its container's padding).
 */
export const dividerCss = (theme, variant, { inline = true } = {}) => {
  const divider = dividerTheme(theme, variant)
  if (!divider) return ''
  const { line } = divider
  if (!line) return 'display: none;'
  const { spacing, indent } = dividerLook(theme, variant)
  const reset = 'box-sizing: content-box; padding: 0; border: none; background: none; min-height: 0; min-width: 0; opacity: 1; flex-shrink: 0;'
  if (variant === 'vertical') {
    return [
      reset,
      'align-self: stretch; width: 0; height: auto; max-height: none;',
      `border-inline-start: ${lineValue(theme, variant)};`,
      `margin: ${indent} ${spacing};`
    ].join(' ')
  }
  // Its length: the row's, less the indent at each end; or the spot's own
  // (its width and inline margins: a bleed)
  const along = inline
    ? `width: auto; max-width: none; margin: ${spacing} ${indent};`
    : `margin-top: ${spacing}; margin-bottom: ${spacing};`
  if (variant === 'band') {
    return [
      reset,
      `height: ${line.width}px;`,
      `background: ${line.color};`,
      along
    ].join(' ')
  }
  return [
    reset,
    'height: 0;',
    `border-top: ${lineValue(theme, variant)};`,
    along
  ].join(' ')
}

/**
 * dividerCss of a spot that is drawn today by its own element, over its current
 * rules: `&& { … }` (`specificity` & more for a spot whose container styles its
 * children with a stronger selector).
 */
export const dividerRules = (theme, variant, { specificity = 2, ...options } = {}) => {
  const rules = dividerCss(theme, variant, options)
  return rules ? `${'&'.repeat(Math.max(specificity, 1))} { ${rules} }` : ''
}

/**
 * A separator (`<hr>`): `$variant` section (default) | band | vertical.
 * Vertical ones say so (aria-orientation); `$decorative` ones are hidden from
 * assistive tech. components.divider (see dividerCss).
 */
export const Divider = styled.hr.attrs(({ $variant, $decorative }) => ({
  'aria-orientation': $variant === 'vertical' ? 'vertical' : undefined,
  'aria-hidden': $decorative ? 'true' : undefined
}))`
  ${({ theme, $variant }) => `&& { ${dividerCss(theme, DIVIDER_VARIANTS.includes($variant) && $variant !== 'item' ? $variant : 'section')} }`}
`
