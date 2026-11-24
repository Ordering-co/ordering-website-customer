import { getThemeComponent, getThemeCss, resolveThemeProps } from '~/utils/themeCss'

/* An alert (components.alert): a box that tells something about the screen
   (an order being processed, a reason the order cannot be placed yet, an
   error loading a list) in one of four variants. One look for every message
   box of the app: the theme gives its fill, text, border, radius, padding,
   the gap to its icon and the icon's color and size. */

export const ALERT_VARIANTS = ['info', 'success', 'warning', 'danger']

/**
 * The resolved props of a variant of components.alert (base merged with the
 * variant; an unknown variant is `info`).
 */
const alertKey = (variant) => (ALERT_VARIANTS.includes(variant) ? variant : 'info')

export const alertTheme = (theme, variant = 'info') => resolveThemeProps(getThemeComponent(theme, 'alert'), { variant: alertKey(variant) })

// The same props as CSS (its view)
const alertLook = (theme, variant) => resolveThemeProps(getThemeCss(theme, 'alert'), { variant: alertKey(variant) })

/**
 * The role of an alert: `alert` (assertive) for a danger one, the message of
 * something that went wrong; `status` (polite) for the rest, a state the
 * person does not have to act on at once.
 */
export const alertRole = (variant) => (variant === 'danger' ? 'alert' : 'status')

/**
 * The role of a live alert (`{ role }`) for the element that is the box. For
 * styled-components' attrs: `styled.p.attrs(alertAttrs('warning'))`. A box
 * that is not a live message (an item of a list) takes no role.
 */
export const alertAttrs = (variant) => () => ({ role: alertRole(variant) })

/**
 * The declarations of an alert of `variant` (see alertTheme): the box (a row of
 * its icon and its text, `gap` apart), its fill, text and border, its icon (an
 * svg child) in the variant's icon color and size and its paragraphs in its
 * text. It resets what the spots drew on their own (a fixed height, opacity, a
 * centered text, an icon placed absolute, a lift or a hover shadow) so every
 * box is the same.
 */
export const alertCss = (theme, variant = 'info') => {
  const props = alertLook(theme, variant)
  const { icon_size: iconSize, border } = props
  const shadow = props.shadow.css
  return [
    'display: flex;',
    'flex-direction: row;',
    'align-items: flex-start;',
    'justify-content: flex-start;',
    'box-sizing: border-box;',
    'position: relative;',
    'width: 100%;',
    'height: auto;',
    'min-height: 0;',
    'max-height: none;',
    'opacity: 1;',
    'text-align: start;',
    'transform: none;',
    'transition: none;',
    `padding: ${props.padding};`,
    `gap: ${props.gap};`,
    `border-radius: ${props.radius};`,
    `background: ${props.background};`,
    `color: ${props.color};`,
    `border: ${border};`,
    `box-shadow: ${shadow};`,
    props.text.css,
    // a message, not a control: hovered it stays the alert at rest (over the
    // lift, glow or fill a spot's own CSS gives its hover)
    `&:hover { transform: none; background: ${props.background}; border: ${border}; box-shadow: ${shadow}; }`,
    `> svg { position: static; flex: none; margin: 0; width: ${iconSize}; height: ${iconSize}; font-size: ${iconSize}; color: ${props.icon_color}; }`,
    // its message (a paragraph of its own): the alert's text, no margins
    `> p { margin: 0; color: inherit; text-align: start; ${props.text.css} }`
  ].join('\n')
}

/**
 * alertCss of a spot drawn by its own element, over its current rules:
 * `&& { … }` (`specificity` & more for a spot whose container styles it with a
 * stronger selector).
 */
export const alertRules = (theme, variant, { specificity = 2 } = {}) => {
  return `${'&'.repeat(Math.max(specificity, 1))} { ${alertCss(theme, variant)} }`
}
