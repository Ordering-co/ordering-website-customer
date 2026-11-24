import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeIconSize, themeRadius, themeSpace, themeValue, themeText } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { fieldErrorTextCss, fieldGap } from '~ui/src/styles/Field'
import { authCheckboxLabelCss, authRedirectColorCss, authRedirectTextCss, authSocialCss } from '~/utils/authForm'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'

export const SignUpContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  ${({ isPopup, theme }) => !isPopup && css`
    min-height: calc(100vh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
    min-height: calc(100dvh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px)); /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  `}
  padding: 0 ${({ theme }) => themeSpace(theme, 'sm')};
  box-sizing: border-box;

  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
  /* in a modal: no side space of its own, its fields line up with the
     modal's title (the modal's padding is the room) */
  ${({ isPopup }) => isPopup && 'padding-left: 0; padding-right: 0;'}
`
const Side = styled.div`
  display: flex;
  width: 100%;
`

export const FormSide = styled(Side)`
  flex-direction: column;
  align-items: flex-start;
  margin: auto;

  @media (min-width: 992px) {
    ${({ isPopup, theme }) => isPopup ? themeText(theme, 'caption', { props: ['size'] }) : 'font-size: 1em;'}
  }

  @media (min-width: 1200px){
    font-size: ${({ isPopup }) => isPopup ? '0.9em' : '1em'};
  }
  /* no text size of its own (the popup's 12px / 0.9em) */
  font-size: inherit;
`

export const FormInput = styled.form`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;

  div.phone_number {
    width: 100%;
  }

  /* the placeholder and padding of components.input, one md space between
     the rows of the form */
  row-gap: ${({ theme }) => fieldGap(theme)};
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
  /* the link (Log in…) of components.link */
  ${({ theme }) => `&& a { ${linkThemeRules(theme)} }`}
`

export const SocialButtons = styled.div`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};

  ${({ isPopup }) => isPopup && css`
    flex: 1;
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

export const Title = styled.h1`
  ${props => headingText(props.theme, 'h1')}
  margin-top: 0;
  /* the form as a page (in a modal its title goes to the modal's
     row): the page title of components.section_header (text, color, space
     under it; centered with the form) */
  ${({ theme }) => sectionTitleCss(theme, { level: 'h1', aligned: false })}
`

// The placeholders of the fields: of the input's radius (the
// form's gap between them)
export const SkeletonWrapper = styled.div`
  span{
    margin: ${props => themeSpace(props.theme, 'md')} 0;
    border-radius: ${props => themeRadius(props.theme, 'xxl', 'input')};
  }
  width: 100%; span { margin: 0; }
`

// The placeholder of the social buttons: of the button's radius
export const SkeletonSocialWrapper = styled(SkeletonWrapper)`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  span{
    margin-top: 0;
    border-radius: ${props => themeRadius(props.theme, 'xxl', 'button')};
  }
  ${({ theme }) => `margin-top: ${themeSpace(theme, 'xl')};`}
`

// The step of the code (countdown, boxes, send again, cancel), outside the
// form: a column with the form's gap and width, as the login's
export const OtpStep = styled.div`
  width: ${({ isPopup }) => isPopup ? '100%' : '80%'};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => fieldGap(theme)};
`

export const ReCaptchaWrapper = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'md')} auto;
`
export const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* the form's gap is the only space */
  margin: 0;


  @media (min-width: 800px) {
    ${({ isHalf }) => isHalf && css`
      width: 48%;
    `}
  }
`
export const InputBeforeIcon = styled.div`
  position: absolute;
  top: 0px;
  left: ${props => themeSpace(props.theme, 'lg')};
  display: flex;
  align-items: center;
  height: 100%;

  ${props => props.theme?.rtl && css`
    right: ${themeSpace(props.theme, 'lg')};
    left: initial;
  `}

  svg {
    font-size: ${props => themeIconSize(props.theme, 'sm')};
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const TermsConditionWrapper = styled.div`
  display: flex;
  align-items: center;

  ${({ theme }) => css`
    margin: 0;
    && > label {
      ${authCheckboxLabelCss(theme)}
      width: 100%;
      margin: 0;

      /* The row itself supplies the touch target. Leave the legal link clickable. */
      &::after { pointer-events: none; }

      @media (pointer: coarse) {
        /* touch-target */
        min-block-size: 44px;
      }
    }
    && > label > span:last-child > span {
      font-weight: 500;
      margin-inline-end: ${themeSpace(theme, 'xs')};
    }
    && > label a {
      ${linkThemeRules(theme)}

      @media (pointer: coarse) {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        /* touch-target */ min-inline-size: 44px;
        /* touch-target */ min-block-size: 44px;
      }
    }
  `}
`

export const PromotionsWrapper = styled(TermsConditionWrapper)``

export const BussinessAndDriverSignUp = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 993px) {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
  }

  /* md between the buttons and over them (the form's rhythm);
     the social buttons that follow keep their xl above */
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'md')};
    margin-top: ${themeSpace(theme, 'md')};
    margin-bottom: 0;
  `}
`

// The checkboxes: md between them (the form's gap around)
export const CheckboxArea = styled.div`
  ${({ theme }) => css`
    width: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${themeSpace(theme, 'md')};
    &:empty {
      display: none;
    }
  `}
`

export const ValidationText = styled.span`
  /* the error text of components.field */
  ${({ theme }) => fieldErrorTextCss(theme)}
`
