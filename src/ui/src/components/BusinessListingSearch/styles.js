import React from 'react'
import styled, { css, useTheme } from 'styled-components'
import { Button } from '~ui/src/design-system/components/Button'
import { themeColor } from '~/utils/themeColors'
import { pageGutter, themePart, themeSize, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { BannerContainer as PageBannerContainer } from '~ui/src/components/PageBanner/styles'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { sliderFillColor, sliderFillCss, sliderTrackCss } from '~ui/src/styles/Slider'
import { getThemeCss, getThemeMobileCss } from '~/utils/themeCss'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { focusRingRoomXCss } from '~ui/src/styles/Focus'
import { srOnlyCss } from '~ui/src/styles/Rules'
import { businessCardSideSpace } from '~ui/src/components/BusinessController/styles'
import { chipRowCss } from '~ui/src/components/BusinessTypeFilter/styles'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

/* The group of a business over its products (components.product_search.base)
   and its changes on a phone (platforms.mobile_web, below 576px), as CSS */
const groupBase = (theme) => getThemeCss(theme, 'product_search').base
const groupMobile = (theme) => getThemeMobileCss(theme, 'product_search')?.base || {}
const colorRule = (value) => `color: ${value};`

export const BusinessListingSearchContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  /* the page sets its side space (tokens.layout.page_gutter) once, the same
     above; its blocks don't add their own */
  padding: ${props => pageGutter(props.theme)}px;
  box-sizing: border-box;

  ${PageBannerContainer} {
    width: 100%;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
    /* a row of banners scrolls, so it clips: room at its
       sides for the focus ring of its first and last banners */
    ${props => focusRingRoomXCss(props.theme)}
  }

  ${({ isShowMap, theme }) => isShowMap && css`
    padding: 0 ${pageGutter(theme)}px;
  `}
`

export const FiltersContainer = styled.div`
  flex-direction: column;
  @media (min-width: 993px){
    flex-direction: row;
    display: flex;
    width: 100%;
  }
`

export const Filters = styled.div`
  width: 100%;
  max-width: 100%;
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
  box-sizing: border-box;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  position: relative;
  &::-webkit-scrollbar { display: none; }

  ${({ fullWidth, theme }) => !fullWidth && css`
    padding-top: ${themeSpace(theme, 'md')};
  `}
  /* the row scrolls, so it clips: room at its sides for the
     focus ring of the first and last filters (its chips keep their place) */
  ${({ theme }) => focusRingRoomXCss(theme)}
`

export const FiltersInner = styled.div`
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
`

export const BusinessBanner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  /* full bleed: out of the page padding, right under the header */
  margin-top: -${props => pageGutter(props.theme)}px;
  margin-left: -${props => pageGutter(props.theme)}px;
  margin-right: -${props => pageGutter(props.theme)}px;
  position: relative;

  /* it holds the docked order context bar, its own spacing */
  margin-bottom: 0;
`

export const FiltersResultContainer = styled.div`
  width: 100%;
  max-width: 100%;
  ${({ fullWidth }) => !fullWidth && css`
    @media (min-width: 993px) {
      display: flex;
    }
  `}
`

export const SortContainer = styled.div`

`

// the direction of the active sort option, for assistive technology only
export const SortDirection = styled.span`
  ${srOnlyCss}
`

export const MaxFilterContainer = styled.div`
  p.under-price {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

// The slider is components.slider: its track, fill, thumb
// (SliderThumb) and marks (the stops)
export const ProgressContentWrapper = styled.div`
  width: 100%;
  cursor: pointer;
  ${({ theme }) => sliderTrackCss(theme)}
  position: relative;
  display: flex;
  align-items: center;
  /* tokens.space.xxl above and below */
  margin-top: ${props => themeSpace(props.theme, 'xxl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};

`

// the origin dot (a base Dot in the text color), in the fill's color
export const OriginDot = styled.span`
  position: absolute;
  z-index: 1;
  display: flex;
  transform: translateX(-50%) translateY(-50%);
  top: 50%;
  color: ${({ theme }) => sliderFillColor(theme)};
`

export const ProgressBar = styled.div`
  ${({ theme }) => sliderFillCss(theme)}
`

// the stops (SliderStopButton), one em apart from what follows
export const MaxItemContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
`

export const BusinessList = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: ${({ hideProductList }) => hideProductList ? 'column' : 'row'};
  box-sizing: border-box;
  align-items: center;
  ${({ noResults }) => noResults && css`
    justify-content: center;
  `}
  ${({ hideProductList }) => !hideProductList && css`
    flex-wrap: nowrap;
    overflow-x: auto;
  `}

  @media (min-width: 480px){
    flex-direction: row;
  }
`

export const ProductsList = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'sm')};
`

export const BusinessInfo = styled.div`
  display: flex;
  /* "Go to the store" is the base Button: one line that keeps its width
     (its own nowrap and shrink-0), and the business text gives room */
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
`

// the bullet between the details (a base Dot), the theme's xs from each
export const BulletMark = styled.span`
  display: inline-flex;
  vertical-align: middle;
`

export const Metadata = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xs')};
  display: flex;
  flex-wrap: wrap;
  ${({ isSkeleton }) => isSkeleton && css`
    display: flex;
    justify-content: space-between;
  `}
  p {
    ${BulletMark} {
      margin: 0 ${props => themeSpace(props.theme, 'xs')};
    }

    /* the label of a detail (the fee's); not the bullet or its dot */
    > span:not(${BulletMark}) {
      margin-right: ${props => themeSpace(props.theme, 'sm')};
      ${props => props.theme?.rtl && css`
        margin-left: ${themeSpace(props.theme, 'sm')};
        margin-right: 0;
      `}
    }
  }
  /* product_search's meta (mobile_web below 576px) and meta_color */
  ${({ theme }) => css`
    ${colorRule(groupBase(theme).meta_color)}
    p {
      ${colorRule(groupBase(theme).meta_color)}
    }
    @media (max-width: 575px) {
      ${(groupMobile(theme).meta || groupBase(theme).meta).css}
    }
    @media (min-width: 576px) {
      ${groupBase(theme).meta.css}
    }
    /* the dot separates two data: none before the first one (pickup, or the
       fee or time hidden by business_card.*) */
    p.bullet:first-child > ${BulletMark}:first-child {
      display: none;
    }
  `}
`

export const BusinessInfoItem = styled.div`
  width: 60%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  margin-left: ${props => themeSpace(props.theme, 'sm')};
  div {
    display: flex;
    p {
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
  @media (min-width: 480px) {
    width: 100%;
  }
`

export const SingleBusinessSearch = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: ${props => themeSpace(props.theme, 'xl')} 0;
`

export const BusinessProductsListContainer = styled.div`
  display: flex;
  box-sizing: border-box;

  .product-card {
    flex: 0 0 min(85%, 34ch);
  }

  @media(min-width: 480px){
    .product-card {
      flex: 0 0 min(85%, 50ch);
    }
  }
`

/* The listing title: the typography of its heading level */
export const ListingTitle = styled.h2`
  margin: ${props => themeSpace(props.theme, 'xl')} 0 0;
  /* the header of a block (components.section_header): its text and the
     space under it */
  ${props => sectionTitleCss(props.theme, { level: props.$level || 'h2' })}
`

// Header publishes the measured height. Its theme is the fallback until it mounts.
const paneHeight = ({ theme }) => {
  const header = `var(--header-height, ${getThemeCss(theme, 'header').base.height})`
  return css`
    height: calc(100vh - ${header});
    height: calc(100dvh - ${header});
  `
}

export const BusinessListWrapper = styled.div`
  width: 100%;

  /* the cards carry their side space: the first one starts at the page edge
     (not beside the map, where this wrapper scrolls and would clip them) */
  ${({ isShowMap, theme }) => !isShowMap && css`
    ${BusinessList} {
      margin: 0 -${businessCardSideSpace(theme)};
    }
  `}

  ${({ fullWidth }) => !fullWidth && css`
    @media (min-width: 993px) {
      width: 45%;
      ${paneHeight}
      overflow-y: auto;
    }
  `}
  ${({ hideProductList }) => !hideProductList && css`
    @media (min-width: 993px) {
      width: 100%;
      height: auto;
    }
  `}
  ${({ isShowMap, theme }) => isShowMap && css`
    @media (min-width: 993px) {
      overflow-y: auto;
      ${paneHeight}
      padding-right: ${themeSpace(theme, 'sm')};
    }
  `}
`

export const BusinessProductsListWrapper = styled(BusinessListWrapper)``

// "Load more" at the end of the row of businesses: a plain box that keeps its
// button whole, the cards' side space before it
export const LoadMoreWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 ${props => businessCardSideSpace(props.theme)};
`

export const NotFoundWrapper = styled.div`
  /* tokens.space.xxxl above */
  padding-top: ${props => themeSpace(props.theme, 'xxxl')};
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
  /* product_search's logo_size (mobile_web below 576px) and logo_radius; its
     skeleton the same square */
  ${({ theme, isSkeleton }) => css`
    border-radius: ${groupBase(theme).logo_radius};
    ${logoSizeRules(groupMobile(theme).logo_size ?? groupBase(theme).logo_size)}
    ${isSkeleton && `span { ${logoSizeRules(groupMobile(theme).logo_size ?? groupBase(theme).logo_size)} }`}
    @media (min-width: 576px) {
      ${logoSizeRules(groupBase(theme).logo_size)}
      ${isSkeleton && `span { ${logoSizeRules(groupBase(theme).logo_size)} }`}
    }
  `}
`

// A logo square of `size` (a CSS length)
const logoSizeRules = (size) => `width: ${size}; min-width: ${size}; height: ${size}; min-height: ${size};`

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

// The business above its products: a small title, two lines before it is
// cut (title= in index.js keeps the whole name)
export const BusinessName = styled.h4`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  margin-block-start: 0;
  margin-block-end: 0;
  /* product_search's name and name_color */
  ${props => themePart(props.theme, 'product_search', { text: 'base.name', color: 'base.name_color' })}
`

export const BrandContainer = styled.div``

export const BrandListWrapper = styled.div`
  max-height: 40dvh;
  overflow: auto;
`

// A row of the brands list while it loads (its skeleton)
export const BrandItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'md')};
`

export const NoResult = styled.div`
  text-align: center;
`

export const PriceFilterWrapper = styled.div``

// The price levels: a row of chips, as the business types (chipRowCss)
export const PriceFilterListWrapper = styled.div`
  ${({ theme }) => chipRowCss(theme)}
`

export const PreviouslyOrderedContainer = styled.div`

`
export const SearchBarContainer = styled.div`
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-end;
  align-items: flex-start;

  @media (min-width: 581px) {
    flex-direction: row;
  }

  .search-bar-business-listing {
    padding: 0 0 ${props => themeSpace(props.theme, 'lg')};
    width: 100%;

    @media (min-width: 581px) {
      width: 100%;
      min-width: 12ch;
      max-width: min(100%, 38ch);
      padding: 0;
    }
  }
`

export const HightestRatedWrapper = styled.div`
  padding: 0;
  /* full bleed carousel: it pads its own title and first card */
  margin: 0 -${props => pageGutter(props.theme)}px;
`

// The actions of the filter modal: the modal's actions_gap above them
export const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: ${props => getThemeCss(props.theme, 'modal').base.actions_gap};
  ${props => blockStill(props.theme)}
`

// The slot of "View Results": its width is the slot's, the Button fills it
export const ResultsAction = styled.div`
  display: flex;
  /* the 54ch are the Button's own characters (it is a lg Button) */
  ${({ theme }) => controlMeasureCss(theme, 'button', { size: 'lg' })}
  width: calc(100% - ${props => themeSize(props.theme, 'md')}); /* px-map: 40px is size.md */
  max-width: min(100%, 54ch);
`

// "Reset" of the filter modal: a button of components.link (muted), at its own
// width under the action, the modal's actions_spacing apart.
export const ResetLink = ({ style, ...props }) => {
  const theme = useTheme()
  return (
    <Button
      {...props}
      appearance='link'
      linkVariant='muted'
      style={{ marginTop: getThemeCss(theme, 'modal').base.actions_spacing, ...style }}
    />
  )
}

// The text that explains a filter: secondary text
export const Description = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
`

export const MapWrap = styled.div`
  width: 100%;
  padding: 0px;

  @media (min-width: 993px) {
    width: 55%;
    padding: 0px;
  }
`

export const MapWrapper = styled.div`
  width: 100%;
  margin: 0 auto;
  height: 60dvh;
  overflow: hidden;
  position: relative;
  /* on its own (narrow screens) the map is a content container
     of the theme (components.card); beside the list, a pane */
  ${props => themePart(props.theme, 'card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}

  > div {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  @media (min-width: 993px) {
    width: 100%;
    ${paneHeight}
    margin: 0;
    border-radius: 0;
    border: none;
    /* a pane edge, components.divider vertical's line */
    ${props => dividerLineCss(props.theme, 'vertical', { edge: 'left' })}
    box-shadow: none;
  }
`
