import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { bannerBoxCss, bannerSpace, bannerTextCss, bannerTheme } from '~ui/src/styles/Banner'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'

// The share of the banner's width its image takes from 768px
// (components.banner.variants.promo.image_width), in %; the text takes the rest
const IMAGE_WIDTHS = { third: 100 / 3, half: 50, two_thirds: 200 / 3 }
const percent = (value) => `${Number(value.toFixed(4))}%`

/** The image's share of the promo banner in %. */
export const promoImageWidth = (theme) => IMAGE_WIDTHS[bannerTheme(theme, 'promo').image_width]

// A value of the promo banner (a color)
const promo = (theme, key) => bannerTheme(theme, 'promo')[key]

// A length of the promo banner (components.banner.variants.promo) as CSS
const promoLength = (theme, key) => getThemeCss(theme, 'banner').variants.promo[key]

// The point of its image kept in view (variants.promo.image_focus_y), a % from the top
const promoFocusY = (theme) => getThemeComponent(theme, 'banner').variants.promo.image_focus_y

export const BannerContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: ${props => themeSpace(props.theme, 'xl')} auto;
  max-width: calc(100% - 2 * ${props => themeSpace(props.theme, 'xl')});

  /* its greatest height from 768px: the screen's, else the promo banner's */
  @media (min-width: 768px) {
    flex-direction: row;
    max-height: ${props => props.maxHeight || promoLength(props.theme, 'max_height')};
  }
  /* a promo banner of the theme (components.banner) */
  && { ${props => bannerBoxCss(props.theme, 'promo')} }
`

export const BannerImage = styled.div`
  width: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* its height when stacked (below 768px), its share of the width from 768px
     and the point of the image kept in view (components.banner promo) */
  @media (max-width: 767px) { height: ${props => promoLength(props.theme, 'stacked_image_height')}; }
  img { object-position: center ${props => promoFocusY(props.theme)}%; }
  @media (min-width: 768px) { width: ${props => percent(promoImageWidth(props.theme))}; height: auto; }
`

export const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* the banner's padding on every side */
  && { padding: ${props => bannerSpace(props.theme, 'promo', 'padding')}; }
  /* the rest of the width beside the image */
  @media (min-width: 768px) { width: ${props => percent(100 - promoImageWidth(props.theme))}; }
`

export const BannerTitle = styled.h2`
  margin: 0;
  /* the banner's title, its gap over the text */
  margin-bottom: ${props => bannerSpace(props.theme, 'promo', 'gap')};
  ${props => bannerTextCss(props.theme, 'promo', 'title')}
  color: ${props => promo(props.theme, 'title_color')};
`

export const BannerSubtitle = styled.p`
  margin: 0 0 ${props => themeSpace(props.theme, 'xl')};
  /* the banner's text and its color */
  ${props => bannerTextCss(props.theme, 'promo', 'text')}
  color: ${props => promo(props.theme, 'text_color')};
`
