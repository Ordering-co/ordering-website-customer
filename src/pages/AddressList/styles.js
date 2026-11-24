import styled from 'styled-components'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleGap } from '~ui/src/styles/Page'
import { FlexTabs } from '~ui/src/components/UserProfileForm/ProfileOptions/styles'

// The box of the account pages; the profile's tabs in it, the title's gap
// (xl) over the title
export const PageBox = styled.div`
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
  && > ${FlexTabs} {
    margin-bottom: ${props => pageTitleGap(props.theme)};
  }
`
