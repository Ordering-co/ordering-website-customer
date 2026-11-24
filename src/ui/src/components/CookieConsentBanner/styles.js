import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themePart, themeRadius, themeShadow, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'

// On phones the banner sits this far above the bottom navigation (90px from
// the bottom with the navigation's 65)
const NAV_CLEARANCE = 25

export const BannerContainer = styled.div`
  position: fixed;
  bottom: ${props => themeSpace(props.theme, 'xl')};
  right: ${props => themeSpace(props.theme, 'xl')};
  /* below the modal backdrop (20002) so the banner never covers an
     open modal's action row; still above page bars (~1000-1006). */
  z-index: 20000;
  background-color: ${props => themeColor(props.theme, 'primary')};
  color: ${props => themeValue(props.theme, 'cookie_banner', 'base.color')};
  padding: ${props => themeSpace(props.theme, 'xl')};
  border-radius: ${props => themeRadius(props.theme, 'md', 'cookie_banner')};
  box-shadow: ${props => themeShadow(props.theme, 'lg', 'cookie_banner')};
  max-width: min(100%, 45ch);

  @media (max-width: 576px) {
    bottom: ${props => bottomNavHeight(props.theme) + NAV_CLEARANCE}px;
    right: ${props => themeSpace(props.theme, 'md')};
    left: ${props => themeSpace(props.theme, 'md')};
    max-width: none;
  }
  ${props => themePart(props.theme, 'cookie_banner', { background: 'base.background' })}
`

export const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${props => themeSpace(props.theme, 'lg')};
`

export const BannerText = styled.p`
  margin: 0;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
`

export const BannerLink = styled.a`
  color: ${props => themeValue(props.theme, 'cookie_banner', 'base.color')};
  text-decoration: underline;
`

export const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'lg')};
`
