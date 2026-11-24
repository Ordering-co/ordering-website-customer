import styled, { css } from 'styled-components'
import { themeRadius, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
export const BusinessCategoryTitle = styled.span`
  display: block;
  z-index: 100;
  position: relative;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  /* the label of a tab of the theme; the tab draws the active one and
     centers it (no padding, line nor colors of its own) */
  color: inherit;
  font-weight: inherit;
  user-select: none;
  white-space: nowrap;
  padding: 0;
  margin: 0;
  ${props => blockStill(props.theme)}
`

/**
 * A row of chips of a filter (the business types, the price levels of
 * /business_search): they wrap, one tokens.space.sm apart, from the start of
 * the block; a chip spaces its own icon (chip.base.gap).
 */
export const chipRowCss = (theme) => `
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: ${themeSpace(theme, 'sm')};
`

export const SearchTypeContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
  position: relative;
  ${({ theme }) => chipRowCss(theme)}
  /* the appointments' types: centered, sm under the block above */
  ${({ isSearchMode, theme }) => !isSearchMode && css`
    justify-content: center;
    padding-top: ${themeSpace(theme, 'sm')};
  `}

  .react-loading-skeleton {
    border-radius: ${props => themeRadius(props.theme, 'full')};
  }
`
