import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themePart, themeRadius, themeSize, themeSpace, themeIconSize, themeText, blockStill, buttonStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'

/**
 * A suggested product is a card of components.product_card (its
 * box; not a control: no hover, the pointer only on its Add), its name and
 * price the card's text, its image the card's image radius and image
 * shadow.
 */
const productCardBoxCss = (theme) => `${themePart(theme, 'product_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}
    cursor: default;`
const productCardNameCss = (theme) => themePart(theme, 'product_card', { text: 'base.name' })
const productCardPriceCss = (theme) => themePart(theme, 'product_card', { text: 'base.price', color: 'base.price_color' })
const productCardImageCss = (theme) => themePart(theme, 'product_card', { 'border-radius': 'base.image_radius', 'box-shadow': 'base.image_shadow' })

// a length of the card as CSS (product_card.base.<key>)
const productCardPx = (theme, key) => getThemeCss(theme, 'product_card').base[key]

/**
 * A suggested product of the horizontal list. Its width is
 * product_card.base.upselling_width (in the cart, "Complement your order",
 * as wide as its image), its padding the card's (base.padding), the space to
 * the next one the gap of a product section (product_section.base.gap).
 */
const upsellingItemCss = (theme, fromCartPopover) => {
  const padding = `padding: ${productCardPx(theme, 'padding')};`
  if (fromCartPopover) return padding
  const side = theme?.rtl ? 'left' : 'right'
  return `
    width: ${productCardPx(theme, 'upselling_width')};
    margin-${side}: ${getThemeCss(theme, 'product_section').base.gap};
    ${padding}
  `
}

/**
 * The image of a suggested product, square:
 * product_card.base.upselling_image_size (upselling_cart_image_size in the
 * cart), a space sm from the details.
 */
const upsellingImageCss = (theme, fromCartPopover) => {
  const size = fromCartPopover
    ? productCardPx(theme, 'upselling_cart_image_size')
    : productCardPx(theme, 'upselling_image_size')
  const space = themeSpace(theme, 'sm')
  const side = theme?.rtl ? 'right' : 'left'
  return `
    img {
      min-width: ${size};
      min-height: ${size};
      width: ${size};
      height: ${size};
      ${!fromCartPopover ? `margin-${side}: ${space};` : ''}
    }
    ${fromCartPopover ? `margin-bottom: ${space};` : ''}
  `
}

export const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  width: 100%;

  @media (min-width: 768px){
    justify-content: flex-start;
    height: auto;
  }
`

export const UpsellingContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  overflow: auto;
`

export const Item = styled.div`
  display: flex;
  width: 70%;
  min-width: min(100%, 19ch);
  padding: ${props => themeSpace(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'lg')} 0;
  flex-direction: column;
  justify-content: flex-start;
  text-align: center;
  box-sizing: border-box;

  @media (min-width: 490px) {
    width: 43%;
  }

  @media (min-width: 769px) {
    width: 27%;
    padding: ${props => themeSpace(props.theme, 'md')};
  }

  @media (min-width: 1024px) {
    width: 20%;
    margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'lg')};
  }
  ${props => blockStill(props.theme)}
  ${props => productCardBoxCss(props.theme)}
`

export const Image = styled.div`
  width: 100%;
  img{
    width: 100%;
    height: auto;
    /* the square thumbnail reserves its shape before the lazy load */
    aspect-ratio: 1 / 1;
    ${props => blockStill(props.theme)}
    ${props => productCardImageCss(props.theme)}
  }
`

export const Details = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  div {
    width: 100%;
    /* two lines before it is cut (title= in index.js keeps the whole name) */
    .name {
      margin-block-start: 0.1em;
      margin-block-end: 0.1em;
      text-align: center;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      overflow-wrap: anywhere;
      ${props => blockStill(props.theme)}
      ${props => productCardNameCss(props.theme)}
    }
  }
  p{
    margin: ${props => themeSpace(props.theme, 'xxs')} auto;
    ${props => blockStill(props.theme)}
    ${props => productCardPriceCss(props.theme)}
  }
  button {
    margin: ${props => themeSpace(props.theme, 'sm')} auto 0;
  }

  @media (min-width: 480px){
    div{
      .name {
        ${props => themeText(props.theme, 'body', { props: ['size'] })}
      }
    }
  }
`

export const CloseUpselling = styled.div`
  width: 100%;
  text-align: center;
