import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeMedia, themePart, themeRadius, themeShadow, themeSize, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'
import { getThemeCss, getThemeMobileCss } from '~/utils/themeCss'

// A card (components.card) of the page or the modal
const cardPart = (theme) => themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })

// The card of an offer (components.offer_card): its props and
// their changes on a phone (platforms.mobile_web, below 576px), as CSS
const offerPart = (theme, map) => themePart(theme, 'offer_card', map)
const offerBase = (theme) => getThemeCss(theme, 'offer_card').base
const offerMobile = (theme) => getThemeMobileCss(theme, 'offer_card')?.base || {}
const squareRules = (size) => `width: ${size}; min-width: ${size}; height: ${size}; min-height: ${size};`

// A declaration of a space of the theme (tokens.space)
const spaceRule = (theme, prop, level) => `${prop}: ${themeSpace(theme, level)};`

export const PromotionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  margin: 0 auto;
  padding: 0 ${props => themeSpace(props.theme, 'lg')};
  box-sizing: border-box;

  > h1 {
    margin-top: 0px;
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 993px){
    width: 70%;
    padding: 0px;
  }

  @media (min-width: 1200px){
    > h1 {
      ${props => headingText(props.theme, 'h1')}
    }
  }
  /* the box of the account pages; the offers apart */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
  ${props => css`
    > ${OfferWrapper} + ${OfferWrapper} {
      margin-top: ${themeSpace(props.theme, 'md')};
    }
  `}
  ${props => blockStill(props.theme)}
`

export const PromotionTitle = styled.h1`
  align-self: flex-start;
  /* the title of the account pages, one gap above the content */
  ${props => pageTitleRules(props.theme)}
  ${props => blockStill(props.theme)}
