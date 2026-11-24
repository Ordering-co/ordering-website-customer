import styled, { css } from 'styled-components'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { cardInnerControlCss, stretchedCardCss } from '~ui/src/styles/Card'

export const Container = styled.div`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-width: min(100%, 26ch);
  margin: ${({ theme }) => themeSpace(theme, 'sm')};
  ${({ theme, $choice }) => !$choice && css`
    padding: ${themeSpace(theme, 'md')};
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  `}
  /* a box whose name is the button that picks the
     professional (its cover spans the whole card) */
  ${props => props.$stretched && stretchedCardCss(props.theme, 'card')}
`

export const InfoWrapper = styled.div`
  /* the professional's name: two lines before it is cut (title= in
     index.js keeps the whole name) */
  > .name {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin: 0px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  p {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
  }
  /* next to the avatar (components.avatar) the theme's md
     apart, taking the rest of the card */
  ${({ theme }) => css`
    flex: 1;
    width: auto;
    min-width: 0;
    margin: 0;
    margin-inline-start: ${themeSpace(theme, 'md')};
    p {
      margin-top: ${themeSpace(theme, 'xxs')};
    }
  `}
`

export const ActionWrapper = styled.div`
  ${({ isSmallPhoto }) => !isSmallPhoto && css`
    margin-top: ${props => themeSpace(props.theme, 'lg')};
  `}
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'xs')};
`

/* Keep each action above the card's stretched control. */
export const CardAction = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  ${({ theme }) => cardInnerControlCss(theme)}

  @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px), (pointer: coarse) {
    /* Reserve the base Button's touch area so the neighboring hit areas don't overlap. */
    /* touch-target */ min-inline-size: 44px;
  }
`
