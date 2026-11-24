import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeSpace, themeText } from '~/utils/themeTokens'
import { cardBoxCss } from '~ui/src/styles/Card'

export const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const Average = styled.strong`
  ${({ theme }) => themeText(theme, 'h3')}
`

export const Count = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

export const Quotes = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ theme }) => themeMedia(theme, '5xl')}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

export const Quote = styled.li`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
  ${({ theme }) => cardBoxCss(theme, 'card', { padding: true })}
`

export const QuoteText = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
`

export const QuoteAuthor = styled.span`
  margin-top: auto;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'label')}
`
