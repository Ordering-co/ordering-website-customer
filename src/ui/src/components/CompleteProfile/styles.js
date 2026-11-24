import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeSpace } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules } from '~ui/src/styles/Page'
import { sectionDescriptionCss, sectionTitleCss } from '~ui/src/styles/SectionHeader'

/* The box of the account pages (components.account_page) */
export const Container = styled.div`
  max-width: min(100%, 95ch);
  margin: 0 auto;
  padding: ${props => themeSpace(props.theme, 'xxl')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xxxl')}; /* TOKEN-GAP(implementation notes): 60px of padding is outside the Space table (xxxl, 48, the closest); overridden by pageContainerRules below, so nothing changes on screen */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`

/* The page's header (components.section_header, page variant): its title,
   the description its gap under it and the header's margin_bottom under both */
export const HeaderWrapper = styled.div`
  margin-bottom: 0;

  /* the title of the page */
  h1 {
    ${props => headingText(props.theme, 'h1')}
    margin: 0;
    ${props => sectionTitleCss(props.theme, { level: 'h1', alone: false })}
  }

  p {
    margin: 0;
    color: ${props => themeColor(props.theme, 'text_muted')};
    ${props => sectionDescriptionCss(props.theme, { level: 'h1' })}
  }
`

export const ActionsWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => themeSpace(props.theme, 'md')};
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`
