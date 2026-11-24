import styled from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { motionCss } from '~/utils/themeMotion'

/**
 * `components.slider.base` as CSS (its view: a slider of stops, the maximums
 * of /business_search: its track, fill, thumb and marks).
 */
export const sliderTheme = (theme) => getThemeCss(theme, 'slider').base

/**
 * The track of the slider (the whole bar): its color, height and rounding.
 */
export const sliderTrackCss = (theme) => {
  const slider = sliderTheme(theme)
  return [
    `background: ${slider.track};`,
    `height: ${slider.height};`,
    `border-radius: ${slider.radius};`
  ].join('\n')
}

/**
 * The fill of the slider (up to the chosen stop): its color, the track's height
 * and rounding, moving as the theme says.
 */
export const sliderFillCss = (theme) => {
  const slider = sliderTheme(theme)
  return [
    'height: 100%;',
    `background: ${slider.fill};`,
    `border-radius: ${slider.radius};`,
    motionCss(theme, 'slider', ['width'])
  ].join('\n')
}

/**
 * The color of the slider's origin dot (the fill's).
 */
export const sliderFillColor = (theme) => sliderTheme(theme).fill

/**
 * A stop's label under the slider: the mark text (without its weight: the
 * stop's own), in the active color when it is the chosen stop.
 */
export const sliderMarkCss = (theme, active) => {
  const slider = sliderTheme(theme)
  return [
    slider.mark.css.replace(/font-weight: [^;]*;\n?/, ''),
    `color: ${active ? slider.mark_active : slider.mark_color};`
  ].join('\n')
}

/**
 * The thumb of the slider (at `left`, a CSS length along the track): a circle
 * of `thumb_size` in the thumb color, with its border and shadow. Decorative:
 * the stops are the buttons under the track.
 */
export const SliderThumb = styled.span.attrs({ 'aria-hidden': true })`
  position: absolute;
  top: 50%;
  z-index: 1;
  box-sizing: border-box;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  ${({ theme }) => {
    const slider = sliderTheme(theme)
    const size = slider.thumb_size
    return [
      `width: ${size};`,
      `height: ${size};`,
      `background: ${slider.thumb};`,
      `border: ${slider.thumb_border};`,
      `box-shadow: ${slider.thumb_shadow.css};`,
      motionCss(theme, 'slider', ['left'])
    ].join('\n')
  }}
`
