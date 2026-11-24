import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText, themeSize } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { layerBackground, layerBackgroundCss } from '~ui/src/styles/Layer'
import { getThemeCss } from '~/utils/themeCss'

// components.header.base as CSS (its view)
const headerCss = (theme) => getThemeCss(theme, 'header').base

export const Container = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  /* the search opens over the page: a floating layer (styles/Layer), its bar
     and its results of the surface */
  ${props => layerBackgroundCss(themeColor(props.theme, 'surface'))}
`
export const BackDropContainer = styled.div`
  background: ${props => themeColor(props.theme, 'overlay')};
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  z-index: -1;
`
export const SearchContainer = styled.div`
  background-color: ${props => layerBackground(props.theme)};
  ${props => dividerLineCss(props.theme, 'item')}
`
/* The bar over the page where the header is: the header's height, side
   space and gap between its pieces (logo, field, cancel) */
export const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: ${props => headerCss(props.theme).height};
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => props.theme.css.tokens.layout.page_gutter};
  gap: ${props => headerCss(props.theme).gap};
`
export const SearchBarWrapper = styled.div`
  flex: 1;
  min-width: 0;
`

// "Cancel" the search: a button of components.link (muted), the header's gap
// from the search bar.
export const CancelButton = (props) => (
  <Button {...props} appearance='link' linkVariant='muted' style={{ flexShrink: 0 }} />
)

// The logo is a button (it goes to the search), without the browser's box,
// and its box is the header's one (T6: header.base.logo_height / logo_width)
const SearchLogoFrame = styled.div`
  display: none;
  min-width: 0;

  @media (min-width: 768px) {
    display: flex;
    align-items: center;
    /* shrinkable: a long site name wraps instead of pushing the search
       field out (its own img keeps flex-shrink: 0, so the logo never
       shrinks) */

    img {
      height: ${props => themeSize(props.theme, 'lg')};
      object-fit: contain;
      flex-shrink: 0;
      ${({ theme }) => themeLogoBoxCss(theme, 'header')}
    }
  }
`

export const LogoHeader = (props) => (
  <SearchLogoFrame>
    <Button {...props} appearance='brand' style={{ color: 'inherit' }} />
  </SearchLogoFrame>
)

/* The site's own name, shown instead of a logo when the theme has none: the
   header's own text color (inherited, see LogoHeader). It wraps to two lines
   before it is cut (title= in index.js keeps the whole name) within
   whatever room LogoHeader has beside the search field. */
export const LogoName = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'] })}
`
export const BusinessProductsListContainer = styled.div`
  background-color: ${props => layerBackground(props.theme)};
  min-height: 0;
  max-height: calc(90dvh - var(--header-height, ${props => headerCss(props.theme).height}));
  overflow: auto;
`

export const BusinessProductsListWrapper = styled.div`
  width: 95%;
  margin: 0px auto;
`
