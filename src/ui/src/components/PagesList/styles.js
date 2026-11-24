import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'

export const PagesListContainer = styled.div`
  display: flex;
  flex-direction: column;
  ${({ theme }) => pageContainerRules(theme)}
`

/* The page's title: the h1 of the pages (pageTitleRules), the one heading of
   the page. */
export const PagesListTitle = styled.h1`
  ${props => pageTitleRules(props.theme)}
`

/* The list of pages: one link per row, sm apart, each a link of the theme. */
export const PagesListLinks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin: 0;
  padding: 0;
  list-style: none;
  ${({ theme }) => `&& a { ${linkThemeRules(theme)} }`}
`