`

export const OfferWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  /* two and a half of the theme's largest control height */
  min-height: calc(2.5 * ${props => themeSize(props.theme, 'xl')});

  /* the card is not a control (its "Use coupon" button is), so it has no
     hover: the card's shadow (components.card base.shadow) in every state */
  /* components.card */
  ${props => cardPart(props.theme)}
  /* none under the last one (the page's bottom space is the
     box's); the space between two, PromotionsContainer */
  margin-bottom: 0;
  /* its padding inside its width, so it lines up with the
     page title and the search (100% + 50px overflowed the page box) */
  box-sizing: border-box;
  /* components.offer_card (its box; its padding, mobile_web
     below 576px) */
  ${({ theme }) => css`
    ${offerPart(theme, { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
    padding: ${offerMobile(theme).padding ?? offerBase(theme).padding};
    @media (min-width: 576px) {
      padding: ${offerBase(theme).padding};
    }
  `}
  ${props => blockStill(props.theme)}
`

export const OfferDescriptionWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* the action at the end also without the description (promotions.offer.description); the Button does not shrink */
  button {
    margin-inline-start: auto;
  }
  /* the description and its button the theme's md apart */
  ${props => spaceRule(props.theme, 'gap', 'md')}
  ${props => blockStill(props.theme)}
`

export const SingleOfferContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  /* the offer card's own line (offer_card.base.divider) */
  border-bottom: ${({ theme }) => offerBase(theme).divider};

  /* the offer's name (an h2 with the card title's look) */
  p, h4, h2 {
    margin: 0;
    ${props => blockStill(props.theme)}
  }

  h4, h2 {
    ${props => headingText(props.theme, 'h4')}
  }

  p {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 400 })}
  }

  @media (max-width: 424px) {
    flex-direction: column-reverse;
    height: auto;

    #offer-wrap {
      width: 100%;
      max-width: 100%;
      justify-content: center;
    }
    #offer-info {
      width: calc(100% - ${props => themeSpace(props.theme, 'sm')});
    }
  }
  /* the theme's md from the offer to its dashed line and from
     the line to the description (md between its parts on a phone too) */
  ${props => css`
    ${spaceRule(props.theme, 'padding-bottom', 'md')}
    ${spaceRule(props.theme, 'margin-bottom', 'md')}
    @media (max-width: 424px) {
      ${spaceRule(props.theme, 'gap', 'md')}
    }
  `}
  ${props => blockStill(props.theme)}
`

/* The offer's description: the theme's body, muted (secondary
   text under the offer's name). Two lines before it is cut (title= in
   index.js keeps the whole description). */
export const Description = styled.p`
  margin: 0;
  ${props => themeText(props.theme, 'body')}
  /* offer_card's description_text and description_color */
  ${props => offerPart(props.theme, { text: 'base.description_text', color: 'base.description_color' })}
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  ${props => blockStill(props.theme)}
`

export const ExpiresAt = styled.div`
  .or-while-stocks-last {
    font-weight: 400;
  }
  /* the theme's sm over the offer's name */
  ${props => spaceRule(props.theme, 'margin-bottom', 'sm')}
  /* offer_card's expiry_text and expiry_color */
  ${props => offerPart(props.theme, { text: 'base.expiry_text', color: 'base.expiry_color' })}
  ${props => blockStill(props.theme)}
`

export const OfferInfoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  ${props => spaceRule(props.theme, 'gap', 'sm')}
  ${props => blockStill(props.theme)}
`

export const OfferInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  /* as wide as the row leaves beside the offer's image (the 3xs media
     logo, OfferInfoWrapper): not a percentage, so the name keeps its room
     when there is no image */
  flex: 1;
  min-width: 0;

  ${({ isSkeleton }) => isSkeleton && css`
    width: 100%;
  `}

  /* the offer's name: two lines before it is cut (title= in index.js
     keeps the whole name) */
  h4, h2 {
    overflow: hidden;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    ${props => headingText(props.theme, 'h4')}
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 720px){
    h4, h2 {
      ${props => headingText(props.theme, 'h4')}
    }
  }
  /* the offer's name, offer_card's name_text and name_color */
  ${({ theme }) => css`
    h4, h2 {
      ${offerPart(theme, { text: 'base.name_text', color: 'base.name_color' })}
    }
    @media (min-width: 720px) {
      h4, h2 {
        ${offerPart(theme, { text: 'base.name_text' })}
      }
    }
  `}
  ${props => blockStill(props.theme)}
`

export const SearchBarContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: flex-start;
  /* a section of the page, the sections' xl from the offers */
  ${props => spaceRule(props.theme, 'margin-bottom', 'xl')}

  .search-bar {
    justify-content: flex-start;

    /* Layout-only override. The "Search promotion" field uses the canonical
       SearchBar look; focus/hover states are inherited from the base
       SearchBar (src/ui/src/components/SearchBar/styles.js). */
    .search-field {
      width: 100%;
    }
    ${props => blockStill(props.theme)}
  }

  ${props => blockStill(props.theme)}
`

const BusinessLogoStyled = styled.div`
  width: ${({ theme }) => themeMedia(theme, '3xs')};
  height: ${({ theme }) => themeMedia(theme, '3xs')};
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  min-height: ${({ theme }) => themeMedia(theme, '3xs')};

  /* this same box doubles as a business logo (the offer's "available
     businesses" list, isLogo): a logo mark is never cropped (contain, not
     cover), unlike the offer's own promotional image above */
  ${({ isLogo }) => isLogo && css`
    background-size: contain;
    object-fit: contain;
  `}

  /* an image is not a control, no hover (its shadow in every state) */
  /* the offer's image in the modal, the theme's md over the
     expiry */
  ${({ fromModal, theme }) => fromModal && spaceRule(theme, 'margin-bottom', 'md')}

  @media (min-width: 481px){
    ${({ isCustomerMode }) => isCustomerMode && css`
      width: 100%;
      height: 100%;
    `}
  }
  /* offer_card's image: image_size (mobile_web below 576px),
     modal_image_size in the offer's modal, image_radius and image_shadow */
  ${({ theme, fromModal, isCustomerMode }) => css`
    ${offerPart(theme, { 'border-radius': 'base.image_radius', 'box-shadow': 'base.image_shadow' })}
    ${fromModal
      ? squareRules(offerBase(theme).modal_image_size)
      : !isCustomerMode && css`
        @media (max-width: 575px) {
          ${squareRules(offerMobile(theme).image_size ?? offerBase(theme).image_size)}
        }
        @media (min-width: 576px) {
          ${squareRules(offerBase(theme).image_size)}
        }
      `}
    ${fromModal && css`
      @media (min-width: 481px) {
        ${squareRules(offerBase(theme).modal_image_size)}
      }
    `}
  `}
  ${props => blockStill(props.theme)}
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

export const SingleBusinessOffer = styled.div`
  display: flex;

  /* the row is not a control (its "Use coupon" button is): a card
     (components.card) with its shadow in every state; the theme's md inside
     and between the logo and the business; the list spaces the rows */
  ${props => css`
    box-sizing: border-box;
    align-items: center;
    margin: 0;
    color: ${themeColor(props.theme, 'text')};
    ${cardPart(props.theme)}
    ${spaceRule(props.theme, 'padding', 'md')}
    ${spaceRule(props.theme, 'gap', 'md')}
  `}

  ${props => blockStill(props.theme)}
`

export const AvailableBusinesses = styled.div`
  display: none;
  white-space: pre;
  width: 80%;

  p:nth-child(2){
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ${props => blockStill(props.theme)}
`

export const OfferData = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;

  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    margin: 0px;
    ${props => blockStill(props.theme)}
  }

  .offer-data-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .description {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      ${props => blockStill(props.theme)}
    }

    .terms-and-conditions {
      ${props => blockStill(props.theme)}
    }
    /* the theme's xs between the lines, sm under the
       description; "Terms and conditions" the theme's label (its bold kept) */
    ${props => css`
      ${spaceRule(props.theme, 'gap', 'xs')}
      .description {
        margin: 0;
        ${spaceRule(props.theme, 'margin-bottom', 'sm')}
      }
      .terms-and-conditions {
        ${themeText(props.theme, 'label', { props: ['size', 'line', 'weight'], weight: 600 })}
      }
    `}
    ${props => blockStill(props.theme)}
  }

  .offer-data-content-info {
    width: auto;
    width: -webkit-fill-available;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    border-radius: ${props => themeRadius(props.theme, 'xl')};
    box-shadow: ${props => themeShadow(props.theme, 'md')};

    /* a panel of information, no hover (its shadow in every state); the
       theme's surface_alt, md / lg inside, xs between the lines */
    ${props => css`
      box-sizing: border-box;
      background-color: ${themeColor(props.theme, 'surface_alt')};
      ${spaceRule(props.theme, 'gap', 'xs')}
      padding: ${themeSpace(props.theme, 'md')} ${themeSpace(props.theme, 'lg')};
    `}

    p {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const Code = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  /* the coupon's code is a text, not a control: no hover (its shadow in
     every state); the theme's sm inside, xs over it and lg under it */
  ${props => css`
    ${spaceRule(props.theme, 'padding', 'sm')}
    ${spaceRule(props.theme, 'margin-top', 'xs')}
    ${spaceRule(props.theme, 'margin-bottom', 'lg')}
  `}
  /* the coupon's box of offer_card (code_background,
     code_radius, code_shadow; its text code_text and code_color) */
  ${props => offerPart(props.theme, { 'background-color': 'base.code_background', 'border-radius': 'base.code_radius', 'box-shadow': 'base.code_shadow' })}

  span {
    ${props => blockStill(props.theme)}
  }

  p{
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    ${props => blockStill(props.theme)}
  }
  /* the coupon's text (offer_card code_text, code_color) */
  ${({ theme }) => css`
    span {
      ${offerPart(theme, { text: 'base.code_text', color: 'base.code_color' })}
    }
  `}
  ${props => blockStill(props.theme)}
`

export const ValueOfOffer = styled.div`

  p{
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    ${props => blockStill(props.theme)}
  }

  span{
    ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const BusinessInfo = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;

  p {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    width: 50%;
    text-align: left;
    ${props => blockStill(props.theme)}
  }

  @media(min-width: 720px){
    p{
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
      width: 70%;
    }
  }
  /* the row's gap is the space from the logo; the theme's md
     between the business's name and its button */
  ${props => css`
    margin: 0;
    min-width: 0;
    ${spaceRule(props.theme, 'gap', 'md')}
    p {
      margin: 0;
      text-align: start;
    }
  `}
  ${props => blockStill(props.theme)}
`

export const OfferView = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;

  h3 {
    ${props => headingText(props.theme, 'h3')}
    width: 100%;
    text-align: left;
    ${props => blockStill(props.theme)}
  }

  @media(min-width: 720px){
    h3 {
      ${props => headingText(props.theme, 'h3')}
    }
  }
  /* the offer's name is the modal's title (its title row
     spaces the content); "Available businesses for this offer" a section
     of it, the heading level below the title, the theme's xl over it and
     md down to the businesses */
  ${props => css`
    margin-top: 0;
    .available-businesses-title {
      ${headingText(props.theme, modalSectionLevel(props.theme))}
      width: 100%;
      margin: 0;
      text-align: start;
      ${spaceRule(props.theme, 'margin-top', 'xl')}
      ${spaceRule(props.theme, 'margin-bottom', 'md')}
    }
  `}
  ${props => blockStill(props.theme)}
`

export const OfferViewList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  /* the business rows the theme's md apart */
  ${props => spaceRule(props.theme, 'gap', 'md')}
  ${props => blockStill(props.theme)}
`
