import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeIconSize, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { cardBoxCss } from '~ui/src/styles/Card'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleGap, pageTitleText } from '~ui/src/styles/Page'

export const Container = styled.div`
  /* the box of the account pages */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  /* the page's title (the theme's h1) and its action, one title gap over
     the cards */
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'md')};
    margin-bottom: ${pageTitleGap(theme)};
    h1 {
      margin: 0;
      ${pageTitleText(theme)}
    }
  `}
`

export const CardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};
`

/* a saved card is a content container (components.card, with its inner
   space) */
export const CardItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => cardBoxCss(theme, 'card', { padding: true })}
`

export const CardData = styled.div`
  display: flex;
  align-items: center;
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'md')};
    svg {
      font-size: ${themeIconSize(theme, 'lg')};
      color: ${themeColor(theme, 'primary')};
    }
  `}
`

export const CardBrand = styled.span`
  text-transform: capitalize;
  ${({ theme }) => themeText(theme, 'label')}
`

export const CardNumber = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

/* the height the Braintree card form needs (its iframe): 8.5 times the xl
   size (476px by default; it was 480px) */
const formMinHeight = (theme) => `calc(8.5 * ${themeSize(theme, 'xl')})`

export const IframeWrapper = styled.div`
  width: 100%;
  min-height: ${props => formMinHeight(props.theme)};

  iframe {
    width: 100%;
    min-height: ${props => formMinHeight(props.theme)};
    border: none;
  }
`
