import React from 'react'
import styled, { css, useTheme } from 'styled-components'
import { themeColor, primaryText, legibleOver, isTransparent } from '~/utils/themeColors'
import { themeBorderWidth, themeIconSize, themeMedia, themePart, themeRadius, themeShadow, themeSize, themeSpace, themeText, themeValue, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { cardDecorationCss, stretchedCardCss } from '~ui/src/styles/Card'
import { Badge, badgeCss } from '~ui/src/styles/Badge'
import { ribbonCss } from '~ui/src/styles/Ribbon'
import { themeSlot } from '~/utils/themeGroups'
import { getThemeCss, getThemeMobileCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'

/**
 * The padding of the card in px (a number, for what is placed from it):
 * `components.business_card.base.padding`. The header bleeds over it and the
 * ribbon and the call center counts sit at it from the card's edge.
 */
export const businessCardPadding = (theme) => themeValue(theme, 'business_card', 'base.padding')

// The card's own values as CSS (its view)
const cardCss = (theme) => getThemeCss(theme, 'business_card').base

// The text of the card that sits on a color the card paints (implementation notes, M4): the theme's own color, made legible over
// that color. The star and the theme's values stay as they are.
const cardPaint = (theme) => {
  const { background } = cardCss(theme)
  return isTransparent(background) ? themeColor(theme, 'background') : background
}
const onCard = (theme, color) => legibleOver(color, cardPaint(theme))
const onHeader = (theme, color) => legibleOver(color, cardCss(theme).header_background)
const ratingText = (theme) => onCard(theme, themeValue(theme, 'rating', 'base.color'))

// A length of the card for small screens (its platforms.mobile_web, below
// MOBILE_WEB_MAX_WIDTH) as CSS, or null when the phone keeps the card's own
const mobileLength = (theme, key) => getThemeMobileCss(theme, 'business_card')?.base?.[key] ?? null

// The media query of the small screens of platforms.mobile_web. The theme's
// sizes go on a doubled class (&&): the card's own steps at 481px are media
// rules, which come after the plain declarations of a class
const MOBILE_WEB = `@media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px)`

/**
 * The heights of the card's header (`header_height`, and
 * `header_height_listing` in the business listing) as CSS lengths, and their
 * values below 576px (`mobile` / `mobileListing`, platforms.mobile_web), or
 * null each.
 */
export const businessCardHeaderHeights = (theme) => ({
  mobile: mobileLength(theme, 'header_height'),
  mobileListing: mobileLength(theme, 'header_height_listing'),
  size: cardCss(theme).header_height,
  listing: cardCss(theme).header_height_listing
})

/**
 * The logo size of the business card (components.business_card.base.
 * logo_size) as a CSS length, and its value below 576px (`mobile`,
 * platforms.mobile_web), or null.
 */
export const businessCardLogoSizes = (theme) => ({
  size: cardCss(theme).logo_size,
  mobile: mobileLength(theme, 'logo_size')
})

/**
 * The space a card of a grid keeps at each side (tokens.space.lg): two cards
 * of a row are twice it apart, and the list that holds them cancels it at its
 * edges (a negative margin of it) so the first card starts at the page's edge.
 */
export const businessCardSideSpace = (theme) => themeSpace(theme, 'lg')

// The space a card of a grid keeps above and under it (tokens.space.sm)
const businessCardRowSpace = (theme) => themeSpace(theme, 'sm')

// The width of a card that takes `share` of its row, its side spaces out
const cardWidth = (theme, share) => `calc(${share} - 2 * ${businessCardSideSpace(theme)})`

export const ContainerCard = styled.div`
  box-sizing: border-box;
  height: auto;
  /* a column: the header keeps its height and the content takes the rest,
     the extra height of a row (its cards stretch to the tallest) included;
     no cap on its height, so nothing in it runs past its edge */
  display: flex;
  flex-direction: column;
  border-radius: ${props => themeRadius(props.theme, 'md', 'business_card')};
  margin: ${({ m, theme }) => m ?? `${businessCardRowSpace(theme)} ${businessCardSideSpace(theme)}`};
  box-shadow: ${props => themeShadow(props.theme, 'md', 'business_card')};
  padding: ${props => themeSpace(props.theme, 'sm')};

  /* the call center's cards keep their height as a floor: a store name on
     two lines grows the card instead of being cut */
  ${({ isCustomerMode }) => isCustomerMode && css`
    min-height: ${({ isSkeleton, theme }) => isSkeleton ? 'auto' : `calc(7.5 * ${themeSize(theme, 'xl')})`};
  `}

  ${({ minWidthEnabled, theme }) => minWidthEnabled && css`
    min-width: ${cardWidth(theme, '65%')};
  `}

  ${({ hideProductList, fromBusinessListingSearch }) => !hideProductList && fromBusinessListingSearch && css`
    min-width: min(85%, 44ch);
  `}

  ${({ firstCard }) => firstCard && css`
    margin-left: 0;
  `}

  ${({ disabled }) => disabled && css`
    cursor: not-allowed;
  `}

  ${({ businessRows, isShowMap, fromFavoriteList, fromMyOrders, theme }) => !isShowMap && !fromFavoriteList && !fromMyOrders && css`
    width: ${cardWidth(theme, '100%')};

    ${({ isCustomerMode }) => isCustomerMode && css`
      @media (min-width: 481px) {
        min-height: ${({ isSkeleton, theme }) => isSkeleton ? 'auto' : `calc(6.8 * ${themeSize(theme, 'xl')})`};
      }
    `}

    @media (min-width: 681px) {
      width: ${cardWidth(theme, '50%')};
    }

    @media (min-width: 993px) {
      width: ${cardWidth(theme, '33.33%')};
    }

    @media (min-width: 1400px) {
      width: ${cardWidth(theme, businessRows === 3 ? '33.33%' : '25%')};
    }
  `}

  ${({ isShowMap, theme }) => isShowMap && css`
    width: ${cardWidth(theme, '100%')};
    margin: ${businessCardSideSpace(theme)};
  `}

  ${({ fromFavoriteList, fromMyOrders }) => (fromFavoriteList || fromMyOrders) && css`
    width: 100%;
    margin: 0px 0 ${props => themeSpace(props.theme, 'xl')};
    padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
  `}
  /* components.business_card */
  ${props => themePart(props.theme, 'business_card', { background: 'base.background', border: 'base.border', 'font-family': 'base.font_role' })}
  ${props => blockStill(props.theme)}
  @media (hover: hover) and (pointer: fine) {
    /* The card's theme supplies its hover shadow and motion. A skeleton or a
       disabled business keeps its resting shadow. */
    ${props => cardHoverCss(props.theme, 'business_card')}
    ${({ theme, $still }) => $still && css`
      &:hover {
        box-shadow: ${themeShadow(theme, 'md', 'business_card')};
      }
    `}
  }
  /* the box of a card whose name is its link (stretched link) */
  ${props => stretchedCardCss(props.theme, 'business_card')}
  ${({ disabled }) => disabled && 'cursor: not-allowed;'}
  /* the card's padding (components.business_card.base.padding); the
     favorites and orders cards keep their own */
  ${({ theme, fromFavoriteList, fromMyOrders }) => !fromFavoriteList && !fromMyOrders &&
    `padding: ${cardCss(theme).padding};`}
`

/* a plain box; the card (ContainerCard) places the link's cover, so it spans
   the whole card */
export const WrapperBusinessCard = styled.div`
  /* the whole card (it is the card's column), a column itself */
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: static;
  text-decoration: none;
  cursor: default;
  ${({ disabled }) => disabled && css`
    pointer-events: none;
    cursor: not-allowed;
  `}
`

export const BusinessHero = styled.div`
  /* the header's height of the theme, never stretched or shrunk */
  flex: none;
  border-radius: ${props => themeRadius(props.theme, 'md')};

  > span {
    display: flex;
  }
`

const BusinessHeaderStyled = styled.div`
  display: flex;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  justify-content: center;
  align-items: center;
  border-radius: ${props => themeRadius(props.theme, 'xl')} ${props => themeRadius(props.theme, 'xl')} 0 0;

  ${({ isShowMap }) => isShowMap && css`
    min-height: unset;
  `}

  /* statuses over the card header (closing soon, closed, disabled): text, not headings */
  .closing-soon, .closed, .disabled {
    margin: 0;
    opacity: 0.7;
  }

  .closing-soon {
    ${props => themeText(props.theme, 'h3')}
  }

  .closed, .disabled {
    text-transform: uppercase;
    ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 600 })}
    opacity: 1;
    position: relative;
    z-index: 2;
  }

  .disabled {
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    text-align: center;

  }
  /* statuses over the link's cover: the pointer goes through */
  .closing-soon, .closed, .disabled {
    ${props => cardDecorationCss(props.theme)}
  }

  ${({ $noImage, theme }) => $noImage && css`
    background-color: ${themeColor(theme, 'secondary')};

    .closing-soon, .closed, .disabled {
      color: ${onHeader(theme, themeColor(theme, 'text_muted'))};
    }
    .closed, .disabled {
      color: ${onHeader(theme, themeColor(theme, 'text'))};
    }
  `}
  /* the header sits on the card's edge, its top corners follow the card radius */
  ${props => themePart(props.theme, 'business_card', { 'border-top-left-radius': 'base.radius', 'border-top-right-radius': 'base.radius' })}
  /* the header bleeds over the card's padding, at the theme's
     heights; its statuses in the theme's text and color over the image, and
     without an image the header's background (components.business_card) */
  ${({ theme, isShowMap, fromBusinessListing, $noImage }) => {
    const padding = businessCardPadding(theme)
    const heights = businessCardHeaderHeights(theme)
    const desktop = fromBusinessListing ? heights.listing : heights.size
    const mobile = fromBusinessListing ? heights.mobileListing : heights.mobile
    const statusText = themePart(theme, 'business_card', { text: 'base.status' })
    const statusColor = themePart(theme, 'business_card', { color: 'base.status_color' })
    const statusOpacity = themePart(theme, 'business_card', { opacity: 'base.status_opacity' })
    return css`
      margin: -${padding}px -${padding}px 0 -${padding}px;
      width: calc(100% + ${padding * 2}px);
      ${!isShowMap && `&& { min-height: ${desktop}; }`}
      ${!isShowMap && mobile && `${MOBILE_WEB} { && { min-height: ${mobile}; } }`}
      .closing-soon, .closed { ${statusText} }
      ${!$noImage && `.closing-soon, .closed, .disabled { ${statusColor} }`}
      .closing-soon { ${statusOpacity} }
      ${$noImage && themePart(theme, 'business_card', { 'background-color': 'base.header_background' })}
    `
  }}
`

export const BusinessHeaderPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => themeSpace(props.theme, 'lg')};
  box-sizing: border-box;
  pointer-events: none;
`

export const PlaceholderLogo = styled.img`
  max-width: 55%;
  max-height: 60%;
  object-fit: contain;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
`

export const PlaceholderInitial = styled.span`
  ${props => themeText(props.theme, 'display', { props: ['size', 'weight', 'line', 'family'], weight: 700 })}
  text-transform: uppercase;
  color: ${props => themeColor(props.theme, 'text_muted')};
`

export const BusinessHeader = (props) => {
  const { bgimage, isShowMap, isClosed, logo, name, children, ...rest } = props
  const theme = useTheme()
  const veil = themeValue(theme, 'business_card', 'base.header_overlay')
  const hasImage = !!bgimage
  const showPlaceholder = !hasImage && !isShowMap
  const style = {}
  if (!isShowMap && hasImage) {
    style.backgroundImage = isClosed
      ? `linear-gradient(${veil}, ${veil}), url("${bgimage}")`
      : `url("${bgimage}")`
  }

  return (
    <BusinessHeaderStyled {...rest} isShowMap={isShowMap} isClosed={isClosed} $noImage={showPlaceholder} style={style}>
      {showPlaceholder && (
        <BusinessHeaderPlaceholder aria-hidden='true'>
          {logo
            ? <PlaceholderLogo src={logo} alt='' loading='lazy' />
            : <PlaceholderInitial>{(name || '').trim().charAt(0).toUpperCase() || '?'}</PlaceholderInitial>}
        </BusinessHeaderPlaceholder>
      )}
      {children}
    </BusinessHeaderStyled>
  )
}

export const BusinessHeaderClosedContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    div {
      text-align: center;
      width: 100%;
      overflow-wrap: break-word;
      word-break: normal;
    }

`

export const BusinessTags = styled.div`
  display: flex;
  position: absolute;
  justify-content: space-between;
  align-items: center;
  top: 0px;
  inset-inline: 0;
  margin: ${({ theme }) => themeSpace(theme, 'md')};

  ${({ hasRibbon }) => hasRibbon && css`
    top: ${props => themeSpace(props.theme, 'xl')};
  `}

  span.crown {
    background-color: ${props => themeColor(props.theme, 'overlay')};
    ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
    display: flex;
    align-items: center;
    color: ${props => themeColor(props.theme, 'warning')};
  }

  div {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  span {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    padding: ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};
    color: ${props => themeColor(props.theme, 'on_overlay')};
    background: ${props => themeColor(props.theme, 'text_muted')};
    border-radius: ${props => themeRadius(props.theme, 'full')};
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
      margin-right: 0;
    `}
    &:last-child {
      ${props => props.theme?.rtl
      ? css`
        margin-left: 0px;
        `
      : css`
        margin-right: 0px;
      `}
    }
  }
  /* the tags (discount, preorder) are badges of the theme
     (inverse, over the image), apart as today; the pointer goes through them
     to the card's link */
  div > span {
    ${props => badgeCss(props.theme, {
      variant: themeSlot(props.theme, 'business_card', 'tag')?.variant || 'inverse',
      size: themeSlot(props.theme, 'business_card', 'tag')?.size || 'sm'
    })}
  }
  ${props => cardDecorationCss(props.theme)}
