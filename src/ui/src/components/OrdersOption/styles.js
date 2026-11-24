import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeIconSize, themeMedia, themeRadius, themeScrollbar, themeSize, themeSpace, themeText, headingText } from '~/utils/themeTokens'

export const OptionTitle = styled.div`
  width: 100%;
  margin: ${({ isBusinessesPage }) => isBusinessesPage ? '0' : '0 auto'};
  padding: ${({ isBusinessesPage, theme }) => isBusinessesPage ? `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'lg')} 0` : `0 ${themeSpace(theme, 'lg')}`};
  h4{
    ${props => headingText(props.theme, 'h4')}
    margin: 0;
  }
  /* the orders page (titleLevel): a section of its h1 */
  h2 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0;
  }

  @media (min-width: 768px){
    padding: ${({ isBusinessesPage, theme }) => isBusinessesPage ? `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'lg')} 0` : '0'};
    width: 100%;
  }
`

export const OrdersContainer = styled.div`
  ${({ activeOrders }) => activeOrders && css`
    padding: 0 ${props => themeSpace(props.theme, 'sm')};
    text-align: center;
    display: flex;
    justify-content: ${({ ordersLength }) => !ordersLength ? 'flex-start' : 'center'};
    width: 100%;
    margin: auto 0px auto auto;
    box-sizing: border-box;
    ${props => props.theme?.rtl && css`
      margin: auto auto auto 0px;
    `}
    ::-webkit-scrollbar {
      width: 0px;
      height: 0px;
    }

    ${({ isSkeleton }) => !isSkeleton && css`
      /* the theme's scrollbar (tokens.scrollbar.size) */
      ::-webkit-scrollbar {
        width: ${props => themeScrollbar(props.theme).size};
        height: ${props => themeScrollbar(props.theme).size};
      }
      ${({ ordersLength, isBusinessesPage }) => !ordersLength && !isBusinessesPage && css`
        > div {
          margin-left: calc(-1 * ${props => themeSpace(props.theme, 'md')});
          ${props => props.theme?.rtl && css`
            margin-left: 0;
            margin-right: calc(-1 * ${props => themeSpace(props.theme, 'md')});
          `}
        }
        > div:first-child {
          margin-left: calc(-1 * ${props => themeSpace(props.theme, 'lg')});
          ${props => props.theme?.rtl && css`
            margin-left: 0;
            margin-right: calc(-1 * ${props => themeSpace(props.theme, 'lg')});
          `}
        }
      `}
    `}

    @media (min-width: 768px) {
      width: 100%;
      justify-content: flex-start;
      ${({ isSkeleton, ordersLength }) => !isSkeleton && !ordersLength && css`
        > div:first-child {
          ${({ isBusinessesPage }) => !isBusinessesPage && css`
            margin-left: calc(-1 * ${props => themeSpace(props.theme, 'md')});
            ${props => props.theme?.rtl && css`
              margin-left: 0;
              margin-right: calc(-1 * ${props => themeSpace(props.theme, 'md')});
            `}
          `}
        }
      `}
    }
  `}

  ${({ activeOrders }) => !activeOrders && css`
    width: 100%;
    display: flex;
    flex-direction: column-reverse;
    margin: 0 auto;

    p {
      margin-block-end: 0;
      margin-block-start: 0;
      color: ${props => themeColor(props.theme, 'text_muted')};
    }

    @media(min-width: 480px) {
      width: 100%;
      padding: 0;
    }
  `}
`

export const SkeletonOrder = styled.div`
  display: flex;

  ${({ activeOrders }) => activeOrders && css`
    width: auto;
    text-align: center;
    margin-left: ${props => themeSpace(props.theme, 'md')};

    ${props => props.theme?.rtl && css`
      margin-right: ${props => themeSpace(props.theme, 'md')};
      margin-left: 0;
    `}
  `}

  ${({ activeOrders }) => !activeOrders && css`
    width: 100%;
    flex-direction: column;
    margin: ${props => themeSpace(props.theme, 'md')} 0;
    > * {
      margin: ${props => themeSpace(props.theme, 'xl')} 0;
    }
  `}
`

export const SkeletonCard = styled.div`
  margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')};
`

export const SkeletonContent = styled.div`
  display: flex;
  width: 100%;

  ${({ activeOrders }) => activeOrders && css`
    > * {
      margin: ${props => themeSpace(props.theme, 'xs')};
    }
  `}

  ${({ activeOrders }) => !activeOrders && css`
    justify-content: space-between;
  `}
`

