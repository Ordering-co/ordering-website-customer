import styled, { css } from 'styled-components'
import React from 'react'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeBreakpoint.mjs'
import { headingText, pageGutter, themeBorderWidth, themeMedia, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { Button } from '~ui/src/design-system/components/Button'
import { BannerContainer as PageBannerContainer } from '~ui/src/components/PageBanner/styles'
import { BannerContainer as CustomOrderBannerContainer } from '~ui/src/components/CustomOrderBanner/styles'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { OrderProgressWrapper } from '~ui/src/components/OrderProgress/styles'
import { HighestRatedContainer, Title as HighestRatedTitle } from '~ui/src/components/HighestRated/styles'
import { focusRingRoomXCss } from '~ui/src/styles/Focus'
import { businessCardSideSpace, ContainerCard } from '~ui/src/components/BusinessController/styles'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

/* The page's sections one rhythm apart (tokens.space.xl, the space between
   the sections of every page), whatever order the theme gives them: the page
   spaces its blocks (gap) and each block drops the space it kept over and
   under itself, so two never add up; an empty block takes no place. */
const sectionsRhythmCss = (theme) => {
  return css`
    gap: ${themeSpace(theme, 'xl')};
    && ${CustomOrderBannerContainer}, && ${PageBannerContainer}, && > ${OrderProgressWrapper},
    && > ${WrapperSearch}, && > ${FiltersContainer} {
      margin-top: 0;
      margin-bottom: 0;
    }
    /* All Businesses: its title at the top of its block (under it, the
       section header's margin_bottom) */
    && ${BusinessesTitle} {
      margin-top: 0;
    }
    /* the carousels: their title at the top of the block, nothing under it */
    && > ${HightestRatedWrapper} ${HighestRatedContainer} {
      padding-bottom: 0;
    }
    && > ${HightestRatedWrapper} ${HighestRatedTitle} {
      margin-top: 0;
    }
    && > ${WrapperSearch}:empty, && > ${HightestRatedWrapper}:empty {
      display: none;
    }
  `
}

/* The page sets its padding once (like business-search): the page's side
   space (tokens.layout.page_gutter), the same above; its blocks don't add
   their own. Full-bleed blocks (the docked bar, carousels) undo it. */
export const BusinessContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
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

  ${CustomOrderBannerContainer} {
    max-width: 100%;
  }
  ${CustomOrderBannerContainer}:first-child {
    margin-top: 0;
  }
  ${props => sectionsRhythmCss(props.theme)}
`

// The all businesses section: its title and its list, one block of the page
export const AllBusinessesSection = styled.div``

// The showcase's groups ("Open now", "Order for later"): one rhythm apart
// (tokens.space.xl), as the page's sections
export const ShowcaseGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xl')};
`

// The line under a group's title: what the group is, in the muted text
export const GroupDescription = styled.p`
  margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
  color: ${props => themeColor(props.theme, 'text_muted')};
  ${props => themeText(props.theme, 'body')}
`

// The featured store of the showcase: its card across the content's width (the grid's
// cards take a share of it), its side spaces out as in the grid
export const ShowcaseHero = styled.div`
  margin: 0 -${props => businessCardSideSpace(props.theme)};
  /* only the card, not the alert or modal beside it; && to win over the card's own widths */
  && > ${ContainerCard} {
    width: calc(100% - 2 * ${props => businessCardSideSpace(props.theme)});
  }
`

// A title read by assistive technology only (clipped to nothing, out of the flow, and never
// wider than its container: a long translation does not widen the page)
export const HiddenTitle = styled.h2`
  position: absolute;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
  /* with the page's rhythm (BusinessContainer's gap): the gap is the space
     under the docked bar */
  ${({ theme }) => css`
    && {
      margin-bottom: 0;
    }
    && > * {
      margin-bottom: 0;
    }
  `}
`

export const BusinessList = styled.div`
  display: flex;
  flex-wrap: wrap;
  /* the cards carry their side space: the first one starts at the page edge */
  margin: 0 -${props => businessCardSideSpace(props.theme)};
`

export const EmptyStateWrapper = styled.div`
  width: 100%;
`

export const SearchRedirectArea = styled.div`
  width: 100%;
`

/* The city: a button of the page, not the search's own controls; this is its place and width, the Button fills it */
export const CityAction = styled.div`
  display: flex;
  /* the 31ch are the Button's own characters */
  ${({ theme }) => controlMeasureCss(theme, 'button', { size: 'md' })}
  width: min(100%, 31ch);
  margin-left: ${props => themeSpace(props.theme, 'sm')};
`

export const WrapperSearch = styled.div`
  margin: 0px 0 ${props => themeSpace(props.theme, 'xs')};
  display: flex;
  justify-content: flex-end;
  /* the map / filters toggles: icon buttons of the theme */
  > .icon-action {
    align-self: center;
    flex-shrink: 0;
    margin-left: ${props => themeSpace(props.theme, 'sm')};
  }
  ${({ isCustomLayout, isCustomerMode }) => isCustomLayout && css`
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    margin: 0;
    margin-top: ${props => themeSpace(props.theme, 'md')};
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
    width: 100%;
    padding: 0;
    ${isCustomerMode
? css`
      margin-right: 0;
    `
: css`
      margin: 0 auto;
    `}
    svg {
      align-self: auto;
    }

    @media(min-width: 681px){
      width: 75%;
      padding: 0;
    }

    @media(min-width: 1201px){
      width: 50%;
    }
  `}

  ${({ isCustomerMode }) => !isCustomerMode && css`
    ${SearchRedirectArea} {
      max-width: min(100%, 50ch);
    }
  `}

  @media(min-width: 581px){
    margin: ${props => themeSpace(props.theme, 'md')} 0 0;
  }

  ${({ $hasMobileSearch }) => $hasMobileSearch && css`
    @media(max-width: 580px){
      margin-top: ${props => themeSpace(props.theme, 'lg')};
    }
  `}
`

// Rendered as h1 or h2 (as + $level), with the typography of that level
export const BusinessesTitle = styled.h1`
  ${({ isCustomerMode }) => isCustomerMode
? css`
    ${props => headingText(props.theme, props.$level || 'h1')}
    margin: 0;
  `
: css`
    color: ${props => themeColor(props.theme, 'text')};
    ${props => headingText(props.theme, props.$level || 'h1')}
    margin: ${props => themeSpace(props.theme, 'md')} 0 0;
  `}
  /* the header of a block (components.section_header; the
     page's h1, its page variant) */
  ${props => sectionTitleCss(props.theme, { level: props.$level || 'h1' })}
`

export const HightestRatedWrapper = styled.div`
  padding: 0;
  /* full bleed carousel: it pads its own title and first card */
  margin: 0 -${props => pageGutter(props.theme)}px;
`

export const SearchContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const BusinessLogosWrapper = styled.div`
  overflow: scroll hidden;
  width: 100%;
`

// A logo of the logos layout: the square tile of the store's logo (a media box of
// the theme) with, over all of it, the base Button that opens its business
const BusinessLogoTile = styled.div`
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  width: ${props => themeMedia(props.theme, 'xs')};
  height: ${props => themeMedia(props.theme, 'xs')};
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  margin-right: ${props => themeSpace(props.theme, 'lg')};
  /* a store without a logo (and no placeholder logo) shows its name */
  ${props => !props.$hasLogo && css`
    background-color: ${themeColor(props.theme, 'surface_alt')};
    color: ${themeColor(props.theme, 'text')};
  `};
  ${props => props.$active && css`
    border: ${props => themeBorderWidth(props.theme, 'thick', { fixed: true })} solid ${props => themeColor(props.theme, 'primary')};
  `};
`

const BusinessLogoName = styled.span`
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: ${props => themeSpace(props.theme, 'sm')};
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  overflow-wrap: anywhere;
  overflow: hidden;
`

// The Button covers the whole tile (its image and its borders), so a click anywhere on it opens the store
const LOGO_BUTTON_COVER = { position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }

export const BusinessLogo = ({ bgimage, isActive, children, ...props }) => (
  <BusinessLogoTile
    $hasLogo={!!bgimage}
    $active={isActive}
    style={bgimage ? { backgroundImage: `url("${bgimage}")` } : undefined}
  >
    <Button {...props} type='button' appearance='plain' style={LOGO_BUTTON_COVER}>
      {children && <BusinessLogoName>{children}</BusinessLogoName>}
    </Button>
  </BusinessLogoTile>
)
export const BusinessLogosContainer = styled.div`
  display: flex;
  padding-bottom: ${props => themeSpace(props.theme, 'sm')};
`

export const AddressFormWrapper = styled.div`
  @media (min-width: 450px) {
    margin-top: ${props => themeSpace(props.theme, 'xl')};
  }
`

// Delivery / pickup: the space above the tab bar of the theme (components.tabs, its variant).
export const TypesContainer = styled.div`
  margin: ${props => themeSpace(props.theme, 'xxxl')} 0 0;
`

export const AdditionalTypesContainer = styled.div`
  width: 60%;
  display: flex;
  gap: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
`

export const Title = styled.h2`
  ${props => themeText(props.theme, 'h2')}
  color: ${props => themeColor(props.theme, 'text')};
  margin: ${props => themeSpace(props.theme, 'xl')} 0 ${props => themeSpace(props.theme, 'xs')};
`

export const TypesWrapper = styled.div`
  /* an unguarded fixed 600px overflowed phone viewports; cap instead */
  width: 100%;
  max-width: min(100%, 75ch);
  box-sizing: border-box;
`

export const FiltersContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'md')} 0 ${props => themeSpace(props.theme, 'md')};

  .filters-scroll {
    flex: 1;
    min-width: 0;

    /* The page already pads the sides: the chips start at its edge */
    > div {
      padding-left: 0;
      padding-right: 0;
      /* the row scrolls, so it clips: room at its sides for
         the focus ring of its first and last chips (they keep their place) */
      ${props => focusRingRoomXCss(props.theme)}
    }
  }
`

export const SheetFilterShortcuts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

// Reserve each chip's expanded hit area in the flex flow, including across rows.
export const SheetFilterCell = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  max-inline-size: 100%;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`

export const FiltersSearch = styled.div`
  flex-shrink: 0;
  width: min(100%, 38ch);

  /* the text is components.search_bar's */
  input {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (min-width: 1400px) {
    width: min(100%, 44ch);
  }
`