`

export const BusinessContent = styled.div`
  /* what is under the header: the rest of the card's column, the extra
     height of its row included (its info takes it, the facts stay at the
     bottom over the card's padding) */
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: ${props => themeSpace(props.theme, 'sm')};
`

export const WrapperBusinessLogo = styled.div`
  align-self: center;

  ${({ isCustomerMode }) => isCustomerMode && css`
    width: ${props => themeMedia(props.theme, '3xs')};
    height: ${props => themeMedia(props.theme, '3xs')};
    min-height: ${props => themeMedia(props.theme, '3xs')};
    min-width: ${props => themeMedia(props.theme, '3xs')};
  `}

  ${({ isSkeleton }) => isSkeleton && css`
    height: auto;
    width: auto;
    > span {
      display: flex;
    }
    @media (min-width: 481px){
      ${({ isCustomerMode }) => isCustomerMode && css`
        min-width: ${props => themeMedia(props.theme, '3xs')};
        min-height: ${props => themeMedia(props.theme, '3xs')};
        height: ${props => themeMedia(props.theme, '3xs')};
        width: ${props => themeMedia(props.theme, '3xs')};
      `}
    }
  `}
  ${props => themePart(props.theme, 'business_card', { 'border-radius': 'base.radius', 'box-shadow': 'base.logo_shadow' })}
