import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH, getThemeCss } from '~/utils/themeCss'
import { themeBorderStyle, themeBorderWidth, themePart, themeRadius, themeShadow, blockStill, themeScrollbar, themeSpace } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'

export const CategoriesWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: ${props => themeRadius(props.theme, 'md')};


  ${({ isPopover }) => !isPopover && css`
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
    box-shadow: ${props => themeShadow(props.theme, 'md')};
    /* beside the products: a card (components.card) of menu options */
    ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
  `}
  /* in the popover: the popover is the one that scrolls (with the menu's
     scrollbar) */
  ${({ isPopover }) => isPopover && css`
    &&& {
      border-radius: 0;
      overflow: visible;
      max-height: none;
    }
  `}

  @media (min-width: 993px) {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: calc(100dvh - var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));

    &::-webkit-scrollbar {
      width: ${props => themeScrollbar(props.theme).size};
    }
    &::-webkit-scrollbar-track {
      background: ${props => themeColor(props.theme, 'surface_alt')};
    }
    &::-webkit-scrollbar-thumb {
      background: ${props => themeColor(props.theme, 'disabled')};
      border-radius: ${props => themeRadius(props.theme, 'xs')};
    }
    &::-webkit-scrollbar-thumb:hover {
      background: ${props => themeColor(props.theme, 'disabled')};
    }
  }
  ${props => blockStill(props.theme)}
`

export const CategoriesContainer = styled.div`
  display: flex;
  /* nothing clips the box's border and shadow (beside the products, its
     padding is their room) */
  overflow: visible;
  padding: ${props => themeSpace(props.theme, 'lg')} 0 0 0;
  padding-bottom: 0;
  background: ${props => themeColor(props.theme, 'background')};
  z-index: 1000;
  text-align: center;
  width: 100%;
  /* fixed on scroll under the business name bar, once that one is fixed */
  top: var(--categories-sticky-top, 0px);
  position: sticky;

  div.category {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  ${({ isPopover }) => isPopover && css`
    width: unset;
  `}
  /* in the popover: the menu's list, no space around it */
  ${({ isPopover }) => isPopover && css`
    &&& {
      padding: 0;
      background: transparent;
    }
  `}

  div.special {
    ${props => !props.featured && css`
      display: none;
    `}
  }

  /* alone on small screens, the box lines up with the page's content; beside
     the products, room for its shadow */
  @media (min-width: 381px) {
    padding: ${props => themeSpace(props.theme, 'xs')} 0;
  }

  @media (min-width: 993px) {
    padding: ${props => themeSpace(props.theme, 'xs')};
    overflow-x: hidden;
  }
  ${props => blockStill(props.theme)}
`

export const IterateCategoriesContainer = styled.div`
  ${({ $popover, theme }) => !$popover && css`
    div.level-1 {
      border-bottom: ${({ isSub }) => !isSub ? `${themeBorderWidth(theme, 'thin', { fixed: true })} solid ${themeColor(theme, 'border')}` : ''} !important;
      ${({ isSub }) => !isSub && dividerLineCss(theme, 'item', { important: true })}
    }

    &:hover {
      transform: scale(1.01);
    }
  `}
  ${props => blockStill(props.theme)}
`

/* The title of an entered category in the popover, with its
   back button: the menu's option text, bold, over a line of the menu's border
   (none without it) */
export const DrillHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
  padding-inline-end: ${props => themeSpace(props.theme, 'lg')};
  text-align: start;
  ${props => themePart(props.theme, 'menu', { text: 'base.item_text', 'border-bottom': 'base.border' })}
  font-weight: 600;
  > span {
    padding-block: ${props => themeSpace(props.theme, 'xs')};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const DrillBackCell = styled.div`
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding-block: ${props => themeSpace(props.theme, 'xs')};
  padding-inline-start: ${props => themeSpace(props.theme, 'xs')};

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Keep the Back button's hit area within its own row and scrollport. */
    /* touch-target */ min-inline-size: 44px;
    /* touch-target */ min-block-size: 44px;
  }
`
