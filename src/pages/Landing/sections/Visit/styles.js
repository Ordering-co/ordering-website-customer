import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeMedia, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'

const phone = `${MOBILE_WEB_MAX_WIDTH - 1}px`

export const VisitLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 40ch), 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'xxl')};
  align-items: stretch;
`

export const VisitDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  min-width: 0;

  address {
    font-style: normal;
    ${({ theme }) => themeText(theme, 'body_lg')}
  }
`

export const Contact = styled.a`
  ${({ theme }) => themeText(theme, 'body_lg')}
`

export const Hours = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: ${({ theme }) => themeSpace(theme, 'xs')} ${({ theme }) => themeSpace(theme, 'xl')};

  dt {
    ${({ theme }) => themeText(theme, 'label')}
  }

  dd {
    margin: 0;
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
  }

  @media (max-width: ${phone}) {
    gap: ${({ theme }) => themeSpace(theme, 'xs')} ${({ theme }) => themeSpace(theme, 'md')};
  }
`

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const MapBox = styled.div`
  min-height: ${({ theme }) => themeMedia(theme, '4xl')};
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'lg')};
  background: ${({ theme }) => themeColor(theme, 'surface')};

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: inherit;
    object-fit: cover;
  }
`
