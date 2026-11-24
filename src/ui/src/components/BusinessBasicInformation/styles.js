import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderWidth, themePart, themeRadius, themeSize, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { getThemeCss, getThemeMobileCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { snapWeight } from '@orderingco/ordering-theme-engine/css'
import { ribbonCss } from '~ui/src/styles/Ribbon'

/**
 * The size of the store's logo (components.business_header.base.logo_size,
 * from 576px), in px (a number, for what adds to it).
 */
export const storeLogoSize = (theme) => themeValue(theme, 'business_header', 'base.logo_size')

const HEADER = 'business_header'

// The store header's own values as CSS (its view)
const headerCss = (theme) => getThemeCss(theme, HEADER).base

// Each CSS property of a text, in the order themeText declares them
const TEXT_PROPERTIES = [['family', 'font-family'], ['size', 'font-size'], ['line', 'line-height'], ['weight', 'font-weight'], ['letter_spacing', 'letter-spacing'], ['transform', 'text-transform']]

/**
 * One text of the store's header (`components.business_header.base.<key>`, a
 * text style) where the spot read a typography level of the font `role`
 * (`heading`, `body`) before: the same declarations (`props`, all
 * when left out), from the header's text in its view. A text that names no
 * family is painted with the role's font, its weight the nearest that font
 * has.
 */
export const headerText = (theme, key, role, { props } = {}) => {
  const text = headerCss(theme)[key]
  const own = themeValue(theme, HEADER, `base.${key}`)
  const font = theme.css.fonts[role]
  const parts = { ...text, family: own.family ? text.family : font.family, weight: snapWeight(own.family || font.id, own.weight) }
  return TEXT_PROPERTIES
    .filter(([part]) => (!props || props.includes(part)) && parts[part] !== null && parts[part] !== undefined)
    .map(([part, property]) => `${property}: ${parts[part]};`)
    .join('\n')
}

// A color of the store's header (base.<key>) as a declaration.
const headerColor = (theme, key) => `color: ${themeValue(theme, HEADER, `base.${key}`)};`

// The space between the store's actions (base.actions_gap).
const actionsGap = (theme) => `gap: ${headerCss(theme).actions_gap};`

/**
 * Whether the cover has the overlay while the store is open too
 * (business_header.base.overlay_when `always`); only when closed otherwise.
 */
export const coverOverlayAlways = (theme) => themeValue(theme, HEADER, 'base.overlay_when') === 'always'

// A length of the header for small screens (platforms.mobile_web, below
// 576px) as CSS, or null when the phone keeps the header's own.
const mobileLength = (theme, key) => getThemeMobileCss(theme, HEADER)?.base?.[key] ?? null

// The height of the cover (base.cover_height from 576px, its mobile_web value
// below), without the min and max of today.
const coverHeightCss = (theme) => {
  const mobile = mobileLength(theme, 'cover_height')
  return css`
    ${mobile && css`
      @media (max-width: 575.98px) {
        height: ${mobile};
        min-height: 0;
        max-height: none;
      }
    `}
    @media (min-width: 576px) {
      height: ${headerCss(theme).cover_height};
      min-height: 0;
      max-height: none;
    }
  `
}

export const BusinessContainer = styled.div`
  display: flex;
  width: 100%;
  height: ${({ theme }) => mobileLength(theme, 'cover_height') || headerCss(theme).cover_height};
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  justify-content: start;
  align-items: flex-end;

  ${props => props.isSkeleton && css`
    background-color: ${props => themeColor(props.theme, 'border_strong')};
  `}

  ${props => props.bgimage && !(props.isClosed || coverOverlayAlways(props.theme)) && css`
    background-image: url("${props.bgimage}");
  `}

  ${props => props.bgimage && (props.isClosed || coverOverlayAlways(props.theme)) && css`
    background-image: linear-gradient(${themeValue(props.theme, 'business_header', 'base.overlay')}, ${themeValue(props.theme, 'business_header', 'base.overlay')}), url("${props.bgimage}");
  `}

  /* the banner is a card (components.card); its color only
     (background-color), under the cover image and its overlay: the
     \`background\` shorthand would reset them */
  ${props => themePart(props.theme, 'card', { 'background-color': 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
  /* business_header.base.cover_height (mobile_web below 576px) */
  ${props => coverHeightCss(props.theme)}
`

export const BusinessContent = styled.div`
  margin: 0 ${props => themeSpace(props.theme, 'xl')} 0 0;
  max-height: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};
  width: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};
  /* the logo is the card (below): no box of its own */
  box-shadow: none;
  border-radius: 0;

  /* the slot of the logo, 4px wider than the logo as today */
  @media (min-width: 576px) {
    max-height: ${({ theme }) => storeLogoSize(theme) + 4}px;
    width: ${({ theme }) => storeLogoSize(theme) + 4}px;
  }
`

export const WrapperBusinessLogo = styled.div`
  max-width: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};
  max-height: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};
  width: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};
  height: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};

  /* components.business_header.base.logo_size */
  @media (min-width: 576px) {
    max-width: ${({ theme }) => headerCss(theme).logo_size};
    max-height: ${({ theme }) => headerCss(theme).logo_size};
    height: ${({ theme }) => headerCss(theme).logo_size};
    width: ${({ theme }) => headerCss(theme).logo_size};
  }
`

const BusinessLogoStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  background-size: contain;
  object-fit: contain;
  background-position: center;
  min-height: ${({ theme }) => mobileLength(theme, 'logo_size') || headerCss(theme).logo_size};

  /* the logo is a card (components.card: background-color only — the
     \`background\` shorthand would reset the size/position above — border,
     radius) with the store header's logo shadow
     (components.business_header.base.logo_shadow) */
  ${props => themePart(props.theme, 'card', { 'background-color': 'base.background', border: 'base.border', 'border-radius': 'base.radius' })}
  ${props => themePart(props.theme, HEADER, { 'box-shadow': 'base.logo_shadow' })}
  @media (min-width: 576px) {
    min-height: ${({ theme }) => headerCss(theme).logo_size};
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

export const BusinessInfo = styled.div`
  display: flex;
`

export const BusinessInfoItem = styled.div`
  width: 100%;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  /* stays a single block vertically centered against the logo's height,
     instead of space-between stretching the name up and the address down */
  justify-content: center;
  padding-right:${props => themeSpace(props.theme, 'xs')};
  ${props => props.theme?.rtl && css`
    padding-left: ${props => themeSpace(props.theme, 'xs')};
    padding-right: 0;
  `}

  /* "Closed" under the name: a status of the identity, never bigger than the
     name (the body_lg level, 16px by default, against the name's 32px); it sits
     on the page, not over the cover, so its color is the text's, not
     business_header.base.closed_color (made for the cover's overlay) */
  .closed {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight', 'line'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0 0 ${props => themeSpace(props.theme, 'xs')} 0;
    padding: 0;
  }

  .type {
    ${props => headerText(props.theme, 'city', 'body', { props: ['size'] })}
    color: ${props => themeValue(props.theme, HEADER, 'base.city_color')};
    margin: 0 0 ${props => themeSpace(props.theme, 'xs')} 0;
  }

  ${({ isInfoShrunken }) => isInfoShrunken && css`
    color: ${props => themeColor(props.theme, 'on_overlay')};
    span, p, h5, svg {
      color: ${props => themeColor(props.theme, 'on_overlay')} !important;
    }
  `}
  /* the texts and colors of business_header.base */
  .address {
    ${props => headerText(props.theme, 'address', 'body', { props: ['size', 'family'] })}
    ${props => headerColor(props.theme, 'address_color')}
  }
  .description {
    ${props => headerText(props.theme, 'description', 'body', { props: ['size', 'family'] })}
    ${props => headerColor(props.theme, 'description_color')}
    display: -webkit-box;
    -webkit-line-clamp: ${props => Math.round(themeValue(props.theme, HEADER, 'base.description_lines'))};
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }
`

export const BusinessInfoContainer = styled.div`
  padding-top: ${props => themeSpace(props.theme, 'xxl')};
  padding-left: ${props => themeSpace(props.theme, 'xs')};
  padding-right: ${props => themeSpace(props.theme, 'xs')};
  display: flex;
  justify-content: ${props => props.isFlexEnd ? 'flex-end' : 'space-between'};
  flex-direction: column;
  box-sizing: border-box;
  align-items: ${props => props.isFlexEnd ? 'flex-end' : 'space-between'};
  /* the gap to the categories below, proportioned to the schema's scale */
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  ${({ $hideHeaderBanner }) => $hideHeaderBanner && css`
    padding-top: 0;
  `}

  @media (min-width: 576px) {
    padding-top: 0px;
    padding-left: 0px;
    padding-right: 0px;
    margin-top: ${props => themeSpace(props.theme, 'xl')};

    ${({ $hideHeaderBanner }) => $hideHeaderBanner && css`
      margin-top: 0;
    `}
  }

  @media (min-width: 768px) {
    flex-direction: row;
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
`

export const BusinessInfoContent = styled.div`
  width: 100%;
`

export const SearchWrapper = styled.div`
  display: flex;
  z-index: 1000;
`

export const WrapperSearch = styled.div`
  margin: ${props => themeSpace(props.theme, 'lg')} 0px 0px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-sizing: border-box;
  z-index: 1002;

  &.fixed-search {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 10001;
    width: fit-content;
    margin-top: 0px;
    background-color: ${props => themeColor(props.theme, 'background')};
    padding: ${props => themeSpace(props.theme, 'sm')};
  }

  @media (min-width: 993px) {
    position: absolute;
    right: ${props => themeSpace(props.theme, 'xxl')};
    ${props => props.theme?.rtl && css`
      right: auto;
      left: ${props => themeSpace(props.theme, 'xxl')};
    `}
    &.fixed-search {
      left: 0;
      width: 100vw;
      z-index: 10000;
    }
  }

  /* laid out in the actions bar's flow instead of floating over the cover;
     \`&&\` (not a plain override) wins over the \`@media (min-width: 993px)\`
     block above regardless of source order, which a same-specificity rule
     here would lose: stylis flushes that block after this one either way */
  ${({ $inline }) => $inline && css`
    && {
      position: static;
      right: auto;
      left: auto;
      margin: 0;
      justify-content: flex-start;
    }
  `}
`

// "£1,50 Service fee · 20min Pickup time · 2 mi" below the identity block:
// a value (strong, `text`) with its label (`text_muted`), the theme's dot
// between them (business_header.base.details_separators; its JS read is in
// BusinessInfoComponent) and otherwise only the gap
export const BusinessDataLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'xs')};
  margin: ${props => themeSpace(props.theme, 'xs')} 0 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};

  strong {
    font-weight: 600;
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const TitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-wrap: wrap;
  /* the business name: the title of the page. Two lines before it is cut
     (title= in BusinessInfoComponent.js keeps the whole name); the row
     already shrinks it beside the favorite button. */
  h1 {
    margin: 0 0 0 0;
    width: 100%;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    background: ${({ theme }) => themeColor(theme, 'background')};
    @media (min-width: 768px) {
      padding-bottom: ${props => themeSpace(props.theme, 'xxs')};
    }
    /* business_header.base.name and name_color */
    ${props => themePart(props.theme, HEADER, { text: 'base.name', color: 'base.name_color' })}
  }
  .title-wrapper-left {
    display: flex;
  }
`

export const RibbonBox = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};
  box-sizing: border-box;
  z-index: 10;
  color: ${props => themeColor(props.theme, 'on_primary')};
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
  background-color: ${props => themeColor(props.theme, 'primary')};
  max-width: 30ch;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-left: ${props => themeSpace(props.theme, 'xs')};
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

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

  ${({ colorText }) => colorText && css`
    color: ${colorText ? 'black' : 'white'};
  `}

  ${({ borderRibbon }) => borderRibbon && css`
    border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${borderRibbon ? 'black' : 'white'};
  `}
  /* components.ribbon (text, inner space, corners of the data's shape) */
  ${({ theme, isRoundRect, isCapsule }) => ribbonCss(theme, { rounded: isRoundRect, capsule: isCapsule })}
`
const SearchTriggerSpacing = styled.div`
  margin-inline-end: ${props => themeSpace(props.theme, 'md')};
`

export const SearchIconWrapper = ({ children, ...props }) => (
  <SearchTriggerSpacing>
    <Button shape='icon' color='neutral' {...props}>{children}</Button>
  </SearchTriggerSpacing>
)

export const SearchComponentContainer = styled.div`
  position: absolute;
  top: ${props => themeSpace(props.theme, 'md')};
  /* room for the button at the end: size.lg and a space */
  right: calc(${props => themeSize(props.theme, 'lg')} + ${props => themeSpace(props.theme, 'md')});
  color: ${({ theme }) => themeColor(theme, 'on_overlay')};
  ${props => props.theme?.rtl && css`
    right: auto;
    left: calc(${themeSize(props.theme, 'lg')} + ${themeSpace(props.theme, 'md')});
  `}
  svg {
    color: ${({ theme }) => themeColor(theme, 'on_overlay')};
  }
`

export const SocialList = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: ${props => themeSpace(props.theme, 'xs')};
`

export const HeaderActionCell = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Reserve the Button's touch area without growing its painted box. */
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`

export const SocialLinkSpacing = styled(HeaderActionCell)`
  margin-inline-start: ${props => themeSpace(props.theme, 'xs')};

  @media (min-width: 768px) {
    margin-inline-start: ${props => themeSpace(props.theme, 'md')};
    margin-block-end: ${props => themeSpace(props.theme, 'md')};
  }
`

export const BusinessInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const StoreFavoriteSpacing = styled(HeaderActionCell)`
  align-self: center;
  margin-inline-start: ${props => themeSpace(props.theme, 'xs')};
`

export const StoreFavoriteButton = ({ pressed, onClick }) => {
  const [, t] = useLanguage()
  return (
    <StoreFavoriteSpacing>
      <Button favorite aria-pressed={!!pressed} aria-label={t('FAVORITE', 'Favorite')} onClick={onClick}>
        <Icon name={pressed ? 'heartFilled' : 'heartOutline'} />
      </Button>
    </StoreFavoriteSpacing>
  )
}

// The actions bar below the identity block: the store's actions on the
// left (BusinessActionsGroup) and the search+sort on the right, wrapping
// below 768px with everything left-aligned (no centering, actions first)
export const BusinessActionsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'md')};
  margin-top: ${props => themeSpace(props.theme, 'lg')};

  @media (max-width: 767.98px) {
    justify-content: flex-start;
  }
`

export const BusinessActionsGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'lg')};
  /* business_header.base.actions_gap */
  ${props => actionsGap(props.theme)}

`
