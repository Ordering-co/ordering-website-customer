import styled from 'styled-components'
import { headingText, themeSpace, themeText } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'

/* The landing fills the viewport under the header (its height, measured by
   the header; components.header height until it is). */
export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
  min-height: calc(100vh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
  /* tokens.space.xxl above and below, xl at the sides */
  padding: ${props => themeSpace(props.theme, 'xxl')} ${props => themeSpace(props.theme, 'xl')};
  background: ${({ theme }) => themeColor(theme, 'background')};
`

export const Title = styled.h1`
  margin: 0 0 ${props => themeSpace(props.theme, 'md')};
  ${props => headingText(props.theme, 'h1')}
  color: ${({ theme }) => themeColor(theme, 'text')};
`

export const Message = styled.p`
  margin: 0;
  max-width: min(100%, 52ch);
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'line'] })}
  color: ${({ theme }) => themeColor(theme, 'text')};
`
