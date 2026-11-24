import React from 'react'
import styled, { css } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import { themeColor, withAlpha, primaryText } from '~/utils/themeColors'
import { headingText, themeBorderWidth, themeIconSize, themePart, themeShadow, themeSize, themeSpace, themeText, themeValue, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { getThemeComponent, getThemeCss, getThemeMobileOverrides, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { cardDecorationCss, stretchedCardCss } from '~ui/src/styles/Card'
import { badgeCss } from '~ui/src/styles/Badge'
import { ribbonCss } from '~ui/src/styles/Ribbon'
import { themeSlot } from '~/utils/themeGroups'
import { productSectionPx } from '~ui/src/components/BusinessProductsList/styles'
import { themeBaseNumber, themeTextKeepWeight } from '~/utils/productCartTheme'
import { usePhotoWithFallback } from '~ui/src/components/Image/useImageLoad'

// The image of the card at its start (components.product_card.base.image_position)
const imageOnLeft = (theme) => themeValue(theme, 'product_card', 'base.image_position') === 'left'

// components.product_card.base as CSS (its view)
const cardCss = (theme) => getThemeCss(theme, 'product_card').base

// the inner space of a card (product_card.base.padding)
const cardPadding = (theme) => cardCss(theme).padding

/**
 * The space between the parts of a card's info (name, last ordered,
 * description, the price row) and between the info and its image
 * (product_card.base.info_gap). The column has no space of its own at its
 * top or bottom: the card's padding gives it.
 */
export const productInfoGap = (theme) => cardCss(theme).info_gap

// the variant and size of a badge slot of the card
// (product_card.slots.<slot>), else `defaults`
const badgeSlot = (theme, slot, defaults) => {
  const value = themeSlot(theme, 'product_card', slot)
  return { ...defaults, ...(value?.variant && { variant: value.variant }), ...(value?.size && { size: value.size }) }
}

/**
 * The sizes (px) of the images of a product card
 * (`components.product_card.base`): `card` (the plain card, square),
 * `featured` (from 768px, square), `previous` / `previousMobile` (the width
 * of "order it again", previous_image_width, and its phone value of
 * platforms.mobile_web, below 576px; 4:3, see previousHeight),
 * `favorite` and `order` (square).
 */
export const productImageSizes = (theme) => {
  const base = getThemeComponent(theme, 'product_card').base
  return {
    card: base.image_size,
    featured: base.featured_image_size,
    previous: base.previous_image_width,
    previousMobile: getThemeMobileOverrides(theme, 'product_card').base.previous_image_width,
    favorite: base.favorite_image_size,
    order: base.order_image_size
  }
}

/**
 * The square sizes of productImageSizes as CSS (`card`, `featured`,
 * `favorite`, `order`), for what paints them.
 */
export const productImageCss = (theme) => {
  const base = cardCss(theme)
  return {
    card: base.image_size,
    featured: base.featured_image_size,
    favorite: base.favorite_image_size,
    order: base.order_image_size
  }
}

/**
 * The tint of a sold-out card: the muted text at 20%, a layer of its own over
 * the card's background (a background image paints over the background color,
 * under the content), so it shows whatever background the theme gives the
 * card. After the card's background, whose shorthand resets the image.
 */
export const soldOutTintCss = (theme) => {
  const tint = withAlpha(themeColor(theme, 'text_muted'), 51 / 255)
  return `background-image: linear-gradient(${tint}, ${tint});`
}

// The height of a 4:3 image of `width` (the "order it again" cards, T3)
export const previousHeight = (width) => Math.round(width * 3 / 4)

/**
 * The height the image gives the row of a plain card, a favorite or an order
 * (a CSS length; null: none). The card holds it from its first render, before
 * the photo or even its content is there, so it does not jump when they come.
 * The plain card and the order keep it with the image hidden: the text of
 * CardInfo is as tall as the image either way. A favorite takes none then.
 */
export const imageRowHeight = (theme, { isFavorite, fromOrders, hideImage }) => {
  const sizes = productImageCss(theme)
  if (isFavorite) return hideImage ? null : sizes.favorite
  return fromOrders ? sizes.order : sizes.card
}

// A reserved height of a card, as a multiple of the theme's xl control size (56px by default), so it
// follows the store's controls and not a fixed px
const cardRows = (theme, rows) => `calc(${rows} * ${themeSize(theme, 'xl')})`

export const CardContainer = styled.div`
  ${({ isShowAddButt, theme }) => css`
    min-height: ${cardRows(theme, isShowAddButt ? 3 : 2)};
  `}
  padding: ${props => cardPadding(props.theme)};
  margin: ${props => themeSpace(props.theme, 'md')};
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  box-shadow: ${props => themeShadow(props.theme, 'sm', 'product_card')};

  ${({ useCustomFunctionality }) => useCustomFunctionality && css`
    justify-content: center;
  `}

  > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    ${({ theme }) => imageOnLeft(theme)
      ? css`
        flex-direction: row-reverse;
      `
      : css`
        flex-direction: row;
      `
    }

    ${({ useCustomFunctionality }) => useCustomFunctionality && css`
      justify-content: center;
    `}

    ${({ isPreviously }) => isPreviously && css`
      flex-direction: column;
      align-items: flex-start;
      width: 98%;
    `}
    ${({ isFeatured }) => isFeatured && css`
      flex-direction: column;
      align-items: flex-start;
    `}
    /* the row of image and info is as tall as the image from the first render */
    ${({ theme, isPreviously, isFeatured, useCustomFunctionality, isFavorite, fromOrders, $hideImage }) => {
      if (useCustomFunctionality) return ''
      // the carousels' cards: their image is above the info, the row starts as tall as it
      if (isPreviously) {
        const { previous, previousMobile } = productImageSizes(theme)
        return css`
          min-height: ${previousHeight(previousMobile)}px;
          @media (min-width: ${MOBILE_WEB_MAX_WIDTH}px) { min-height: ${previousHeight(previous)}px; }
        `
      }
      if (isFeatured) {
        const sizes = productImageCss(theme)
        return css`
          min-height: ${sizes.card};
          @media (min-width: 768px) { min-height: ${sizes.featured}; }
        `
      }
      const height = imageRowHeight(theme, { isFavorite, fromOrders, hideImage: $hideImage })
      return height ? `min-height: ${height};` : ''
    }}
  }

  /* Decorative labels fill the lanes sized by the card. */
  .add-button,
  .order-button {
    display: block;
    width: 100%;
    margin-top: ${props => themeSpace(props.theme, 'md')};
  }
  ${({ productsRows }) => productsRows
    ? css`
    width: calc(${productsRows === 3 ? 33 : 50}% - ${props => themeSpace(props.theme, 'xl')});
    margin: ${props => themeSpace(props.theme, 'md')} 0;
  `
    : css`
    width: 100%;
    margin: ${props => themeSpace(props.theme, 'md')};
    @media (min-width: 576px) {
      margin: ${props => themeSpace(props.theme, 'md')};
      width: calc(100% - 2 * ${props => themeSpace(props.theme, 'md')});

      ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
        margin: 0px 0px ${props => themeSpace(props.theme, 'xxl')};
      `}
      ${({ isPreviously }) => isPreviously && css`
        margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} 0px;
      `}
      ${({ isFeatured }) => isFeatured && css`
        margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')} 0px;
      `}
    }

    ${({ isCartOnProductsList }) => isCartOnProductsList
        ? css`
          @media (min-width: 993px) {
            width: calc(50% - ${props => themeSpace(props.theme, 'xl')});
            margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'md')} 0px;
            ${props => props.theme?.rtl && css`
              margin: ${props => themeSpace(props.theme, 'md')} 0px ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xl')};
            `}
          }
        `
        : css`
          @media (min-width: 681px) {
            width: calc(50% - ${props => themeSpace(props.theme, 'xl')});
          }
          @media (min-width: 1000px) {
            width: calc(33% - ${props => themeSpace(props.theme, 'xl')});
          }
      `}
  `}

  ${({ isPreviously }) => isPreviously && css`
    min-height: ${({ theme }) => cardRows(theme, 3.5)};
    margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'md')} 0px;
    ${props => props.theme?.rtl && css`
      margin: ${props => themeSpace(props.theme, 'md')} 0px ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')};
    `}

    @media (min-width: 768px) {
      min-height: ${({ theme }) => cardRows(theme, 6)};
    }
  `}

  ${({ isFeatured }) => isFeatured && css`
    min-height: ${({ theme }) => cardRows(theme, 3.5)};
    margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'md')} 0px;
    ${props => props.theme?.rtl && css`
      margin: ${props => themeSpace(props.theme, 'md')} 0px ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'xs')};
    `}

    @media (min-width: 768px) {
      min-height: ${({ theme }) => cardRows(theme, 5.5)};
    }
  `}

  /* the cards of a carousel of the business page (featured,
     order it again) apart by the section's gap, as in a category's grid
     (product_section.base.gap, the theme's md by default) */
  ${({ theme, isFeatured, isPreviously }) => (isFeatured || isPreviously) && css`
    margin-left: 0;
    margin-right: 0;
    margin-inline-end: ${productSectionPx(theme, 'gap')};
  `}

  ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
    padding: ${props => themeSpace(props.theme, 'lg')};
  `}
  /* components.product_card */
  ${props => themePart(props.theme, 'product_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'font-family': 'base.font_role' })}
  /* a sold-out card keeps its background (the theme's) under the tint
     (soldOutTintCss), then takes the sold-out opacity of
     components.product_card */
  ${props => props.soldOut && soldOutTintCss(props.theme)}
  ${props => props.soldOut && themePart(props.theme, 'product_card', { opacity: 'variants.default.states.sold_out.opacity' })}
  ${props => blockStill(props.theme)}
  /* the hover of components.product_card (its shadow; faded when
     the theme animates it), only on a card that opens its product; one that
     only shows it has no hover and no pointer */
  ${props => props.$clickable !== false && cardHoverCss(props.theme, 'product_card')}
  ${props => props.$clickable === false && 'cursor: default;'}
  /* a stretched link: the card is a plain box, its name the
     button that opens it (CardLink); "Order" is only the look of that action
     (the click goes through it to the name) */
  ${props => stretchedCardCss(props.theme, 'product_card')}
  .order-button,
  .add-button {
    pointer-events: none;
  }
`

