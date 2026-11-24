import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { Badge } from '~ui/src/styles/Badge'
import { cardBoxCss } from '~ui/src/styles/Card'

export const SessionsListContainer = styled.div`
  /* the page keeps the footer under the fold while it is short: the screen minus the header and the footer (about four headers) */
  min-height: calc(100vh - 4 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
  min-height: calc(100dvh - 4 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
  /* the box of the account pages */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`
export const Title = styled.h1`
  /* the h1 of the account pages, at the start of the box */
  ${props => pageTitleRules(props.theme)}
`

/* A session is a card of components.card (with its inner space) that cannot
   be touched (only its delete button can): no hover. */
export const SessionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => themeSpace(props.theme, 'md')};
  ${props => cardBoxCss(props.theme, 'card', { padding: true })}
  ${props => blockStill(props.theme)}
`

/* The session's dates: when it was created (muted) and when it expires. */
export const DurationWrapper = styled.div`
  display: flex;
  flex-direction: column;

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body')}
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  p.bold {
    color: ${props => themeColor(props.theme, 'text')};
    margin-top: ${props => themeSpace(props.theme, 'xs')};
  }
`

/* The current session: a badge of the theme, next to its delete button. */
export const CurrentBadge = styled(Badge)`
  margin-inline-start: auto;
`

/* The sessions, md apart. */
export const SessionsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};
`

/* The "delete all" buttons: a section xl under the sessions, centered, sm
   apart, both as wide as the longest (each sized by the button). */
export const ButtonsGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: fit-content;
  max-width: 100%;
  gap: ${props => themeSpace(props.theme, 'sm')};
  margin: ${props => themeSpace(props.theme, 'xl')} auto 0;
`
