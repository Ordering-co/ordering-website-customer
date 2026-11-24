import styled from 'styled-components'
import { pageGutter, themeShadowDown, themeSpace, themeText, themePart } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { pageWidth } from '~ui/src/styles/Page'

// The page's bar: what components.header paints, across the whole width; its
// content (Inner) is the column of the page's sections (MarketplaceSection) so
// the logo sits over the left edge of their titles
export const Bar = styled.header`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-inline: ${({ theme }) => pageGutter(theme)}px;
  ${({ theme }) => themePart(theme, 'header', { background: 'base.background', color: 'base.color', 'border-bottom': 'base.border_bottom', 'min-height': 'base.height' })}
  ${({ theme }) => themeShadowDown(theme, 'header')}
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    padding-inline: 0;
  }
`

export const Inner = styled.div`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
  width: 100%;
  min-width: 0;
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    width: ${({ theme }) => pageWidth(theme)};
  }
`

export const Brand = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  img {
    ${({ theme }) => themeLogoBoxCss(theme, 'header')}
  }
`

// The site's own name, where there is no logo: one line, cut with …
export const BrandName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ theme }) => themeText(theme, 'h4', { props: ['size', 'weight', 'line', 'family'] })}
`

// The anchors to the page's sections; a phone leaves them out
export const Sections = styled.nav`
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => themeSpace(theme, 'lg')};
    margin: 0;
    padding: 0;
    list-style: none;
  }
  @media (width < ${MOBILE_WEB_MAX_WIDTH}px) {
    display: none;
  }
`

export const Actions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`