`

const BusinessLogoStyled = styled.div`
  display: flex;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  /* the logo takes the rounding and the border of the card */
  ${props => themePart(props.theme, 'business_card', { 'border-radius': 'base.radius', border: 'base.border' })}
  /* the logo size of components.business_card (its
     platforms.mobile_web value below 576px) */
  ${({ theme }) => {
    const { size, mobile } = businessCardLogoSizes(theme)
    const box = (value) => `width: ${value}; height: ${value}; min-width: ${value}; min-height: ${value};`
    return css`
      && { ${box(size)} }
      ${mobile && `${MOBILE_WEB} { && { ${box(mobile)} } }`}
    `
  }}
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

export const BusinessInfo = styled.div`
  display: flex;
  /* all of the content's height: the name stays at the top and the facts
     at the bottom (BusinessInfoItem), the logo in the middle */
  flex: 1 1 auto;
  ${({ isCustomerMode }) => isCustomerMode
? css`
    width: 90%;
  `
: css`
    width: 100%;
  `}
  /* the room of the logo even without one: every card is as tall */
  ${({ theme, $logoRoom, isCustomerMode }) => $logoRoom && (isCustomerMode
? css`
    min-height: ${themeMedia(theme, '3xs')};
  `
: css`
    min-height: ${businessCardLogoSizes(theme).size};
    ${MOBILE_WEB} {
      min-height: ${businessCardLogoSizes(theme).mobile || businessCardLogoSizes(theme).size};
    }
  `)}
`

