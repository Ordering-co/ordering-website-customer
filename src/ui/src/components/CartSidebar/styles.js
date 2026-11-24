import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { headingText, themeBorderWidth, themeRadius, themeShadow, themeText, themeSpace, themeIconSize, blockStill } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { layerBackgroundCss } from '~ui/src/styles/Layer'

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const TopContainer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  align-items: center;
  border-bottom: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'border')};
  ${props => dividerLineCss(props.theme, 'item')}
  margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};
  flex-shrink: 0;

  h4 {
    ${props => headingText(props.theme, 'h4')}
    color: ${props => primaryText(props.theme)};
    margin: 0px;
  }
`
export const IconContent = styled.div`
  cursor: pointer;
  margin: 0 ${({ theme }) => themeSpace(theme, 'xs')};
  background-color: ${props => themeColor(props.theme, 'primary')};
  border-radius: ${props => themeRadius(props.theme, 'xxl')};
  padding: ${({ theme }) => themeSpace(theme, 'xs')} ${({ theme }) => themeSpace(theme, 'lg')};
  display: flex;
  align-items: center;
  color: ${props => themeColor(props.theme, 'on_primary')};

  svg {
    font-size: ${({ theme }) => themeIconSize(theme, 'lg')};
  }

  span {
    ${props => props.theme?.rtl
? css`
      margin-right: ${({ theme }) => themeSpace(theme, 'md')};
    `
: css`
      margin-left: ${({ theme }) => themeSpace(theme, 'md')};
    `}
  }
`

export const BackDropContainer = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0px;
  background-color: ${props => themeColor(props.theme, 'inverse_surface')};
  opacity: 0.6;
  left: 0;
  z-index: 1000;
`

export const SidebarContent = styled.div`
  height: 100%;
  width: 0;
  position: fixed;
  z-index: 1005;
  top: 0;
  background: ${props => themeColor(props.theme, 'surface')};
  /* a floating layer (styles/Layer): what is inside it is of its background */
  ${props => layerBackgroundCss(themeColor(props.theme, 'surface'))}
  overflow-x: hidden;
  /*
   * 3-zone drawer layout. A bounded flex column keeps the "My cart"
   * header (TopContainer) pinned at the top and the cart's Total + Checkout +
   * Add more footer pinned at the bottom, while only the product list scrolls.
   */
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-shadow: ${({ theme }) => themeShadow(theme, 'xl')};

  ${props => props.theme?.rtl
? css`
      left: 0;
  `
: css`
      right: 0;
  `}

  @media (max-height: 450px) {
    padding-top: ${({ theme }) => themeSpace(theme, 'lg')};
  }
  ${props => blockStill(props.theme)}
`

export const MenuClose = styled.div`
  cursor: pointer;
  border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'primary')};
  border-radius: ${props => themeRadius(props.theme, 'full')};
  display: flex;
  align-items: center;
  padding: ${({ theme }) => themeSpace(theme, 'xs')} ${({ theme }) => themeSpace(theme, 'sm')};
  color: ${props => primaryText(props.theme)};
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  svg {
    font-size: ${({ theme }) => themeIconSize(theme, 'md')};
    ${props => props.theme?.rtl
? css`
      margin-left: ${({ theme }) => themeSpace(theme, 'md')};
    `
: css`
      margin-right: ${({ theme }) => themeSpace(theme, 'md')};
    `}
  }
`

export const CartContentWrapper = styled.div`
  width: 94%;
  margin: 0 auto;
  /*
   * scrollable MIDDLE zone of the drawer. flex:1 + min-height:0 lets
   * this region take the remaining height between the header and the pinned
   * cart footer; the inner cart itself manages where the scroll happens.
   */
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
`
