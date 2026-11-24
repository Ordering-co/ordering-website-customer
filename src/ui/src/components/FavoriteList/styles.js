import React from 'react'
import styled, { css } from 'styled-components'
import { headingText, themeMedia, themePart, themeRadius, themeScrollbar, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'

// `margin-<side>: <space level>`
const spaceRule = (theme, side, level) => `margin-${side}: ${themeSpace(theme, level)};`

export const Container = styled.div`
  width: 100%;
  /* a section of the page, xl under the tabs */
  ${props => spaceRule(props.theme, 'top', 'xl')}
`

export const FavoriteListWrapper = styled.div`
  overflow: hidden auto;
  width: 100%;

  ${({ isLoading }) => isLoading
    ? css`
    ::-webkit-scrollbar {
        width: 0px;
        height: 0px;
    }
  `
    : css`
      ::-webkit-scrollbar {
          /* the theme's scrollbar (tokens.scrollbar.size) */
          width: ${props => themeScrollbar(props.theme).size};
          height: ${props => themeScrollbar(props.theme).size};
      }
  `}
`

export const FavoriteListing = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'xxs')};

  .card-wrapper {
    padding: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'lg')};
  }
`

export const ReadMoreCard = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  /* lg under the last card */
  ${props => spaceRule(props.theme, 'top', 'lg')}
`

export const FavPopupView = styled.div`
  text-align: center;
  /* the product (the title of the popup) and what follows */
  h3 {
    ${props => headingText(props.theme, 'h3')}
  }
  h4 {
    ${props => headingText(props.theme, 'h4')}
  }
  /* the product's name is the modal's title (its row holds the close), so
     the content starts at the top; md under the subtitle */
  margin-top: 0;
  > h2, > h3, > h4 {
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
  }
`

/* What the popup lists (the businesses of the product): a section of the
   modal, one level under its title. */
export const FavPopupSubtitle = styled.h4.attrs(props => ({ as: modalSectionLevel(props.theme) }))`
  ${props => headingText(props.theme, modalSectionLevel(props.theme))}
`

/* The businesses of the popup md apart */
export const BusinessOffers = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};
`

/* A business of the popup, as in the offers' popup
   (Promotions): a card (components.card) that is not a control (its button
   is), md inside and between the logo and the business. */
export const SingleBusinessOffer = styled.div`
  display: flex;
  box-sizing: border-box;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'md')};
  gap: ${props => themeSpace(props.theme, 'md')};
  color: ${props => themeColor(props.theme, 'text')};
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
`

export const BusinessInfo = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  /* the row's gap is the space from the logo; md between the business's
     name and its button */
  margin: 0;
  min-width: 0;
  gap: ${props => themeSpace(props.theme, 'md')};
  p {
    margin: 0;
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    width: 50%;
    text-align: left;
  }
  @media(min-width: 720px) {
    p {
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
      width: 70%;
    }
  }
`

export const Image = styled.div`
  width: 100%;
  img{
    width: 100%;
    height: auto;
    border-radius: ${props => themeRadius(props.theme, 'lg')};
    aspect-ratio: attr(width) / attr(height)
  }
`

const BusinessLogoStyled = styled.div`
  /* a saved business's logo box: the 3xs image size (it was 65px, then 75px
     from 481px: now 70px at both) */
  width: ${props => themeMedia(props.theme, '3xs')};
  height: ${props => themeMedia(props.theme, '3xs')};
  min-height: ${props => themeMedia(props.theme, '3xs')};
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};

  @media (min-width: 481px){
    min-width: ${props => themeMedia(props.theme, '3xs')};
    ${({ isCustomerMode }) => isCustomerMode && css`
      width: 100%;
      height: 100%;
    `}
  }
`

export const BusinessLogo = (props) => {
  const style = {}
  if (props.bgimage) {
    style.backgroundImage = `url("${props.bgimage}")`
  }

  return (
    <BusinessLogoStyled {...props} style={style}>
      {props.children}
    </BusinessLogoStyled>
  )
}

export const ProductsListing = styled.div`
  display: flex;
  flex-direction: column;
  /* a section, xl over the list that follows */
  margin-bottom: ${({ isSubcategorySearch, theme }) => isSubcategorySearch ? '0px' : themeSpace(theme, 'xl')};

  .product-card {
    width: 100%;
  }
`
