import styled, { css } from 'styled-components'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'

export const PaginationContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
`

export const PaginationButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'xs')};
  ${props => props.theme?.rtl
? css`
    margin-left: ${props => themeSpace(props.theme, 'xl')};
  `
: css`
    margin-right: ${props => themeSpace(props.theme, 'xl')};
  `}
`

/* the row spaces them (tokens.space.xs) */
const pageGap = css`
  margin-left: 0;
  margin-right: 0;
`

/* The gap between page numbers (not a button). */
export const PageEllipsis = styled.span`
  padding: 0 ${props => themeSpace(props.theme, 'sm')};
  ${pageGap}
`

export const PageSizeContainer = styled.div`
  display: flex;
  align-items: center;
  margin: ${props => themeSpace(props.theme, 'md')} 0;

  .select {
    border-color: ${props => themeColor(props.theme, 'text_disabled')};
    padding: ${props => themeSpace(props.theme, 'xs')} 0;

    > div:first-child {
      padding-left: ${props => themeSpace(props.theme, 'sm')};
      padding-right: ${props => themeSpace(props.theme, 'sm')};
    }
  }
`

export const PageSizeTitle = styled.p`
  margin: 0px;
  color: ${props => themeColor(props.theme, 'text_disabled')};
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  ${props => props.theme?.rtl
? css`
    margin-left: ${props => themeSpace(props.theme, 'md')};
  `
: css`
    margin-right: ${props => themeSpace(props.theme, 'md')};
  `}
`

export const Option = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_disabled')};
`
