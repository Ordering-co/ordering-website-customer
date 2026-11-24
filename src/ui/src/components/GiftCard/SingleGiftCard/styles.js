import styled from 'styled-components'
import { themeMedia, themePart, themePartText, themeRadius, themeShadow, themeSpace, cardHoverCss } from '~/utils/themeTokens'
import { stretchedCardCss } from '~ui/src/styles/Card'

/* A card of components.order_card (it opens its order, as the cards of the
   orders it sits among): its title is the button that opens it (a stretched
   link), still, the hover of order_card (its shadow), tokens.space.lg inside */
export const CardContainer = styled.div`
  display: flex;
  flex-direction: row-reverse;
  ${({ theme }) => `
    ${themePart(theme, 'order_card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    padding: ${themeSpace(theme, 'lg')};
    ${cardHoverCss(theme, 'order_card')}
    ${stretchedCardCss(theme, 'order_card')}
  `}
`

/* The image of the gift card: the media scale's sm on both sides. */
export const CardLogo = styled.div`
  box-sizing: border-box;
  flex-shrink: 0;
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  width: ${props => themeMedia(props.theme, 'sm')};
  height: ${props => themeMedia(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
`

/* The texts of the card, tokens.space.lg from the image: the name
   (order_card name, name_color), the order and date (meta, meta_color), the
   price (total, total_color) and the status (a badge) */
export const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  ${({ theme }) => `
    margin: 0;
    margin-inline-end: ${themeSpace(theme, 'lg')};

    /* the gift card's order name: two lines before it is cut (title= in
       index.js keeps the whole name) */
    h3.name {
      margin: 0;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      overflow-wrap: anywhere;
      ${themePart(theme, 'order_card', { text: 'base.name', color: 'base.name_color' })}
    }

    p.date {
      display: flex;
      align-items: center;
      margin: ${themeSpace(theme, 'sm')} 0;
      ${themePart(theme, 'order_card', { text: 'base.meta', color: 'base.meta_color' })}
    }

    .status-container {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: ${themeSpace(theme, 'xl')};

      .price {
        ${themePartText(theme, 'order_card', 'base.total')}
        ${themePart(theme, 'order_card', { color: 'base.total_color' })}
      }
    }

    p.status {
      margin: 0;
    }
  `}
`
