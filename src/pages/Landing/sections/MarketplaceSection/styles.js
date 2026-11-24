import styled from 'styled-components'
import { themeSpace, pageGutter } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { pageWidth } from '~ui/src/styles/Page'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

// One band of the marketing page: its own vertical space (tokens.space.xxl)
// and a column as wide as the account pages' (the page's side space on a
// phone, a share of the screen from the phone cut)
export const Band = styled.section`
  box-sizing: border-box;
  width: 100%;
  padding: ${({ theme }) => themeSpace(theme, 'xxl')} ${({ theme }) => pageGutter(theme)}px;
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    padding-inline: 0;
  }
`

export const Column = styled.div`
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    width: ${({ theme }) => pageWidth(theme)};
  }
`

export const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')} ${({ theme }) => themeSpace(theme, 'lg')};
  margin-bottom: ${({ theme }) => themeSpace(theme, 'lg')};
`

// the title of a section (an h2): components.section_header
export const Title = styled.h2`
  margin: 0;
  ${({ theme }) => sectionTitleCss(theme, { level: 'h2', spaced: false, aligned: false })}
`

export const TitleSkeleton = styled.div`
  width: 40%;
`
