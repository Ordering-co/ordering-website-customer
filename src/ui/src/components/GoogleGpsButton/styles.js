import styled from 'styled-components'
import { getThemeCss, getThemeMobileCss, resolveThemeProps } from '~/utils/themeCss'

const gpsShape = { variant: ['primary', 'ghost'], size: 'md', shape: 'icon' }

export const gpsButtonSize = (theme, mobile = false) => {
  const look = mobile ? getThemeMobileCss(theme, 'button') : getThemeCss(theme, 'button')
  return (look && resolveThemeProps(look, gpsShape).height) ?? resolveThemeProps(getThemeCss(theme, 'button'), gpsShape).height
}

// Only the place: the pin sits inside the address field, at its end edge,
// centered by the field's flex row. The button (its square, its glyph and its
// 44 px touch area) is the base Button's.
export const GpsButtonWrap = styled.span`
  position: absolute;
  display: flex;
  inset-inline-end: var(--gps-field-inset, 0);
`
