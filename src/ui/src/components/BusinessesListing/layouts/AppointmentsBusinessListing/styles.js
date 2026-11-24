import React from 'react'
import styled, { css } from 'styled-components'
import { headingText, pageGutter, themeBorderWidth, themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { Button } from '~ui/src/design-system/components/Button'
import { dividerLineCss, dividerSpacing } from '~ui/src/styles/Divider'
import { BannerContainer as PageBannerContainer } from '~ui/src/components/PageBanner/styles'
import { BannerContainer as CustomOrderBannerContainer } from '~ui/src/components/CustomOrderBanner/styles'
import { OrderProgressWrapper } from '~ui/src/components/OrderProgress/styles'
import { HighestRatedContainer, Title as HighestRatedTitle } from '~ui/src/components/HighestRated/styles'
import { focusRingRoomXCss } from '~ui/src/styles/Focus'
import { businessCardSideSpace } from '~ui/src/components/BusinessController/styles'

export const BusinessListContainer = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxl')} ${props => pageGutter(props.theme)}px;
  > h1 {
    ${props => headingText(props.theme, 'h1')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
`

export const WrapperSearch = styled.div`
  display: flex;
  align-items: center;
  > svg, > button {
    margin: 0 0 0 ${props => themeSpace(props.theme, 'sm')};
  }
  input {
    width: 100%;
  }
`

export const FilterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xl')};

  > div {
    /* section titles under the page's h1, with the h4 typography */
    > h2 {
      ${props => headingText(props.theme, 'h4')}
      margin: 0px;
    }
  }

  @media (min-width: 800px) {
    flex-direction: row;
    gap: 0;
  }
`

/* A part of the filters' row (the service types, the price levels): from
   800px a line after it ($divided, components.divider vertical) and the
   room of that line before the next one ($afterDivider) */
export const FilterPart = styled.div`
  padding: 0px;
  border: none;

  @media (min-width: 800px) {
    ${({ $divided }) => $divided && css`
      ${props => props.theme.rtl
? css`
        border-left: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'text_disabled')};
        padding-left: ${props => themeSpace(props.theme, 'xl')};
      `
: css`
        border-right: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'text_disabled')};
        padding-right: ${props => themeSpace(props.theme, 'xl')};
      `}
      ${props => dividerLineCss(props.theme, 'vertical', { edge: 'inline-end', padding: true })}
    `}
    ${({ $afterDivider }) => $afterDivider && css`
      ${props => props.theme.rtl ? `padding-right: ${themeSpace(props.theme, 'xl')};` : `padding-left: ${themeSpace(props.theme, 'xl')};`}
    `}
  }
  ${props => props.$afterDivider && `@media (min-width: 800px) {
    padding-${props.theme.rtl ? 'right' : 'left'}: ${dividerSpacing(props.theme, 'vertical')};
  }`}
`

export const PriceFilterListWrapper = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding-block-start: ${props => themeSpace(props.theme, 'md')};
  gap: ${props => themeSpace(props.theme, 'md')} calc(2 * ${props => themeSpace(props.theme, 'xs')});
`

export const PreorderAndBusinessWrapper = styled.div`
  display: flex;
  flex-direction: column;

  > div {
    margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  }

  /* the filters' column and the list: a third and two thirds (350px of the
     1400px of a wide page), the column never under 36ch */
  @media (min-width: 800px) {
    display: grid;
    grid-template-columns: minmax(36ch, 1fr) minmax(0, 3fr);
  }
`

export const PreorderWrapper = styled.div`
  width: 100%;
  min-width: min(100%, 31ch);
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 576px) {
    width: 75%;
  }

  /* from 800px it fills its grid column */
  @media (min-width: 800px) {
    width: 100%;
  }
`

export const PreorderContent = styled.div`
  position: sticky;
  top: 0px;
  background-color: ${props => themeColor(props.theme, 'surface')};
  z-index: 1;
  /* a content container of the theme (components.card) */
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
  padding: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'lg')};
  > h2 {
    ${props => headingText(props.theme, 'h2')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
    text-align: center;
  }
`

export const AddressWrapper = styled.div`
  padding-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const AddressHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    margin-bottom: 0px;
    ${props => headingText(props.theme, 'h4')}
  }
  span {
    cursor: pointer;
    user-select: none;
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 400 })}
    color: ${props => themeColor(props.theme, 'text_disabled')};
  }
`

// "Change" the address: a text action of components.link (sm).
export const AddressChangeLink = (props) => <Button {...props} appearance='link' size='sm' />

export const AddressContent = styled.div`
  display: flex;
  align-items: flex-start;
  margin-top: ${props => themeSpace(props.theme, 'md')};

  svg {
    flex-shrink: 0;
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
      margin-right: 0px;
    `}
  }

  span {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
  }
`

export const MomentWrapper = styled.div`
  padding-bottom: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  border-bottom: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'border')};
  ${props => dividerLineCss(props.theme, 'item')}
`

export const OrderTypeWrapper = styled.div`
  > h3 {
    ${props => headingText(props.theme, 'h4')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  }
`

export const SelectWrapper = styled.div`
  /* the select is a field of components.input and its list of
     components.menu, as the theme draws them (only their width here) */
  #select-input, #select-input > #list {
    width: 100%;
  }
`

export const EmptyStateWrapper = styled.div`
  width: 100%;
`

export const BusinessList = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin: 0px;

  /* the cards carry their side space: the first one starts at the edge */
  @media (min-width: 576px) {
    margin-left: -${props => businessCardSideSpace(props.theme)};
    width: 100%;
  }
`

export const BusinessListWrapper = styled.div`
  width: 100%;
  margin-left: 0px;
  > h2 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0px;
  }

  /* from 800px it takes the grid's wide column */
  @media (min-width: 800px) {
    margin-left: ${props => themeSpace(props.theme, 'xl')};
    width: auto;
  }
`

export const HightestRatedWrapper = styled.div`
  overflow: hidden;
  /* full bleed carousel: it pads its own title and first card */
  margin: 0 -${props => pageGutter(props.theme)}px;
`

/* The page's main sections (pages.business_listing, group main) one rhythm
   apart (tokens.space.xl), whatever order the theme gives them: the blocks
   drop the space they kept over and under themselves, and an empty one
   takes no place */
export const MainSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xl')};

  &:empty {
    display: none;
  }
  && ${CustomOrderBannerContainer}, && ${PageBannerContainer}, && > ${OrderProgressWrapper} {
    margin-top: 0;
    margin-bottom: 0;
  }
  ${CustomOrderBannerContainer} {
    max-width: 100%;
  }
  ${PageBannerContainer} {
    width: 100%;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
    /* a row of banners scrolls, so it clips: room at its sides for the
       focus ring of its first and last banners */
    ${props => focusRingRoomXCss(props.theme)}
  }
  /* the carousels: their title at the top of the block, nothing under it */
  && > ${HightestRatedWrapper} ${HighestRatedContainer} {
    padding-bottom: 0;
  }
  && > ${HightestRatedWrapper} ${HighestRatedTitle} {
    margin-top: 0;
  }
  && > ${HightestRatedWrapper}:empty {
    display: none;
  }
`