export const BusinessInfoItem = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}

  ${({ fromMyOrders }) => fromMyOrders && css`
    min-height: calc(1.25 * ${props => themeSize(props.theme, 'xl')});
  `}
  div {
    display: flex;
    p {
      margin-right: ${props => themeSpace(props.theme, 'xs')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'xs')};
        margin-right: 0;
    `}
      text-transform: capitalize;
      display: flex;
      align-items: center;
      margin: 0px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    p.bold {
      font-weight: bold;
    }
  }

  div.name-content {
    display: flex;
    justify-content: space-between;
  }
`

// The title of the business card: two lines before it is cut (title= in
// index.js keeps the whole name), breaking only where the name needs it
export const BusinessName = styled.h3`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  margin-block-start: 0;
  margin-block-end: 0;
  /* the name's text and color (components.business_card) */
  ${props => themePart(props.theme, 'business_card', { text: 'base.name', color: 'base.name_color' })}
`

/* the bullet between metadata (a Dot): the theme's bullet_color, its space from the text */
export const Bullet = styled.span`
  display: inline-flex;
  vertical-align: middle;
  margin-inline-end: ${props => themeSpace(props.theme, 'xs')};
  ${props => themePart(props.theme, 'business_card', { color: 'base.bullet_color' })}
`

export const Medadata = styled.div`
  margin-top: 0px;
  display: flex;
  justify-content: ${({ flexStart }) => flexStart ? 'flex-start' : 'space-between'};
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 400 })}
  color: ${props => themeColor(props.theme, 'text')};
  flex-wrap: wrap;
  gap: ${({ gap }) => gap ?? '0px'};

  ${({ isCustomerMode }) => isCustomerMode && css`
    > div {
      flex-direction: column;
    }
  `}
  ${({ isSkeleton }) => isSkeleton && css`
    display: flex;
    justify-content: center;
  `}
  ${({ fromBusinessListing }) => fromBusinessListing && css`
    flex-wrap: nowrap;
  `}
  p {
    ${({ theme, $largeText }) => themeText(theme, $largeText ? 'body_lg' : 'body', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text')};
    svg {
      font-size: ${props => themeIconSize(props.theme, 'sm')};
      margin: 0 ${props => themeSpace(props.theme, 'xs')} 0 0;
      ${({ isShowMap }) => isShowMap && css`
        color: ${props => themeColor(props.theme, 'border_strong')};
      `}
    }

    span {
      margin-right: ${props => themeSpace(props.theme, 'md')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'md')};
        margin-right: 0;
      `}
    }
  }

  .business-info-item {
    padding-right: ${props => themeSpace(props.theme, 'xxl')};

    ${({ fromBusinessListing }) => fromBusinessListing && css`
      padding-right: 0px;
    `}
  }
  /* "Order now" shows what the card does; it is not a control
     of its own (aria-hidden, out of the tab order): a click on it reaches
     the card's link */
  .order-now-button {
    ${props => cardDecorationCss(props.theme)}
  }
  .overflow-hidden {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre-wrap;
  }
  .bullet {
    ${({ fromBusinessListing }) => fromBusinessListing && css`
        ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: pre-wrap;
    `}
    ${({ fromFavoriteList }) => fromFavoriteList && css`
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    `}
  }

  @media (min-width: 481px) {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }
  /* the metadata of components.business_card: its text (meta,
     meta_lg where it is the larger text), color, icon size and the color of
     its bullets */
  ${({ theme, $largeText, isShowMap }) => css`
    ${themePart(theme, 'business_card', { color: 'base.meta_color' })}
    p {
      ${themePart(theme, 'business_card', { text: $largeText ? 'base.meta_lg' : 'base.meta', color: 'base.meta_color' })}
      svg {
        ${themePart(theme, 'business_card', { 'font-size': 'base.meta_icon_size' })}
      }
    }
  `}
