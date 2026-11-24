import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeIconSize, themeRadius, themeShadow, themeSpace, themeText, buttonStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'

export const OptionStripeContainer = styled.div`
  display: flex;
  flex-direction: column;
`

/* A message, not a title: the theme's large text in danger, at the start of
   the sheet */
export const WarningMessage = styled.p`
  color: ${props => themeColor(props.theme, 'danger_text')};
  ${props => themeText(props.theme, 'body_lg')}
  padding: 0;
`

export const CardItem = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
`

/* A saved card is a Choice card (components.choice: the base piece sets its
   padding, box and text): its layout only; a card missing its zipcode can't
   be picked */
export const CardChoiceRow = styled.div`
  width: 100%;
  justify-content: space-between;
  gap: ${props => themeSpace(props.theme, 'md')};

  ${({ $invalid }) => $invalid && css`
    opacity: 0.7;
  `}
`

/* The saved cards, a single choice list */
export const CardsChoiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

/* The cards apart from the methods (the checkout folds both):
   their title (the theme's label text) and, once a card is chosen, the
   action that shows them all again, a row md over the list and sm above it */
export const CardsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin: ${({ theme }) => themeSpace(theme, 'md')} 0 ${({ theme }) => themeSpace(theme, 'sm')};

  h3 {
    margin: 0;
    ${({ theme }) => themeText(theme, 'label')}
  }
`

export const CardsChangeLink = (props) => (
  <Button {...props} appearance='link' size='sm' />
)

/* The option sets the spacing and the text (components.choice) */
export const CardItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'md')};

  > div {
    display: flex;
    align-items: center;
    margin: 0;

    img {
      width: ${props => themeIconSize(props.theme, 'lg')};
      height: ${props => themeIconSize(props.theme, 'md')};
    }
  }

  /* the card's texts (not the radio indicator, a span of the color of
     components.radio) */
  span:not([aria-hidden='true']) {
    font: inherit;
    color: inherit;
  }
  p {
    margin: 0;
    color: ${({ theme }) => themeColor(theme, 'danger_text')};
  }
`

export const CardItemActions = styled.div`
  display: flex;
  align-items: center;
`

export const BlockLoading = styled.div`
  width: 100%;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const AddNewCard = styled.div`
  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => primaryText(props.theme)};
    cursor: pointer;
    user-select: none;
  }
`

// "Add new card": a button of components.link, tokens.space.md under the cards.
export const AddNewCardLink = (props) => (
  <Button {...props} appearance='link' />
)

export const CardItemActionsWrapper = styled.div`
  position: relative;
`

export const ActionsContent = styled.div`
  position: absolute;
  z-index: 10;
  top: 100%;
  background: ${props => themeColor(props.theme, 'surface')};
  border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
  box-sizing: border-box;
  box-shadow: ${props => themeShadow(props.theme, 'lg')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  overflow: hidden;
  ${props => props.theme?.rtl
? css`
    left: 0;
  `
: css`
    right: 0;
  `}

  div {
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'md')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    cursor: pointer;
    white-space: nowrap;
    color: ${props => themeColor(props.theme, 'text')};

    &:hover {
      background: ${props => themeColor(props.theme, 'surface_alt')};
    }

    &.delete {
      color: ${props => themeColor(props.theme, 'danger_text')};
    }
    ${props => buttonStill(props.theme)}
  }
`
