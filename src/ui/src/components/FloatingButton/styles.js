import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeRadius } from '~/utils/themeTokens'
import { bottomBarPaddingCss, bottomBarTypingCss, bottomNavHeight, bottomNavDockedRules } from '~ui/src/components/NavigationBar/styles'

export const Container = styled.div`
  position: fixed;
  bottom: 0px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  /* keep clear of the mobile bottom NavigationBar (fixed, bottomNavHeight, z-index 1005) */
  @media (max-width: 575px) {
    bottom: ${props => bottomNavHeight(props.theme)}px;
  }

  /* a bar at the bottom, as the navigation (above it on small
     screens): its background, border, shadow and padding
     (components.bottom_nav); the padding is the bar's, not the button's margin */
  ${props => bottomNavDockedRules(props.theme, { aboveNav: true })}
  box-sizing: border-box;
  ${props => bottomBarPaddingCss(props.theme)}
  /* while a text field is being typed in the bar gives way () */
  ${props => bottomBarTypingCss(props.theme)}
`

export const FloatingButtonLane = styled.div`
  width: 90%;

  @media (min-width: 850px) {
    width: 80%;
  }
`

export const BtnValue = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  border-radius: ${props => themeRadius(props.theme, 'full')};
  /* a veil over the button's color: the theme's overlay */
  background-color: ${props => themeColor(props.theme, 'overlay')};
  padding: var(--ot-space-sm);
  right: var(--ot-space-sm);
  height: var(--ot-icon-md);
  width: auto;
  min-width: var(--ot-icon-md);
  ${props => props.theme?.rtl && css`
    left: var(--ot-space-sm);
    right: initial;
  `}
`
