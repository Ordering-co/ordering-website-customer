import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themePart, themeRadius, themeSpace } from '~/utils/themeTokens'
import { cardBoxCss } from '~ui/src/styles/Card'

// One card per store, as many columns as fit a card's measure: one on a phone, three in the column of a
// desktop (the column is 120ch wide).
export const Cards = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 30ch), 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

// The look of a store card of the theme (components.business_card: background, border, radius, shadow,
// padding and the name's and the details' text); its button is the card's cta slot.
export const Card = styled.li`
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  ${({ theme }) => cardBoxCss(theme, 'business_card', { padding: true })}
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.meta', color: 'base.meta_color' })}
`

export const StoreName = styled.h3`
  margin: 0;
  overflow-wrap: anywhere;
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.name', color: 'base.name_color' })}
`

export const Address = styled.address`
  font-style: normal;
  overflow-wrap: anywhere;
`

export const Status = styled.p`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

// the buttons of a row line up at the bottom of their cards
export const Action = styled.div`
  margin-top: auto;
  padding-top: ${({ theme }) => themeSpace(theme, 'xs')};
`

export const MapBox = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
  min-height: ${({ theme }) => themeMedia(theme, '4xl')};
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'lg')};
  background: ${({ theme }) => themeColor(theme, 'surface')};

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: inherit;
    object-fit: cover;
  }
`
