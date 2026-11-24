import styled, { css } from 'styled-components'
import { headingText, themeFocusRing, themePart, themeSpace, themeValue, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { getThemeCss } from '~/utils/themeCss'

// The carousel of promotional banners of a page: components.promo_carousel
export const PROMO_CAROUSEL = 'promo_carousel'

/** One number of components.promo_carousel (`base[key]`). */
export const promoCarouselNumber = (theme, key) => themeValue(theme, PROMO_CAROUSEL, `base.${key}`)

// One length of components.promo_carousel (`base[key]`) as CSS
const promoCarouselLength = (theme, key) => getThemeCss(theme, PROMO_CAROUSEL).base[key]

// The banner's title: a section of the page (its h1 is the page's own)
export const BannerTitle = styled.h2`
  ${props => headingText(props.theme, 'h2')}
  /* a section title (components.section_header) */
  ${props => sectionTitleCss(props.theme, { level: 'h2' })}
`

export const BannerContainer = styled.div`
  width: 100%;
  overflow: hidden;
  /* the arrows sit over the banner */
  position: relative;

  ${({ isHorizontal }) => isHorizontal && css`
    width: calc(100vw - 2 * ${props => themeSpace(props.theme, 'xxl')});
    display: flex;
    padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'lg')};
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `}

  /* the space over and under the carousel and between its
     cards (components.promo_carousel) */
  margin: ${({ theme }) => promoCarouselLength(theme, 'margin_y')} 0;
  ${({ theme, isHorizontal }) => isHorizontal && `gap: ${promoCarouselLength(theme, 'gap')};`}
`

/* Where an arrow of the carousel (the theme's icon button) sits: over the
   banner's side, vertically centered, the sm space off the edge */
export const BannerArrow = styled.div`
  display: flex;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  ${({ $side, theme }) => $side === 'prev'
    ? `left: ${themeSpace(theme, 'sm')};`
    : `right: ${themeSpace(theme, 'sm')};`}
`

export const BannerWrapper = styled.div`
  flex-shrink: 0;
  ${props => blockStill(props.theme)}
  /* a card of the theme's size, radius and shadow; on hover
     only what its hover state says (components.promo_carousel) */
  width: ${({ theme }) => promoCarouselLength(theme, 'card_width')};
  height: ${({ theme }) => promoCarouselLength(theme, 'card_height')};
  ${props => themePart(props.theme, PROMO_CAROUSEL, { 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
  ${props => props.$clickable && cardHoverCss(props.theme, PROMO_CAROUSEL)}
`

// The image of a banner; a button when it has an action ($clickable)
export const ImageWrapper = styled.div`
  display: block;
  width: 100%;
  ${({ $clickable }) => $clickable && css`
    cursor: pointer;
    border: none;
    margin: 0;
    background: none;
    font: inherit;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: 0;
  `}
  position: relative;

  ${({ isHorizontal }) => isHorizontal && css`
    width: 100%;
    height: 100%;
    padding-top: 0;
  `}

  .banner-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* the slide's proportion (height ÷ width) and the image's
     radius at every width (components.promo_carousel) */
  ${({ theme, isHorizontal }) => !isHorizontal &&
    `padding-top: ${Number((promoCarouselNumber(theme, 'slide_ratio') * 100).toFixed(4))}%;`}
  .banner-img {
    ${props => themePart(props.theme, PROMO_CAROUSEL, { 'border-radius': 'base.radius' })}
  }
  /* a banner of the slider fills its slide, which clips: its
     keyboard focus is the theme's ring inside its edge */
  ${({ theme, $clickable, isHorizontal }) => $clickable && !isHorizontal &&
    `&:focus-visible { outline-offset: -${themeFocusRing(theme).width} !important; }`}
`
