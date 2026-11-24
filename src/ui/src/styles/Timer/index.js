import { getThemeCss } from '~/utils/themeCss'

/**
 * The countdown of a verification code (login, verification, the profile's
 * phone change), `components.timer.base`: its text, color (the expired one when
 * the time is up), background, rounding and side space; the same look in every
 * screen.
 */
export const timerCss = (theme, { expired = false } = {}) => {
  const timer = getThemeCss(theme, 'timer').base
  return [
    'display: inline-block;',
    'width: auto;',
    'margin-left: auto; margin-right: auto;',
    timer.text.css,
    `color: ${expired ? timer.expired_color : timer.color};`,
    `background: ${timer.background};`,
    `border-radius: ${timer.radius};`,
    `padding: 0 ${timer.padding_x};`
  ].join('\n')
}
