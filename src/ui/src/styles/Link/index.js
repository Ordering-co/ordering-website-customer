import { getThemeComponent, getThemeCss, resolveThemeProps } from '~/utils/themeCss'
import { DEFAULT_CONTROL_SIZE, themeValue } from '~/utils/themeTokens'
import { stateMotionCss } from '~/utils/themeMotion'

export const LINK_VARIANTS = ['default', 'muted', 'danger']

/**
 * The color of a plain link (an `a` no rule of its own colors):
 * components.link's color.
 */
export const linkColor = (theme) => themeValue(theme, 'link', 'base.color')

/**
 * The resolved look of a link of components.link (its base, variant and size:
 * `{ color, underline, text, states }`); an unknown variant is the default
 * one, an unknown size md.
 */
const linkProps = (component, { variant = 'default', size = DEFAULT_CONTROL_SIZE } = {}) => {
  const name = LINK_VARIANTS.includes(variant) ? variant : 'default'
  const sized = component.sizes[size] ? size : DEFAULT_CONTROL_SIZE
  return resolveThemeProps(component, { variant: name, size: sized })
}

export const linkTheme = (theme, options) => linkProps(getThemeComponent(theme, 'link'), options)

/**
 * A text action of components.link (Show map, Forgot password, See more…):
 * inline, of its size's text, in its variant's color, underlined as the theme
 * says (never, on hover or always); pressed takes the pressed opacity and
 * disabled its color. No box: no height, padding, border, background or shadow,
 * so it sits inside a sentence. Still (the theme's motion only). For a link
 * this file does not render, put it inside its selector.
 */
export const linkThemeRules = (theme, options) => {
  // (its view: the same look as CSS)
  const { color, underline, text, states } = linkProps(getThemeCss(theme, 'link'), options)
  return [
    'display: inline; height: auto; min-height: 0; padding: 0; margin: 0; border: none; background: none; box-shadow: none;',
    'border-radius: 0; text-align: start; cursor: pointer; transform: none;',
    text.css,
    `color: ${color};`,
    `text-decoration: ${underline === 'always' ? 'underline' : 'none'};`,
    stateMotionCss(theme, 'link'),
    `&:hover { transform: none; background: none; box-shadow: none; color: ${color}; text-decoration: ${underline === 'none' ? 'none' : 'underline'}; }`,
    `&:visited { color: ${color}; }`,
    `&:active { opacity: ${states.pressed.opacity}; }`,
    `&:disabled, &[aria-disabled='true'] { color: ${states.disabled.color}; cursor: not-allowed; text-decoration: none; opacity: 1; }`
  ].join('\n')
}