`

// The slot of "No, Thanks": 90% of the dialog, 40% from 720px, centered; the Button fills it
export const CloseAction = styled.div`
  display: flex;
  width: 90%;
  margin-inline: auto;

  @media (min-width: 720px){
    width: 40%;
  }
`

export const SkeletonContainer = styled.div`
  display: flex;
  width: 15%;
  margin: ${props => themeSpace(props.theme, 'xl')};
  padding: ${props => themeSpace(props.theme, 'sm')};
  flex-direction: column;
  justify-content: flex-start;
  text-align: center;
  border-radius: ${props => themeRadius(props.theme, 'md')};
  overflow: hidden;
`

export const HorizontalUpsellingContainer = styled.div`
  display: flex;
  min-height: calc(3.4 * ${props => themeSize(props.theme, 'xl')});
`

export const HorizontalItem = styled.div`
  display: flex;
  justify-content: space-between;
  box-sizing: border-box;

  ${({ fromCartPopover }) => fromCartPopover && css`
    flex-direction: column-reverse;
    align-items: flex-start;
    justify-content: flex-end;
  `}
  ${props => blockStill(props.theme)}
  ${props => productCardBoxCss(props.theme)}
  ${props => upsellingItemCss(props.theme, props.fromCartPopover)}
`

export const HorizontalImage = styled.div`
  display: flex;
  align-items: center;

  img {
    ${props => blockStill(props.theme)}
    ${props => productCardImageCss(props.theme)}
  }
  ${props => upsellingImageCss(props.theme, props.fromCartPopover)}
`

export const HorizontalDetails = styled.div`
  min-width: 12ch;
  position: relative;

  > div {
    line-height: calc(var(--ot-text-caption-size) * var(--ot-text-caption-line));
  }

  .name {
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    ${props => blockStill(props.theme)}
    ${props => productCardNameCss(props.theme)}
  }

  /* its texts (the price), not the inner span of its base Buttons (Add) */
  span:not(button span) {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};

    &.discount {
      ${props => themeText(props.theme, 'caption', { props: ['size'] })}
      color: ${props => themeColor(props.theme, 'text_muted')};
      ${props => props.theme?.rtl
? css`
        margin-right: ${props => themeSpace(props.theme, 'xs')};
      `
: css`
        margin-left: ${props => themeSpace(props.theme, 'xs')};
      `}
    }
    ${props => blockStill(props.theme)}
  }

  > button {
    position: absolute;
    bottom: 0px;
    left: 0px;
    margin-top: ${props => themeSpace(props.theme, 'xs')};
  }

  ${({ fromCartPopover }) => fromCartPopover && css`
    width: 100%;
    max-width: 16ch;
    .price-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
      /* a bare icon of the row; the Add's is the Button's own */
      > svg {
        font-size: ${props => themeIconSize(props.theme, 'lg')};
        cursor: pointer;
        ${props => buttonStill(props.theme)}
      }
    }
    h3 {
      ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
      -webkit-line-clamp: 1;
      word-break: break-all;
      margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    }
  `}
  /* the price, the card's price text (components.product_card) */
  .price-container > span {
    ${props => productCardPriceCss(props.theme)}
  }
  /* in the cart, as wide as the image above it */
  ${props => props.fromCartPopover && `max-width: ${productCardPx(props.theme, 'upselling_cart_image_size')};`}
`

export const WrapAutoScroll = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
  overflow-x: auto;
  display: flex;
`

export const UpsellingPageTitleWrapper = styled.div`
  display: flex;
  align-items: center;

  p {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 500 })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }

  /* a bare icon of the title; the close's is the Button's own */
  > svg {
    font-size: ${props => themeIconSize(props.theme, 'md')};
    cursor: pointer;
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin-left: ${props => themeSpace(props.theme, 'xxl')};

    ${props => props.theme?.rtl && css`
      margin-right: ${props => themeSpace(props.theme, 'xxl')};
      margin-left: 0px;
    `}
    ${props => buttonStill(props.theme)}
  }
  /* the close is a button of the theme: the gap is the row's, its icon the button's */
  > button {
    margin-inline-start: ${props => themeSpace(props.theme, 'xxl')};
  }

  ${({ fromCartPopover }) => fromCartPopover && css`
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    p {
      margin: 0px 0px 0px;
      ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 600 })}
    }

    span {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }
  `}
`
