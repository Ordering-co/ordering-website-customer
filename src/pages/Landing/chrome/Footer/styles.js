import styled, { css } from 'styled-components'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { pageGutter, themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { contentColumn } from '../../sections/shared/styles'

// components.footer, as the app's footer paints it (background, text, links, box and line on top).
// The theme's padding is none by default and this footer is the page's own content, so its room
// (the page's sides, a space above and below) is added to the theme's.
export const Bar = styled.footer`
  ${({ theme }) => {
    const base = getThemeCss(theme, 'footer').base
    return css`
      box-sizing: border-box;
      padding: calc(${base.padding_y} + ${themeSpace(theme, 'xxl')}) calc(${base.padding_x} + ${pageGutter(theme)}px);
      ${themePart(theme, 'footer', { background: 'base.background', color: 'base.color', text: 'base.text', 'border-top': 'base.border_top' })}
      a, a:visited {
        ${themePart(theme, 'footer', { color: 'base.link' })}
        text-decoration: underline;
      }
    `
  }}
`

export const Columns = styled.div`
  ${({ theme }) => contentColumn(theme)}
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'xl')};`}
  /* on a phone one column under another */
  @media (width < ${MOBILE_WEB_MAX_WIDTH}px) {
    flex-direction: column;
  }
`

// The site's own footer content (footer page or footer_html, its legal links), under the columns
export const SiteContent = styled.div`
  ${({ theme }) => contentColumn(theme)}
  ${({ theme }) => css`margin-top: ${themeSpace(theme, 'xl')};`}
  /* a site without footer content leaves no gap */
  &:empty {
    display: none;
  }
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'sm')};`}
  address {
    font-style: normal;
  }
  p {
    margin: 0;
  }
`

export const ColumnTitle = styled.h2`
  margin: 0;
  ${({ theme }) => themeText(theme, 'label', { props: ['size', 'weight', 'line', 'family'] })}
`

export const BrandName = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
  ${({ theme }) => themeText(theme, 'h4', { props: ['size', 'weight', 'line', 'family'] })}
`

export const BrandLogo = styled.img`
  display: block;
  ${({ theme }) => themeLogoBoxCss(theme, 'header')}
`

export const Socials = styled.ul`
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'md')};`}
  a {
    text-decoration: none;
  }
`

export const LocationList = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'xs')};`}
`
