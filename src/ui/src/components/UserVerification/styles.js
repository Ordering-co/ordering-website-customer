import styled, { css } from 'styled-components'
import { timerCss } from '~ui/src/styles/Timer'
import { headingText, themeRadius, themeSpace, themeValue } from '~/utils/themeTokens'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { fieldMessageCss, fieldGap } from '~ui/src/styles/Field'
import { pageTitleGap } from '~ui/src/styles/Page'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

// the space under the title and its message, to the form: the
// page title's space (components.section_header, page variant), less the
// form's gap that already separates them (never negative)
const titleBlockSpace = (theme) => {
  return `margin-bottom: max(0px, calc(${pageTitleGap(theme)} - ${fieldGap(theme)}));`
}

/* the code's boxes (InputCode: its code size, centered, its gap apart), xl above and below; at the sides
   the row takes the whole width of the form, so six boxes keep their 44px on a 320px phone (implementation notes M5) */
export const OtpWrapper = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'xl')} 0;
`

// The title (the page's h1) and the message: the title of the
// theme's h1, sm over the message
export const WrapperText = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  text-align: center;
  h1 {
    ${props => headingText(props.theme, 'h1')}
  }
  ${({ theme }) => css`
    && h1 {
      margin: 0 0 ${themeSpace(theme, 'sm')};
      /* the page title of components.section_header (its text and color; sm
         over the message, which belongs to it; centered with it) */
      ${sectionTitleTextCss(theme, { level: 'h1' })}
    }
    && span {
      margin: 0;
    }
    ${titleBlockSpace(theme)}
  `}
`

/* a warning alert of the theme (the phone must be updated), a
   status */
export const WarningText = styled.span.attrs(alertAttrs('warning'))`
  ${props => alertRules(props.theme, 'warning')}
`

export const ErrorText = styled.span.attrs(alertAttrs('danger'))`
  ${props => alertRules(props.theme, 'danger')}
`

export const FieldError = styled.p`
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

export const CountdownTimer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  margin: ${({ theme }) => themeSpace(theme, 'md')} auto 0;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  span:last-child {
    cursor: pointer;
  }
  /* the countdown of components.timer (its expired color when
     the time is up), with no box of its own */
  ${({ theme, error }) => css`
    && {
      width: auto;
      background-color: transparent;
    }
    && span {
      ${timerCss(theme, { expired: !!error })}
    }
  `}
`

export const Container = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh; /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  /* the room under the header (no scroll of an empty page), the
     page's side space (lg) and xxl above and below */
  ${({ theme }) => css`
    box-sizing: border-box;
    height: auto;
    min-height: calc(100vh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
    min-height: calc(100dvh - var(--header-height, ${themeValue(theme, 'header', 'base.height')}px));
    padding: ${themeSpace(theme, 'xxl')} ${themeSpace(theme, 'lg')};
  `}
`

export const FormInput = styled.form`
  width: 60%;
  display: flex;
  flex-direction: column;
  /* the padding of components.input; the gap of components.field; the whole width on a phone
     (the code boxes fit), 60% from 768px as before */
  ${({ theme }) => css`
      gap: ${fieldGap(theme)};
      @media (max-width: 767px) {
        width: 100%;
      }
    `}
`

/* the phone field (InputPhoneNumber, which draws its own box); the form's gap is the
   only space */
export const InputWrapper = styled.div`
  width: 100%;

  .phone_number {
    display: flex;
    justify-content: center;
  }
  && input, && .phone_number {
    margin: 0;
  }
`

export const ButtonsWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  width: 100%;
  /* md between the buttons; each one takes its half, the button across it */
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'md')};
    > div {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `}
`
