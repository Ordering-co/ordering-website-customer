import styled from 'styled-components'
import { themeBorderWidth, themeFontFamily, themeText, themeSpace } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { dividerLineCss } from '~ui/src/styles/Divider'

export const Container = styled.div`
  border-top: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${({ theme }) => themeColor(theme, 'border')};
  ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  padding-top: ${props => themeSpace(props.theme, 'lg')};
`

export const SelectWrapper = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

`

export const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};
  margin: ${props => themeSpace(props.theme, 'sm')} 0 ${props => themeSpace(props.theme, 'xs')};
  font-family: ${({ theme }) => themeFontFamily(theme, 'body')};

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    color: ${({ theme }) => themeColor(theme, 'text')};
  }
`

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'xs')} 0 ${props => themeSpace(props.theme, 'md')};
`
