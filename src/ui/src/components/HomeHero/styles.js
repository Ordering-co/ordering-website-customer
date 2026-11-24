import { HeroLocationButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import styled, { css } from 'styled-components'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { themePart, themeSpace, headingText } from '~/utils/themeTokens'
import { getThemeCss, getThemeMobileCss } from '~/utils/themeCss'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'
import { srOnlyCss } from '~ui/src/styles/Rules'

/* The props of the hero (components.home_hero.base) and their changes below
   MOBILE_WEB_MAX_WIDTH (platforms.mobile_web), as CSS (their view) */
const heroBase = (theme) => getThemeCss(theme, 'home_hero').base
const heroMobile = (theme) => getThemeMobileCss(theme, 'home_hero')?.base || {}

// start | center | end → the flex alignment
const FLEX_ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end' }
const TEXT_ALIGN = { start: 'start', center: 'center', end: 'end' }

/**
 * The title's text-shadow (home_hero.base.title_shadow, a shadow
 * of the theme: its offset, blur and color; null: none).
 */
export const heroTitleShadow = (theme) => {
  const shadow = heroBase(theme).title_shadow.css
  if (shadow === 'none') return 'text-shadow: none;'
  const [x, y, blur, , ...color] = shadow.split(' ')
  return `text-shadow: ${x} ${y} ${blur} ${color.join(' ')};`
}

export const HeroContainerStyled = styled.div`
  width: 100%;
  height: fit-content;
  /* its minimum height (home_hero.base.min_height) */
  min-height: ${({ theme }) => heroBase(theme).min_height};
  position:relative;
  ${({ mb }) => mb && css`
    margin-bottom: ${mb};
  `}


  ${({ bgimage }) => bgimage && css`
    background-repeat: no-repeat, repeat;
    background-size: cover;
    object-fit: cover;
    background-position: center;
  `}

  @media (min-width: 567px) {
    height: calc(100vh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
    height: calc(100dvh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height})); /* dvh = visible viewport under mobile URL bars (vh fallback above) */
    ${({ isFullScreen }) => !isFullScreen && css`
      height: calc(60vh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
      height: calc(60dvh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
    `}
    margin-bottom: 0;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ theme }) => heroBase(theme).overlay};
    z-index: 1;
  }

  & > * {
    position: relative;
    z-index: 2;
  }
`

export const HeroContainer = (props) => {
  const style = { backgroundImage: `url("${props.bgimage}")` }

  return (
    <HeroContainerStyled {...props} style={style}>
      {props.children}
    </HeroContainerStyled>
  )
}

export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-height: 100%;
    /* its sides (home_hero.base.padding_x) at every width */
    padding: 0 ${({ theme }) => heroBase(theme).padding_x};

    input {
      width: 90%;
      margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    }

    @media (min-width: 576px) {
      justify-content: center;
      input {
        width: 97%;
      }
    }
`

export const Title = styled.h1`
  /* The hero stacks title, field and button one lg space apart */
  margin: 0 0 ${props => themeSpace(props.theme, 'lg')} 0;
  ${props => headingText(props.theme, 'h1')}
  opacity: 1;
  ${props => themePart(props.theme, 'home_hero', { color: 'base.title_color', text: 'base.title' })}
  /* its shadow (title_shadow, also on the highlighted words),
     alignment (title_align) and the weight of the highlighted words
     (highlight_weight) */
  ${({ theme }) => css`
    ${heroTitleShadow(theme)}
    text-align: ${TEXT_ALIGN[heroBase(theme).title_align]};
    span.highlight {
      ${heroTitleShadow(theme)}
      font-weight: ${heroBase(theme).highlight_weight};
    }
  `}
  /* the theme hides it (visibility home.hero.title): read, not seen */
  ${({ $srOnly }) => $srOnly && srOnlyCss}
`

const HeroFieldLane = styled.div`
  width: 100%;
  min-width: 0;

  @media (min-width: 1024px) {
    /* a field width less the room beside its button */
    width: calc(70% - ${props => themeSpace(props.theme, 'xl')});
    max-width: ${props => heroBase(props.theme).field_max_width};
  }
`

export const HeroAddressLabel = styled.span`
  display: block;
  min-width: 0;
  position: relative;
  margin: 0;
  /* the help or the address wraps (, B3): nothing in it is cut with an ellipsis */
  overflow-wrap: anywhere;
  color: ${props => heroBase(props.theme).field_text_color};
  ${props => (heroMobile(props.theme).field_text || heroBase(props.theme).field_text).css}
  @media (min-width: 576px) {
    ${props => heroBase(props.theme).field_text.css}
  }
`

export const WrapInput = ({ $withIcon, ...props }) => {
  const button = <HeroLocationButton {...props} heroWide={$withIcon} />
  return $withIcon ? <HeroFieldLane>{button}</HeroFieldLane> : button
}

export const UseAccount = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  min-height: 30vh;
  padding: 10vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  > *:last-child {
    margin-top: ${props => themeSpace(props.theme, 'md')};
  }

  @media (min-width: 576px) {
    display: none;
  }
`

export const SectionHeader = styled.h2`
  margin: 0;
  /* the title one xl over its buttons */
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
  /* a section title (components.section_header: text and color) */
  ${props => sectionTitleTextCss(props.theme, { level: 'h2' })}
`

export const LogoWrapper = styled.div`
  margin: ${props => themeSpace(props.theme, 'xxxl')} auto;
  display: flex;
  justify-content: center;
  img {
    width: 100%;
    object-fit: fill;
  }
  /* from 576px it heads the hero's content: over the title, on its side
     (home_hero.base.title_align) and lined up with it, one lg space apart */
  @media (min-width: 576px) {
    margin: 0 0 ${props => themeSpace(props.theme, 'lg')};
    justify-content: ${({ theme }) => FLEX_ALIGN[heroBase(theme).title_align]};
  }
  @media (min-width: 768px) {
    padding-left: ${props => themeSpace(props.theme, 'lg')};
  }
  /* the logo is never stretched (T6): up to header.base.screen_logo_height tall, as wide as
     the image within the hero */
  ${({ theme }) => css`
    width: auto;
    max-width: 100%;

    img {
      ${themeLogoBoxCss(theme, 'hero')}
      /* the hero's own logo height (home_hero.base.logo_height) */
      max-height: ${heroBase(theme).logo_height};
    }
  `}
`

/* The site's own name, shown instead of a logo when the theme has none: the
   hero's own title text and color (home_hero.base.title / title_color). It
   wraps to two lines before it is cut (title= in index.js keeps the whole
   name); the flex item already shrinks to the hero's width, so a long name
   never breaks the layout. */
export const LogoName = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
  ${props => themePart(props.theme, 'home_hero', { color: 'base.title_color', text: 'base.title' })}
`
export const HeroContent = styled.div`
  padding-left: 0;

  @media (min-width: 768px) {
    padding-left: ${props => themeSpace(props.theme, 'lg')};
  }

  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: ${props => themeSpace(props.theme, 'lg')};

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
    }
  }

  /* the field and the button along the row
     (home_hero.base.content_align) */
  @media (min-width: 768px) {
    .input-wrapper {
      justify-content: ${({ theme }) => FLEX_ALIGN[heroBase(theme).content_align]};
    }
  }
`

// The slot of the search Button in the field's row: on the phone the field's width and its space below; from 768px it
// takes its own width, at least home_hero.base.search_min_width, and the Button fills it
export const SearchAction = styled.div`
  display: flex;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  @media (min-width: 768px) {
    flex: 0 0 auto;
    min-width: ${props => heroBase(props.theme).search_min_width};
    margin-bottom: 0;
  }
`