export const SoldOut = styled.span`
  position: absolute;
  top: ${props => themeSpace(props.theme, 'sm')};
  right: 0px;
  ${props => props.theme?.rtl && css`
    left: 0px;
    right: initial;
  `}
  &:first-letter {
    text-transform: uppercase;
  }

  ${({ isBottom }) => isBottom && css`
    bottom: ${props => themeSpace(props.theme, 'sm')};
    top: initial;
  `}
  /* a badge of the theme (components.badge, inverse, md) at the
     card's edge: square on the edge it touches, the badge's corners inside;
     not a control (the pointer goes through to the card's name) */
  ${({ theme }) => css`
    ${badgeCss(theme, { ...badgeSlot(theme, 'sold_out_badge', { variant: 'inverse', size: 'md' }), weight: 'bold' })}
    ${theme?.rtl
      ? 'border-top-left-radius: 0; border-bottom-left-radius: 0;'
      : 'border-top-right-radius: 0; border-bottom-right-radius: 0;'}
    ${cardDecorationCss(theme)}
  `}
`

export const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  /* as tall as, and beside, an image of the theme's size (product_card.base.image_size) */
  min-height: ${({ theme }) => productImageCss(theme).card};

  ${({ isBgimage, hideImage, theme }) => css`
    width: ${isBgimage && !hideImage ? `calc(100% - ${productImageCss(theme).card})` : '100%'};
  `}

  /* the parts apart by the info gap (none above the first or under
     the last); a part that is not shown is not rendered, so it leaves no
     double gap */
  gap: ${props => productInfoGap(props.theme)};

  .description {
    ${props => themePart(props.theme, 'product_card', { text: 'base.description' })}
    /* product_card.base description_color and description_lines
       (a card of one line keeps its one) */
    ${props => themePart(props.theme, 'product_card', { color: 'base.description_color' })}
    ${props => !props.oneLine && `-webkit-line-clamp: ${Math.round(themeBaseNumber(props.theme, 'product_card', 'description_lines'))};`}
  }

  .product-card-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    ${({ fromOrders }) => fromOrders && css`
      flex-direction: column;
      align-items: flex-start;
      @media (min-width: 520px) {
        flex-direction: row;
        align-items: center;
      }
    `}
    ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
      flex-wrap: nowrap;
      flex-direction: column;
      align-items: flex-start;

      @media (min-width: 480px) {
        flex-direction: row;
        align-items: center;

      }
    `}
  }

  p {
    /* no paragraph margin: the info gap separates the parts */
    margin: 0;
    color: ${props => themeColor(props.theme, 'text')};
    text-align: left;
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    ${props => props.theme?.rtl && css`
      text-align: right;
    `}

    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    white-space: pre-wrap;

    ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    `}
  }

  span {
    color: ${props => themeColor(props.theme, 'text')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  ${({ oneLine }) => oneLine && css`
    p {
      -webkit-line-clamp: 1;
    }
  `}

  ${({ isPreviously }) => isPreviously && css`
    width: 100%;
    min-height: ${({ theme }) => cardRows(theme, 2)};
  `}

  ${({ isFeatured }) => isFeatured && css`
    width: 100%;
    min-height: unset;
  `}

  ${({ isPreviously, isFeatured }) => !isPreviously && !isFeatured && css`
    justify-content: space-between;
  `}

  @media (min-width: 1024px) {
    p {
      ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    }
    ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
      p {
        ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
      }
    `}
    span {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }
  }
  /* the text of a plain card beside its image of the theme's
     size (product_card.base.image_size), as tall as it at least; the text
     of a card of a past order as tall as its image (order_image_size) */
  ${({ theme, isBgimage, hideImage, isPreviously, isFeatured, isFavorite, fromOrders }) => {
    const sizes = productImageCss(theme)
    if (fromOrders) return `min-height: ${sizes.order};`
    if (isPreviously || isFeatured || isFavorite) return ''
    return `
      min-height: ${sizes.card};
      ${isBgimage && !hideImage ? `width: calc(100% - ${sizes.card});` : ''}
    `
  }}
`

export const WrapLogo = styled.div`
  position: relative;
  /* apart from the info by the info gap, on the side it faces
     (logical: the row flips in RTL) */
  ${({ theme }) => imageOnLeft(theme)
    ? css`
    margin-inline-end: ${productInfoGap(theme)};
  `
    : css`
    margin-inline-start: ${productInfoGap(theme)};
  `}
  /* over the info (featured, order it again): the info gap under it */
  ${({ isPreviously, isFeatured }) => (isPreviously || isFeatured) && css`
    margin: 0px 0px ${props => productInfoGap(props.theme)} 0px;
  `}

  /* a favorite: the info gap toward the info, the xxxl space on the
     other side */
  ${({ isFavorite }) => isFavorite && css`
    margin: 0px;
    margin-inline-start: ${props => productInfoGap(props.theme)};
    margin-inline-end: ${props => themeSpace(props.theme, 'xxxl')};
  `}

  /* a product of a past order: the xxxl space toward the info */
  ${({ fromOrders }) => fromOrders && css`
    margin: 0px;
    ${({ theme }) => imageOnLeft(theme)
      ? css`
        margin-inline-end: ${props => themeSpace(props.theme, 'xxxl')};
      `
      : css`
        margin-inline-start: ${props => themeSpace(props.theme, 'xxxl')};
      `
    }
  `}

  /* the product images of a card are square (1:1, cover) at
     the theme's sizes (components.product_card.base: image_size, featured
     from 768px, favorite, order); the wide cards of "order it again" are 4:3
     like the product modal at previous_image_width (its phone value of
     platforms.mobile_web below 576px), inside the 4:3 safe area of the square
     photo (T3) */
  ${({ theme, isPreviously, isFeatured, isFavorite, fromOrders, isBgimage }) => {
    const sizes = productImageCss(theme)
    // (CSS lengths)
    const box = (width, height = width) => `
      width: ${width};
      max-width: ${width};
      height: ${height};
      max-height: ${height};
      .image {
        min-height: ${height};
      }
    `
    if (isPreviously) {
      // 4:3, its height computed from the width (px)
      const { previous, previousMobile } = productImageSizes(theme)
      return css`
        ${box(`${previousMobile}px`, `${previousHeight(previousMobile)}px`)}
        @media (min-width: ${MOBILE_WEB_MAX_WIDTH}px) {
          ${box(`${previous}px`, `${previousHeight(previous)}px`)}
        }
      `
    }
    if (isFeatured) {
      return css`
        ${box(sizes.card)}
        @media (min-width: 768px) {
          ${box(sizes.featured)}
        }
      `
    }
    if (isFavorite) return box(sizes.favorite)
    if (fromOrders) return box(sizes.order)
    return css`
      max-width: ${sizes.card};
      max-height: ${sizes.card};
      height: ${sizes.card};
      ${isBgimage && `width: ${sizes.card};`}
      .image {
        min-height: ${sizes.card};
      }
    `
  }}

  ${({ hideImage }) => hideImage && css`
    max-width: 0px;
    max-height: 0px;
    height: 0px;
    width: 0px;
    /* and takes no space beside the info */
    margin: 0px;
    /* a hidden image draws nothing (not its shadow, not its border) */
    .image {
      display: none;
    }
  `}  /* the image is not a control: the pointer goes through it to
     the card's name (a box with a position, it would sit over the link) */
  ${({ theme }) => cardDecorationCss(theme)}
`

export const WrapTags = styled.div`
  display: flex;
  margin-left: ${props => themeSpace(props.theme, 'md')};
  margin-right: ${props => themeSpace(props.theme, 'md')};
  overflow-x: auto;

  ${({ isBgimage }) => isBgimage && css`
    width: ${props => themeSize(props.theme, 'lg')};
  `}
  ${props => props.theme?.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'xs')};
    margin-left: 0px;
  `}

  div {
    display: flex;
    margin: auto;
  }
  ::-webkit-scrollbar {
    display: none;
  }

  /* a tag's image: an icon of the theme (md) */
  img {
    width: ${props => themeIconSize(props.theme, 'md')};
    height: ${props => themeIconSize(props.theme, 'md')};
    margin-right: ${props => themeSpace(props.theme, 'xs')};
    /* product_card.base.tag_size */
    ${props => themePart(props.theme, 'product_card', { width: 'base.tag_size', height: 'base.tag_size' })}
  }
`

const CardLogoStyled = styled.div`
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  background-position: center;
  object-fit: cover;
  /* its height is the one WrapLogo gives its .image; the image takes the image rounding and the border of the card, and
     a shadow of its own like a store's logo (product_card.base.image_shadow;
     null → none) */
  ${props => themePart(props.theme, 'product_card', { 'border-radius': 'base.image_radius', border: 'base.border', 'box-shadow': 'base.image_shadow' })}

  /* no picture to show: the fill of the loading placeholders (the border
     color, set globally for skeletons), still, never an empty box */
  &[data-image-state='placeholder'] {
    background-color: ${props => themeColor(props.theme, 'border')};
  }

  /* the loading placeholder takes the whole box without changing it (out of
     the flow) and the box's rounding */
  .image-skeleton {
    position: absolute;
    inset: 0;
    display: block;
    border-radius: inherit;
    overflow: hidden;
  }
  .image-skeleton .react-loading-skeleton {
    display: block;
    height: 100%;
    line-height: inherit;
  }
`

/**
 * The photo of a card. It is painted only once it is whole (`useImageLoad`): a
 * photo drawn as it arrives stays half painted when the download is slow or cut.
 *   - loading: the theme's loading placeholder (a skeleton) fills the box;
 *   - photo failed: the theme's placeholder image (`fallbackImage`) takes its
 *     place, loaded the same way;
 *   - that failed too, or there is none: the box keeps the placeholder fill.
 * The box is the same in every state (its size comes from WrapLogo).
 */
export const CardLogo = ({ bgimage, fallbackImage, soldOut, children, ...rest }) => {
  const { state, url } = usePhotoWithFallback(bgimage, fallbackImage)

  const style = {}
  if (state === 'loaded') {
    style.backgroundImage = `url("${url}")`
  }
  if (soldOut) {
    style.filter = 'brightness(70%)'
  }
  return (
    <CardLogoStyled {...rest} data-image-state={state} style={style}>
      {state === 'loading' && (
        <Skeleton containerClassName='image-skeleton' borderRadius='inherit' width='100%' height='100%' />
      )}
      {children}
    </CardLogoStyled>
  )
}

export const PriceWrapper = styled.div`
  display: flex;
  align-items: center;

  span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  }
  .current-price {
    min-width: 8ch;
  }
  .off-price {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    margin-left: ${props => themeSpace(props.theme, 'xs')};
    text-decoration: line-through;
    ${({ isOffPrice }) => isOffPrice && css`
      min-width: ${props => themeSize(props.theme, 'lg')};
    `}
    ${props => props.theme.rtl && css`
      margin-right: ${themeSpace(props.theme, 'xs')};
      margin-left: 0;
    `}

    @media (min-width: 1024px) {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      ${({ isOffPrice }) => isOffPrice && css`
        min-width: 8ch;
      `}
      ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
        ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
      `}
    }
  }

  ${({ isFavorite, fromOrders }) => (isFavorite || fromOrders) && css`
    gap: ${props => themeSpace(props.theme, 'md')};

    span {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
      ${({ fromOrders }) => fromOrders && css`
        ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
      `}
    }
  `}
  ${props => themePart(props.theme, 'product_card', { text: 'base.price', color: 'base.price_color' })}
  /* the price itself is the card's price (over the spans' own text) */
  .current-price {
    ${props => themePart(props.theme, 'product_card', { text: 'base.price', color: 'base.price_color' })}
  }
  /* the price before the offer (product_card.base offer_price,
     its weight the price's, and offer_price_color), at every width; the
     cards of favorites and orders keep their text */
  ${({ theme, isFavorite, fromOrders }) => css`
    && .off-price {
      ${!isFavorite && !fromOrders ? themeTextKeepWeight(theme, 'product_card', 'offer_price') : ''}
      ${themePart(theme, 'product_card', { color: 'base.offer_price_color' })}
    }
  `}
`

export const QuantityContainer = styled.div`
  position: absolute;
  top: ${props => themeSpace(props.theme, 'sm')};
  right: ${props => themeSpace(props.theme, 'sm')};
  z-index: 999;

  ${props => props.theme?.rtl && css`
    right: initial;
    left: ${props => themeSpace(props.theme, 'sm')};
  `}
  /* a count of components.badge (primary, md, the count
     shape) in its place over the image, ringed by the surface; its number
     in the badge's text; not a control (the pointer goes through to the
     card's name) */
  ${({ theme }) => css`
    ${badgeCss(theme, { ...badgeSlot(theme, 'quantity_badge', { variant: 'primary', size: 'md' }), count: true, weight: 600 })}
    width: auto;
    border: ${themeBorderWidth(theme, 'thick', { fixed: true })} solid ${themeColor(theme, 'surface')};
    span {
      font: inherit;
    }
    ${cardDecorationCss(theme)}
  `}
`

export const RibbonBox = styled.div`
  position: absolute;
  box-sizing: border-box;
  z-index: 10;
  color: ${props => themeColor(props.theme, 'on_primary')};
  top: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
  inset-inline-end: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
  background-color: ${props => themeColor(props.theme, 'primary')};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 9ch;
  word-break: break-all;

  ${({ bgColor }) => bgColor && css`
    background-color: ${bgColor};
  `}
  /* a ribbon of the theme (components.ribbon: text, inner
     space, the corners of its shape); its color is the product's. Not a
     control: the pointer goes through to the card's name */
  ${({ theme, isRoundRect, isCapsule }) => ribbonCss(theme, { rounded: isRoundRect, capsule: isCapsule })}
  ${({ theme }) => cardDecorationCss(theme)}
`

export const LastOrder = styled.span`
  color: ${props => primaryText(props.theme)};
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], important: true, weight: 400 })}
`

export const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    ${props => headingText(props.theme, 'h3')}
    text-align: left;
    margin: 0px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    white-space: pre-wrap;

    ${({ isPreviously, isFeatured, isFavorite, fromOrders }) => (isPreviously || isFeatured || isFavorite || fromOrders) && css`
      -webkit-line-clamp: 1;
    `}
    /* components.product_card (name), over the heading's own text */
    ${props => themePart(props.theme, 'product_card', { text: 'base.name', color: 'base.name_color' })}
  }
  /* the name has no margin of its own and is the theme's name
     (components.product_card name and name_color) wherever the card is: a
     page's own h3 rule, as the search's, does not reach it. The card's
     padding is above it, the info gap under it */
  && h3 {
    margin: 0px;
    ${props => themePart(props.theme, 'product_card', { text: 'base.name', color: 'base.name_color' })}
  }
`
// the spacing of the card's info (CardInfo, WrapLogo)
export const SkeletonCardInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: calc(100% - ${props => productImageCss(props.theme).card});
  gap: ${props => productInfoGap(props.theme)};
`
export const SkeletonCardLogo = styled.div`
  max-width: ${props => productImageCss(props.theme).card};
  max-height: ${props => productImageCss(props.theme).card};
  width: ${props => productImageCss(props.theme).card};
  height: ${props => productImageCss(props.theme).card};
  margin-inline-start: ${props => productInfoGap(props.theme)};
`
