import { Button } from '~ui/src/design-system/components/Button'
import styled, { css, useTheme } from 'styled-components'
import React from 'react'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themePart, themePartText, themeRadius, themeShadow, themeSize, themeSpace, blockStill, cardHoverCss } from '~/utils/themeTokens'
import { getThemeMobileCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { cardInnerControlCss, stretchedCardCss } from '~ui/src/styles/Card'
import { srOnlyCss } from '~ui/src/styles/Rules'

export const Container = styled.div`
  cursor: pointer;
  margin: ${props => themeSpace(props.theme, 'md')} 0;
  position: relative;
  display: inline-block;
  text-align: left;
  box-sizing: border-box;

  > span {
    display: flex;
  }

  ${props => props.theme?.rtl && css`
    text-align: right;
  `}

  ${props => props.flex && css`
    display: flex;
    align-items: center;
    justify-content: center;
  `}
  ${({ isFavorite }) => isFavorite && css`
    width: 100%;
  `}
  @media (min-width: 768px) {
    margin: ${props => themeSpace(props.theme, 'md')};
  }

  @media(min-width: 993px){
    ${({ isBusinessesPage, theme }) => isBusinessesPage && css`
      margin: ${themeSpace(theme, 'xl')};
      /* three a row: the width less its two side margins */
      width: calc(33% - 2 * ${themeSpace(theme, 'xl')});
    `}
  }
  /* components.order_card */
  ${props => themePart(props.theme, 'order_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  ${props => blockStill(props.theme)}
  /* the hover of components.order_card (its shadow; faded when the theme animates it) */
  ${props => cardHoverCss(props.theme, 'order_card')}
  /* the card's inside is the theme's lg space on every screen
     (Content adds none) */
  padding: ${props => themeSpace(props.theme, 'lg')};
  /* a box whose title is the button that opens the order (its
     cover spans the whole card) */
  ${props => stretchedCardCss(props.theme, 'order_card')}
  /* the texts of components.order_card */
  ${props => orderCardTextsCss(props.theme)}
`

/* the texts of an order card from components.order_card: the
   business name (name, name_color: a heading, all of its text), the facts
   under it (meta, meta_color: the order number and date, the products, the
   delivery type; platforms.mobile_web.meta below 576px), the status
   (status_color) and the total (total, total_color; its weight kept). Empty
   otherwise. */
const orderCardTextsCss = (theme) => {
  const mobileMeta = getThemeMobileCss(theme, 'order_card').base.meta
  return css`
    && h3 {
      ${themePart(theme, 'order_card', { text: 'base.name', color: 'base.name_color' })}
    }
    && .orders-detail p,
    && ${OrderStatusContainer} p {
      ${themePart(theme, 'order_card', { text: 'base.meta', color: 'base.meta_color' })}
    }
    && ${OrderStatusContainer} .order-status {
      ${themePart(theme, 'order_card', { color: 'base.status_color' })}
    }
    && .total {
      ${themePartText(theme, 'order_card', 'base.total', { weight: 600 })}
      ${themePart(theme, 'order_card', { color: 'base.total_color' })}
    }
    @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px) {
      && .orders-detail p,
      && ${OrderStatusContainer} p {
        ${mobileMeta.css}
      }
    }
  `
}

export const Content = styled.div`
  display: flex;
  position: relative;
  border-radius: ${props => themeRadius(props.theme, 'lg')};
  padding: 0;
  ${({ isCustomerMode }) => isCustomerMode
    ? css`
    align-items: center;
  `
    : css`
    align-items: flex-start;
    flex: 1;
  `}

  .buttons-wrapper {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    /* the actions' column keeps 1.75 times the xl size (98px by default; it was 95px) */
    min-height: ${props => `calc(1.75 * ${themeSize(props.theme, 'xl')})`};
  }
  /* not a box of its own, so the title's cover spans the card */
  position: static;
`

export const Price = styled.div`
  display: flex;
  width: ${({ isFavorite }) => isFavorite ? '35%' : 'auto'};
  justify-content: flex-end;
  flex-direction: row;
  align-items: flex-start;

  /* the order total: an amount, not a heading */
  .total {
    margin: 0;
  }
  p {
    margin-block-end: 0.1em;
    margin-block-start: ${({ isBusinessesPage }) => isBusinessesPage ? '0.1em' : '1em'};
    color: ${props => themeColor(props.theme, 'warning_text')};
    font-size: 0.8em;
    overflow:hidden;
    text-overflow: ellipsis;
    margin-left: ${props => themeSpace(props.theme, 'xs')};
  }

  p[name='view-cart']{
    color: ${props => primaryText(props.theme)};
    cursor: pointer;
  }

  @media (min-width: 480px) {
    ${({ isCustomerMode }) => !isCustomerMode && css`
      flex-direction: row;
      align-items: center;
    `}
  }
`

const BusinessLogoWrapperStyled = styled.div`
  display: flex;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  justify-content: center;
  align-items: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  /* the logo (orders.business_logo): the theme's xl size (tokens.size),
     md before the card's text, on every screen */
  ${({ theme }) => css`
    && {
      width: ${themeSize(theme, 'xl')};
      min-width: ${themeSize(theme, 'xl')};
      height: ${themeSize(theme, 'xl')};
      min-height: ${themeSize(theme, 'xl')};
      margin: 0;
      margin-inline-end: ${themeSpace(theme, 'md')};
    }
  `}
`

export const BusinessLogoWrapper = (props) => {
  const theme = useTheme()
  const style = {}
  if (props.bgimage && !props.isClosed) {
    style.backgroundImage = `url("${props.bgimage}")`
  } else {
    // a closed business: the theme's overlay veil over the logo (0.4 by default; it was a 0.5 black)
    const veil = themeColor(theme, 'overlay')
    style.backgroundImage = `linear-gradient(${veil}, ${veil}), url("${props.bgimage}")`
  }

  return (
    <BusinessLogoWrapperStyled {...props} style={style}>
      {props.children}
    </BusinessLogoWrapperStyled>
  )
}
export const ButtonWrapper = styled.div`
  /* the actions: a column of the widest one under 576px, a row from there; none
     narrower than 100px (the theme's padding and type size would cut "Reorder" at that width) */
  display: grid;
  align-items: center;
  grid-template-columns: minmax(13ch, max-content);

  @media (min-width: 576px) {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(13ch, max-content);
  }
  /* the actions sm apart (no margins of their own), over the cover of the
     card's title: they work apart */
  gap: ${props => themeSpace(props.theme, 'sm')};
  ${props => cardInnerControlCss(props.theme)}
`

export const TitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
`

export const FavoriteWrapper = (props) => (
  <Button {...props} appearance='plain' style={{ marginLeft: 'var(--ot-space-xs)', zIndex: 10 }} />
)

export const ReviewWrapper = styled.div`
`

export const MultiLogosContainer = styled.div`
  display: flex;
  align-items: center;
  p {
    white-space: nowrap;
  }
`

export const OrderStatusContainer = styled.div`
  .order-status {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (min-width: 576px){
    display: flex;
    /* the facts of the row sm apart */
    gap: ${props => themeSpace(props.theme, 'sm')};
    && p {
      margin-left: 0;
      margin-right: 0;
    }
  }

  .completed {
    color: ${({ theme }) => primaryText(theme)};
  }
`

/* The title of a card whose business name the theme hides: read, not seen. */
export const HiddenTitle = styled.span`
  ${srOnlyCss}
`
