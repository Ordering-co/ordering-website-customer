import styled, { createGlobalStyle, css } from 'styled-components'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { pageGutter, themePart, themeShadowDown, themeSpace, themeText } from '~/utils/themeTokens'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { HEADER_LAYER } from '~ui/src/components/Header/styles'
import { contentColumn } from '../../sections/shared/styles'

const phone = `(width < ${MOBILE_WEB_MAX_WIDTH}px)`

// components.header, as the app's header paints it: it stays on top of the page
export const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${HEADER_LAYER};
  ${({ theme }) => themePart(theme, 'header', { background: 'base.background', color: 'base.color', 'border-bottom': 'base.border_bottom', 'min-height': 'base.height' })}
  ${({ theme }) => themeShadowDown(theme, 'header')}
  /* the installed web app draws under the system's status area */
  padding-top: env(safe-area-inset-top);
  padding-inline: ${({ theme }) => pageGutter(theme)}px;
  display: flex;
  align-items: center;
`

// The sticky bar covers the top of an anchor's target: the page leaves it that room
export const AnchorRoom = createGlobalStyle`
  html {
    scroll-padding-top: ${({ theme }) => getThemeCss(theme, 'header').base.height};
  }
`

export const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => contentColumn(theme)}
  gap: ${({ theme }) => getThemeCss(theme, 'header').base.gap};
`

export const BrandName = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ theme }) => themeText(theme, 'h4', { props: ['size', 'weight', 'line', 'family'] })}
`

export const BrandLogo = styled.img`
  display: block;
  ${({ theme }) => themeLogoBoxCss(theme, 'header')}
`

export const Links = styled.nav`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'xs')};`}
  @media ${phone} {
    display: none;
  }
`

export const Actions = styled.div`
  display: flex;
  align-items: center;
  flex: none;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'sm')};`}
`

// the phone's way to the links: the menu button, with the sheet
export const PhoneOnly = styled.div`
  display: none;
  @media ${phone} {
    display: block;
  }
`

export const SheetLinks = styled.nav`
  display: flex;
  flex-direction: column;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'xs')};`}
`