export const SkeletonText = styled.div`
  display: flex;
  flex-direction: column;
  text-align: left;

  ${props => props.theme?.rtl && css`
    text-align: right;
  `}
`

export const SkeletonButton = styled.div`
    span{
      border-radius: ${props => themeRadius(props.theme, 'xl')};
      width: min(100%, 34ch);
      height: ${props => themeSize(props.theme, 'md')};
    }
  @media(min-width: 480px){
    span{
      width: min(100%, 45ch);
    }
  }
`

export const SkeletonInformation = styled.div`
  display: flex;

  > *{
    margin: ${props => themeSpace(props.theme, 'xs')};
  }
`

export const SkeletonReorder = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  text-align: center;
  align-items: center;
  margin-right: ${props => themeSpace(props.theme, 'xl')};

  ${props => props.theme?.rtl && css`
    margin-left: ${props => themeSpace(props.theme, 'xl')};
    margin-right: 0;
  `}

  span:first-child span{
    width: ${props => themeSize(props.theme, 'md')};
  }

  span:last-child{
    width: min(100%, 9ch);
    height: ${props => themeSize(props.theme, 'sm')};
  }

  @media(min-width: 480px){
    ${props => props.theme?.rtl
? css`
      margin-left: 0;
    `
: css`
      margin-right: 0;
    `}
    span:first-child span{
      width: ${props => themeMedia(props.theme, '2xs')};
    }
    span:last-child{
      width: min(100%, 19ch);
    }
  }
`

export const ImageNotFound = styled.div`
  margin: 0 auto;
  img{
    width: 100%;
  }
`

export const BusinessInformation = styled.div`
  display: inline-flex;
  flex-direction: column;
  flex: 1;

  ${({ activeOrders }) => activeOrders && css`
      width: 30%;
  `}
  .orders-detail {
    display: flex;
    align-items: center;

    svg {
      background: transparent;
      border: none;
      opacity: 1;
      color: ${props => themeColor(props.theme, 'text_muted')};
      width: ${props => themeIconSize(props.theme, 'sm')};
      min-width: ${props => themeIconSize(props.theme, 'sm')};
    }
  }
  /* the business name identifies the order: it wraps to 2 lines before it
     is cut, never on one line with "…" */
  h3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    ${props => headingText(props.theme, 'h3')}
    margin-block-start: 0;
  }
  p {
    margin-block-end: 0.1em;
    margin-block-start: 0.1em;
    color : ${({ theme }) => themeColor(theme, 'text')};
    width: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* the order's number and date (implementation notes, B3): each fact stays whole and the date drops to its own line when both
     do not fit beside the actions; a fact longer than the room wraps, nothing is cut with an ellipsis */
  .orders-detail p {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    .order-fact {
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
  }

  .order-status {
    color: ${props => primaryText(props.theme)};
    width: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p[name='view_order'] {
    color: ${props => primaryText(props.theme)};
    cursor: pointer;
    text-decoration: none;
    width: fit-content;
  }

  @media (min-width: 480px){
    h3 {
      margin-block-start: 0.1em;
    }
  }
  /* the texts of an order card are the theme's, not a fraction
     of the inherited size (body under 768px, body_lg from it); the name
     md over them; no indent of its own (the card's padding is the only one:
     the business logo of the card is never shown) */
  ${props => css`
    && {
      font-size: inherit;
      padding-left: 0;
      padding-right: 0;
    }
    && h3 {
      margin-bottom: ${themeSpace(props.theme, 'md')};
    }
    && p {
      ${themeText(props.theme, 'body', { props: ['size', 'line'] })}
    }
    @media (min-width: 768px) {
      && p {
        ${themeText(props.theme, 'body_lg', { props: ['size', 'line'] })}
      }
    }
  `}
`

export const NoOrdersWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  > p {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 500 })}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
`

export const BusinessListWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;
`

export const BusinessControllerSkeleton = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  > div {
    flex: 1;
  }

  ${({ horizontal }) => horizontal && css`
    @media (min-width: 681px){
      flex-direction: row;
    }
  `}
`

export const ProductsListing = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: ${props => themeSpace(props.theme, 'xxxl')};

  ${({ horizontal }) => !horizontal && css`
    flex-direction: column;
    flex-wrap: wrap;
    margin-bottom: ${props => themeSpace(props.theme, 'xxxl')};
    width: 100%;
    .product-card {
      width: auto !important;
      max-width: none !important;
    }
  `}
`
