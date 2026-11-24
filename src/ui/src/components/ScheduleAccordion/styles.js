import styled, { css } from 'styled-components'
import { themeFontFamily, themeText, themeSpace } from '~/utils/themeTokens'

export const AccordionSection = styled.div`

  .info-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xl')};
    font-family: ${props => themeFontFamily(props.theme, 'body')};

    .hours {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 40%;
    }

    .day {
      margin: 0px;
      ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}

      ${({ isClosed }) => isClosed && css`
        font-weight: 700;
      `}
    }

    p {
      margin: 0px 0 ${props => themeSpace(props.theme, 'md')};
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }

    p:last-child {
      margin: 0px;
    }
  }
`

export const ClosedSchedule = styled.p`
  margin: 0px !important;
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 700 })}
`
