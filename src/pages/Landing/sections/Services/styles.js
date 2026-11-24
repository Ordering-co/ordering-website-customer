import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeSpace, themeText } from '~/utils/themeTokens'

export const ServiceList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ theme }) => themeMedia(theme, '5xl')}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const Service = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  min-width: 0;
`

export const ServiceName = styled.h3`
  margin: 0;
  ${({ theme }) => themeText(theme, 'h3')}
`

export const ServiceTime = styled.span`
  color: ${({ theme }) => themeColor(theme, 'primary_text')};
  ${({ theme }) => themeText(theme, 'label')}
`

export const ServiceDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`
