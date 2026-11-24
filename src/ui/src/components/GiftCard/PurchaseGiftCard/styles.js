import styled from 'styled-components'
import { themeIconSize, themePart, themeSpace, themeText, headingText } from '~/utils/themeTokens'
import { Badge } from '~ui/src/styles/Badge'

/* The purchase section: its title (an h2 with the h3 look, as the redeem's),
   tokens.space.md over the gift cards */
export const Container = styled.div`
  display: flex;
  flex-direction: column;

  > h2 {
    ${props => headingText(props.theme, 'h3')}
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
  }
`

/* The gift cards, tokens.space.lg apart: one column, two from 600px */
export const GiftCardsWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`

/* A gift card is a content container (components.card) with its purchase
   button: still, no hover of its own (the button is the control),
   tokens.space.md by tokens.space.lg inside, its parts tokens.space.md apart */
export const GiftCardItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'md')};
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    padding: ${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')};

    .left-content {
      display: flex;
      align-items: center;
      gap: ${themeSpace(theme, 'md')};
      min-width: 0;
    }
  `}

  /* the gift card's name: two lines before it is cut (title= in index.js
     keeps the whole name) */
  .name {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 500 })}
    margin: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
`

/* The amount of a gift card: a badge of the theme (components.badge,
   primary), its icon (tokens.icon.sm) tokens.space.xs from the value */
export const AmountBadge = styled(Badge)`
  gap: ${props => themeSpace(props.theme, 'xs')};

  svg {
    font-size: ${props => themeIconSize(props.theme, 'sm')};
  }
`
