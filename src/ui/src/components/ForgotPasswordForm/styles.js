import styled, { css } from 'styled-components'
import { headingText, themePart, themeSpace, themeValue } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { fieldErrorAboveCss, fieldGap } from '~ui/src/styles/Field'
import { authRedirectColorCss, authRedirectTextCss } from '~/utils/authForm'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

export const ForgotPasswordContainer = styled.div`
  width: 100%;
  height: ${({ isPopup }) => isPopup ? '100vh' : 'auto'};
  height: ${({ isPopup }) => isPopup ? '100dvh' : 'auto'}; /* dvh = visible viewport under mobile URL bars (vh fallback above) */

  /* the title: of the page (h1), of the popup (h2) */
  h1, h2 {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
    text-align: center;
  }
  h1 {
    ${props => headingText(props.theme, 'h1')}
  }
  h2 {
    ${props => headingText(props.theme, 'h2')}
  }
  /* the title of the page, the page title of
     components.section_header (text, color, space under it; centered with the
     form); of a popup whose modal has no title row, the modal's title text */
  ${({ theme }) => `&& > h1 { ${sectionTitleCss(theme, { level: 'h1', aligned: false })} }`}
  ${({ theme }) => `&& > h2 { ${themePart(theme, 'modal', { text: 'base.title' })} }`}
  @media (min-width: 992px) {
    height: 100%;
    ${({ isPopup, theme }) => !isPopup && css`
      min-height: calc(100vh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
      min-height: calc(100dvh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
    `}
  }
  /* in a modal: the height of its form (the modal sizes to its
     content, as the login's) */
  ${({ theme, isPopup }) => isPopup && css`
    && {
      height: auto;
      min-height: 0;
    }
  `}
`
const Side = styled.div`
  display: flex;
  width: 100%;
`

export const FormSide = styled(Side)`
  flex-direction: column;
  align-items: center;

  /* no space of its own over the form under 992px (the title's space, or in
     a modal the modal's gap, already separates them); no text size of its
     own: each text of the form is the theme's */
  @media (min-width: 992px) {
    margin: auto;
  }
`

/* one md space between the rows of the form; in a modal its whole width,
   as the login's */
export const FormInput = styled.form`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => fieldGap(theme)};
`

export const RedirectLink = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 0px;

  * {
    margin: 0px;
    padding: 0px;
  }

  ${({ register, isPopup, theme }) => register && css`
    width: calc(95% - ${themeSpace(theme, 'lg')});

    @media (min-width: 481px) {
      width: calc(${isPopup ? 95 : 80}% - ${themeSpace(theme, 'lg')});
    }
  `}

  @media (min-width: 425px) {
    flex-direction: row;
  }
  /* the text of the sentence the body's, the link's md text
     (no size per width), xs between text and link; no space of its own: in
     the form its gap sets it, after the form (register) md above it */
  ${({ theme, register }) => css`
    padding: 0;
    ${register && `margin-top: ${themeSpace(theme, 'md')};`}
    ${authRedirectTextCss(theme)}
    && span {
      margin: 0;
      margin-inline-end: ${themeSpace(theme, 'xs')};
      ${authRedirectColorCss(theme)}
    }
  `}
  /* the link (Login) of components.link */
  ${({ theme }) => `&& a { ${linkThemeRules(theme)} }`}
`

export const ReCaptchaWrapper = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'md')} auto;
`

/* the error text of components.field, message_gap over its field (the
   form's gap less message_gap), at the field's start */
export const ValidationText = styled.div`
  ${({ theme }) => fieldErrorAboveCss(theme)}
`
