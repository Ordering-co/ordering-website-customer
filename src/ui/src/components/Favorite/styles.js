import styled from 'styled-components'
import { themeSize } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'

export const FavoritesContainer = styled.div`
  /* the empty list fills the screen under the header (its measured height)
     and the profile shell above it */
  min-height: calc(100dvh - var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}) - 4 * ${props => themeSize(props.theme, 'xl')});
  /* the box of the account pages */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`

export const Title = styled.h1`
  /* the title of the account pages: its text, color and space under it */
  ${props => pageTitleRules(props.theme)}
`

// The box around the tabs: the tabs' track is the theme's, as wide as its
// tabs
export const TabsContainer = styled.div`
  display: flex;
`

export const ContentWrapper = styled.div`

`
