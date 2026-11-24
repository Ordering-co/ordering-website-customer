import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeRadius, themeSpace, themeText, themeScrollbar, themeSize, themeMedia } from '~/utils/themeTokens'
import { ribbonCss } from '~ui/src/styles/Ribbon'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { productsGridCss } from '../../styles'

export const ProductsContainer = styled.div`
  background: ${props => themeColor(props.theme, 'background')};
`

/* a danger alert of the theme (the products could not load) */
export const ErrorMessage = styled.div.attrs(alertAttrs('danger'))`
  padding: ${props => themeSpace(props.theme, 'lg')};
  width: 100%;
  background-color: ${props => themeColor(props.theme, 'border_strong')};
  margin: 0 ${props => themeSpace(props.theme, 'lg')};
  color: ${props => themeColor(props.theme, 'danger_text')};
  font-weight: bold;
  ${props => alertRules(props.theme, 'danger')}
`

export const ProductsListing = styled.div`
  display: flex;
  flex-wrap: wrap;
  /* the grid of the products list (see productsGridCss) */
  ${({ theme, $withCart }) => productsGridCss(theme, $withCart)}
`

export const WrapAllCategories = styled.div`
  .category-title {
    display: flex;
    align-items: center;
    justify-content: ${({ isCategorySelected }) => isCategorySelected ? 'flex-start' : 'space-between'};
    margin-left: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      margin-right: ${props => themeSpace(props.theme, 'md')};
      margin-left: 0;
    `}

    img {
      border-radius: ${props => themeRadius(props.theme, 'sm')};
      min-width: ${props => themeSize(props.theme, 'md')};
      min-height: ${props => themeSize(props.theme, 'md')};
      height: ${props => themeSize(props.theme, 'md')};
      width: ${props => themeSize(props.theme, 'md')};
    }
  }
  .wrap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  /* the title of a category: a section of the business page */
  h2 {
    ${props => headingText(props.theme, 'h2')}
    color: ${props => themeColor(props.theme, 'text')};
    /* at the start of its row (the row holds the space), like the
       description under it */
    margin-left: 0;
    margin-right: 0;
  }
`

export const WrapperNotFound = styled.div`
  height: 60dvh;
  > div{
    height: 100%;
  }
`

export const HeaderWrapper = styled.div`
  width: 100%;
`

export const DescriptionModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  img{
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    width: ${props => themeMedia(props.theme, '5xl')};
    height: ${props => themeMedia(props.theme, '5xl')};
    min-width: ${props => themeMedia(props.theme, '5xl')};
    min-height: ${props => themeMedia(props.theme, '5xl')};
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
  p{
    white-space: pre;
  }
`

export const RibbonBox = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};
  box-sizing: border-box;
  color: ${props => themeColor(props.theme, 'on_primary')};
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
  background-color: ${props => themeColor(props.theme, 'primary')};
  max-width: min(100%, 30ch);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-left: ${props => themeSpace(props.theme, 'xs')};

  ${props => props.theme.rtl && css`
    margin-left: 0px;
    margin-right: ${props => themeSpace(props.theme, 'xs')};
  `}

  ${({ bgColor }) => bgColor && css`
    background-color: ${bgColor};
  `}

  ${({ isRoundRect }) => isRoundRect && css`
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  `}

  ${({ isCapsule }) => isCapsule && css`
    border-radius: ${props => themeRadius(props.theme, 'full')};
  `}
  /* a ribbon of the theme (components.ribbon: text, inner
     space, the corners of its shape); its color is the category's */
  ${({ theme, isRoundRect, isCapsule }) => ribbonCss(theme, { rounded: isRoundRect, capsule: isCapsule })}
`

export const CategoryDescripion = styled.div`
    margin-left: ${props => themeSpace(props.theme, 'md')};
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
    display: flex;
    align-items: flex-end;
    p {
      margin: 0;
      color: ${props => themeColor(props.theme, 'text_muted')};
      max-width: ${({ maxWidth }) => maxWidth ? `${maxWidth - 200}px` : 'initial'};
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
    }
`

export const DescriptionContainer = styled.div`
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  div{
    height: 40dvh;
    ::-webkit-scrollbar {
      width: ${props => themeScrollbar(props.theme).size};
      height: ${props => themeScrollbar(props.theme).size};
    }
  }
  p{
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
`

export const HeaderTitle = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
`

// "View more" of a category description: a button of components.link, with
// its gap and on one line.
export const ViewMoreLink = (props) => (
  <Button {...props} appearance='link' style={{ marginInlineStart: 'var(--ot-space-md)', whiteSpace: 'nowrap' }} />
)
