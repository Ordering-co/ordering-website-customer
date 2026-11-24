import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'

export const PageNotFoundContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 85%;
  box-sizing: border-box;
  margin: auto;
  /* the screen under the header: its measured height, the theme's as fallback */
  min-height: calc(100vh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
  min-height: calc(100dvh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));

  @media (max-width: 575px) {
    padding-block-end: ${({ theme }) => `calc(${bottomNavHeight(theme)}px + ${themeSpace(theme, 'lg')})`};
  }

  @media (min-width: 1024px) {
    min-height: 0;
    margin: ${props => themeSpace(props.theme, 'xxxl')} auto;
  }
`
