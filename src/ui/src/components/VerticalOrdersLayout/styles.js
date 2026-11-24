import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themePart, themeRadius, themeShadow, themeSize, themeSpace, themeValue, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { stretchedCardCss } from '~ui/src/styles/Card'

// Whether a card is of the page's own color (components.order_card's
// background against the page background): then the cards stand apart by a
// space, not by a rule on top
export const cardOnPageColor = (theme) => {
  const card = themeValue(theme, 'order_card', 'base.background')
  return card.toUpperCase() === themeColor(theme, 'background').toUpperCase()
}

export const SingleCard = styled.div`
  width: 100%;
  display: flex;
  /* min, not a cap: a 2-line business name (BusinessInformation h3) grows
     the row instead of getting clipped */
  min-height: calc(1.75 * ${props => themeSize(props.theme, 'xl')});
  height: auto;
  padding: ${props => themeSpace(props.theme, 'sm')};
  cursor: pointer;

  ${props => cardOnPageColor(props.theme) && css`
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  `}

  @media(min-width: 480px){
    min-height: calc(2.5 * ${props => themeSize(props.theme, 'xl')});
    ${props => cardOnPageColor(props.theme) && css`
      border-top: none !important;
    `}
  }

  /* components.order_card */
  ${props => themePart(props.theme, 'order_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  ${props => blockStill(props.theme)}
  /* the hover of components.order_card (its shadow; faded when the theme animates it) */
  ${props => cardHoverCss(props.theme, 'order_card')}
  /* a box whose title is the button that opens the order (its
     cover spans the whole card) */
  ${props => stretchedCardCss(props.theme, 'order_card')}
`

export const OrderPastContent = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
  padding-right: ${props => themeSpace(props.theme, 'xs')};
  min-width: 28ch;

  ${props => props.theme?.rtl && css`
    padding-left: ${props => themeSpace(props.theme, 'xs')};
    padding-right: 0px;
  `}
`

export const PastLogo = styled.div`
  width: ${props => themeMedia(props.theme, '3xs')};
  height: 100%;
  ${({ isMulti }) => isMulti && css`
      width: ${props => themeSize(props.theme, 'xl')};
      min-width: ${props => themeSize(props.theme, 'xl')};
      height: ${props => themeSize(props.theme, 'xl')};
      min-height: ${props => themeSize(props.theme, 'xl')};
      margin: ${props => themeSpace(props.theme, 'xs')};
    `}
  img {
    width: 100%;
    height: 100%;
    border-radius: ${props => themeRadius(props.theme, 'lg')};
    object-fit: contain;
  }
  box-shadow: ${props => themeShadow(props.theme, 'md')};
  display: none;

  @media (min-width: 480px) {
    display: block;
  }
`

export const WrapperBusinessTitle = styled.div`
  width: 80%;
  display: flex;
  gap: ${props => themeSpace(props.theme, 'md')};

  @media (min-width: 480px) {
    width: 95%;
  }
`

export const OrderInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .dot {
    display: none;
  }

  @media (min-width: 480px){
    flex-direction: row;
    align-items: center;
    .dot {
      display: block;
    }
  }
`

export const WrappButton = styled.div`
  width: 80%;
  display: grid;
  justify-content: center;
  /* the button fills its column: the box's width, 60% of it from 768px */
  grid-template-columns: 100%;
  margin: ${props => themeSpace(props.theme, 'xl')} auto;

  @media (min-width: 768px) {
    grid-template-columns: 60%;
  }
`
export const ReviewWrapper = styled.div`
  .review-sent {
    border-radius: ${props => themeRadius(props.theme, 'xxl')};
  }
`

export const MultiLogosContainer = styled.div`
  display: none;
  align-items: center;

  @media (min-width: 480px) {
    display: flex;
  }
`
