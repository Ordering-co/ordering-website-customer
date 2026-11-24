import { CardButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { pageTitleGap, pageTitleText } from '~ui/src/styles/Page'

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  /* the content of the account pages' box (UserProfileForm),
     no second width nor margin; the students md apart */
  ${({ theme }) => css`
    && {
      width: 100%;
      margin: 0;
      gap: 0;
    }
    > [data-student-card] + [data-student-card] {
      margin-top: ${themeSpace(theme, 'md')};
    }
  `}
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => themeSpace(props.theme, 'md')};
  /* the page's title (the account pages' h1: its text and
     color) and its action, one title gap over the students */
  ${({ theme }) => css`
    margin-bottom: ${pageTitleGap(theme)};
    h1 {
      margin: 0;
      ${pageTitleText(theme)}
    }
  `}
`

export const StudentName = styled.strong`
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
`

export const StudentDetails = styled.span`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

export const StudentCard = (props) => <CardButton {...props} data-student-card='' />

export const Empty = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`