`

export const CallCenterInformation = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 0;
  bottom: 0;
  margin-right: ${props => themeSpace(props.theme, 'sm')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  /* placed by the card (not its link): as far from its edges
     as before; the pointer goes through to the card's link */
  ${({ theme }) => css`
    right: ${cardCss(theme).padding};
    bottom: ${cardCss(theme).padding};
    ${cardDecorationCss(theme)}
  `}
`

/* A count of the call center mode (idle and busy drivers, active orders): a
   badge of the theme ($variant success, danger, warning), its icon beside the
   number; the column makes them as wide as the widest */
export const CallCenterInformationBullet = styled(Badge)`
  gap: ${props => themeSpace(props.theme, 'xs')};
  margin-bottom: ${props => themeSpace(props.theme, 'xxs')};
  svg {
    font-size: ${props => themeIconSize(props.theme, 'sm')};
  }
`

export const BusinessLogoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0;
  margin-bottom: 0;


  ${({ hideBusinessLogo }) => !hideBusinessLogo && css`
    margin-right: ${props => themeSpace(props.theme, 'md')};
  `}
  /* a business without a logo leaves no gap before its name
     (the name lines up with the facts and the card's padding) */
  ${({ hideBusinessLogo, $hasLogo }) => !hideBusinessLogo && !$hasLogo && css`
    margin-right: 0;
  `}
