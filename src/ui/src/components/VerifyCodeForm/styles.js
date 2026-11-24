import styled, { css } from 'styled-components'
import { timerCss } from '~ui/src/styles/Timer'
import { themeSpace, themeText } from '~/utils/themeTokens'

export const Container = styled.div`
  margin: 0px auto;
  max-width: min(100%, 44ch);

  > p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  }

  @media (min-width: 576px) {
    max-width: min(100%, 62ch);
  }
`

// The countdown: a number, not a heading
export const DownTimer = styled.p`
  text-align: center;
  margin: 0px;
  /* the countdown of components.timer, centered */
  ${({ theme }) => css`
    && {
      ${timerCss(theme)}
      display: block;
      width: fit-content;
    }
  `}
`

// The code's box (InputCode): lg above it plus xl, xl under it
export const OtpWrapper = styled.div`
  padding: calc(${props => themeSpace(props.theme, 'lg')} + ${props => themeSpace(props.theme, 'xl')}) 0 ${props => themeSpace(props.theme, 'xl')};
`
