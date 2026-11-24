import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeFontFamily, themeSpace, themeText, headingText } from '~/utils/themeTokens'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};

  > h3 {
    margin: ${({ theme }) => themeSpace(theme, 'xl')} 0 ${({ theme }) => themeSpace(theme, 'xs')};
    ${props => headingText(props.theme, 'h3')}
  }

  .name {
    font-family: ${({ theme }) => themeFontFamily(theme, 'body')};
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${({ theme }) => themeColor(theme, 'text')};
  }

  .meta {
    margin-top: ${({ theme }) => themeSpace(theme, 'xxs')};
    font-family: ${({ theme }) => themeFontFamily(theme, 'body')};
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
  }
`