`

export const BusinessStarInfo = styled.div`
  display: flex;
  align-items: center;
  padding-right: ${props => props.fromFavoriteList || props.fromMyOrders || props.fromBusinessListing ? themeSpace(props.theme, 'xxs') : '0px'};

  .reviews {
    display: flex;
    align-items: center;
    svg {
      margin-right: ${props => themeSpace(props.theme, 'xs')};
      font-size: ${props => themeIconSize(props.theme, 'md')};
      color: ${props => themeValue(props.theme, 'rating', 'base.color')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'xs')};
        margin-right: 0;
    `}
    }
    span {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      color: ${props => ratingText(props.theme)};
    }
  }

  ${({ fromFavoriteList, fromMyOrders }) => (fromFavoriteList || fromMyOrders) && css`
    .reviews {
      svg {
        margin-right: 0px;
        color: ${props => themeValue(props.theme, 'rating', 'base.color')};
      }
      span {
        ${props => themeText(props.theme, 'body', { props: ['size'] })}
        color: ${props => ratingText(props.theme)};
      }
    }
  `}
`

export const RibbonBox = styled.div`
  position: absolute;
  padding: ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};
  box-sizing: border-box;
  z-index: 10;
  color: ${props => themeColor(props.theme, 'on_primary')};
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
  top: ${props => props.isShowMap ? `calc(-1 * ${themeSpace(props.theme, 'xl')})` : '0px'};
  background-color: ${props => themeColor(props.theme, 'primary')};
  max-width: min(100%, 22ch);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;

  ${props => props.isShowMap
  ? css`
      right: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
    `
  : css`
      left: 0px;
    `}
  ${props => props.theme.rtl && css`
    right: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
    left: initial;
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

  ${({ colorText }) => colorText && css`
    color: ${colorText ? 'black' : 'white'};
  `}
  /* a ribbon of the data's color (implementation notes, M4): the theme's text on a primary fill, made legible over it */
  ${({ bgColor, colorText, theme }) => bgColor && !colorText && css`
    color: ${legibleOver(themeColor(theme, 'on_primary'), bgColor)};
  `}

  ${({ borderRibbon }) => borderRibbon && css`
    border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${borderRibbon ? 'black' : 'white'};
  `}
  /* components.ribbon (text, inner space, corners of the data's
     shape); placed by the card, as far from its edges as before; the pointer
     goes through to the card's link */
  ${({ theme, isRoundRect, isCapsule, isShowMap }) => css`
    ${ribbonCss(theme, { rounded: isRoundRect, capsule: isCapsule })}
    top: ${(isShowMap ? -20 : 0) + businessCardPadding(theme)}px;
    ${isShowMap || theme?.rtl
      ? `right: ${businessCardPadding(theme) - 3}px; left: initial;`
      : `left: ${cardCss(theme).padding};`}
    ${cardDecorationCss(theme)}
  `}
`

export const FavoriteWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  /* it holds the favorite button, which has the pointer */
  cursor: ${({ $holdsButton }) => $holdsButton ? 'auto' : 'pointer'};
  margin-left: ${props => themeSpace(props.theme, 'lg')};
  ${props => props.theme.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'lg')};
    margin-left: 0px;
  `}

  svg {
    font-size: ${props => themeIconSize(props.theme, 'md')};
    color: ${props => themeColor(props.theme, 'favorite')};
  }
`

export const OpenAtContainer = styled.div`
  color: ${({ theme }) => primaryText(theme)};
  font-weight: 400;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`
