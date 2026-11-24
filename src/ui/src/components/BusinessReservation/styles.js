import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'

export const RevervationContainer = styled.div`
  ${({ isCheckout }) => isCheckout && css`
    margin-top: ${props => themeSpace(props.theme, 'xl')};
  `}
`

export const Block = styled.div`
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  h4 {
    ${props => headingText(props.theme, 'h4')}
  }
  > div {
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
  }
  .error {
    color: ${props => themeColor(props.theme, 'danger_text')};
  }
  /* components.card */
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  /* a section of cards (the date and time steps, each a card of its own) has
     no box: its title and its cards, no card around cards */
  ${({ $plain }) => $plain && css`
    && {
      background: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 0;
    }
  `}
`

/* The ordering methods, a single choice list (components.choice) */
export const ChoiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

export const ChoiceRow = styled.div`
  display: flex;
  align-items: center;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Keep the full Choice touch area in its own row even when the gap is zero. */
    /* touch-target */
    min-block-size: 44px;
  }
`

export const EmptyCart = styled.div`
  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* the icon (EmptyStateIcon) paints and sizes itself; no rule here */

    p {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      color: ${props => themeColor(props.theme, 'text_muted')};
      margin: ${({ theme }) => themeSpace(theme, 'xl')} 0 0;
    }
  }
`

export const EmptyBtnWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${props => themeSpace(props.theme, 'xl')};

  span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const ToleranceText = styled.p`
  color: ${props => themeColor(props.theme, 'text_muted')};
`
