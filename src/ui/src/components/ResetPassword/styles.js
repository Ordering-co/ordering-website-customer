import styled, { css } from 'styled-components'
import { primaryText } from '~/utils/themeColors'
import { themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { fieldGap, fieldMessageCss } from '~ui/src/styles/Field'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { baseCss } from '~/utils/authForm'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'
import { srOnlyCss } from '~ui/src/styles/Rules'

export const ResetPasswordContainer = styled.div`
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;

  @media (min-width: 992px) {
    flex-direction: row;
    height: 100%;
    min-height: calc(100vh - var(--header-height, ${({ theme }) => themeValue(theme, 'header', 'base.height')}px));
    min-height: calc(100dvh - var(--header-height, ${({ theme }) => themeValue(theme, 'header', 'base.height')}px)); /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  }
`
const Side = styled.div`
  display: flex;
  width: 100%;
`
export const HeroSide = styled(Side)`
  height: calc(40vh - var(--header-height, ${({ theme }) => themeValue(theme, 'header', 'base.height')}px));
  justify-content: center;
  align-items: center;
  padding-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  /* its height is the room under the header, its padding inside it */
  box-sizing: border-box;

  @media (min-width: 992px) {
    width: 55%;
    height: calc(100vh - var(--header-height, ${({ theme }) => themeValue(theme, 'header', 'base.height')}px));
    height: calc(100dvh - var(--header-height, ${({ theme }) => themeValue(theme, 'header', 'base.height')}px));
  }
  /* the panel of components.reset_password (its background and
     the color of its texts) */
  ${({ theme }) => baseCss(theme, 'reset_password', { 'background-color': 'background', color: 'color' })}
`

export const TitleHeroSide = styled.div`
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  h1,
  p {
    margin: 0px;
  }
  /* the title (the page title's text, components.section_header
     page variant), the text and their color (components.reset_password, the
     panel's); its mobile_web text under 576px */
  ${({ theme }) => css`
    && h1 {
      ${sectionTitleTextCss(theme, { level: 'h1', color: false })}
      ${baseCss(theme, 'reset_password', { color: 'color' })}
    }
    && p {
      ${baseCss(theme, 'reset_password', { text: 'text', color: 'color' })}
    }
    @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px) {
      && p {
        ${baseCss(theme, 'reset_password', { text: 'text' }, { mobile: true })}
      }
    }
  `}
`

/* The site's own name, shown instead of a logo when the theme has none: it
   wraps to two lines before it is cut (title= in index.js keeps the whole
   name), never wider than the form side. */
export const LogoName = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'] })}
`

export const FormSide = styled(Side)`
  flex-direction: column;
  align-items: center;
  margin-top: ${({ theme }) => themeSpace(theme, 'xxl')};

  /* the logo of a standalone screen (T6: header.base.screen_logo_height tall, up to screen_logo_width
     wide, never stretched) */
  > img {
    ${({ theme }) => themeLogoBoxCss(theme, 'screen')}
  }

  /* one over the other (under 992px): xxl above and below it, so it keeps
     its room from the hero on whichever side the theme puts it
     (pages.reset_password) and from the page's end */
  @media (max-width: 991px) {
    margin: ${({ theme }) => themeSpace(theme, 'xxl')} 0;
  }

  @media (min-width: 992px) {
    margin: auto;
    width: 45%;
    font-size: 1em;
  }
`

// The page's h1 when the theme hides the hero (its title): only for
// assistive technology
export const HiddenTitle = styled.h1`
  ${srOnlyCss}
`

export const FieldError = styled.p.attrs({ role: 'alert' })`
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

export const FormInput = styled.form`
  width: 80%;
  display: flex;
  flex-direction: column;

  /* the padding of components.input and components.button, one md space
     between the rows of the form and xl under the logo */
  gap: ${({ theme }) => fieldGap(theme)};
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const RedirectLink = styled.div`
  padding: ${({ theme }) => themeSpace(theme, 'sm')};
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 0px;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}

  span {
    margin-right: ${({ theme }) => themeSpace(theme, 'xs')};

    ${props => props.theme?.rtl && css`
      margin-left: ${themeSpace(props.theme, 'xs')};
      margin-right: 0px;
    `}
  }

  a {
    color: ${props => primaryText(props.theme)};
    text-decoration: none;
  }

  * {
    margin: 0px;
    padding: 0px;
  }

  ${({ register, theme }) => register && css`
    width: calc(90% - ${themeSpace(theme, 'lg')});

    @media (min-width: 481px) {
      width: calc(80% - ${themeSpace(theme, 'lg')})
    }
  `}

  @media (min-width: 425px) {
    flex-direction: row;
  }

  @media (min-width: 768px) {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  @media (min-width: 992px) {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    flex-direction: row;
  }
`
