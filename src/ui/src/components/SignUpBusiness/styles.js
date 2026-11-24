import styled, { css } from 'styled-components'
import { themeRadius, themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { fieldGap, fieldMessageCss } from '~ui/src/styles/Field'
import { authCheckboxLabelCss, authRedirectColorCss, authRedirectTextCss } from '~/utils/authForm'
import {
  signupBackgroundCss,
  signupBandRatio,
  signupContainerCss,
  signupDescriptionContainerCss,
  signupDescriptionTextCss,
  signupDescriptionTitleCss,
  signupFormPaddingCss
} from '~/utils/signupPage'
import { pageTitleGap } from '~ui/src/styles/Page'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

/* The page: the background image with cover only from 768px (a width with no
   token), its veil while the description sits on it; under 768px the form sits
   on the page background of the theme (tokens.color.background) and the image
   is the header band (SignupBackgroundBand). Its sections take its whole width
   one over the other (below 993px) and side by side from 993px:
   components.signup_page sets its padding, the width of each side and the gap
   between them (the sections in the theme's order) */
export const SignupBusinessContainer = styled.div`
  ${({ bgImage, $veiled, theme }) => signupBackgroundCss(theme, bgImage, { veiled: $veiled })}
  display: flex;
  justify-content: space-between;
  align-items: center;

  > div {
    width: 100%;
    box-sizing: border-box;
  }
  ${({ theme }) => signupContainerCss(theme)}
`

/* While the page's content loads: the spinner centered, no taller than half
   the screen */
export const SignupLoadingContainer = styled(SignupBusinessContainer)`
  && {
    justify-content: center;
    max-height: 52vh;
  }
`

export const SignupDescriptionContainer = styled.div`
  /* the container's gap is the only space */
  ${({ theme }) => signupDescriptionContainerCss(theme)}
`

/* under 768px (T5): the background image as a decorative band
   (a CSS background, no alt) over the page, the full width with cover, at the
   ratio of components.signup_page (band_ratio) */
export const SignupBackgroundBand = styled.div`
  width: 100%;
  background-image: url("${({ $image }) => $image}");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;

  @media (min-width: 768px) {
    display: none;
  }
  aspect-ratio: ${({ theme }) => signupBandRatio(theme)};
`

/* the title of the description: the display text of the theme, the text and
   colors of components.signup_page */
export const SignupDescriptionTitle = styled.div`
  ${({ theme, $hasImage }) => css`
    && {
      ${themeText(theme, 'display')}
      ${signupDescriptionTitleCss(theme, { hasImage: $hasImage })}
    }
  `}
`

/* a paragraph, the body_lg text of the theme, the text, colors and gap under
   the title of components.signup_page */
export const SignupDescriptionContent = styled.p`
  ${({ theme, $hasImage }) => css`
    && {
      ${themeText(theme, 'body_lg')}
      margin: 0;
      ${signupDescriptionTextCss(theme, { hasImage: $hasImage })}
    }
  `}
`
export const FormInput = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;

  /* the fields of components.input (and InputPhoneNumber), one md space
     between the rows of the form */
  gap: ${({ theme }) => fieldGap(theme)};
  div.phone_number {
    width: 100%;
  }
`

/* A field with its error under it (components.field: its error text,
   message_gap from the field) */
export const FieldItem = styled.div`
  width: 100%;
`
export const FieldError = styled.span`
  display: block;
  text-align: start;
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

export const PhoneNumberWrapper = styled.div`
  .PhoneInput {
    box-sizing: border-box;
    /* the country and the number are components.input
       (InputPhoneNumber) */
  }
`

/* the form's gap spaces it */
export const ReCaptchaWrapper = styled.div``

/* the Checkbox with its label: the form's gap is the only space */
export const TermsConditionWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 0;
`

/* the label of the checkbox: the checkbox label of auth_form, xs between its
   text and link (the Checkbox puts sm between its box and the label) */
export const TermsLabel = styled.span`
  ${({ theme }) => css`
    && {
      ${authCheckboxLabelCss(theme)}
      margin: 0;
    }
    && > span:first-child {
      margin: 0;
      margin-inline-end: ${themeSpace(theme, 'xs')};
    }
    /* the Terms & Conditions link of components.link */
    && > a { ${linkThemeRules(theme)} }
  `}
`

// The placeholders of the fields: of the input's radius (the
// form's gap between them)
export const SkeletonWrapper = styled.div`
  span {
    margin: 0;
    border-radius: ${props => themeRadius(props.theme, 'sm', 'input')};
  }
`

/* a content container of the theme (components.card), form_padding
   inside; its title the page title over the form */
export const FormSide = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  margin: auto;
  ${({ theme }) => css`
    ${themePart(theme, 'card', {
      background: 'base.background',
      'border-radius': 'base.radius',
      border: 'base.border',
      'box-shadow': 'base.shadow'
    })}
    && {
      ${signupFormPaddingCss(theme)}
    }
  `}
`
export const SignUpTitle = styled.h1`
  width: 100%;
  margin-top: 0;
  /* the page title's space (section_header, page variant) */
  margin-bottom: ${props => pageTitleGap(props.theme)} !important;
  /* the page title (components.section_header, page variant) */
  ${({ theme }) => `&& { ${sectionTitleCss(theme, { level: 'h1', spaced: false })} }`}
`

/* Already have an account? and the link to log in (auth_form's redirect
   text and color, the link of components.link), md under the form */
export const RedirectLink = styled.p`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  ${({ theme }) => css`
    margin: ${themeSpace(theme, 'md')} 0 0;
    ${authRedirectTextCss(theme)}
    && > span {
      margin-inline-end: ${themeSpace(theme, 'xs')};
      ${authRedirectColorCss(theme)}
    }
  `}
  ${({ theme }) => `&& > a { ${linkThemeRules(theme)} }`}
`
