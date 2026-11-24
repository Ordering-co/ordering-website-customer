import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themeRadius, themeSpace, themeText, themeValue, themeScrollbar, themeSize, themeMedia } from '~/utils/themeTokens'
import { getThemeCss, getThemeMobileOverrides, isPositiveNumber, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { ribbonCss } from '~ui/src/styles/Ribbon'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

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

/* A section of products of the business page (a category, the featured
   products, order it again): components.product_section; its title is a
   section title (components.section_header). */
export const PRODUCT_SECTION = 'product_section'

// A number of columns, a whole number from 1
const wholeColumns = (value) => Math.max(1, Math.round(value))

// A number of columns of the section (base.<key>)
const sectionColumns = (theme, key) => wholeColumns(themeValue(theme, PRODUCT_SECTION, `base.${key}`))

/** A length of the section (base.<key>) as CSS. */
export const productSectionPx = (theme, key) => getThemeCss(theme, PRODUCT_SECTION).base[key]

/** The category's image next to its title (base.image_size and image_radius). */
export const productSectionImage = (theme) => {
  const size = productSectionPx(theme, 'image_size')
  return `min-width: ${size}; min-height: ${size}; width: ${size}; height: ${size};${themePart(theme, PRODUCT_SECTION, { 'border-radius': 'base.image_radius' })}`
}

/* The products of a category are a grid with the section's gap
   (product_section.base.gap, the theme's md by default) and its columns:
   the phone value of `columns` (platforms.mobile_web) below 576px,
   columns_tablet from 576px and columns from 1000px (one, two and three by
   default); with the cart beside the list columns_tablet from 576px. The
   cards fill their cell (no width or margin of their own) and the grid has
   no inset of its own: the cards line up with the category's title and the
   category bar. */
export const productsGridCss = (theme, withCart) => {
  const gap = productSectionPx(theme, 'gap')
  const mobile = getThemeMobileOverrides(theme, PRODUCT_SECTION)?.base?.columns
  const phone = isPositiveNumber(mobile) ? wholeColumns(mobile) : 1
  const tablet = sectionColumns(theme, 'columns_tablet')
  const desktop = sectionColumns(theme, 'columns')
  return css`
    display: grid;
    gap: ${gap};
    padding: 0;
    grid-template-columns: repeat(${phone}, minmax(0, 1fr));
    @media (min-width: ${MOBILE_WEB_MAX_WIDTH}px) {
      grid-template-columns: repeat(${tablet}, minmax(0, 1fr));
    }
    ${!withCart && css`
      @media (min-width: 1000px) {
        grid-template-columns: repeat(${desktop}, minmax(0, 1fr));
      }
    `}
    && > * {
      width: auto;
      margin: 0;
    }
  `
}

export const ProductsListing = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: ${({ isSubcategorySearch, theme }) => isSubcategorySearch ? '0px' : productSectionPx(theme, 'margin_bottom')};
  ${({ theme, $withCart }) => productsGridCss(theme, $withCart)}
`

export const WrapAllCategories = styled.div`
  .category-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    padding-top: ${props => themeSpace(props.theme, 'xs')};
    padding-bottom: ${props => themeSpace(props.theme, 'md')};

    img {
      border-radius: ${props => themeRadius(props.theme, 'sm')};
      min-width: ${props => themeSize(props.theme, 'md')};
      min-height: ${props => themeSize(props.theme, 'md')};
      height: ${props => themeSize(props.theme, 'md')};
      width: ${props => themeSize(props.theme, 'md')};
      margin-right: ${props => themeSpace(props.theme, 'md')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'md')};
        margin-right: 0;
      `}
      /* product_section.base.image_size and image_radius */
      ${props => productSectionImage(props.theme)}
    }

    /* no inset at any width, the title lines up with the cards (the grid has
       none either) */
    margin: 0;
  }

  /* the title of a category: a section of the business page */
  h2 {
    ${props => headingText(props.theme, 'h2')}
    color: ${props => themeColor(props.theme, 'text')};
    /* a section title (section_header: its text and color) */
    ${props => sectionTitleTextCss(props.theme, { level: 'h2' })}
    /* at the start of its row (see .category-title) */
    margin: 0;
  }
`

export const CategoryDescription = styled.div`
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
    /* at the start of the category's title above it, which lines up with
       the cards at every width */
    margin-left: 0;
    margin-inline-start: 0;
    display: flex;
    align-items: flex-end;
    /* its lines wrap in the width of the list at every width (a long one
       is cut at 200 characters, with "View more") */
    p {
      margin: 0;
      color: ${props => themeColor(props.theme, 'text_muted')};
      white-space: pre-line;
      min-width: 0;
      overflow-wrap: anywhere;
    }
`

export const WrapperNotFound = styled.div`
  height: 60dvh;
  > div{
    height: 100%;
  }
`

export const HeaderWrapper = styled.div``

export const DescriptionModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 ${props => themeSpace(props.theme, 'sm')};
  img{
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    width: ${props => themeMedia(props.theme, '4xl')};
    height: ${props => themeMedia(props.theme, '4xl')};
    min-width: ${props => themeMedia(props.theme, '4xl')};
    min-height: ${props => themeMedia(props.theme, '4xl')};
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
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

export const SubCategoriesContainer = styled.div`
  overflow: auto hidden;
  margin-top: ${props => themeSpace(props.theme, 'md')};
  width: 100%;
  ::-webkit-scrollbar {
      opacity: 0;
  }
  @media (min-width: 993px) {
    width: calc(100% - ${props => themeSpace(props.theme, 'xxl')});
  }
`

export const SubCategoriesInnerContainer = styled.div`
  display: flex;
`

export const ContainerButton = styled.div`
  margin-inline-end: ${props => themeSpace(props.theme, 'sm')};

  /* Reserve the chip's touch area inside the clipping scrollport. */
  @media (max-width: 575.98px), (pointer: coarse) {
    display: grid;
    place-items: center;
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`

export const SubcategorySearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: ${props => themeSpace(props.theme, 'xxl')};
`

export const PreviouslyOrderedContainer = styled.div`
    display: flex;
    overflow: scroll hidden;
    ::-webkit-scrollbar {
      width: 0px;
      height: 0px;
    }
`

export const PreviouslyOrderedWrapper = styled.div`
  display: flex;
  box-sizing: border-box;

  .product-card {
    flex: 0 0 34ch;
    width: 34ch;
    max-width: 34ch;
  }

`

// "View more" of a category description: a button of components.link, with
// its gap and on one line.
export const ViewMoreLink = (props) => (
  <Button {...props} appearance='link' style={{ marginInlineStart: 'var(--ot-space-md)', whiteSpace: 'nowrap' }} />
)
