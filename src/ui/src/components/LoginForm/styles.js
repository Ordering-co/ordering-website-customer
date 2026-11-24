import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css, useTheme } from 'styled-components'
import { themeRadius, themeSpace, themeValue, themeText, headingText } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { timerCss } from '~ui/src/styles/Timer'
import { themeSlot } from '~/utils/themeGroups'
import { fieldErrorAboveCss, fieldGap } from '~ui/src/styles/Field'
import { authRedirectColorCss, authRedirectTextCss, authSocialCss } from '~/utils/authForm'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

export const LoginContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  padding: 0 ${({ theme }) => themeSpace(theme, 'sm')};
  box-sizing: border-box;

  flex-direction: column;

  ${({ isPopup, theme }) => !isPopup && css`
    min-height: calc(100vh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
    min-height: calc(100dvh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px)); /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  `}

  @media (min-width: 768px) {
    flex-direction: row;
  }
  /* in a modal: no side space of its own, its fields line up
     with the modal's title (the modal's padding is the room) */
  ${({ isPopup }) => isPopup && 'padding-left: 0; padding-right: 0;'}
`
const Side = styled.div`
  display: flex;
  width: 100%;
`

export const FormSide = styled(Side)`
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  @media (min-width: 992px) {
    width: ${({ isCustomerMode }) => isCustomerMode ? '55%' : '100%'};
    ${({ isPopup, theme }) => isPopup ? themeText(theme, 'caption', { props: ['size'] }) : 'font-size: 1em;'}
  }

  @media (min-width: 1200px){
    font-size: ${({ isPopup }) => isPopup ? '0.9em' : '1em'};
  }
  /* no text size of its own (the popup's 12px / 0.9em): each
     text and control takes the theme's */
  font-size: inherit;
`

export const Title = styled.h1`
  ${props => headingText(props.theme, 'h1')}
  margin-top: 0;
  /* the form as a page (in a modal its title goes to the modal's
     row): the page title of components.section_header (text, color, space
     under it; centered with the form) */
  ${({ theme }) => sectionTitleCss(theme, { level: 'h1', aligned: false })}
`

export const LoginWith = styled.div`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  display: grid;
  justify-items: start;
  margin-bottom: ${({ theme }) => fieldGap(theme)};
`

export const FormInput = styled.form`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  display: flex;
  flex-direction: column;

  /* one md space between the rows of the form, the inputs with the padding
     of components.input */
  gap: ${({ theme }) => fieldGap(theme)};
`

export const RedirectLink = styled.div`
  padding: ${({ theme }) => themeSpace(theme, 'sm')};
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
    /* narrower than the form: centered on its axis, as its button () */
    margin-inline: auto;

    @media (min-width: 481px) {
      width: calc(${isPopup ? 100 : 80}% - ${themeSpace(theme, 'lg')});
    }
  `}

  @media (min-width: 425px) {
    flex-direction: row;
  }

  @media (min-width: 992px) {
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
      ${authRedirectColorCss(theme)}
    }
    /* the space between sentence and link only when they share a row: stacked, each line is centered by itself */
    @media (min-width: 425px) {
      && span { margin-inline-end: ${themeSpace(theme, 'xs')}; }
    }
  `}
  /* the link (Forgot password, Sign up…) of components.link */
  ${({ theme }) => `&& a { ${linkThemeRules(theme)} }`}
`

export const SocialButtons = styled.div`
   width: ${({ isPopup }) => isPopup ? '100%' : '80%'};

  ${({ isPopup }) => isPopup && css`
    @media (min-width: 576px) {
      flex: 1;
    }
  `}

  /* one over the other (side by side, equal columns, from 576px in a modal):
     a grid, so the full width buttons share the row without overflowing it */
  display: grid;
  ${({ isPopup }) => isPopup && css`
    @media (min-width: 576px) {
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
    }
  `}
  /* the block of components.auth_form: social_margin over it, social_gap
     between its buttons (the buttons are the base Button's) */
  ${({ theme }) => authSocialCss(theme)}
`

// The placeholders of the social buttons: of the button's
// radius, md apart
export const SkeletonSocialWrapper = styled.div`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  span{
    border-radius: ${props => themeRadius(props.theme, 'xxl', 'button')};
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
  }
`

export const CountdownTimer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  align-self: center;
  text-align: center;

  /* the countdown of components.timer, a number (no pointer:
     it cannot be touched); in the form its gap is the only space */
  ${({ theme }) => css`
    && {
      margin: 0 auto;
    }
    && span {
      ${timerCss(theme)}
      cursor: auto;
    }
  `}
`

export const ReCaptchaWrapper = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'md')} auto;
`

// The error over a field: components.field's error text,
// message_gap over it (the form's gap less message_gap)
export const ValidationText = styled.div`
  /* the error text of components.field, message_gap over its field */
  ${({ theme }) => fieldErrorAboveCss(theme)}
`

// The empty column beside the form in call center mode (wide screens only)
export const HeroSide = styled(Side)`
  display: none;
  @media (min-width: 992px) {
    width: 45%;
    display: flex;
  }
`

// the link of auth_form.slots.resend (its size and variant)
const resendLink = (theme) => {
  const { size, variant } = themeSlot(theme, 'auth_form', 'resend')
  // an axis the slot leaves empty (null) is the link's default
  return { ...(size && { size }), ...(variant && { variant }) }
}

// "Send again": a button of components.link (its
// disabled color while the code is still valid).
export const ResendCode = ({ disabled, ...props }) => {
  const theme = useTheme()
  const { size, variant } = resendLink(theme)
  return (
    <Button
      {...props}
      appearance='link'
      linkVariant={variant}
      size={size}
      disabled={disabled}
      style={{ alignSelf: 'center', pointerEvents: disabled ? 'none' : undefined }}
    />
  )
}
